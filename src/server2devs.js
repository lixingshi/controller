/**
 * Created by john on 2017/3/16.
 */

const net = require('net');
const http = require('http')
const PC = require('./packversion').PackControl;
var pack = require('./../index').packControl;
var rpack = require('./../index').resControl
const timer = require('timers')
const apiPhp = require('./../index').apiPhp
const collectionConfig = require('./../config').collectionConfig
const mConfig = require('./../config').mainConfig
const httpConfig = require('./../config').httpConfig
const Stream = require('./proxyserver/videoStream');
const util = require('./utils/util');
const TakePhotoTimer = require('./takePhotoTimer');
const ConvertAudio = require('./utils/convertAudio');

const VALIDATE_TASK_FINISH_DURATION = 100*1000
const VALIDATE_DEV_OFFLINE_DURATION = 120*1000

var stream = new Stream({
    wsPort:mConfig.proxy_server_port,
})

var takePhotoTimer = new TakePhotoTimer();
takePhotoTimer.start();

const deviceMap = new DevicesMap();
const liveMap = new Map();

startValidateOnlineTimer()

module.exports.server = net.createServer((socket) => {
    console.log(socket);
    console.log('client connected '+socket.remoteAddress)
    if(!socket.remoteAddress){
        socket.destroy()
        return;
    }
    console.log('client connected '+socket.remoteAddress.split(':').pop() + "  " + socket.remotePort);

    socket.on('end', () => {
        const host = socket.remoteAddress.split(':').pop()+':'+socket.remotePort
        if (deviceMap.getForHost(host) == null){
            return
        }
        const devId = deviceMap.getForHost(host).devId
        removeDevive([devId])
        console.log('client disconnected');
    });

    socket.on('data', (data) => {
        const dispatch = new SocketEvent(socket)
        dispatch.dispatchSocketEvent(data)
    });

    socket.on('error', (err) => {
        const host = socket.remoteAddress.split(':').pop()+':'+socket.remotePort
        if (deviceMap.getForHost(host) == null){
            return
        }
        const devId = deviceMap.getForHost(host).devId
        removeDevive([devId])
        console.log('客户端出错');
    });

}).on('error', (err) => {
    server.close();
});

function startValidateOnlineTimer() {
    timer.setInterval(()=>{
        var devIds = []
        deviceMap.hostMap.forEach((value,key,map)=>{
            let currentTime = Date.now() / 1000
            let duration = currentTime - value.tm_heartbeat
            if (duration > 10){
                value.disabled = true
                devIds.push(value.devId)
            }
        })

        if (devIds.length != 0){
            removeDevive(devIds)
        }
    },10*1000)
}

/**
 *
 * @param {[]} devIds
 * @returns {Promise.<void>}
 */
function removeDevive(devIds) {

    setTimeout(()=>{
        let drops = devIds.filter((i,j,k)=>{
            return !deviceMap.hasDevId(i)
        })
        if (drops.length == 0){
            return
        }
        apiPhp.device_disconnect(drops)
    },VALIDATE_DEV_OFFLINE_DURATION)

    devIds.forEach((item,index,array)=>{
        if (deviceMap.getForDevId(item) == null){
            return
        }
        const devinf = deviceMap.getForDevId(item)
        if (devinf.taskId != -1){
            orderDone(devinf,-1)
        }
        deviceMap.getForDevId(item).socket.destroy()
        deviceMap.deleteForDevId(item)
        takePhotoTimer.removeDevId(item)
        console.log(item+"掉线被移除")
    })

}

function checkLive(name,callback) {
    var stat = false;
    http.get(httpConfig.easydarwin_rtsplist_api,(res)=>{
        var rowData = ''
        res.on('data',(chunk)=>{
            rowData += chunk
        })

        res.on('end',()=>{
            const result = JSON.parse(rowData)
            const totalLive =  result['EasyDarwin']['Body']['SessionCount']

            if (totalLive == 0){
                callback(false)
                return
            }

            const sessions = result['EasyDarwin']['Body']['Sessions']

            sessions.forEach((i,j,k)=>{
                if (i['name'].split('.')[0] === name){
                    stat = true
                }
            })

            callback(stat)

        })

        res.on('error',(err)=>{
            callback(stat)
        })
    })
}

