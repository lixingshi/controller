/**
 * Created by john on 2017/3/16.
 */
require('./src/utils/util');
const PC = require('./src/packversion').PackControl;
const DeviceOP = require('./src/device').deviceOP;
const ApiPhp = require('./src/apiphp').ApiPhp;
const mConfig = require('./config').mainConfig;

function OrderIndex(index) {
    this.index = index;
}
Object.assign(OrderIndex.prototype,{
        decrement(){
            this.index -= 1
        },

        increment(){
            this.index += 1
        },
    }
)

function startCollection() {
    try {
        const cp = require('child_process').fork('./src/collection/collection.js');
        return cp;
    }catch (err){
        return null;
    }
}

(async function () {
    try {
        let apiPhp = new ApiPhp();
        let result = await apiPhp.getOrderIndex();
        let str = JSON.parse(result);
        if (str['stat'] == 'fail'){
            console.log('获取指令序列失败');
            return;
        }
        if (str['index'] <= 100){
            global.orderIndex = new OrderIndex(101);

        }else {
            global.orderIndex = new OrderIndex(str['index']);
        }

        let localConfig = await require('./config').asyncLocalConfig;
        let res = await apiPhp.setLocalConfig(localConfig)
        if (JSON.parse(res)['stat'] != 'success') {
            console.log('更新本地配置失败');
            return
        }

        console.log("当前指令流水号:"+orderIndex.index)
        module.exports.resControl = new PC(mConfig.res_patch_path,mConfig.res_patch_file_suffix);
        module.exports.apiPhp = apiPhp
        module.exports.deviceOP = new DeviceOP();

        require('./src/server2devs').server.listen(mConfig.socket_port);
        require('./src/server2server_http').server.listen(mConfig.http_port);

        startCollection();

    }catch (err){
        console.log(err);
    }
})();
