/**
 * created by stfnhmplr on 28.01.16.
 * control your Denon AVR via http with node.js
 */


import axios, { AxiosResponse } from 'axios';
import { parseString } from 'xml2js';

export class DenonLib {

    private readonly ip: string;
    private readonly url_status_lite = '/goform/formMainZone_MainZoneXmlStatusLite.xml';
    private readonly url_status = '/goform/formMainZone_MainZoneXml.xml';
    private readonly url_post = '/goform/formiPhoneAppDirect.xml'

    constructor(ip: string) {
        this.ip = ip;
    }

    /**
     * Returns the friendly avr name
     * @param callback
     */
    async getModelInfo():Promise<any> {
        
        let modelInfo = {
            name: "",
            brand: ""
        };
        await axios.get('http://' + this.ip + this.url_status)
            .then((response: AxiosResponse) => {
                let xml = '';
                parseString(xml + response.data, function (err: any, result: any) {
                    modelInfo.name = result.item.FriendlyName[0].value[0];
                    modelInfo.brand = result.item.BrandId[0].value[0];  
                });
            })
            .catch((error) => {
                return Promise.reject(error);
            });
        
        return modelInfo;
    }
    /**
     * Returns the friendly avr name
     * @param callback
     */
    async getName(): Promise<string> {

        let name: string = "";
        await axios.get('http://' + this.ip + this.url_status)
            .then((response: AxiosResponse) => {
                var xml = '';
                parseString(xml + response.data, function (err: any, result: any) {
                    name =  result.item.FriendlyName[0].value[0];
                });
        })
        .catch((error) => {
            return Promise.reject(error);
        });
        return name;
    };
    /**
     * Returns the avr brand
     * @param callback
     */
    async getBrand(): Promise<string> {

        let brand = "";
        var xml = '';
        await axios.get('http://' + this.ip + this.url_status)
            .then((response: AxiosResponse) => {
                parseString(xml + response.data, function (err: any, result: any) {
                    brand = result.item.BrandId[0].value[0];
                });
            })
            .catch((error) => {
                return Promise.reject(error);
            });

        return brand;
    };
    /**
     * Returns the current power state of the avr
     * @param callback
     */
    async getPowerState(): Promise<boolean> {

        let powerState = false;
        await axios.get('http://' + this.ip + this.url_status_lite)
            .then((response: AxiosResponse) => {
                var xml = '';
                parseString(xml + response.data, function (err: any, result: any) {
                    powerState = (result.item.Power[0].value[0] == 'ON');
                });
            })
            .catch((error) => {
                return Promise.reject(error);
            });
        return powerState;
    };

    /**
     * sets the power state of the avr
     * @param powerState - true or false
     * @param callback
     */
    async setPowerState(wantedPowerState: boolean) {
        const stringWantedPowerState = (wantedPowerState) ? 'ON' : 'OFF';
        await axios.get('http://' + this.ip + '/MainZone/index.put.asp?cmd0=PutZone_OnOff/' + stringWantedPowerState)
            .catch((error) => {
                return Promise.reject(error);
            });
        return wantedPowerState;
    };

    /**
     * Returns the current mute state of the avr
     * @returns Promise<boolean>
     */
    async getMuteState(): Promise<boolean> {

        let muteState = false;
        await axios.get('http://' + this.ip + this.url_status_lite)
            .then((response: AxiosResponse) => {
                var xml = '';
                parseString(xml + response.data, function (err: any, result: any) {
                    muteState = (result.item.Mute[0].value[0] == 'ON');
                    console.log(result)
                    console.log('DenonLib getMuteState: ' + muteState)                
                });
            })
            .catch((error) => {
                return Promise.reject(error);
            })
        return muteState;
    };
    /**
     * set the mute state of the avr
     * @param muteState
     * @param callback
     */
    async setMuteState(wantedMuteState: boolean): Promise<boolean> {
        let stringWantedMuteState = (wantedMuteState) ? 'ON' : 'OFF';
        await axios.get('http://' + this.ip + '/MainZone/index.put.asp?cmd0=PutVolumeMute/' + stringWantedMuteState)
            .catch((error) => {
                return Promise.reject(error);
            })  
        return wantedMuteState;
    };

