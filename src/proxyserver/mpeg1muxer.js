
(function() {
  var Mpeg1Muxer, child_process, events, util;

  child_process = require('child_process');

  util = require('util');

  events = require('events');

  Mpeg1Muxer = function(options) {
    var self;
    self = this;
    this.url = options.url;
    this.name = options.name;

    this.stream = child_process.spawn("ffmpeg", ["-rtsp_transport", "tcp", "-i", this.url, '-an' ,'-f', 'mpeg1video', '-b:v', '1000k', '-s', '1280*720','-r', '30', '-'], {
      detached: true
    });
    this.inputStreamStarted = true;

    this.stream.stdout.on('data', function(data) {
      return self.emit('mpeg1data', data,self.name);
    });
    this.stream.stderr.on('data', function(data) {
      return self.emit('ffmpegError', data);
    });
    return this;
  };

  util.inherits(Mpeg1Muxer, events.EventEmitter);

  module.exports = Mpeg1Muxer;

}).call(this);
