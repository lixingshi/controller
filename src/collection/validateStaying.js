/**
 * Created by john on 2017/5/11.
 */

(function () {
    var events,util;

    events = require('events');

    util = require('util');

    function ValidateStaying(options) {
        defaultValue.call(this);
        if (options != null){
            this.photoInterval = options.photoInterval;
            this.photoInterval2StayingDurationRate = options.photoInterval2StayingDurationRate;
            this.photosDefineStayingRate = options.photosDefineStayingRate;
        }
        this.stayingDuration = this.photoInterval * this.photoInterval2StayingDurationRate;
        this.photosDefineStaying = this.photoInterval2StayingDurationRate * this.photosDefineStayingRate;
        this.validateContainer = new Map();

        function defaultValue() {
            this.photoInterval = 30;
            this.photoInterval2StayingDurationRate = 10;
            this.photosDefineStayingRate = 0.9;
        }
    }

    util.inherits(ValidateStaying,events.EventEmitter);

    ValidateStaying.prototype.validate = function (devId,tm,imgPath) {
        if (!this.validateContainer.has(devId)){
            let infoWrapper = new InfoWrapper();
            infoWrapper.curruntPhotoPath = imgPath;
            infoWrapper.curruntPhotos = infoWrapper.curruntPhotos + 1;
            infoWrapper.firstTimeStamp = tm;
            infoWrapper.finishTimeStamp = parseInt(tm) + parseInt(this.stayingDuration);
            this.validateContainer.set(devId,infoWrapper);
            return;
        }
        let infoWrapper = this.validateContainer.get(devId)
        console.log(tm+' '+infoWrapper.finishTimeStamp)
        if (infoWrapper.firstTimeStamp < tm && tm <= infoWrapper.finishTimeStamp){
            infoWrapper.curruntPhotoPath = imgPath;
            infoWrapper.curruntPhotos = infoWrapper.curruntPhotos + 1;
        }else{
            if (infoWrapper.curruntPhotos >= this.photosDefineStaying){
                this.emit('alert',devId,imgPath);
                this.validateContainer.delete(devId);
            }else{
                infoWrapper.finishTimeStamp = tm;
                infoWrapper.finishTimeStamp = parseInt(tm) + parseInt(this.stayingDuration);
                infoWrapper.curruntPhotos = 1;
                infoWrapper.curruntPhotoPath = imgPath;
            }
        }
    }

    function InfoWrapper() {
        this.firstTimeStamp = 0;
        this.finishTimeStamp = 0;
        this.curruntPhotos = 0;
        this.curruntPhotoPath = '';
    }

    module.exports = ValidateStaying;
})()