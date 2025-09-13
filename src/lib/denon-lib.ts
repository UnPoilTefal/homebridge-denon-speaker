/**
 * created by stfnhmplr on 28.01.16.
 * control your Denon AVR via http with node.js
 */

import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

interface DenonXmlResponse {
  item: {
    Zone: Array<{ value: string[] }>;
    Power: Array<{ value: string[] }>;
    InputFuncSelect: Array<{ value: string[] }>;
    SurrMode: Array<{ value: string[] }>;
    MasterVolume: Array<{ value: string[] }>;
    Mute: Array<{ value: string[] }>;
    Model: Array<{ value: string[] }>;
  };
}

export interface ModelInfo {
  brand: string;
  model: string;
}

export interface MainZoneXmlStatus {
  zone: string;
  powerState: boolean;
  inputSelected: string;
  surroundMode: string;
  volumeState: number;
  muteState: boolean;
  model: string;
}

export class DenonLib {
  private readonly ip: string;
  private readonly url_main_zone_xml_lite = '/goform/formMainZone_MainZoneXmlStatusLite.xml';
  private readonly url_main_zone_xml = '/goform/formMainZone_MainZoneXmlStatus.xml';

  constructor(ip: string) {
    this.ip = ip;
  }

  private async callHttp(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      return response.text();
    } catch (error) {
      throw new Error(`Erreur HTTP: ${error}`);
    }
  }

  private async xml2DenonStatus(xml: string): Promise<MainZoneXmlStatus> {
    try {
      const jsResult = await parseStringPromise(xml) as DenonXmlResponse;
      return {
        zone: jsResult.item.Zone[0].value[0].trim(),
        powerState: jsResult.item.Power[0].value[0] === 'ON',
        inputSelected: jsResult.item.InputFuncSelect[0].value[0],
        surroundMode: jsResult.item.SurrMode[0].value[0],
        volumeState: parseInt(jsResult.item.MasterVolume[0].value[0]) + 80,
        muteState: jsResult.item.Mute[0].value[0] === 'on',
        model: jsResult.item.Model[0].value[0],
      };
    } catch (error) {
      throw new Error(`Erreur lors du parsing XML: ${error}`);
    }
  }

  async getModelInfo(): Promise<ModelInfo> {
    try {
      const status = await this.getStatus();
      return {
        brand: 'Denon',
        model: status.model || 'AVR',
      };
    } catch (error) {
      return {
        brand: 'Denon',
        model: 'AVR',
      };
    }
  }

  async setPowerState(wantedPowerState: boolean): Promise<boolean> {
    try {
      const command = wantedPowerState ? 'ON' : 'OFF';
      await this.callHttp(`http://${this.ip}/MainZone/index.put.asp?cmd0=PutZone_OnOff/${command}`);
      return wantedPowerState;
    } catch (error) {
      throw new Error(`Erreur lors du changement d'état: ${error}`);
    }
  }

  async setMuteState(wantedMuteState: boolean): Promise<boolean> {
    try {
      const command = wantedMuteState ? 'ON' : 'OFF';
      await this.callHttp(`http://${this.ip}/MainZone/index.put.asp?cmd0=PutVolumeMute/${command}`);
      return wantedMuteState;
    } catch (error) {
      throw new Error(`Erreur lors du changement du mute: ${error}`);
    }
  }

  async setVolume(wantedVolumeState: number): Promise<number> {
    try {
      const vol = (+wantedVolumeState - 80).toFixed(1); // volume fix
      await this.callHttp(`http://${this.ip}/goform/formiPhoneAppVolume.xml?1+${vol}`);
      return wantedVolumeState;
    } catch (error) {
      throw new Error(`Erreur lors du changement de volume: ${error}`);
    }
  }

  async getStatus(): Promise<MainZoneXmlStatus> {
    try {
      const xmlData = await this.callHttp(`http://${this.ip}${this.url_main_zone_xml}`);
      return this.xml2DenonStatus(xmlData);
    } catch (error) {
      throw new Error(`Erreur lors de la récupération du status: ${error}`);
    }
  }

}
