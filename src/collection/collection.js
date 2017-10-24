/**
 * 报警图片，视频信息搜集，生成数据插入数据库
 * Created by john on 2017/4/5.
 */
const fs = require('fs');
const path = require('path')
const timer = require('timers')
const http = require('http')
const url = require('url')
const pgConfig = require('../../config').pgConfig
const collectionConfig = require('../../config').collectionConfig
const pg = require('pg')
const ApiPhp = require('./../apiphp').ApiPhp
const exec = require('child_process').exec
const mConfig = require('../../config').mainConfig;
const ValidateStaying = require('./validateStaying');
const util = require('../utils/util');

(async function () {
    const apiPhp = new ApiPhp()
    const validateStaying = new ValidateStaying()
    const devRestrain = new Map()
    const pool = new pg.Pool(pgConfig)

    validateStaying.on('alert',(devId,imgPath)=>{
        console.log('二次报警逗留:'+devId+'  '+imgPath)
        to_t_log(devId,imgPath)
    });

    http.createServer((req, res) => {
        const pathName = url.parse(req.url).pathname
        const query = url.parse(req.url, true).query
        const op = query['op']
        if (pathName == '/device/restrain' && op != null) {

            if (op === 'delete') {
                let id = query['devId']
                if (id == null) {
                    res.writeHead(404, {'Content-Type': 'text/plain;charset=utf-8'});
                    res.write('{"msg":"devId不能为空","stat":"fail"}')
                    res.end()
                    return
                }
                devRestrain.delete(query['devId'])
                res.writeHead(200, {'Content-Type': 'text/plain;charset=utf-8'});
                res.write('{"msg":"取消设备报警抑制成功","stat":"success"}')
                res.end()
                return
            } else if (op === 'add') {
                let devId = query['devId'];
                let tm_stop = query['tm_stop'];
                let repeat = query['repeat']
                let tm_start = query['tm_start']
                let duration = query['duration'];
                if (!devId || !tm_stop || !duration || !repeat || !tm_start) {
                    res.writeHead(404, {'Content-Type': 'text/plain;charset=utf-8'});
                    res.write('{"msg":"请求路径不存在","stat":"fail"}')
                    res.end()
                    return
                }
                let restrain = new Restrain()
                restrain.tm_stop = tm_stop
                restrain.tm_start = tm_start
                restrain.repeat = (repeat || false) == 1 ? true : false
                restrain.tm_ = parseInt(Date.now() / 1000) + parseInt(duration)
                restrain.duration = duration
                devRestrain.set(devId, restrain)
                res.writeHead(200, {'Content-Type': 'text/plain;charset=utf-8'});
                res.write('{"msg":"设备报警抑制成功","stat":"success"}')
                res.end()
            }

        } else {
            res.writeHead(404, {'Content-Type': 'text/plain;charset=utf-8'});
            res.write('{"msg":"请求路径不存在","stat":"fail"}')
            res.end()
        }

    }).listen(collectionConfig.http_port)


function Restrain() {
    this.tm_start = ''
    this.tm_stop = ''
    this.tm_ = ''
    this.duration = ''
    this.repeat = false
}

pool.connect((error,client)=>{
    if (error != null){
        return
    }

    timer.setInterval(checkFileCollect,3*1000)
})

pool.on('error',(err,client)=>{
    console.log(err)
})

function checkFileCollect() {
    if (!fs.existsSync(collectionConfig.ftp_base_path)){
        return
    }

    fs.readdir(collectionConfig.ftp_base_path,(err,files)=>{
        if (err != null){
            return
        }

        files.map((item,index,array)=>{
            const p = collectionConfig.ftp_base_path+item
            if (fs.existsSync(p)&&fs.lstatSync(p).isDirectory()){
                return item
            }else{
                return null
            }
        }).filter((item,index,array)=>{
            return item != '' && item != null && item != 'upgrade'
        }).forEach((item,index,array)=>{
            const p = collectionConfig.ftp_base_path+item
            fs.readdir(p,(err,files)=>{
                if (err != null){
                    return
                }

                files.forEach((i,j,k)=>{
                    const dir = p+'/'+i
                    if (fs.existsSync(dir)){
                        const sep = item+"/"+i
                        if (fs.lstatSync(dir).isFile()&&collectionConfig.picture_suffix.hasItem(path.extname(dir))){
                            collectAlertPicture(sep,item)
                        }else if (fs.existsSync(dir)){
                            try {
                                if((fs.lstatSync(dir).isDirectory())){
                                    collectTask(sep,item,i)
                                }
                            }catch (error){
                                console.log('文件不存在')
                                console.log(error)
                            }

                        }
                    }
                })
            })
        })
    })
}

/**
 *收集指令任务结果
 * @param mPath 不含根路径
 * @param devId 设备id
 * @param taskId 任务id
 */
function collectTask(mPath,devId,taskId) {
    const p = collectionConfig.ftp_base_path+mPath
    fs.readdir(p,(err,files)=>{
        if (err != null){
            return
        }

        if (!fs.existsSync(p+'/'+collectionConfig.mark_file)){
            return
        }

        fs.unlinkSync(p+'/'+collectionConfig.mark_file)

        let res = path.resolve(collectionConfig.ftp_base_path,mPath)
        let des = path.resolve(collectionConfig.file_base_path,'./'+devId)
        let fileName = '';
        if (taskId == 11){
            fileName = files.removeItem(collectionConfig.mark_file).length > 0 ? files[0] : null;
            if (fileName == null){return;}
            res = path.resolve(collectionConfig.ftp_base_path,mPath+'/*')
            des = path.resolve(collectionConfig.file_base_path,mPath,'./'+util.YMDDate2Number())
            util.mkdirsSync(des);
        }

        if (taskId == 12){
            res = path.resolve(collectionConfig.ftp_base_path,mPath+'/*')
            des = path.resolve(collectionConfig.file_base_path,'./'+devId,'./'+util.YMDDate2Number())
        }
        exec(`mv -f ${res}  ${des}`,async (error,stdout,stderr)=>{
            if (error != null){
                return
            }

            console.log(res+'移动到'+des+'成功')
            if (taskId == 12){
                return;
            }

            const results = await pool.query('select * from t_device where id=$1',[devId])
            if (results.rows == 0){
                return
            }

            const position = results.rows[0].position
            var latitude = results.rows[0].latitude
            var longitude = results.rows[0].longitude
            let id_station = results.rows[0].id_station

            if (taskId == 11){
                if (results.rows[0].is_cancel_alert){
                    pool.query(`insert into t_caution (id_device,id_station,img_url,time_,status,description,longitude,latitude,position,geom) values ('${devId}','${id_station}','${'/'+mPath+'/'+util.YMDDate2Number()+'/'+fileName}','${util.formatDate()}',0,'${devId+'定时抓拍'}','${longitude}','${latitude}','${position}',st_geomfromtext('POINT(${longitude} ${latitude})',4326))`);
                }else {
                    pool.query(`insert into t_history (id_device,id_station,img_url,time_,status,description,longitude,latitude,position,geom) values ('${devId}','${id_station}','${'/'+mPath + '/' + util.YMDDate2Number() + '/' + fileName}','${util.formatDate()}',0,'${devId + '定时抓拍'}','${longitude}','${latitude}','${position}',st_geomfromtext('POINT(${longitude} ${latitude})',4326))`);
                }
            }else {
                pool.query('update t_order set status=$1,path=$2,tm_finish=$4 where id=$3', [2, mPath, taskId, `${parseInt(Date.now() / 1000)}`])
            }
        })

    })
}

/**
 *收集报警图片
 * @param {string}mPath 不含根路径
 * @param {string}devId 设备id
 */
function collectAlertPicture(mPath,devId) {
    const parsePath = path.parse(mPath)
    const res = path.resolve(collectionConfig.ftp_base_path,mPath)
    const currentPath = path.resolve('/'+parsePath.dir,'./'+util.YMDDate2Number(),'./'+parsePath.name+'.'+collectionConfig.transform_picture_suffix.split('.').removeBlank()[0]);
    const des = path.resolve(collectionConfig.file_base_path,parsePath.dir,'./'+util.YMDDate2Number(),'./'+parsePath.name+'.'+collectionConfig.transform_picture_suffix.split('.').removeBlank()[0]);
    const dirname = path.dirname(des)

    const spl = path.basename(res,parsePath.ext).split('_').removeBlank()

    util.mkdirsSync(dirname)

    if (devRestrain.has(devId)){
        let tm = parseInt(Date.now() / 1000)
        let restrain = devRestrain.get(devId)

        if (restrain.repeat && tm > restrain.tm_stop){
            let day = 60*60*24
            let dur = +tm - +restrain.tm_stop
            let mul = parseInt(dur / day)
            restrain.tm_start = +restrain.tm_start + (mul+1)*day
            restrain.tm_stop = +restrain.tm_stop + (mul+1)*day
            restrain.tm_ = +restrain.tm_start + +restrain.duration
        }

        if (tm >= restrain.tm_start &&tm <= restrain.tm_stop){
            if (tm >= (restrain.tm_ - restrain.duration) && tm <= restrain.tm_){
                restrain.tm_ = +restrain.tm_ + +restrain.duration
            }else if(tm>restrain.tm_&&tm <= restrain.tm_stop){
                let dur = +tm - +restrain.tm_
                let mul = parseInt(dur / restrain.duration)+1
                restrain.tm_ = +restrain.tm_ + +restrain.duration*(mul+1)
            }else{
                to_t_restrain()
                return
            }
        }else if (tm >= restrain.tm_stop){
            devRestrain.delete(devId)
        }
    }

    to_t_order()

    function to_t_order() {
        exec(`ffmpeg -y -s 1280*720 -i ${res}  ${des}`,async (error,stdout,stderr)=>{
            if (error != null){
                fs.unlinkSync(res)
                console.log(error)
                return
            }

            console.log(res+'移动到'+des+'成功')
            fs.unlinkSync(res)
            const date = new Date()
            const time = date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+' '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds()
            const results = await pool.query('select * from t_device where id=$1',[devId])
            if (results.rows == 0){
                return
            }

            if (results.rows[0].is_cancel_alert){
                fs.unlinkSync(des)
                return
            }
            validateStaying.validate(devId,parseInt(Date.now()/1000),des)

            const position = results.rows[0].position
            let latitude = results.rows[0].latitude
            let longitude = results.rows[0].longitude
            let id_station = results.rows[0].id_station
            const desc = '终端编号为'+devId+'的机器在'+position+'发现可疑目标，时间为'+time

            if (spl.length == 3){
                const name = spl[2].split(',').removeBlank()
                const lon = name[0]
                const lat = name[1]
                if (parseInt(lon) != 0 && parseInt(lat) != 0){
                    longitude = lon
                    latitude = lat
                }
            }
            const sql = pool.query(`insert into t_caution (id_device,id_station,img_url,time_,status,description,longitude,latitude,position,geom) values ('${devId}','${id_station}','${currentPath}','${time}',0,'${desc}','${longitude}','${latitude}','${position}',st_geomfromtext('POINT(${longitude} ${latitude})',4326))`);
            pool.query(sql)

            if (results.rows[0].type == 4){
                autoTakeVideo(devId);
            }
        })
    }

    function to_t_restrain() {
        exec(`ffmpeg -y -s 1280*720 -i ${res}  ${des}`,async (error,stdout,stderr)=>{
            if (error != null){
                fs.unlinkSync(res)
                return
            }
            console.log('图片抑制：'+res+'移动到'+des+'成功')
            fs.unlinkSync(res)
            const date = new Date()
            const time = date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+' '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds()
            const results = await pool.query('select * from t_device where id=$1',[devId])
            if (results.rows == 0){
                return
            }

            if (results.rows[0].is_cancel_alert){
                fs.unlinkSync(des)
                return
            }

            const position = results.rows[0].position
            var latitude = results.rows[0].latitude
            var longitude = results.rows[0].longitude
            let id_station = results.rows[0].id_station
            const desc = '终端编号为'+devId+'的机器在'+position+'发现可疑目标，时间为'+time

            if (spl.length == 3){
                const name = spl[2].split(',').removeBlank()
                const lon = name[0]
                const lat = name[1]
                if (parseInt(lon) != 0 && parseInt(lat) != 0){
                    longitude = lon
                    latitude = lat
                }
            }

            pool.query('insert into t_restrain (id_device,id_station,img_url,time_,description) ' +
                'values ($1,$2,$3,$4,$5)'
                ,[devId,id_station,currentPath,time,desc])

        })
    }

}

function autoTakeVideo(devId) {
    http.get(`http://127.0.0.1:${mConfig.http_port}/command/auto_takevideo?devId=${devId}&duration=${mConfig.auto_takevideo_duration}`);
}

async function to_t_log(devId,imgPath) {
    const results = await pool.query('select * from t_device where id=$1',[devId])
    if (results.rows == 0){
        return
    }
    pool.query('insert into t_log (id_station,param,type,time_,obj,description) values ($1,$2,$3,$4,$5,$6)'
        ,[results.rows[0].id_station,imgPath,23,parseInt(Date.now()/1000),devId,`设备${devId}发现可疑逗留`])
}

})()