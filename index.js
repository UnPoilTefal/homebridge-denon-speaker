var Service, Characteristic;
var Denon = require('./lib/denon');
var inherits = require('util').inherits;
var pollingtoevent = require('polling-to-event');

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-denon-speaker", "DenonAVRSpeaker", denonSpeakerAccessory);
};

function denonSpeakerAccessory(log, config) {
    this.log = log;
    var that = this;

    this.config = config;
    this.ip = config['ip'];
    this.name = config['name'];

    this.defaultInput = config['defaultInput'] || null;
    this.defaultVolume = config['defaultVolume'] || null;
    this.minVolume = config['minVolume'] || 0;
    this.maxVolume = config['maxVolume'] || 70;
    this.doPolling = config['doPolling'] || false;

    this.pollingInterval = config['pollingInterval'] || "60";
    this.pollingInterval = parseInt(this.pollingInterval)

    this.denon = new Denon(this.ip);

    this.setAttempt = 0;
    this.state = false;
    this.volume = config['defaultVolume'] || 0;
    if (this.interval < 10 && this.interval > 100000) {
        this.log.warn("polling interval out of range.. disabled polling");
        this.doPolling = false;
    }

    // Status Polling
    if (this.doPolling) {
        this.log.debug("start polling..");
        var statusemitter = pollingtoevent(function (done) {
            that.log.debug("do poll..")
            that.getSpeakerOnCharacteristic(function (error, response) {
                done(error, response, this.setAttempt);
            }, "statuspoll");
        }, { longpolling: true, interval: that.pollingInterval * 1000, longpollEventName: "statuspoll" });

        statusemitter.on("statuspoll", function (data) {
            that.state = data;
            that.log.debug("poll end, state: " + data);

            if (that.speakerService) {
                that.speakerService.getCharacteristic(Characteristic.On).updateValue(that.state, null, "statuspoll");
                that.speakerService.getCharacteristic(Characteristic.Brightness).updateValue(that.volume, null, "statuspoll");
            }
        });
    }
}

denonSpeakerAccessory.prototype = {
    getServices: function () {
        let informationService = new Service.AccessoryInformation();
        informationService
            .setCharacteristic(Characteristic.Manufacturer, 'Denon')
            .setCharacteristic(Characteristic.Model, this.name)
		this.log("Create service...");
        let speakerService = new Service.Speaker(this.name);

        this.log("add Characteristic Mute...");
        speakerService.getCharacteristic(Characteristic.Mute)
            .on('get', this.getSpeakerMuteCharacteristic.bind(this))
            .on('set', this.setSpeakerMuteCharacteristic.bind(this));
            
        this.log("add Characteristic Volume...");
        speakerService.getCharacteristic(Characteristic.Volume)
            .on('get', this.getSpeakerVolumeCharacteristic.bind(this))
            .on('set', this.setSpeakerVolumeCharacteristic.bind(this));

        this.log("add Characteristic On...");
        speakerService.getCharacteristic(Characteristic.On)
            .on('get', this.getSpeakerOnCharacteristic.bind(this))
            .on('set', this.setSpeakerOnCharacteristic.bind(this));
		
        this.informationService = informationService;
        this.speakerService = speakerService;
        return [informationService, speakerService];
    },

    getSpeakerOnCharacteristic: function (callback, context) {

        if ((!context || context != "statuspoll") && this.doPolling) {
            callback(null, this.state);
        } else {
            this.denon.getPowerState(function (err, state) {
                if (err) {
                    this.log(err);
                    callback(null, false);
                } else {
                    this.log.debug('current power state is: %s', (state) ? 'ON' : 'OFF');
                    callback(null, state);
                }
            }.bind(this));
        }
    },

    setSpeakerOnCharacteristic: function (powerState, callback, context) {
        var that = this;

        //if context is statuspoll, then we need to ensure that we do not set the actual value
        if (context && context == "statuspoll") {
            callback(null, powerState);
            return;
        }
        
        this.setAttempt = this.setAttempt+1;
        
        this.denon.setPowerState(powerState, function (err, state) {
            if (err) {
                this.log(err);
            } else {
                if(powerState && this.defaultInput) {
                    this.denon.setInput(this.defaultInput, function (error) {
                        if (error) {
                            this.log.error('Error setting default input. Please check your config');
                        }
                    }.bind(this));
                }
                this.log.info('denon avr powered %s', state);
            }
        }.bind(this));
/*    
        if (powerState && this.defaultVolume) {
            setTimeout(function () {
                this.denon.setVolume(this.defaultVolume, function (err) {
                    if (err) {
                        this.log('Error setting default volume');
                    }
                    this.speakerService.getCharacteristic(Characteristic.Brightness)
                      .updateValue(Math.round(this.defaultVolume / this.maxVolume * 100));
                }.bind(this));
            }.bind(this), 4000);
        }
        */
        callback(null);
    },

    getSpeakerMuteCharacteristic: function (callback, context) {
        callback(null);
    },

    setSpeakerMuteCharacteristic: function (state, callback) {
        callback(null);
    },

    getSpeakerVolumeCharacteristic: function (callback, context) {
    	if ((!context || context != "statuspoll") && this.doPolling) {
            callback(null, this.volume);
        } else {
	    	this.denon.getVolume(function (err, volume) {
		        if (err) {
		            this.log.error('get Volume error: ' + err)
		            callback(err);
		        } else {
		            this.log.debug('current volume is: ' + volume);
		            var pVol = Math.round(volume / this.maxVolume * 100);
		            callback(null, pVol);
		        }
	    	}.bind(this))
        }
    },

    setSpeakerVolumeCharacteristic: function (pVol, callback, context) {

        //if context is statuspoll, then we need to ensure that we do not set the actual value
        if (context && context == "statuspoll") {
            callback(null, pVol);
            return;
        }

	    var volume = Math.round(pVol / 100 * this.maxVolume);
	    this.denon.setVolume(volume, function (err) {
	        if (err) {
	            this.log.debug('set Volume error: ' + err);
	        } else {
	            this.log.debug('set Volume to: ' + volume);
	            callback(null);
	        }
	    }.bind(this))
    },
};