function DeviceInfo(socket) {
    this.socket = socket
    this.executing = false
    this.taskId = -1
    this.taskType = 0 //1代表特殊指令，截取视频
    this.duration = 0
    this.tm_heartbeat = 0
    this.devId = null
    this.disable = false
    this.callback = null
    this.isLogin = false

    this.longitude = 0;
    this.latitude = 0;
    this.sys_ver = 0;
    this.res_ver = 0;
    this.finish = null
}

DeviceInfo.prototype.cmd_sys_reset = function () {
    this.finish = this.autoFinish(VALIDATE_TASK_FINISH_DURATION)
    return this.socket.write("sys-reset\r\n")
    //return this.Promise_()
}

DeviceInfo.prototype.cmd_sys_config = function (param) {
    this.finish = this.autoFinish(VALIDATE_TASK_FINISH_DURATION)
    return this.socket.write("sys-config"+" "+param+"\r\n")
    //return this.Promise_()
}

DeviceInfo.prototype.cmd_sys_reboot = function () {
    this.finish = this.autoFinish(VALIDATE_TASK_FINISH_DURATION)
    return this.socket.write("sys-reboot\r\n")
    //return this.Promise_()
}

DeviceInfo.prototype.cmd_broadcast = function (audio,replay,interval) {
    this.finish = this.autoFinish(VALIDATE_TASK_FINISH_DURATION+parseInt(replay)*1000*10)
    return this.socket.write("broadcast"+" "+this.taskId+" "+audio+","+replay+","+interval+"\r\n")//this.Promise_()
}

DeviceInfo.prototype.cmd_takephoto = function (photos,interval) {
    this.finish = this.autoFinish(parseInt(photos)*parseInt(interval)*1000+VALIDATE_TASK_FINISH_DURATION)
    return this.socket.write("take-photo"+" "+this.taskId+" "+photos+","+interval+"\r\n")//this.Promise_()
}

DeviceInfo.prototype.cmd_takevideo = function (duration) {
    this.taskType = 1;
    var time = ''
    if (duration < 60){
        time = '00:00:'+duration
    }else if (60 <= duration && duration < 3600){
        let min = parseInt(duration / 60)
        let s = duration % 60
        time = '00:'+min+':'+s
    }else{
        let h = parseInt(duration / 3600)
        let remain = duration % 3600
        let min = parseInt(remain / 60)
        let s = remain % 60
        time = h+':'+min+':'+s
    }

    this.duration = time
    checkLive(this.devId,(stat)=>{
        this.finish = this.autoFinish(VALIDATE_TASK_FINISH_DURATION+parseInt(duration)*1000)
        if (stat){
            takeVideo(this)
        }else{
            this.socket.write("show-video"+" "+this.taskId+"\r\n")//this.Promise_()
        }
    })

    return true

}

DeviceInfo.prototype.cmd_showvideo = function () {
    checkLive(this.devId,(stat)=>{
        this.finish = this.autoFinish(60*1000+VALIDATE_TASK_FINISH_DURATION)
        if (stat){
            pushRTSPStream(this.devId)

            this.cmd_takevideo(mConfig.auto_takevideo_duration)

        }else{
            this.socket.write("show-video"+" "+this.taskId+"\r\n")//this.Promise_()
        }
    })

    return true

}

DeviceInfo.prototype.cmd_upgrade = function (name,id,version,type) {
    if (type === 'sys'){
        const str = pack.formatNecessaryPackForSys(this.sys_ver)
        if (str != ''){
            this.finish = this.autoFinish(VALIDATE_TASK_FINISH_DURATION)
            this.callback(this.socket.write('sys-upgrade'+' '+str+'\r\n'));

        }
    }else if(type === 'res'){
        util.mkdirsSync(mConfig.res_sou_patch_path,0o777)
        util.mkdirsSync(mConfig.res_patch_path)
        util.chownSync(mConfig.res_patch_path)
        let convertAudio = new ConvertAudio(mConfig.res_sou_patch_path,mConfig.res_patch_path);
        convertAudio.convert((err)=>{
            if (err){
                this.callback(false)
                return
            }
            rpack = new PC(mConfig.res_patch_path,mConfig.res_patch_file_suffix,(files)=>{
                const str = rpack.formatNecessaryPack2ForRes(this.res_ver)
                if (str != ''){
                    this.finish = this.autoFinish(VALIDATE_TASK_FINISH_DURATION)
                    this.socket.write('res-upgrade'+' '+str+'\r\n');
                }
            });

        })

    }

    return this.Promise_()
}


