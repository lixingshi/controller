/**
 * Created by john on 2017/3/27.
 */
const fs = require('fs')
const path = require('path')
const util = require('./utils/util')
const mConfig = require('../config').mainConfig;

module.exports.PackControl = PackControl

function PackControl(dir,suffix,callback) {
    this.files = [];
    this.dir = dir;
    this.suffix = suffix;
    this.callback = callback;

    if (dir != null && suffix != null){
        util.mkdirsSync(dir)
        if (callback != null){
            this.parseContent(dir,suffix,callback)
        }else{
            this.parseContent(dir,suffix)
        }
    }
}

/**
 * 将指定目录下的补丁文件 排序整理  (文件格式  例如：pack_1.1.zip)
 * @param dir
 * @param suffix
 * @param callback
 */
PackControl.prototype.parseContent = function (dir,suffix,callback) {
    this.dir = dir
    this.suffix = suffix
    this.callback = callback

    fs.readdir(dir,(err,files)=>{
        if ( err != null){
            return
        }

        const items = files.filter((item,index,array)=>{
            const parse = path.parse(item)
            const prefix = parse['name'].split('_')[0]
            if (mConfig.patch_file_prefix.hasItem(prefix) && parse['ext'].split('.').removeBlank()[0] == suffix.split('.').removeBlank()[0]){
                return true
            }else{
                return false
            }
        }).sort((a,b)=>{
            const parse1 = path.parse(a)
            const parse2 = path.parse(b)
            const bundleIndex1 = parse1['name'].split('_').removeBlank()[1]
            const bundleIndex2 = parse2['name'].split('_').removeBlank()[1]
            return bundleIndex1 - bundleIndex2
        })

        this.files = items

        if (callback != null){
            callback(items)
        }

    })
}

/**
 * 需要升级的系统版本
 * @param version
 * @returns {*}
 */
PackControl.prototype.necessaryPackForSys = function (version) {

    if (this.files == null || this.files.length == 0){
        return []
    }

    const lastVer = path.parse(this.files[this.files.length-1])['name'].split('_').removeBlank()[1]
    const lastVerInt =  lastVer % 1
    if (lastVerInt == 0){
        if (lastVer == version){
            return []
        }

        return [this.files[this.files.length-1]]
    }

    const lastCompleteVer = parseInt(lastVer)

    if (lastCompleteVer > version){
        return this.files.filter((item,index,array)=>{
            const parse = path.parse(item)
            const bundleVer = parse['name'].split('_').removeBlank()[1]
            if (bundleVer >= lastCompleteVer){
                return true
            }else{
                return false
            }
        })
    }else{
        return this.files.filter((item,index,array)=>{
            const parse = path.parse(item)
            const bundleVer = parse['name'].split('_').removeBlank()[1]
            if (bundleVer <= version){
                return false
            }else{
                return true
            }
        })
    }

}

PackControl.prototype.necessaryPackForRes = function (version) {
    if (this.files == null || this.files.length == 0){
        return []
    }

    const lastVer = path.parse(this.files[this.files.length-1])['name'].split('_').removeBlank()[1]

    if (version >= lastVer){
        return [];
    }

    return this.files.filter((i,j,k)=>{
        const bundleVer = path.parse(i)['name'].split('_').removeBlank()[1]
        return bundleVer > version;
    })

}

/**
 * 格式化输出需要升级的版本
 * @param version
 * @returns {string}
 */
PackControl.prototype.formatNecessaryPackForSys = function (version) {
    const items = this.necessaryPackForSys(version)
    var str = ''
    items.forEach((item,index,array)=>{
        const p = path.join(this.dir,item)
        const size = fs.lstatSync(p)['size']
        if (index == items.length-1){
            str += item+','+size+'KB'
        }else{
            str += item+','+size+'KB'+';'
        }

    })
    console.log(str)
    return str
}

PackControl.prototype.formatNecessaryPack2ForRes = function (version) {
    const items = this.necessaryPackForRes(version)
    console.log(items)
    var str = ''
    items.forEach((i,j,k)=>{
        const p = path.join(path.basename(this.dir),i);
        const parse = path.parse(p)
        const bundleIndex = parse['name'].split('_').removeBlank()[1]
        if (j == items.length-1){
            str += bundleIndex+','+p
        }else{
            str += bundleIndex+','+p+';'
        }
    })
    console.log(str)
    return str
}

