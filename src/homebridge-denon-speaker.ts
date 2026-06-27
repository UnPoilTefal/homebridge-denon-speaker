import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicValue,
  HAP,
  Logging,
  Service,
} from 'homebridge';
import { inspect } from 'node:util';
import { DenonLib, MainZoneXmlStatus } from './lib/denon-lib';

let hap: HAP;

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory('homebridge-denon-speaker', 'DenonAVRSpeaker', DenonSpeakerAccessory);
};

interface Speaker {
  active: boolean;
  volume: number;
  mute: boolean;
}

class DenonSpeakerAccessory implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;
  private readonly pollingInterval: number;
  private readonly doPolling: boolean;
  private speakerState: Speaker = {
    active: false,
    volume: 0,
    mute: false,
  };

  private readonly speakerService: Service;
  private readonly informationService: Service;

  private denonLib: DenonLib;

  private readonly cacheTimeout: number = 5; // cache validity in seconds
  private lastUpdate: number = 0; // timestamp in ms (Date.now())

  constructor(log: Logging, config: AccessoryConfig) {
    this.log = log;
    this.name = config.name;
    this.speakerState.volume = config.defaultVolume;
    this.pollingInterval = config.pollingInterval || 30;
    this.doPolling = config.doPolling ?? true;
    this.denonLib = new DenonLib(config.ip);

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, 'Denon')
      .setCharacteristic(hap.Characteristic.SerialNumber, '123-456-789')
      .setCharacteristic(hap.Characteristic.FirmwareRevision, '1.0.0');
    this.informationService.getCharacteristic(hap.Characteristic.Model)
      .onGet(this.getModel.bind(this));

    // Set Speaker Characteristic
    this.speakerService = new hap.Service.Speaker(this.name);

    // Configure required Speaker characteristics
    this.speakerService.getCharacteristic(hap.Characteristic.Mute)
      .onGet(this.getMuteState.bind(this))
      .onSet(this.setMuteState.bind(this));

    this.speakerService.getCharacteristic(hap.Characteristic.Active)
      .onGet(this.getActiveState.bind(this))
      .onSet(this.setActiveState.bind(this))
      .updateValue(false); // État initial

    this.speakerService.getCharacteristic(hap.Characteristic.Volume)
      .onGet(this.getVolumeState.bind(this))
      .onSet(this.setVolumeState.bind(this))
      .setProps({
        minValue: 0,
        maxValue: 98,
        minStep: 2,
      });
    if (this.doPolling) {
      this.log.debug(`Refresh every ${this.pollingInterval} sec`);
      setInterval(async () => {
        this.log.debug('Triggering updateSpeakerState');
        const updated = await this.updateAllStates();
        if (updated) {
          // Ne mettre à jour HomeKit que si les valeurs ont changé
          this.speakerService.updateCharacteristic(hap.Characteristic.Mute, this.speakerState.mute);
          this.speakerService.updateCharacteristic(hap.Characteristic.Active, this.speakerState.active);
          this.speakerService.updateCharacteristic(hap.Characteristic.Volume, this.speakerState.volume);
          this.log.debug('États mis à jour dans HomeKit');
        }
      }, this.pollingInterval * 1000);

      // Mise à jour initiale des états
      this.updateAllStates().catch(error => {
        this.log.error('Erreur lors de la mise à jour initiale:', error);
      });
    }

    log.info(`${this.name} finished initializing!`);
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log('Identify!');
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

  async getModel(): Promise<CharacteristicValue> {
    const modelInfo = await this.denonLib.getModelInfo();
    return modelInfo.model;
  }

  async getMuteState(): Promise<CharacteristicValue> {
    await this.updateAllStates();
    const muteState = this.speakerState.mute;
    this.log.info('getMuteState: ' + (muteState ? 'ON' : 'OFF'));
    return muteState;
  }

  async setMuteState(wantedMuteState: CharacteristicValue) {
    try {
      const muteState = await this.denonLib.setMuteState(wantedMuteState as boolean);
      this.log.debug('setMuteState: ' + (muteState ? 'ON' : 'OFF'));
      this.speakerState.mute = muteState;
    } catch (error) {
      this.log('setMuteState error: ' + (error as Error).message);
      throw error;
    }
  }

  async getActiveState() {
    await this.updateAllStates();
    const activeState = this.speakerState.active;
    this.log.info('getActiveState: ' + (activeState ? 'ON' : 'OFF'));
    return activeState;
  }

  async setActiveState(wantedActiveState: CharacteristicValue) {
    try {
      const activeState = await this.denonLib.setPowerState(wantedActiveState as boolean);
      this.log('setActiveState: ' + (activeState ? 'ON' : 'OFF'));
      this.speakerState.active = activeState;
    } catch (error) {
      this.log('setActiveState error: ' + (error as Error).message);
      throw error;
    }
  }

  async getVolumeState() {
    const now = Date.now();
    if (now - this.lastUpdate >= this.cacheTimeout * 1000) {
      await this.updateAllStates();
    }
    const volumeState = this.speakerState.volume;
    this.log.info('getVolumeState: ' + volumeState);
    return volumeState;
  }

  async setVolumeState(wantedVolumeState: CharacteristicValue) {
    try {
      const volumeState = await this.denonLib.setVolume(wantedVolumeState as number);
      this.log('setVolumeState: ' + volumeState);
      this.speakerState.volume = volumeState;
    } catch (error) {
      this.log('setVolumeState error: ' + (error as Error).message);
      throw error;
    }
  }

  async updateAllStates(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastUpdate < this.cacheTimeout * 1000) {
      this.log.debug('Using cached data for updateAllStates');
      return false;
    }

    try {
      const status: MainZoneXmlStatus = await this.denonLib.getStatus();
      this.log.debug(inspect(status));
      this.speakerState.active = status.powerState;
      this.speakerState.volume = status.volumeState;
      this.speakerState.mute = status.muteState;
      this.lastUpdate = now;
      return true;
    } catch (error) {
      this.log('updateAllStates Error : ' + (error as Error).message);
      return false;
    }
  }

}

