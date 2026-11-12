import { SatMath } from '@app/app/analysis/sat-math';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { BestPassPlugin } from '@app/plugins/best-pass/best-pass';
import { type PassRae, trackRaeFailure } from '@app/plugins/best-pass/best-pass-calculator';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const NULL_RAE: PassRae = { az: null, el: null, rng: null };
const GOOD_RAE: PassRae = { az: 10, el: 20, rng: 1000 };

describe('trackRaeFailure', () => {
  it('reports no failure before any sample is taken', () => {
    const t = trackRaeFailure(() => NULL_RAE);

    expect(t.failed()).toBe(false);
  });

  it('reports failure when every sample has a null elevation', () => {
    const t = trackRaeFailure(() => NULL_RAE);

    t.getRae(new Date(0), {} as never, defaultSensor as never);
    t.getRae(new Date(1), {} as never, defaultSensor as never);
    expect(t.failed()).toBe(true);
  });

  it('does not report failure when any sample propagates', () => {
    let n = 0;
    const t = trackRaeFailure(() => (n++ === 0 ? NULL_RAE : GOOD_RAE));

    t.getRae(new Date(0), {} as never, defaultSensor as never);
    t.getRae(new Date(1), {} as never, defaultSensor as never);
    expect(t.failed()).toBe(false);
  });

  it('passes the wrapped return value through unchanged', () => {
    const t = trackRaeFailure(() => GOOD_RAE);

    expect(t.getRae(new Date(0), {} as never, defaultSensor as never)).toBe(GOOD_RAE);
  });
});

describe('BestPassPlugin sync search records a never-propagating object as failed', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let plugin: any;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new BestPassPlugin();
    websiteInit(plugin);
    ServiceLocator.getSensorManager().currentSensors = [defaultSensor];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds the id to lastFailedIds_ when getRae returns all-null look angles without throwing', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockReturnValue(defaultSat);
    vi.spyOn(SatMath, 'getRae').mockReturnValue(NULL_RAE as never);
    plugin.looksLength_ = 0.02;

    const passes = plugin.findBestPasses_('25544', defaultSensor);

    expect(passes).toStrictEqual([]);
    expect(plugin.lastFailedIds_).toEqual([defaultSat.sccNum]);
  });
});

describe('trackRaeFailure peak elevation', () => {
  it('tracks the highest sampled elevation per sensor and null when never sampled', () => {
    const els = [5, 42.5, 20];
    let n = 0;
    const other = { ...defaultSensor } as never;
    const t = trackRaeFailure(() => ({ az: 1, el: els[n++ % els.length], rng: 1000 }));

    for (let k = 0; k < 3; k++) {
      t.getRae(new Date(k), {} as never, defaultSensor as never);
    }
    expect(t.peakElDeg(defaultSensor as never)).toBeCloseTo(42.5, 6);
    expect(t.peakElDeg(other)).toBeNull();
  });
});
