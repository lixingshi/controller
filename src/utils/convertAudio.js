/**
 * Created by john on 2017/6/1.
 */
const fs = require('fs');
const path = require('path')
const exec = require('child_process').exec;
const mConfig = require('../../config').mainConfig

function ConvertAudio(souPath,desPath) {
    if (souPath == null || desPath == null){
        throw new Error('souPath 或 desPath不能为空');
    }
    this.souPath = souPath;
    this.desPath = desPath;
}

ConvertAudio.prototype.convert = function (callback) {
    if (!fs.existsSync(this.souPath) || !fs.existsSync(this.desPath)){
        callback('文件夹路径不存在');
        return;
    }

    fs.readdir(this.souPath,(err,files)=>{
        if (err != null){
            callback(err);
            return;
        }
        files.filter((i,j,k)=>{
            return path.extname(i) == mConfig.res_sou_patch_file_suffix;
        }).forEach((i,j,k)=>{
            let souFile = path.resolve(this.souPath,i);
            convertFile.apply(this,[souFile,j,(err,index)=>{
                if (err){
                    callback(err);
                    return
                }
                if (index == k.length - 1){
                    callback(null);
                }
            }])
        })
    })

    function convertFile (dir,index,call) {
        let name = path.resolve(this.desPath,path.basename(dir,mConfig.res_sou_patch_file_suffix)+mConfig.res_patch_file_suffix)
        exec(`sh ${mConfig.convert_audio_sh_path} ${dir}  ${name}`, (error, stdout, stderr) => {
            if (error) {
                if (call != null){
                    call(error,index);
                }
                console.log(error)
                return;
            }

            call(null,index);

        });
    }

}

ConvertAudio.prototype.clear = function () {
    exec(`rm -f -r ${this.souPath}/*`)
}

module.exports = ConvertAudio;
