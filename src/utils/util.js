/**
 * Created by john on 2017/5/22.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

module.exports.mkdirsSync = function (destPath,chmod) {
    let mod = 0o775
    if (chmod != null){
        mod = chmod
    }

    if (!fs.existsSync(destPath)){
        mkdirs(destPath)
    }

    function mkdirs(dirPath) {
        let mPath = path.dirname(dirPath)
        if (!fs.existsSync(mPath)){
            mkdirs(mPath);
        }

        fs.mkdirSync(dirPath)
        fs.chmodSync(dirPath,mod)
    }
}

module.exports.chownSync = function (path) {
    fs.chownSync(path,1000,50);
}

module.exports.md5 = function () {
    return crypto.createHash('md5').update(text).digest('hex');
}

module.exports.formatDate = function () {
    const date = new Date()
    const time = date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+' '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds()
    return time
}

module.exports.YMDDate2Number = function () {
    const date = new Date()
    const time = date.getFullYear()+''+(parseInt((date.getMonth()+1)/10) == 0
                                                                ?'0'+(date.getMonth()+1)
                                                                :(date.getMonth()+1))
                                    +''+(parseInt(date.getDate()/10) == 0
                                                                ?'0'+date.getDate()
                                                                :date.getDate());
    return time
}

Array.prototype.removeBlank = function () {
    return this.filter((item,index,array)=>{
        return item != '' && item != null
    })
}

Array.prototype.removeItem = function (item) {
    this.forEach((i,j,k)=>{
        if (i == item){
            this.splice(j,1)
        }
    })

    return this
}

Array.prototype.hasItem = function (item) {
    let stat = false
    this.forEach((i,j,k)=>{
        if (i == item){
            stat = true
            return
        }
    })

    return stat
}

Array.prototype.clone=function(){ return [].concat(this); }