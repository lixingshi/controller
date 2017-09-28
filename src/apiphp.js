/**
 * Created by john on 2017/3/28.
 */
const http = require('http')
const httpConfig = require('./../config').httpConfig
const querystring = require('querystring');

module.exports.ApiPhp = ApiPhp

function ApiPhp() {

}

ApiPhp.prototype.setLocalConfig = function (json) {
    return this.promise_post(JSON.stringify(json),httpConfig.baseUrl_php+'station_info.php?op=bureau')
}

ApiPhp.prototype.getOrderIndex = function () {
    return this.promise_get(httpConfig.baseUrl_php+'orderindex.php')
}

/**
 *
 * @param {string} devId
 * @param {string} longitude
 * @param {string} latitude
 * @param {int} remain_battery
 * @param {int} status
 * @param {string} tm_startup
 */
ApiPhp.prototype.device_stat = function (devId,ip,longitude,latitude,remain_battery,status,tm_startup,sysVer,resVer,hd_info) {
    if (devId == null){
        throw new Error('devid不能为空',-1)
    }
    var param = 'devId='+devId

    if (ip != null){
        param += '&ip='+ip
    }
    if (longitude != null){
        param += '&longitude='+longitude
    }
    if (latitude != null){
        param += '&latitude='+latitude
    }
    if (remain_battery != null){
        param += '&remain_battery='+remain_battery
    }
    if (status != null){
        param += '&status='+status
    }
    if (tm_startup != null){
        param += '&tm_startup='+tm_startup
    }
    if (sysVer != null){
        param += '&sys_version='+sysVer
    }
    if (resVer != null){
        param += '&res_version='+resVer
    }
    if (hd_info != null){
        param += '&hd_info='+hd_info
    }
    console.log('stat  '+param)
    return this.promise_get(httpConfig.baseUrl_php+'device_stat.php?'+param)
}

ApiPhp.prototype.device_stat_t1 = function (devId,status,tm_startup) {
    if (devId == null){
        throw new Error('devid不能为空',-1)
    }
    var param = 'devId='+devId

    if (status != null){
        param += '&status='+status
    }
    if (tm_startup != null){
        param += '&tm_startup='+tm_startup
    }
    console.log('stat  '+param)
    return this.promise_get(httpConfig.baseUrl_php+'device_stat_t1.php?'+param)
}

ApiPhp.prototype.ordertask_done = function (taskId,stat,tm_finish) {
    return this.promise_get(httpConfig.baseUrl_php+'ordertask_done.php?taskId='+taskId+'&stat='+stat+'&tm_finish='+tm_finish)
}

/**
 *
 * @param {[]} devIds
 */
ApiPhp.prototype.device_disconnect = function (devIds) {
    var param = ''
    devIds.forEach((item,index,array)=>{
        if (index == devIds.length-1){
            param += item
        }else{
            param += item+','
        }
    })

    return this.promise_get(httpConfig.baseUrl_php+'device_disconnect.php?devIds='+param)
}

ApiPhp.prototype.device_list = function () {
    return this.promise_get(httpConfig.baseUrl_php+'device_list.php')
}

ApiPhp.prototype.device_config = function (devId,config) {
    return this.promise_get(httpConfig.baseUrl_php+'device_config.php?devId='+devId+'&config='+config+'&op=update')
}

ApiPhp.prototype.device_hd_info = function (devId,info) {
    return this.promise_get(httpConfig.baseUrl_php)
}

ApiPhp.prototype.promise_get = function (url) {
    return new Promise((resolve,reject)=>{
        http.get(url,(res)=>{
            var rowData = ''
            res.on('data',(chunk)=>{
                rowData += chunk
            })

            res.on('end',()=>{
                resolve(rowData)
            })

            res.on('error',(err)=>{
                reject(err)
            })
        })
    })
}

ApiPhp.prototype.promise_post = function (json,url) {
    return new Promise((resolve,reject)=>{
        let option = {
            host:httpConfig.host,
            port:httpConfig.port,
            method:'POST',
            path:httpConfig.path+'station_info.php?op=bureau',
            headers:{
                'Content-Type': 'application/json',
            },
            method:'POST'
        }
        let req = http.request(option,(res)=>{
            var rowData = ''
            res.on('data',(chunk)=>{
                rowData += chunk
            })

            res.on('end',()=>{
                resolve(rowData)
            })

            res.on('error',(err)=>{
                reject(err)
            })
        })

        req.write(json);
        req.end();
    })
    
}



