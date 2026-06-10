/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { StereoMap } from '@app/plugins/stereo-map/stereo-map';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

// jsdom has no canvas 2D context - stub the calls the plugin makes on init.
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })), beginPath: vi.fn(), moveTo: vi.fn(),
  lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fill: vi.fn(), save: vi.fn(),
  restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), rotate: vi.fn(),
})) as never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SM = StereoMap as any;

describe('StereoMap.getMapPoints_', () => {
  const now = new Date('2026-05-31T00:00:00Z');

  it('returns a zeroed position when the satellite has no ECI state', () => {
    const sat = { eci: () => null };

    const result = SM.getMapPoints_(now, sat, []);

    expect(result.lla).toStrictEqual({ lat: 0, lon: 0, alt: 0 });
    expect(result.overallView).toBe(false);
    expect(typeof result.time).toBe('string');
  });

  it('projects the ECI position to LLA and flags overall view when a sensor sees it', () => {
    const sat = { eci: () => ({ position: { x: 7000, y: 0, z: 0 } }) };
    const sensor = { isSatInFov: () => true };

    const result = SM.getMapPoints_(now, sat, [sensor]);

    expect(Number.isFinite(result.lla.lat)).toBe(true);
    expect(Number.isFinite(result.lla.lon)).toBe(true);
    expect(result.overallView).toBe(true);
  });

  it('leaves overall view false when no sensor sees the satellite', () => {
    const sat = { eci: () => ({ position: { x: 7000, y: 0, z: 0 } }) };
    const sensor = { isSatInFov: () => false };

    expect(SM.getMapPoints_(now, sat, [sensor]).overallView).toBe(false);
  });
});

describe('StereoMap input synchronization', () => {
  let plugin: StereoMap;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new StereoMap();
    websiteInit(plugin);
    // These inputs live in the secondary menu, which websiteInit does not inject.
    if (!getEl('stereo-map-minutes', true)) {
      document.body.insertAdjacentHTML('beforeend',
        '<input id="stereo-map-minutes" /><input id="stereo-map-orbit-mult" />');
    }
  });

  afterEach(() => vi.restoreAllMocks());

  describe('getSelectedSatPeriod_', () => {
    it('returns the selected satellite period, or 0 when there is none', () => {
      const catalog = ServiceLocator.getCatalogManager();

      vi.spyOn(catalog, 'getSat').mockReturnValue({ period: 95 } as never);
      expect(p().getSelectedSatPeriod_()).toBe(95);

      vi.spyOn(catalog, 'getSat').mockReturnValue(null as never);
      expect(p().getSelectedSatPeriod_()).toBe(0);
    });
  });

  describe('syncMinutesFromOrbits_', () => {
    it('writes orbitMultiplier * period (rounded) into the minutes input', () => {
      vi.spyOn(p(), 'getSelectedSatPeriod_').mockReturnValue(90);
      p().orbitMultiplier_ = 2;

      p().syncMinutesFromOrbits_();

      expect((getEl('stereo-map-minutes') as HTMLInputElement).value).toBe('180');
    });

    it('is a no-op when no satellite period is available', () => {
      vi.spyOn(p(), 'getSelectedSatPeriod_').mockReturnValue(0);
      (getEl('stereo-map-minutes') as HTMLInputElement).value = 'unchanged';

      p().syncMinutesFromOrbits_();

      expect((getEl('stereo-map-minutes') as HTMLInputElement).value).toBe('unchanged');
    });
  });

  describe('syncOrbitsFromMinutes_', () => {
    it('writes the orbit multiplier (2dp) into the orbit input', () => {
      vi.spyOn(p(), 'getSelectedSatPeriod_').mockReturnValue(90);
      p().orbitMultiplier_ = 3.5;

      p().syncOrbitsFromMinutes_();

      expect((getEl('stereo-map-orbit-mult') as HTMLInputElement).value).toBe('3.50');
    });
  });

  describe('onMinutesInputChanged_', () => {
    it('derives the orbit multiplier from the minutes input within bounds', () => {
      vi.spyOn(p(), 'getSelectedSatPeriod_').mockReturnValue(90);
      vi.spyOn(p(), 'debouncedMapUpdate_').mockImplementation(() => undefined);
      (getEl('stereo-map-minutes') as HTMLInputElement).value = '180';

      p().onMinutesInputChanged_();

      expect(p().orbitMultiplier_).toBeCloseTo(2, 5);
    });
  });
});