DeviceInfo.prototype.cmd_stopvideo = function () {
    var live = liveMap.get(this.devId)
    if (live != null){
        live.stream.kill('SIGHUP')
        liveMap.delete(this.devId)
    }
    this.finish = this.autoFinish(VALIDATE_TASK_FINISH_DURATION)
    return this.socket.write("stop-video"+" "+this.taskId+"\r\n")
}

DeviceInfo.prototype.Promise_ = function () {
    return new Promise((resolve,reject)=>{
        this.callback = function (result) {
            resolve(result)
        }
    })
}
DeviceInfo.prototype.autoFinish = function (interval) {
    return setTimeout(()=>{
        orderDone(this,-1)
    },interval)

}

function DevicesMap() {
    this.hostMap = new Map()
    this.devIdMap = new Map()
}

DevicesMap.prototype.deleteForDevId = function (devId) {
    const host = this.devIdMap.get(devId)
    if (host != null){
        this.hostMap.delete(host)
    }
    this.devIdMap.delete(devId)
}

DevicesMap.prototype.deleteForHost = function (host) {
    if (this.hasHost(host)){
        const info = this.hostMap.get(host)
        this.devIdMap.delete(info.devId)
    }
    this.hostMap.delete(host)
}

DevicesMap.prototype.getForDevId = function (devId) {
    const host = this.devIdMap.get(devId)
    if (host != null){
        return this.hostMap.get(host)
    }
    return null
}

DevicesMap.prototype.getForHost = function (host) {
    return this.hostMap.get(host)
}

DevicesMap.prototype.hasDevId = function (devId) {
    return this.devIdMap.has(devId)
}

DevicesMap.prototype.hasHost = function (host) {
    return this.hostMap.has(host)
}

DevicesMap.prototype.set = function (devId,host,deviceInfo) {
    if (this.hasDevId(devId)){
        let h = this.devIdMap.get(devId)
        this.hostMap.delete(h)
    }
    this.devIdMap.set(devId,host)
    this.hostMap.set(host,deviceInfo)
}

module.exports.deviceMap = deviceMap
//139.196.38.161
//500 Internal Server Error
function takeVideo(devInfo) {
    util.mkdirsSync(collectionConfig.ftp_base_path+devInfo.devId+'/'+devInfo.taskId)
    util.chownSync(collectionConfig.ftp_base_path+devInfo.devId+'/'+devInfo.taskId)
    var retry = 0;
    take();
    function take() {
        if (!devInfo.executing){
            return
        }
        retry += 1;
        stream.addConnNum(devInfo.devId)
        const exec = require('child_process').exec;
        const cmd = `ffmpeg -rtsp_transport tcp -y -i rtsp://127.0.0.1:${mConfig.rtsp_server_port}/${devInfo.devId}.sdp -c:v copy -ss 00:00:01 -t ${devInfo.duration} -f ${collectionConfig.video_suffix.split('.').removeBlank()[0]} ${collectionConfig.ftp_base_path+devInfo.devId}/${devInfo.taskId}/${devInfo.taskId+'_'+Date.now()+collectionConfig.video_suffix}`

        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                //console.log(error)
                let reg = new RegExp('500 Internal Server Error')
                let x = reg.exec(error)
                console.log('retry  '+retry)
                if (x != null&&retry <= 10){
                    setTimeout(()=>{
                        stream.delConnNum(devInfo.devId)
                        take();
                    },2*1000)
                }else{
                    stream.delConnNum(devInfo.devId)
                    orderDone(devInfo,-1)
                }

                return;
            }

            console.log('视屏截取成功')
            stream.delConnNum(devInfo.devId)
            makeMarkFile(devInfo)

            devInfo.executing = false
            devInfo.taskType = 0
            devInfo.taskId = -1;
            devInfo.callback = null

        });
    }
}

