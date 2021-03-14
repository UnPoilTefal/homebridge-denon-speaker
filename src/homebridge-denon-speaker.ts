import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicValue,
  HAP,
  Logging,
  Service,
} from "homebridge";
import { DenonLib, DenonStatusLite } from "./lib/denon-lib";

/*
 * IMPORTANT NOTICE
 *
 * One thing you need to take care of is, that you never ever ever import anything directly from the "homebridge" module (or the "hap-nodejs" module).
 * The above import block may seem like, that we do exactly that, but actually those imports are only used for types and interfaces
 * and will disappear once the code is compiled to Javascript.
 * In fact you can check that by running `npm run build` and opening the compiled Javascript file in the `dist` folder.
 * You will notice that the file does not contain a `... = require("homebridge");` statement anywhere in the code.
 *
 * The contents of the above import statement MUST ONLY be used for type annotation or accessing things like CONST ENUMS,
 * which is a special case as they get replaced by the actual value and do not remain as a reference in the compiled code.
 * Meaning normal enums are bad, const enums can be used.
 *
 * You MUST NOT import anything else which remains as a reference in the code, as this will result in
 * a `... = require("homebridge");` to be compiled into the final Javascript code.
 * This typically leads to unexpected behavior at runtime, as in many cases it won't be able to find the module
 * or will import another instance of homebridge causing collisions.
 *
 * To mitigate this the {@link API | Homebridge API} exposes the whole suite of HAP-NodeJS inside the `hap` property
 * of the api object, which can be acquired for example in the initializer function. This reference can be stored
 * like this for example and used to access all exported variables and classes from HAP-NodeJS.
 */
let hap: HAP;

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory("homebridge-denon-speaker", "DenonAVRSpeaker", DenonSpeakerAccessory);
};

class DenonSpeakerAccessory implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;

  /* Characteristic States  */
  private speakerState = {
    active: false,
    volume: 0,
    mute: false,
  }

  private readonly speakerService: Service;
  private readonly informationService: Service;

  private denonLib: DenonLib;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.denonLib = new DenonLib(config.ip),

    // Set AccessoryInformation
    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "Denon")
      .setCharacteristic(hap.Characteristic.Model, this.name);

    // Set Speaker Characteristic
    this.speakerService = new hap.Service.Speaker(this.name);
    // Mute
    this.speakerService.getCharacteristic(hap.Characteristic.Mute)!
      .onGet(this.getMuteState.bind(this))
      .onSet(this.setMuteState.bind(this));

    // Active 
    this.speakerService.getCharacteristic(hap.Characteristic.Active)!
      .onGet(this.getActiveState.bind(this))
      .onSet(this.setActiveState.bind(this));

    // Volume
    this.speakerService.getCharacteristic(hap.Characteristic.Volume)!
      .onGet(this.getVolumeState.bind(this))
      .onSet(this.setVolumeState.bind(this));
    
    setInterval(() => {
      this.updateAllStates()
        .then(() => {
          // push the new value to HomeKit
          this.speakerService.updateCharacteristic(hap.Characteristic.Mute, this.speakerState.mute);
          this.speakerService.updateCharacteristic(hap.Characteristic.Active, this.speakerState.active);
          this.speakerService.updateCharacteristic(hap.Characteristic.Volume, this.speakerState.volume);
          this.log.debug('Triggering updateSpeakerState');
        });
    }, 5000);
    
    log.info(`${this.name} finished initializing!`);
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log("Identify!");
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.speakerService,
    ];
  }

  async getMuteState(): Promise<CharacteristicValue> {
    await this.updateAllStates();
    const muteState = this.speakerState.mute;
    this.log.info("getMuteState: " + (muteState ? "ON" : "OFF"));
    return muteState;
  }

  async setMuteState(wantedMuteState: CharacteristicValue) {

    await this.denonLib.setMuteState(wantedMuteState as boolean)
      .then((muteState: boolean) => {
        this.log.debug("setMuteState: " + (muteState ? "ON" : "OFF"));
        this.speakerState.mute = muteState as boolean;
      })
      .catch((error) => {
        this.log("setMuteState error: " + error.message);
        return Promise.reject(error);
      });
    
  }

  async getActiveState() {
    await this.updateAllStates();
    const activeState = this.speakerState.active;
    this.log.info("getActiveState: " + (activeState ? "ON" : "OFF"));
    return activeState;
  }

  async setActiveState(wantedActiveState: CharacteristicValue) {
    this.denonLib.setPowerState(wantedActiveState as boolean)
      .then((activeState: boolean) => {
        this.log("setActiveState: " + (activeState ? "ON" : "OFF"));
        this.speakerState.active = activeState as boolean;
      })
      .catch((error) => {
        this.log("setActiveState error: " + error.message);
        return Promise.reject(error);
      });
  }

  async getVolumeState() {
    const volumeState = this.speakerState.volume;
    this.log.info("getVolumeState: " + volumeState);
    return volumeState;
  }

  async setVolumeState(wantedVolumeState: CharacteristicValue) {

    this.denonLib.setVolume(wantedVolumeState as number)
      .then((volumeState: number) => {
        this.log("setVolumeState: " + volumeState);
        this.speakerState.volume = volumeState;
      })
      .catch((error) => {
        this.log("setVolumeState error: " + error.message);
        return Promise.reject(error);
      });
  }

  async updateAllStates(): Promise<boolean> {

    let updated = false;
    this.denonLib.getStatusLite()
      .then((statusLite: DenonStatusLite) => {
        this.log.debug(statusLite.toString());
        this.speakerState.active = statusLite.powerState;
        this.speakerState.volume = statusLite.volumeState;
        this.speakerState.mute = statusLite.muteState;
        updated = true;
      })
      .catch((error) => {
        this.log("updateAllStates Error : " + error.message);
      });

    return updated;
  }
}
