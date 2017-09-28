/**
 * Created by john on 2017/4/11.
 */

module.exports.deviceOP = DeviceOP

function Device() {
    this.devId = null
    this.longitude = null
    this.latitude = null
    this.type = null
    this.id_station = null
}

function DeviceOP() {
    this.device = new Map()
}

DeviceOP.prototype.parseJSON2Map = function (json) {
    if (json == null || json == ''){
        return
    }

    json.forEach((i,j,k)=>{
        let dev = new Device()
        dev.devId = i['id']
        dev.id_station = i['id_station']
        dev.latitude = i['latitude']
        dev.longitude = i['longitude']
        dev.type = i['type']

        this.device.set(i['id'],dev)
    })
}

/**
 *
 * @param devId
 * @returns {Device}
 */
DeviceOP.prototype.get = function (devId) {
    return this.device.get(devId)
}

DeviceOP.prototype.delete = function (devId) {
    this.device.delete(devId)
}