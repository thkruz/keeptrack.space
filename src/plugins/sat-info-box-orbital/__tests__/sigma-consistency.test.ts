import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { AnalysisEnv, generateConjunctionReport, SIGMA_ROW_LABEL } from '@app/plugins/reports/conjunction-report-core';
import { buildDownloadPayload } from '@app/plugins/reports/report-formatter';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SatInfoBoxOrbital } from '@app/plugins/sat-info-box-orbital/sat-info-box-orbital';
import { EL } from '@app/plugins/sat-info-box-orbital/sat-info-box-orbital-html';
import { screeningSigmasKm } from '@app/plugins/sat-info-box-orbital/screening-sigmas';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Satellite, TleLine1, TleLine2 } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/*
 * Scenario 1 (iteration 2): the info box showed LANDSAT 8 sigmas of 8.4 / 33.4 / 5.0 m (the Pro
 * Covariance plugin's measured covariance.json entry, written into the ellipsoid radii) while the
 * Conjunction Report showed 0.120 / 1.000 / 0.100 km (the TLE-derived model Pc actually uses).
 * Both surfaces must print the same 1-sigma RIC numbers from one TLE.
 */
const L8_TLE1 = '1 39084U 13008A   22221.78099992  .00000176  00000-0  49109-4 0  9999' as TleLine1;
const L8_TLE2 = '2 39084  98.2198 291.4222 0001287  95.0667 265.0678 14.57105218504766' as TleLine2;
const SEC_TLE1 = '1 99901U 13008ZZ  22221.78099992  .00000176  00000-0  49109-4 0  9993' as TleLine1;
const SEC_TLE2 = '2 99901  98.3198 291.4222 0001287  95.0667 265.0678 14.57105218504762' as TleLine2;

const env = (k: number): AnalysisEnv => ({
  analysisEpoch: new Date('2022-08-10T00:00:00Z'),
  wallClock: new Date('2026-10-16T00:00:00Z'),
  appVersion: '13.0.0-test',
  covarianceConfidenceLevel: k,
  primaryHardBodyRadiusKm: 0.01,
  secondaryHardBodyRadiusKm: 0.005,
});

/** Parses "120.0 m" / "1.000 km" into km. */
const shownKm = (id: string): number => {
  const [value, unit] = getEl(id)!.textContent!.trim().split(' ');

  return unit === 'm' ? parseFloat(value) / 1000 : parseFloat(value);
};

describe('Info box and Conjunction Report sigmas', () => {
  let plugin: SatInfoBoxOrbital;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  const landsat8 = new Satellite({ id: 0, name: 'LANDSAT 8', tle1: L8_TLE1, tle2: L8_TLE2 });
  const secondary = new Satellite({ id: 1, name: 'TEST DEB', tle1: SEC_TLE1, tle2: SEC_TLE2 });

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    ServiceLocator.getTimeManager().simulationTimeObj = new Date('2022-08-10T00:00:00Z');
    plugin = new SatInfoBoxOrbital();
    websiteInit(plugin);
    document.body.insertAdjacentHTML('beforeend', p().createOrbitalSection());
    // setInnerHtml defers to an idle callback; run it inline so the rows can be read back.
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => cb());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([1, 2, 3])('print the same 1-sigma R / I / C at confidence level k = %i', (k) => {
    const selectSatManager = PluginRegistry.getPlugin(SelectSatManager)!;

    // What the Pro Covariance plugin writes for LANDSAT 8 (measured, k-scaled, [R, C, I] order).
    selectSatManager.primarySatCovMatrix = [0.0084 * k, 0.005 * k, 0.0334 * k];
    settingsManager.covarianceConfidenceLevel = k;

    p().updateCovariance_(landsat8);
    const box = { r: shownKm(EL.UNCERTAINTY_RADIAL), i: shownKm(EL.UNCERTAINTY_INTRACK), c: shownKm(EL.UNCERTAINTY_CROSSTRACK) };

    const text = buildDownloadPayload(generateConjunctionReport({ primary: landsat8, secondary, env: env(k) }), 'text').content;
    const row = text.split('\n').find((line) => line.startsWith(SIGMA_ROW_LABEL))!;
    const [r, i, c] = row
      .slice(SIGMA_ROW_LABEL.length)
      .trim()
      .split(/\s+/u)
      .filter((tok) => tok !== '/')
      .slice(0, 3)
      .map(Number);

    expect(row).toContain('own RIC frame, at TLE epoch');
    // Info box shows meters to 0.1 m, the report km to 0.001 km: they agree to the coarser one.
    expect(Math.abs(box.r - r)).toBeLessThanOrEqual(0.0005);
    expect(Math.abs(box.i - i)).toBeLessThanOrEqual(0.0005);
    expect(Math.abs(box.c - c)).toBeLessThanOrEqual(0.0005);

    const model = screeningSigmasKm(L8_TLE1, L8_TLE2)!;

    expect(r).toBeCloseTo(model.radial, 3);
    expect(i).toBeCloseTo(model.inTrack, 3);
    expect(c).toBeCloseTo(model.crossTrack, 3);
    // In-track dominates for a TLE-derived covariance; the measured display radii were ignored.
    expect(model.inTrack).toBeGreaterThan(model.radial);
    expect(box.i).not.toBeCloseTo(0.0334 * k, 3);
  });

  it('shows unknown for an object without a TLE', () => {
    p().updateCovariance_({ isSatellite: () => false });

    expect(getEl(EL.UNCERTAINTY_RADIAL)!.textContent).toBe(getEl(EL.UNCERTAINTY_INTRACK)!.textContent);
    expect(getEl(EL.UNCERTAINTY_RADIAL)!.textContent).not.toContain(' m');
  });
});
