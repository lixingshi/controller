/**
 * Created by john on 2017/4/10.
 */

/**
 * postgresql数据库配置
 * @type {{user: string, database: string, password: string, host: string, port: number, max: number, idleTimeoutMillis: number}}
 */
const pgConfig = {
    user: 'postgres',
    database: 'db_petrochina',
    password: 'efield-tech',
    host: '127.0.0.1',
    port: 5432,
    max: 20,
    idleTimeoutMillis: 30000,
}

/**
 * 异常状态码
 * @type {{1001: string, 1002: string, 1003: string, 1004: string, 1005: string, 1006: string, 1007: string}}
 */
const statusCode = {
    1001:'设备未连接',
    1002:'设备正在执行任务，请稍后再试',
    1003:'请求路径不存在',
    1004:'指令传输异常',
    1005:'指令发送成功',
    1006:'连接超时',
    1007:'设备当前状态不可用',
}

/**
 * 报警搜集进程配置
 * @type {{ftp_base_path: string, file_base_path: string, picture_suffix: string, video_suffix: string, mark_file: string, http_port: number}}
 */
const collectionConfig = {
    ftp_base_path:'/data/ftp/',
    file_base_path:'/data/resource/',
    picture_suffix:['.yuv','.jpg'],
    transform_picture_suffix:'jpg',
    video_suffix:'.mp4',
    mark_file:'log.txt',
    yuv_px_size:1280*720,
    http_port:8892,
}

/**
 * 主配置
 * @type {{socket_port: number, http_port: number, patch_path: string, patch_file_suffix: string}}
 */
const mainConfig = {
    socket_port:8889,
    http_port:8890,
    local_config_path:'/home/petrochina/portal/config/config.xml',
    sys_patch_path:'/data/ftp/upgrade/sys',
    sys_patch_file_suffix:'.zip',
    patch_file_prefix:['pack','audio'],
    res_patch_path:'/data/ftp/upgrade/audio',
    res_sou_patch_path:'/data/upgrade/audio',
    sys_sou_patch_path:'/data/upgrade/sys',
    res_patch_file_suffix:'.g711',
    res_sou_patch_file_suffix:'.mp3',
    convert_audio_sh_path:'/home/petrochina/manageragent/converter/converter.sh',
    proxy_server_port:8999,
    rtsp_server_port:8998,
    php_server_port:8891,
    auto_takevideo_duration:20,
}

/**
 * http 配置
 * @type {{baseUrl_php: string, easydarwin_rtsplist_api: string, easydarwin_restart: string}}
 */
const httpConfig = {
    host:'139.196.175.181',
    port:8891,
    path:'/service/web/',
    baseUrl_php:'http://127.0.0.1:8891/service/web/',
    easydarwin_rtsplist_api:'http://127.0.0.1:10008/api/v1/getrtsplivesessions',//'http://192.168.1.119:8087/api/getrtsppushsessions',
    easydarwin_restart:'http://127.0.0.1:10008/api/v1/restart',
}


const asyncLocalConfig = new Promise((resolve,reject)=>{
    const xml2js = require('xml2js')
    const fs = require('fs')

    var parser = new xml2js.Parser({ explicitArray : false, ignoreAttrs : true ,explicitRoot:false});
    fs.readFile(mainConfig.local_config_path, function(err, data) {
        parser.parseString(data,function (err, result) {
            if (err != null){
                reject(err)
            }else{
                resolve(result)
            }
        });
    });
})

module.exports.pgConfig = pgConfig
module.exports.collectionConfig = collectionConfig
module.exports.statusCode = statusCode
module.exports.mainConfig = mainConfig
module.exports.httpConfig = httpConfig
module.exports.asyncLocalConfig = asyncLocalConfig
