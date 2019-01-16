# Homebridge-Denon-Speaker
[![NPM Version](https://img.shields.io/npm/v/homebridge-denon-speaker.svg)](https://www.npmjs.com/package/homebridge-denon-speaker)
[![Package Quality](http://npm.packagequality.com/shield/homebridge-denon-speaker.svg)](http://packagequality.com/#?package=homebridge-denon-speaker)

homebridge-plugin for Denon AVR control with Apple-Homekit. Works with most Denon AVR since 2011.
It's a fork of [homebridge-denon](https://www.npmjs.com/package/homebridge-denon) by stfnhmplr

> Apples Home App currently doesn't support the Speaker Service. To use this service you can use a non official app like Elgato Eve.

# Installation
Follow the instruction in [NPM](https://www.npmjs.com/package/homebridge) for the homebridge server installation. The plugin is published through [NPM](https://www.npmjs.com/package/homebridge-denon-speaker) and should be installed "globally" by typing:

    sudo npm install -g homebridge-denon-speaker

# Configuration

config.json

Example:

    {
      "bridge": {
          "name": "Homebridge",
          "username": "CC:22:3D:E3:CE:51",
          "port": 51826,
          "pin": "031-45-154"
      },
      "description": "This is an example configuration file for homebridge denon plugin",
      "hint": "Always paste into jsonlint.com validation page before starting your homebridge, saves a lot of frustration",
      "accessories": [
          {
              "accessory": "DenonAVRSpeaker",
              "name": "Denon LivingRoom",
              "ip": "192.168.1.99",
              "defaultInput": "IRADIO",
              "defaultVolume": 35,
              "minVolume": 10,
              "maxVolume": 75,
              "doPolling": true,
              "pollingInterval": 60
          }
      ]
  }

## possible default inputs
Setting the default input and the default volume is optional. The available inputs depends on your avr model. Please check the official manuals from Denon. https://usa.denon.com/us/downloads/manuals-and-downloads

- 'CD'
- 'SPOTIFY'
- 'CBL/SAT'
- 'SAT/CBL'
- 'DVD'
- 'BD' (Bluray)
- 'GAME'
- 'GAME2'
- 'AUX1'
- 'MPLAY' (Media Player)
- 'USB/IPOD'
- 'TUNER'
- 'NETWORK'
- 'TV'
- 'IRADIO' (Internet Radio)
- 'DOCK'
- 'IPOD'
- 'NET/USB'
- 'RHAPSODY'
- 'PANDORA'
- 'LASTFM'
- 'IRP'
- 'FAVORITES'
- 'SERVER'
- 'FLICKR'
- 'NAPSTER'
- 'HDRADIO'



### notes
If you are interested in setting the volume of your receiver with Siri than [this](https://github.com/robertvorthman/homebridge-marantz-volume) plugin might be a good addition. Only remember to not tell Siri "Set the light in the Living room to 100 %" ;)
homebridge-marantz-volume was written by Robert Vorthman (thanks!)
