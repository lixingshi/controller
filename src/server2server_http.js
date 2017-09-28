/**
 * Created by john on 2017/3/23.
 */
const http = require('http')
const url = require('url')
const queryString = require('querystring')
const devsMap = require('./server2devs').deviceMap

module.exports.server = http.createServer((req,res)=>{
    setTimeout(()=>{
        if (!res.finished){
            res.writeHead(404, {'Content-Type': 'text/plain;charset=utf-8'});
            res.write('{"id":"","msg":"连接超时","stat":"fail"}')
            res.end()
        }
    },10*1000)
    const pathName = url.parse(req.url).pathname
    const query = url.parse(req.url,true).query
    sendCommand(query,pathName,res)

})

async function sendCommand(query,pathName,res) {
    const devId = query['devId']
    let suss = false

    if (!devsMap.hasDevId(devId)){
        res.writeHead(404, {'Content-Type': 'text/plain;charset=utf-8'});
        res.write('{"id":"","msg":"设备未连接","stat":"fail"}')
        res.end()
        return
    }

    const devInfo = devsMap.getForDevId(devId)

    if (devInfo.disabled){
        res.writeHead(404, {'Content-Type': 'text/plain;charset=utf-8'});
        res.write('{"id":"","msg":"设备当前状态不可用","stat":"fail"}')
        res.end()
        return
    }

    if (pathName === '/command/stopvideo'){
        suss = devInfo.cmd_stopvideo()
        if (suss){
            res.writeHead(200, {'Content-Type': 'text/plain;charset=utf-8'});
            res.write('{"id":"'+(-101)+'","msg":"指令发送成功","stat":"success"}')
            res.end()
        }else{
            res.writeHead(404, {'Content-Type': 'text/plain;charset=utf-8'});
            res.write('{"id":"","msg":"指令传输异常","stat":"fail"}')
            res.end()
        }
        return
    }else if (pathName === '/command/sys-reboot'){
        devInfo.executing = false;
    }

    if (devInfo.executing){
        res.writeHead(404, {'Content-Type': 'text/plain;charset=utf-8'});
        res.write('{"id":"","msg":"设备正在执行任务，请稍后再试","stat":"fail"}')
        res.end()
        return
    }

    devInfo.executing = true
    orderIndex.increment()
    devInfo.taskId = orderIndex.index

    switch (pathName){
        case '/command/sys_reset':
            suss =  devInfo.cmd_sys_reset()
            break;
        case '/command/sys_config':

            suss =  devInfo.cmd_sys_config(queryString.stringify(JSON.parse(query['param'])))
            break;
        case '/command/sys-reboot':
            suss =  devInfo.cmd_sys_reboot()
            break;
        case '/command/broadcast':
            suss = devInfo.cmd_broadcast(query['audio'],query['replay'],query['interval'])
            break;
        case '/command/takephoto':
            suss = devInfo.cmd_takephoto(query['photos'],query['interval'])
            break;
        case '/command/t_takephoto':
            orderIndex.decrement()
            devInfo.taskId = 11
            suss = devInfo.cmd_takephoto(query['photos'],query['interval'])
            break;
        case '/command/auto_takevideo':
            orderIndex.decrement()
            devInfo.taskId = 12
            suss = devInfo.cmd_takevideo(query['duration'])
            break;
        case '/command/takevideo':
            suss = devInfo.cmd_takevideo(query['duration'])
            break;
        case '/command/showvideo':
            suss = devInfo.cmd_showvideo()
            break;
        case '/command/sys-upgrade':
            suss = await devInfo.cmd_upgrade(query['name'],query['id'],query['version'],query['type'])
            break;
        default:
            devInfo.executing = false
            res.writeHead(404, {'Content-Type': 'text/plain;charset=utf-8'});
            res.write('{"id":"","msg":"请求路径不存在","stat":"fail"}')
            res.end()
            return
    }

    if (res.finished){
        orderIndex.decrement()
        return
    }

    if (suss){
        response(1)
    }else{
        response(0)
    }

    /**
     * 0失败 1成功
     * @param stat
     */
    function response(stat) {
        if (stat == 0){
            orderIndex.decrement()
            devInfo.executing = false
            devInfo.taskType = 0
            res.writeHead(200, {'Content-Type': 'text/plain;charset=utf-8'});
            res.write('{"id":"","msg":"指令传输异常","stat":"fail"}')
            res.end()
        }else {
            res.writeHead(200, {'Content-Type': 'text/plain;charset=utf-8'});
            res.write('{"id":"'+devInfo.taskId+'","msg":"指令发送成功","stat":"success"}')
            res.end()
        }

    }
}
