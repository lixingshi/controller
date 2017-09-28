/**
 * 将sockec数据拼接完整后，数组返回
 * Created by john on 2017/3/16.
 */


module.exports.Message = Message
module.exports = Analyse


function Analyse() {
    this.temp = new Map()
    this.match_expre = ''
}

Analyse.prototype.check_data = function (code,data) {
    var client = this.temp.get(code)

    var match_ = data.toString().match(/(^\d*)!!/)

    if (match_ != null){
        const data_length = match_[1]
        const recieve_length = data.length

        if (data_length == recieve_length){
            client.mData.push(data.toString());
        }else if (data_length < recieve_length){
            client.mData.push(data.slice(0,data_length).toString());
            this.check_data(code,data.slice(data_length,recieve_length));
        }else if (data_length > recieve_length){
            client.temp_pre_incomplete = new Message(data_length,recieve_length,data)
        }
    }else{
        var mat = data.toString().match(/(\d*)!!/)

        if (mat != null){
            /*此处对中文处理会有乱码,中文转码后传输*/
            const buff = new Buffer(data.toString().substring(0,mat['index']))
            //console.log("test    " +buff.toString())
            client.pos_incomplete = new Message(0,buff.length,buff)
            this.check_data(code,new Buffer( data.toString().substring(mat['index'],data.toString().length)))
        }else{
            client.pos_incomplete = new Message(0,data.length,data.slice(0,data.length))
        }
    }

    return client.mData;
}


Analyse.prototype.fetch_data = function (code,socket,data,callback) {
    setTimeout(()=>{
        var client = this.temp.get(code)
        if (client == null){
            client = new Client()
            this.temp.set(code,client)
        }

        client.mData = []
        client.code = code

        this.check_data(code,data)
        var d = []

        var pre =  client.pre_incomplete
        var pos = client.pos_incomplete

        if (pre != null && pos != null){
            if (pre.total == pos.current + pre.current){
                const str = Buffer.concat([pre.buffer_,pos.buffer_],pre.buffer_.length+pos.buffer_.length)
                d.push(str.toString())
                client.pre_incomplete = null
            }else if (pre.total > pos.current + pre.current){
                console.log("lxs     "+pre.total+" "+pos.current+"  "+pre.current+" "+pre.buffer_+pos.buffer_.toString())
                var bu = Buffer.concat([pre.buffer_,pos.buffer_],pre.buffer_.length+pos.buffer_.length)
                const current = pos.current + pre.current
                const msg = new Message(pre.total,current,bu)
                client.pre_incomplete = msg
            }else{
                client.pos_incomplete = null
                client.pre_incomplete = null
            }

        }

        client.mData = d.concat(client.mData)

        if (client.temp_pre_incomplete != null){
            client.pre_incomplete = client.temp_pre_incomplete
            client.temp_pre_incomplete = null
        }

        callback( client)

    },10)

}

Analyse.prototype.clearData = function () {
    this.mData = [];
    this.pre_incomplete = null;
    this.pos_incomplete = null;
    this.temp.clear();
}

Analyse.prototype.deleteClientTempData = function (code) {
    this.temp.delete(code)
    console.log(code+"临时数据清除")
}

Analyse.prototype.setMatchExpre = function (match) {
    this.match_expre = match
}

function Client() {
    this.mData = []
    this.pre_incomplete = null
    this.pos_incomplete = null
    this.temp_pre_incomplete = null
    this.code = ''
}

Client.prototype.dataForClearSplit = function(match){
    return this.mData.map((item,index,array)=>{
        return item.split(match)[1]
    })

}


function Message(total,current,buffer_) {
    this.total = total;
    this.current = current;
    this.buffer_ = buffer_;
}