/**
 *
 * @param {DeviceInfo} devInfo
 * @returns {Promise.<void>}
 */
async function orderDone(devInfo,stat,makeFile = false) {
    if (!devInfo.executing){
        return
    }
    const res = await apiPhp.ordertask_done(devInfo.taskId,stat,`${parseInt(Date.now()/1000)}`)
    //console.log('broadcast '+res)
    if (JSON.parse(res)['stat'] == 'success'){

        console.log('指令任务完成，成功更新')
    }
    if (makeFile){
        makeMarkFile(devInfo)
    }
    clearTimeout(devInfo.finish)
    devInfo.taskId = -1;
    devInfo.executing = false
    devInfo.taskType = 0
    devInfo.callback = null

}


function makeMarkFile(devInfo) {
    const fs = require('fs')
    try {
        fs.appendFileSync(collectionConfig.ftp_base_path+devInfo.devId+'/'+devInfo.taskId+'/'+collectionConfig.mark_file,'')
    }catch (err){
        console.log(err)
    }

}

function createOrderDir(devInfo) {
    util.mkdirsSync(collectionConfig.ftp_base_path+devInfo.devId+'/'+devInfo.taskId)
    util.mkdirsSync(collectionConfig.file_base_path+devInfo.devId+'/'+devInfo.taskId)
    util.chownSync(collectionConfig.ftp_base_path+devInfo.devId+'/'+devInfo.taskId)
}

function pushRTSPStream(name) {
    let devInfo = deviceMap.getForDevId(name)
    if (!devInfo){
        return
    }
    var retry = 0
    const exec = require('child_process').exec;
    exec('ps -ef | grep ffmpeg',(error,stdout,stderr)=>{
        let reg = new RegExp(name+'.sdp')
        let x = reg.exec(stdout)

        if (x == null){
            push(name)
        }else{
            setTimeout(()=> {
                devInfo.cmd_takevideo(mConfig.auto_takevideo_duration)
                //orderDone(devInfo, 2)
            },1*1000)
        }
    })

    function push(name) {
        let takeVideo = setTimeout(()=> {
            devInfo.cmd_takevideo(mConfig.auto_takevideo_duration)
            //orderDone(devInfo, 2)
        },8*1000)

        setTimeout(()=>{
            const url = `rtsp://127.0.0.1:${mConfig.rtsp_server_port}/${name}.sdp`
            var mpeg1muxer = stream.startMpeg1Stream(url,name)
            mpeg1muxer.on('ffmpegError',(data)=>{
                let reg = new RegExp('500 Internal Server Error')
                let x = reg.exec(data.toString())
                if (x != null){
                    clearTimeout(takeVideo)
                    if (retry >= 10){
                        return
                    }
                    retry += 1;
                    mpeg1muxer = null
                    push(name)
                }
            })

            liveMap.set(name,mpeg1muxer)
        },2*1000)
    }

}

function SocketEvent(socket) {
    this.socket = socket
}