    /**
     * Returns the current input of the avr
     * @param callback (String)
     */
/*
    async getInput() {
        request.get('http://' + this.ip + this.url_status_lite, function (error: any, response: any, body: any) {
            var xml = '';
            if (!error && response.statusCode === 200) {
                parseString(xml + body, function (err: any, result: any) {
                    callback(null, result.item.InputFuncSelect[0].value[0]);
                });
            } else {
                callback(error);
            }
        });
    };
*/
    /**
     * sets the input to xxx
     * possible values are
     * 'CD', 'SPOTIFY', 'CBL/SAT', 'DVD', 'BD', 'GAME', 'GAME2', 'AUX1',
         'MPLAY', 'USB/IPOD', 'TUNER', 'NETWORK', 'TV', 'IRADIO', 'SAT/CBL', 'DOCK',
        'IPOD', 'NET/USB', 'RHAPSODY', 'PANDORA', 'LASTFM', 'IRP', 'FAVORITES', 'SERVER'
    * @param input String
    * @param callback
    */
/*
        async setInput(input: any, callback: any) {
        request.get('http://' + this.ip + '/goform/formiPhoneAppDirect.xml?SI' + input, function (error: any, response: any, body: any) {
            if (!error && response.statusCode === 200) {
                callback(null);
            } else {
                callback(error)
            }
        })
    };
*/
    /**
     * Returns the current Surround Mode
     * @param callback
     */
/*   
    async getSurroundMode(callback: any) {
        request.get('http://' + this.ip + this.url_status, function (error: any, response: any, body: any) {
            var xml = '';
            if (!error && response.statusCode === 200) {
                parseString(xml + body, function (err: any, result: any) {
                    callback(null, result.item.selectSurround[0].value[0]);
                });
            } else {
                callback(error);
            }
        });
    };
*/
    /**
     * Set the playback volume
     * the volume fix sets the volume to the volume the display shows
     * @param volume integer
     * @param callback
     */
    async setVolume(wantedVolumeState: number): Promise<number> {
        var vol = (+wantedVolumeState - 80).toFixed(1);  //volume fix
        await axios.get('http://' + this.ip + '/goform/formiPhoneAppVolume.xml?1+' + vol)
            .catch((error) => {
                return Promise.reject(error);
            });
        return wantedVolumeState;
    };

    /**
     * Returns the current volume of the avr (with volume fix)
     * @param callback
     */
    async getVolume(): Promise<number> {
        let volumeState: number = 0;
       await axios.get('http://' + this.ip + this.url_status)
            .then((response: AxiosResponse) => {
                var xml = '';
                parseString(xml + response.data, function (err: any, result: any) {
                    volumeState = (result.item.MasterVolume[0].value[0]) + 80;
                });
            })
            .catch((error) => {
                return Promise.reject(error);
            });
              
        return volumeState;
    };

    async getStatusLite(): Promise<DenonStatusLite> {
        let statusLite: DenonStatusLite = new DenonStatusLite();
        await axios.get('http://' + this.ip + this.url_status_lite)
            .then((response: AxiosResponse) => {
                var xml = '';

                parseString(xml + response.data, function (err: any, result: any) {
                    statusLite.powerState = (result.item.Power[0].value[0] == 'ON');
                    statusLite.inputSelected = result.item.InputFuncSelect[0].value[0];
                    statusLite.volumeState = parseInt(result.item.MasterVolume[0].value[0]) + 80;
                    statusLite.muteState = (result.item.Mute[0].value[0]  == 'on');
                });
            })
            .catch((error) => {
                return Promise.reject(error);
            });
        return statusLite;
    }

}

export class DenonStatusLite {
    powerState: boolean;
    inputSelected: string;
    volumeState: number;
    muteState: boolean;

    constructor() {
        this.powerState = false;
        this.inputSelected = "";
        this.volumeState = 52;
        this.muteState = false;
    }

    public toString = () : string => {
        return `DenonStatusLite (power: ${this.powerState}, input: ${this.inputSelected}, volume: ${this.volumeState}, mute: ${this.muteState})`;
    }
}

