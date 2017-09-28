/**定时拍照
 * Created by john on 2017/5/22.
 */

(function () {
    const timer = require('timers');
    const http = require('http');
    const mConfig = require('../config').mainConfig
    const lengthOfArray = 10;

    function TakePhotoTimer() {
        this.orderArray = [];
        this.deleteIndex = [];
        this.devIdIndex = new Map();
        this.currentIndex = 0;
        initArray.call(this);

        function initArray() {
            let num = 0;
            while(num <= (lengthOfArray-1)){
                let list = new Array();
                this.orderArray.push(list);
                this.deleteIndex.push(0)
                ++num;
            }
        }
    }
    
    TakePhotoTimer.prototype.addDevId = function (devId) {
        if (this.devIdIndex.has(devId)){
            return;
        }

        let mCurrentIndex = 0;
        let flag = false;
        for (let i=0;i<this.deleteIndex.length;i++){
            if (this.deleteIndex[i]>0){
                mCurrentIndex = i;
                flag = true;
                this.deleteIndex[i] -= 1;
                break;
            }
        }

        if (!flag){
            mCurrentIndex = this.currentIndex;
        }

        let index = new DevIdIndex();
        this.orderArray[mCurrentIndex].push(devId);
        let col = this.orderArray[mCurrentIndex].length - 1;
        index.row_ = mCurrentIndex;
        index.col_ = col;
        index.devId = devId;
        this.devIdIndex.set(devId,index);

        if (flag){
            return;
        }

        if (this.currentIndex == lengthOfArray -1){
            this.currentIndex = 0;
        }else{
            this.currentIndex += 1;
        }
    }
    
    TakePhotoTimer.prototype.removeDevId = function (devId) {
        if (this.devIdIndex.has(devId)){
            let index = this.devIdIndex.get(devId);
            this.orderArray[index.row_].splice(index.col_,1);
            this.devIdIndex.delete(devId);
            this.deleteIndex[index.row_] += 1;

            this.orderArray[index.row_].forEach((i,j,k)=>{
                let mIndex = new DevIdIndex();
                mIndex.row_ = index.row_;
                mIndex.col_ = j;
                this.devIdIndex.set(i,mIndex)
            })
        }
    }

    TakePhotoTimer.prototype.start = function () {
        this.orderArray.forEach((i,j,k)=>{
            timer.setInterval(this.taskSchedule(i),60*1000*30+j*8000);
        })
    }

    TakePhotoTimer.prototype.taskSchedule = function (devIds) {
        return function () {
            devIds.forEach((i,j,k)=>{
                http.get(`http://127.0.0.1:${mConfig.http_port}/command/t_takephoto?devId=${i}&photos=1&interval=0`);
            })
        }
    }

    function DevIdIndex() {
        this.row_ = 0;
        this.col_ = 0;
    }

    module.exports = TakePhotoTimer;
})()



