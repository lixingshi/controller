(function() {
    var Mpeg1Muxer, STREAM_MAGIC_BYTES, VideoStream, events, util, ws, http, exec;
    exec = require('child_process').exec;

    ws = require('ws');

    util = require('util');

    events = require('events');

    Mpeg1Muxer = require('./mpeg1muxer');

    http = require('http');

    STREAM_MAGIC_BYTES = "jsmp";

    VideoStream = function(options) {
        this.width = options.width;
        this.height = options.height;
        this.wsPort = options.wsPort;
        this.inputStreamStarted = false;
        this.stream = void 0;
        this.connNumMap = new Map();
        this.pipeStreamToSocketServer();
        return this;
    };

    util.inherits(VideoStream, events.EventEmitter);

    VideoStream.prototype.startMpeg1Stream = function(streamUrl,name) {
        var gettingInputData, gettingOutputData, inputData, outputData, self,mpeg1Muxer;
        mpeg1Muxer = new Mpeg1Muxer({
            url:streamUrl,
            name:name,
        });
        self = this;
        if (this.inputStreamStarted) {
            return;
        }
        mpeg1Muxer.on('mpeg1data', function(data,name) {
            return self.emit('camdata', data,name);
        });
        gettingInputData = false;
        inputData = [];
        gettingOutputData = false;
        outputData = [];
        mpeg1Muxer.on('ffmpegError', function(data) {
            var size;
            data = data.toString();
            if (data.indexOf('Input #') !== -1) {
                gettingInputData = true;
            }
            if (data.indexOf('Output #') !== -1) {
                gettingInputData = false;
                gettingOutputData = true;
            }
            if (data.indexOf('frame') === 0) {
                gettingOutputData = false;
            }
            if (gettingInputData) {
                inputData.push(data.toString());
                size = data.match(/\d+x\d+/);
                if (size != null) {
                    size = size[0].split('x');
                    if (self.width == null) {
                        self.width = parseInt(size[0], 10);
                    }
                    if (self.height == null) {
                        return self.height = parseInt(size[1], 10);
                    }
                }
            }
        });


        mpeg1Muxer.on('ffmpegError', function(data) {
            return global.process.stderr.write(data);
        });
        return mpeg1Muxer;
    };

    VideoStream.prototype.addConnNum = function (name) {
        if (!this.connNumMap.has(name)){
            this.connNumMap.set(name,1)
            return
        }
        var num = this.connNumMap.get(name)
        this.connNumMap.set(name,++num)
        console.log(`current ${name} client num : ${num}`)
    }

    VideoStream.prototype.delConnNum = function (name) {
        if (!this.connNumMap.has(name)){
            return;
        }
        var num = this.connNumMap.get(name)
        num -= 1
        this.connNumMap.set(name,num)
        console.log(`current ${name} client num : ${num}`)
        if (num == 0){
            setTimeout(()=>{
                if (this.connNumMap.has(name)){
                    var n = this.connNumMap.get(name)
                    if (n == 0){
                        console.log('entet')
                        const mConfig = require('./../../config').mainConfig
                        http.get(`http://127.0.0.1:${mConfig.http_port}/command/stopvideo?devId=${name}`);
                        this.connNumMap.delete(name);
                    }
                }
            },8*1000)
        }
    }

    // VideoStream.prototype.clear = function (name) {
    //     var self = this;
    //     setTimeout(function () {
    //         if (self.wsServer.clients.size != 0){
    //             return
    //         }
    //         self.connNumMap.forEach(function (i,j,k) {
    //             const mConfig = require('./../../config').mainConfig
    //             http.get(`http://127.0.0.1:${mConfig.http_port}/command/stopvideo?devId=${j}`);
    //             self.connNumMap.delete(j);
    //         })
    //     },8*1000)
    //
    // }

    VideoStream.prototype.pipeStreamToSocketServer = function() {
        var self;
        self = this;
        this.wsServer = new ws.Server({
            port: this.wsPort
        });
        this.wsServer.on("connection", function(socket) {
            socket.on("message",function(msg){
                socket.name = msg;
                socket.start = false;
                console.log(socket.name);
                self.addConnNum(socket.name)
            });
            socket.on("close", function(code, message) {
                self.delConnNum(socket.name)
            });

            socket.on('error',function (err) {
                console.log('socket error')
            })
        });

        this.wsServer.broadcast = function(data, name) {
            var  _results;
            _results = [];

            // if (this.clients.size == 0 && self.connNumMap.size != 0){
            //
            //     exec('ps -ef | grep ffmpeg',(error,stdout,stderr)=>{
            //         let reg = new RegExp(name+'.sdp')
            //         let x = reg.exec(stdout)
            //
            //         if (x == null){
            //             self.clear();
            //         }
            //     })
            //
            // }

            this.clients.forEach(function (i) {
                if (i.readyState == 1 && i.name == name) {
                    try {
                        if (!i.start){
                            i.start = true;
                            self.onSocketConnect(i);
                        }

                        _results.push(i.send(data));
                    }catch (err){

                    }
                } else {
                    _results.push(console.log("Error: Client (" + i.name + ") not connected."));

                }
            })
            return _results;
        };
        return this.on('camdata', function(data,name) {
            return self.wsServer.broadcast(data,name);
        });
    };

    VideoStream.prototype.onSocketConnect = function(socket) {
        var self, streamHeader;
        self = this;
        streamHeader = new Buffer(8);
        streamHeader.write(STREAM_MAGIC_BYTES);
        streamHeader.writeUInt16BE(this.width, 4);
        streamHeader.writeUInt16BE(this.height, 6);
        socket.send(streamHeader, {
            binary: true
        });
    };

    module.exports = VideoStream;

}).call(this);