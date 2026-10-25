import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { DebrisScreening } from '@app/plugins/debris-screening/debris-screening';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { settingsManager } from '@app/settings/settings';
import { cappedScreeningCovarianceFromTle, Satellite, StateCovariance, TleLine1, TleLine2 } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/** Recomputes the TLE checksum digit (column 69) after editing a line. */
const withChecksum = (line: string): string => {
  const body = line.slice(0, 68);
  let sum = 0;

  for (const ch of body) {
    if (ch >= '0' && ch <= '9') {
      sum += parseInt(ch, 10);
    } else if (ch === '-') {
      sum += 1;
    }
  }

  return `${body}${sum % 10}`;
};

const L8_TLE1 = '1 39084U 13008A   22221.78099992  .00000176  00000-0  49109-4 0  9999';
const L8_TLE2 = '2 39084  98.2198 291.4222 0001287  95.0667 265.0678 14.57105218504766';

const elementsOf = (cov: StateCovariance): number[] => cov.matrix.elements.flat();

describe('DebrisScreening: an analyst clone uses its parent uncertainty', () => {
  let plugin: DebrisScreening;
  const parent = new Satellite({ id: 0, name: 'LANDSAT 8', tle1: L8_TLE1 as TleLine1, tle2: L8_TLE2 as TleLine2 });
  // Fitted at a burn 4 h after the parent's epoch with BSTAR 0: its own covariance would be smaller.
  const clone = new Satellite({
    id: 1,
    name: 'LANDSAT 8 (burn 1)',
    tle1: withChecksum('1 90000U 13008A   22222.16666667  .00000000  00000-0  00000-0 0  9999') as TleLine1,
    tle2: withChecksum(L8_TLE2.replace('2 39084', '2 90000')) as TleLine2,
  });
  const objects = [parent, clone];

  clone.derivedFromSccNum = '39084';

  type Internals = {
    beginScreeningRun_: (primary: Satellite) => void;
    onTargetChanged_: () => void;
    calculateCovarianceFromSatellite: (sat: Satellite) => StateCovariance;
  };
  const internals = () => plugin as unknown as Internals;
  const note = () => getEl('ds-uncertainty-note')!;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    const catalogManager = ServiceLocator.getCatalogManager();

    catalogManager.objectCache = objects as never;
    vi.spyOn(catalogManager, 'sccNum2Sat').mockImplementation(((scc: string) => objects.find((o) => o.sccNum === scc) ?? null) as never);
    plugin = new DebrisScreening();
    websiteInit(plugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds the clone covariance from the parent TLE, not the clone TLE', () => {
    const k = settingsManager.covarianceConfidenceLevel;
    const cloneCov = elementsOf(internals().calculateCovarianceFromSatellite(clone));

    expect(cloneCov).toEqual(elementsOf(cappedScreeningCovarianceFromTle(parent.tle1, parent.tle2, k)));
    expect(cloneCov).not.toEqual(elementsOf(cappedScreeningCovarianceFromTle(clone.tle1, clone.tle2, k)));
  });

  it('keeps a catalog object on its own covariance', () => {
    const k = settingsManager.covarianceConfidenceLevel;

    expect(elementsOf(internals().calculateCovarianceFromSatellite(parent))).toEqual(elementsOf(cappedScreeningCovarianceFromTle(parent.tle1, parent.tle2, k)));
  });

  it('notes the assumed parent in the results area for a clone primary, and clears it on a target change', () => {
    expect(note().style.display).toBe('none');

    internals().beginScreeningRun_(clone);
    expect(note().style.display).toBe('');
    expect(note().textContent).toBe('Uncertainty assumed from parent LANDSAT 8 (39084)');

    internals().onTargetChanged_();
    expect(note().style.display).toBe('none');
    expect(note().textContent).toBe('');
  });

  it('shows no note for a catalog primary', () => {
    internals().beginScreeningRun_(parent);

    expect(note().style.display).toBe('none');
  });
});