SocketEvent.prototype.dispatchSocketEvent = function (data) {
    console.log('recieve  '+ data.toString())
    const items = data.toString().split('\r\n').removeBlank()
    items.forEach((item,index,array)=>{
        const cmd = item.split('>>')
        const host = this.socket.remoteAddress.split(':').pop() + ':' + this.socket.remotePort
        const devInfo = deviceMap.getForHost(host)
        if (cmd.length > 1){
            //接受指令执行结果
            if (devInfo == null){
                this.socket.destroy();
                console.log("非法连接，已关闭");
            }

            const recall_split = cmd.removeBlank()[0].split(' ').removeBlank()
            if (recall_split[0] == 'report'){
                if (recall_split[1] == 'take-photo'){
                    setTimeout(()=>{
                        orderDone(devInfo,2,true)
                    },3*1000)

                }else if (recall_split[1] == 'broadcast'){
                    setTimeout(()=>{
                        orderDone(devInfo,2)
                    },3*1000)

                }else if (recall_split[1] == 'show-video'){
                    if (devInfo.taskType == 1){
                        setTimeout(()=>{
                            takeVideo(devInfo)
                        },3*1000)

                    }else{
                        pushRTSPStream(devInfo.devId)
                        // setTimeout(()=> {
                        //     devInfo.cmd_takevideo(mConfig.auto_takevideo_duration)
                        //     //orderDone(devInfo, 2)
                        // },8*1000)
                    }
                }else if (recall_split[1] == 'show-config'){
                    let x = cmd.removeBlank()[0].match(/\d{1}\s(.*)/)
                    if (x != null){
                        apiPhp.device_config(devInfo.devId,x[1])
                    }
                }else if (recall_split[1] == 'show-hd-info'){
                    let x = cmd.removeBlank()[0].match(/\d{1}\s(.*)/)
                    if (x != null){
                        apiPhp.device_stat(devInfo.devId,null,null,null,null,null,null,null,null,x[1])
                    }
                }
                
            }

            if (recall_split[0] == 'response'){
                if (recall_split[1] == 'sys-reset' || recall_split[1] == 'sys-config' || recall_split[1] == 'sys-reboot'
                    || recall_split[1] == 'res-upgrade' || recall_split[1] == 'sys-upgrade'){
                    if (devInfo.callback){
                        devInfo.callback(true)
                    }

                    setTimeout(()=>{
                        orderDone(devInfo,2)
                    },3*1000)

                }

                if (recall_split[1] == 'take-photo' || (recall_split[1] == 'show-video' && devInfo.taskType == 1)){
                    createOrderDir(devInfo)
                }
            }

        }else{
            //接受摄像头发送指令
            const cmd_split = cmd.removeBlank()[0].split(' ').removeBlank()
            var p1 ,p2;
            switch (cmd_split[0]){
                case 'login-t1':
                    this.recieve_login_t1(cmd_split[1],cmd_split[2],cmd_split[3])
                    break
                case 'login':
                     p1 = cmd_split[1].split(',').removeBlank()
                     p2 = cmd_split[2].split(',').removeBlank()
                    this.recieve_login(p1[0],p1[1],p1[2],p1[3],p2[0],p2[1],cmd_split[3],cmd_split[4])
                    break
                case 'heart-beat':
                     p1 = cmd_split[1].split(',').removeBlank()
                     p2 = cmd_split[2].split(',').removeBlank()
                    this.recieve_heartbeat(p1[0],p1[1],p2[0],p2[1])
                    break
                case 'heart-beat-t1':
                    this.recieve_heartbeat_t1(cmd_split[1])
                    break;
                case 'alert-battery':
                     p1 = cmd_split[1].split(',').removeBlank()
                    this.recieve_alertbattery(p1[0],p1[1])
                    break
                default:
                    if (!deviceMap.hasHost(host)){
                        this.socket.destroy();
                        console.log("非法连接，已关闭");
                    }
                    break;
            }
        }
    })
}

SocketEvent.prototype.recieve_login = async function (devId,ip,version,resversion,longitude,latitude,tm,sign) {
    const devInfo = new DeviceInfo(this.socket)
    const host = this.socket.remoteAddress.split(':').pop()+':'+this.socket.remotePort
    devInfo.devId = devId
    devInfo.tm_heartbeat = Date.now()/1000
    deviceMap.set(devId,host,devInfo)
    const re = await apiPhp.device_stat(devId,ip,longitude,latitude,null,1,parseInt(devInfo.tm_heartbeat),version,resversion,null)

    console.log("login "+re)
    if (JSON.parse(re)['stat'] == 'fail'){
        this.socket.write('>>report login 101\r\n')
        deviceMap.deleteForDevId(devId)
        this.socket.destroy()
    }

    if (JSON.parse(re)['stat'] == 'success'){
        this.socket.write('>>report login 0\r\n')
        util.mkdirsSync(collectionConfig.ftp_base_path+devId)
        util.mkdirsSync(collectionConfig.file_base_path+devId)
        util.chownSync(collectionConfig.ftp_base_path+devId)
        //this.checkDeviceUpdate(version)
        this.checkresourceUpdate(resversion)
        this.show_config()
        this.show_hd_info()
        this.setTime()
        takePhotoTimer.addDevId(devId)
    }

}

