/**
 * Created by john on 2017/4/10.
 */
const http = require('http')
const url = require('url')
const timer = require('timers')
const httpConfig = require('./../../config').httpConfig
const mConfig = require('./../../config').mainConfig

timer.setInterval(checkOnlineLive,120*1000)

const livesTemp = []

function checkOnlineLive() {
    http.get(httpConfig.easydarwin_rtsplist_api,(res)=>{
        var rowData = ''
        res.on('data',(chunk)=>{
            rowData += chunk
        })

        res.on('end',()=>{
            const result = JSON.parse(rowData)
            const totalLive =  result['EasyDarwin']['Body']['SessionCount']

            if (totalLive == 0){
                return
            }

            const sessions = result['EasyDarwin']['Body']['Sessions']

            sessions.forEach((i,j,k)=>{
                if (i['NumOutputs'] == 0){
                    if (livesTemp.hasItem(i['name'])){
                        livesTemp.removeItem(i['name'])
                        closeLive(i['name'])
                    }else{
                        livesTemp.push(i['name'])
                    }

                }
            })

        })

        res.on('error',(err)=>{

        })
    })
}

function closeLive(devId) {
    http.get(`http://localhost:${mConfig.http_port}/command/stopvideo?devId=${devId}`)
}

