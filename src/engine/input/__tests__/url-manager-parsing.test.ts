import { ServiceLocator } from '@app/engine/core/service-locator';
import { UrlManager } from '@app/engine/input/url-manager';
// Import the same settingsManager singleton the handlers mutate, rather than
// relying on the ambient global (which another test file may stub, diverging
// the two references under the full shared-worker suite).
import { settingsManager } from '@app/settings/settings';
import { vi } from 'vitest';

/*
 * UrlManager query parsing + per-parameter validation handlers. The pure
 * parsers read window.location, which jsdom lets us drive via history
 * .replaceState. The private handlers are reached through a typed cast.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Url = UrlManager as any;

const setLocation = (queryOrHash: string) => {
  window.history.replaceState(null, '', queryOrHash);
};

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('UrlManager.getParams / getKeyValuePairs', () => {
  it('parses the query string into raw key=value params', () => {
    setLocation('?sat=25544&search=ISS&rate=2');

    expect(UrlManager.getParams()).toStrictEqual(['sat=25544', 'search=ISS', 'rate=2']);
  });

  it('falls back to hash-based params when the URL is fragment-routed', () => {
    setLocation('#?sat=25544');

    expect(UrlManager.getParams()).toStrictEqual(['sat=25544']);
  });

  it('decodes values and treats "+" as a space', () => {
    setLocation('?sat=25544&search=ISS+One&tle=a%20b');

    expect(UrlManager.getKeyValuePairs()).toStrictEqual({
      sat: '25544',
      search: 'ISS One',
      tle: 'a b',
    });
  });

  it('skips params with no value or no "="', () => {
    setLocation('?sat=25544&empty=&orphan');

    expect(UrlManager.getKeyValuePairs()).toStrictEqual({ sat: '25544' });
  });
});

describe('UrlManager.handleDateParam_', () => {
  let original: Date | undefined;

  beforeEach(() => {
    original = settingsManager.simulationTime;
    settingsManager.simulationTime = undefined as unknown as Date;
  });

  afterEach(() => {
    settingsManager.simulationTime = original as Date;
  });

  it('accepts an ISO 8601 date string', () => {
    Url.handleDateParam_('2023-10-05T14:48:00.000Z');
    expect(settingsManager.simulationTime?.toISOString()).toBe('2023-10-05T14:48:00.000Z');
  });

  it('accepts a 13-digit unix millisecond timestamp', () => {
    Url.handleDateParam_('1696517280000');
    expect(settingsManager.simulationTime?.getTime()).toBe(1696517280000);
  });

  it('rejects a malformed ISO string', () => {
    Url.handleDateParam_('not-a-date');
    expect(settingsManager.simulationTime).toBeUndefined();
  });

  it('rejects a timestamp of the wrong length', () => {
    Url.handleDateParam_('123');
    expect(settingsManager.simulationTime).toBeUndefined();
  });
});

describe('UrlManager.handleRateParam_', () => {
  let changePropRate: ReturnType<typeof vi.fn>;
  let original: number;

  beforeEach(() => {
    original = settingsManager.propRate;
    changePropRate = vi.fn();
    vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ changePropRate } as never);
  });

  afterEach(() => {
    settingsManager.propRate = original;
    vi.restoreAllMocks();
  });

  it('sets a valid rate', () => {
    Url.handleRateParam_('2.5');
    expect(settingsManager.propRate).toBe(2.5);
    expect(changePropRate).toHaveBeenCalledWith(2.5);
  });

  it('clamps a rate above the maximum to 1000', () => {
    Url.handleRateParam_('5000');
    expect(settingsManager.propRate).toBe(1000);
  });

  it('clamps a negative rate to 0', () => {
    Url.handleRateParam_('-5');
    expect(settingsManager.propRate).toBe(0);
  });

  it('ignores a non-numeric rate', () => {
    settingsManager.propRate = 1;
    Url.handleRateParam_('abc');
    expect(settingsManager.propRate).toBe(1);
    expect(changePropRate).not.toHaveBeenCalled();
  });
});

describe('UrlManager.handleRegimeParam_', () => {
  let original: string[];

  beforeEach(() => {
    original = settingsManager.core.regimeFilter;
  });

  afterEach(() => {
    settingsManager.core.regimeFilter = original;
  });

  it('keeps the valid regimes from a comma list', () => {
    Url.handleRegimeParam_('leo,meo');
    expect(settingsManager.core.regimeFilter).toStrictEqual(['leo', 'meo']);
  });

  it('lowercases and trims entries', () => {
    Url.handleRegimeParam_('LEO, GEO ');
    expect(settingsManager.core.regimeFilter).toStrictEqual(['leo', 'geo']);
  });

  it('drops unknown regimes', () => {
    Url.handleRegimeParam_('leo,bogus,xgeo');
    expect(settingsManager.core.regimeFilter).toStrictEqual(['leo', 'xgeo']);
  });

  it('yields an empty filter for a blank value', () => {
    Url.handleRegimeParam_('');
    expect(settingsManager.core.regimeFilter).toStrictEqual([]);
  });
});

describe('UrlManager.handleDotsParam_', () => {
  it('applies the large-dot shader preset and reports a parsed variable', () => {
    expect(Url.handleDotsParam_('large')).toBe(true);
    expect(settingsManager.satShader.minSize).toBe(15.0);
  });

  it('returns false for an unrecognized preset', () => {
    expect(Url.handleDotsParam_('teeny')).toBe(false);
  });
});

describe('UrlManager.parseGetVariables', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('returns false when there are no query params', () => {
    setLocation('/');
    expect(UrlManager.parseGetVariables(settingsManager)).toBe(false);
  });

  it('applies a pre-load boolean param and reports usage', () => {
    setLocation('?planets=false');
    const result = UrlManager.parseGetVariables(settingsManager);

    expect(result).toBe(true);
    expect(settingsManager.isDisablePlanets).toBe(true);
  });
});
