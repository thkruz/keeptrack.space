import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { settingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeepSpaceSatellite } from '../deep-space-satellite';
import { DEEP_SPACE_SATELLITE_CONFIGS, isRemoteEphemerisDisabled, loadDeepSpaceSatelliteData } from '../deep-space-satellite-catalog';

const sats = (): Record<string, DeepSpaceSatellite> =>
  Object.fromEntries(DEEP_SPACE_SATELLITE_CONFIGS.map((c) => [c.name, { setCoefficients: vi.fn() } as unknown as DeepSpaceSatellite]));

describe('deep-space ephemeris loading in embeds', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setupStandardEnvironment();
    fetchSpy = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchSpy);
    logSpy = vi.spyOn(errorManagerInstance, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  });
  afterEach(() => {
    settingsManager.isEmbedMode = false;
    settingsManager.noCatalogOnLoad = false;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('scenario mode (embed + no catalog) fetches nothing and drops the probes', async () => {
    settingsManager.isEmbedMode = true;
    settingsManager.noCatalogOnLoad = true;
    const satellites = sats();

    expect(isRemoteEphemerisDisabled()).toBe(true);
    await loadDeepSpaceSatelliteData(satellites);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(Object.keys(satellites)).toHaveLength(0);
  });

  it('full-mode embed still tries, fails quietly with no toast and no rejection', async () => {
    settingsManager.isEmbedMode = true;
    const satellites = sats();

    expect(isRemoteEphemerisDisabled()).toBe(false);
    await expect(loadDeepSpaceSatelliteData(satellites)).resolves.toBeUndefined();

    expect(fetchSpy).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(Object.keys(satellites)).toHaveLength(0);
  });

  it('the normal site keeps its failure toast and the fetch', async () => {
    const satellites = sats();

    expect(isRemoteEphemerisDisabled()).toBe(false);
    await loadDeepSpaceSatelliteData(satellites);

    expect(fetchSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });

  it('noCatalogOnLoad alone (URL param on the normal site) does not disable the fetch', () => {
    settingsManager.noCatalogOnLoad = true;
    expect(isRemoteEphemerisDisabled()).toBe(false);
  });
});