SocketEvent.prototype.recieve_login_t1 = async function (devId,tm,sign) {
    const devInfo = new DeviceInfo(this.socket)
    const host = this.socket.remoteAddress.split(':').pop()+':'+this.socket.remotePort
    devInfo.devId = devId
    devInfo.tm_heartbeat = Date.now()/1000
    deviceMap.set(devId,host,devInfo)
    const re = await apiPhp.device_stat_t1(devId,1,parseInt(devInfo.tm_heartbeat))

    console.log("login "+re)
    if (JSON.parse(re)['stat'] == 'fail'){
        this.socket.write('>>report login-t1 101\r\n')
        deviceMap.deleteForDevId(devId)
        this.socket.destroy()
    }

    if (JSON.parse(re)['stat'] == 'success'){
        this.socket.write('>>report login-t1 0\r\n')
        util.mkdirsSync(collectionConfig.ftp_base_path+devId)
        util.mkdirsSync(collectionConfig.file_base_path+devId)
        util.chownSync(collectionConfig.ftp_base_path+devId)
    }
}


SocketEvent.prototype.recieve_heartbeat = async function (longitude,latitude,sys_ver,res_ver) {
    const host = this.socket.remoteAddress.split(':').pop()+':'+this.socket.remotePort
    const devInfo = deviceMap.getForHost(host)
    if (devInfo != null){

        devInfo.tm_heartbeat = Date.now() / 1000

        if (devInfo.longitude != longitude || devInfo.latitude != latitude){
            apiPhp.device_stat(devInfo.devId,null,longitude,latitude,null,null,null,sys_ver,res_ver,null)
            devInfo.longitude = longitude
            devInfo.latitude = latitude
        }


        if (sys_ver != devInfo.sys_ver || res_ver != devInfo.res_ver){
            apiPhp.device_stat(devInfo.devId,null,longitude,latitude,null,null,null,sys_ver,res_ver,null)
            devInfo.sys_ver = sys_ver;
            devInfo.res_ver = res_ver;
        }

    }else{
        this.socket.destroy();
        return
    }

    this.socket.write('>>report heart-beat 0\r\n')
}

SocketEvent.prototype.recieve_heartbeat_t1 = async function (tm) {
    const host = this.socket.remoteAddress.split(':').pop()+':'+this.socket.remotePort
    const devInfo = deviceMap.getForHost(host)
    if (devInfo == null){
        this.socket.destroy();
        return
    }else{
        devInfo.tm_heartbeat = Date.now() / 1000
    }
    this.socket.write('>>report heart-beat-t1 0\r\n')
}

SocketEvent.prototype.recieve_alertbattery = function (battery,battery_remain) {
    const host = this.socket.remoteAddress.split(':').pop()+':'+this.socket.remotePort
    const devInfo = deviceMap.getForHost(host)
    apiPhp.device_stat(devInfo.devId,null,null,null,battery_remain,null,null,null,null,null)
    this.socket.write('>>report alert-battery 0\r\n')

}

SocketEvent.prototype.checkDeviceUpdate = function (version) {
    const str = pack.formatNecessaryPackForSys(version)
    if (str != ''){
        this.socket.write('sys-upgrade'+' '+str+'\r\n')
    }

}

SocketEvent.prototype.checkresourceUpdate = function (version) {
    const str = rpack.formatNecessaryPack2ForRes(version)
    if (str != ''){
        this.socket.write('res-upgrade'+' '+str+'\r\n');
    }
}

SocketEvent.prototype.setTime = function () {
    this.socket.write('set-time'+' '+parseInt(Date.now()/1000)+'\r\n')
}

SocketEvent.prototype.show_config = function () {
    this.socket.write('show-config\r\n')
}

SocketEvent.prototype.show_hd_info = function () {
    this.socket.write('show-hd-info\r\n')
}
