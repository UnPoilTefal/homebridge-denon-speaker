import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DenonLib } from '../lib/denon-lib';

const SAMPLE_XML = `<?xml version="1.0" encoding="utf-8" ?>
<item>
  <Zone><value>MAIN ZONE</value></Zone>
  <Power><value>ON</value></Power>
  <InputFuncSelect><value>GAME</value></InputFuncSelect>
  <SurrMode><value>STEREO</value></SurrMode>
  <MasterVolume><value>-42</value></MasterVolume>
  <Mute><value>off</value></Mute>
  <Model><value>AVR-X1600H</value></Model>
</item>`;

function mockFetch(body: string) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    text: () => Promise.resolve(body),
  }));
}

describe('DenonLib', () => {
  let lib: DenonLib;

  beforeEach(() => {
    lib = new DenonLib('192.168.1.100');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getStatus() — XML parsing', () => {
    it('parses power state ON', async () => {
      mockFetch(SAMPLE_XML);
      const status = await lib.getStatus();
      expect(status.powerState).toBe(true);
    });

    it('parses power state OFF', async () => {
      mockFetch(SAMPLE_XML.replace('<value>ON</value>', '<value>OFF</value>'));
      const status = await lib.getStatus();
      expect(status.powerState).toBe(false);
    });

    it('parses mute off', async () => {
      mockFetch(SAMPLE_XML);
      const status = await lib.getStatus();
      expect(status.muteState).toBe(false);
    });

    it('parses mute on', async () => {
      mockFetch(SAMPLE_XML.replace('<value>off</value>', '<value>on</value>'));
      const status = await lib.getStatus();
      expect(status.muteState).toBe(true);
    });

    it('parses zone and model', async () => {
      mockFetch(SAMPLE_XML);
      const status = await lib.getStatus();
      expect(status.zone).toBe('MAIN ZONE');
      expect(status.model).toBe('AVR-X1600H');
    });

    it('throws on network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      await expect(lib.getStatus()).rejects.toThrow();
    });
  });

  describe('getStatus() — volume mapping', () => {
    it('maps Denon -42 dB to HomeKit 38', async () => {
      mockFetch(SAMPLE_XML);
      expect((await lib.getStatus()).volumeState).toBe(38);
    });

    it('maps Denon -80 dB (min) to HomeKit 0', async () => {
      mockFetch(SAMPLE_XML.replace('<value>-42</value>', '<value>-80</value>'));
      expect((await lib.getStatus()).volumeState).toBe(0);
    });

    it('maps Denon +18 dB (max) to HomeKit 98', async () => {
      mockFetch(SAMPLE_XML.replace('<value>-42</value>', '<value>18</value>'));
      expect((await lib.getStatus()).volumeState).toBe(98);
    });
  });

  describe('setPowerState()', () => {
    it('sends ON command', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ text: () => Promise.resolve('') });
      vi.stubGlobal('fetch', fetchMock);
      await lib.setPowerState(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://192.168.1.100/MainZone/index.put.asp?cmd0=PutZone_OnOff/ON',
      );
    });

    it('sends OFF command', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ text: () => Promise.resolve('') });
      vi.stubGlobal('fetch', fetchMock);
      await lib.setPowerState(false);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://192.168.1.100/MainZone/index.put.asp?cmd0=PutZone_OnOff/OFF',
      );
    });
  });

  describe('setVolume()', () => {
    it('maps HomeKit 38 to Denon -42.0 dB', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ text: () => Promise.resolve('') });
      vi.stubGlobal('fetch', fetchMock);
      await lib.setVolume(38);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://192.168.1.100/goform/formiPhoneAppVolume.xml?1+-42.0',
      );
    });

    it('maps HomeKit 0 to Denon -80.0 dB', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ text: () => Promise.resolve('') });
      vi.stubGlobal('fetch', fetchMock);
      await lib.setVolume(0);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://192.168.1.100/goform/formiPhoneAppVolume.xml?1+-80.0',
      );
    });
  });

  describe('getModelInfo()', () => {
    it('returns brand and model from device', async () => {
      mockFetch(SAMPLE_XML);
      const info = await lib.getModelInfo();
      expect(info.brand).toBe('Denon');
      expect(info.model).toBe('AVR-X1600H');
    });

    it('returns fallback AVR on network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
      const info = await lib.getModelInfo();
      expect(info.brand).toBe('Denon');
      expect(info.model).toBe('AVR');
    });
  });
});
