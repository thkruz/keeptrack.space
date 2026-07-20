import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { UrlManager } from '@app/engine/input/url-manager';
import { settingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

/*
 * Exercises the large parameter-dispatch (parseGetVariables), the URL writer
 * (updateURL) and the earth/sun preset handlers, which the existing suites
 * skipped. window.location is driven via history.replaceState (jsdom).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Url = UrlManager as any;
const setLocation = (q: string) => window.history.replaceState(null, '', q);

afterEach(() => {
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

describe('UrlManager.handleEarthParam_', () => {
  it.each(['satellite', 'engineer', 'opscenter', '90s', 'unknown'])('applies the "%s" earth preset', (val) => {
    expect(() => UrlManager.handleEarthParam_(val)).not.toThrow();
  });

  it('satellite preset enables clouds and political map', () => {
    UrlManager.handleEarthParam_('satellite');
    expect(settingsManager.isDrawCloudsMap).toBe(true);
    expect(settingsManager.isDrawPoliticalMap).toBe(true);
  });
});

describe('UrlManager.handleSunParam_', () => {
  it.each(['off', 'potato', 'low', 'medium', 'high', 'ultra', 'unknown'])('applies the "%s" sun preset', (val) => {
    expect(() => Url.handleSunParam_(val)).not.toThrow();
  });
});

describe('UrlManager.parseGetVariables', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  it('returns false when there are no query parameters', () => {
    setLocation('/');
    expect(UrlManager.parseGetVariables(settingsManager)).toBe(false);
  });

  it('dispatches the full set of pre-load parameters', () => {
    setLocation(
      '?date=2023-10-05T14:48:00.000Z&rate=2&plugins=Foo,Bar&bottomMenu=false&canvas=false' +
        '&planets=false&vimpel=true&external-only&gp=a&tle=b&limitSats=25544&regime=geo&earth=satellite' +
        '&sun=high&sensors=false&launchSites=false&dots=1&ecf=2&color=velocity&msbai&unknownKey=1'
    );

    const result = UrlManager.parseGetVariables(settingsManager);

    expect(result).toBe(true);
    expect(settingsManager.plugins.Foo).toEqual({ enabled: true });
    expect(settingsManager.isDisableBottomMenu).toBe(true);
  });

  it('runs the deferred onKeepTrackReady parameter handlers', () => {
    const catalog = ServiceLocator.getCatalogManager();

    catalog.getIdFromSccNum = vi.fn(() => 0) as never;
    catalog.getIdFromIntlDes = vi.fn(() => 0) as never;
    catalog.getMissile = vi.fn(() => null) as never;
    ServiceLocator.getUiManager().doSearch = vi.fn();
    const cam = ServiceLocator.getMainCamera();

    cam.camSnap = vi.fn() as never;
    cam.changeZoom = vi.fn() as never;
    cam.lookAtLatLon = vi.fn() as never;
    cam.state = { ...cam.state } as never;
    setLocation('?search=ISS&sat=25544&pitch=10&yaw=20&lat=10&lon=20&zoom=0.5&unknownKey=1');

    UrlManager.parseGetVariables(settingsManager);

    expect(() => EventBus.getInstance().emit(EventBusEvent.onKeepTrackReady)).not.toThrow();
  });
});

describe('UrlManager.getKeyValuePairs', () => {
  it('keeps a wrapped external URL intact, including its own query string', () => {
    setLocation('/?tle=%22https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?INTDES=2026-123&FORMAT=csv%22&external-only=true');

    const kv = UrlManager.getKeyValuePairs();

    expect(kv.tle).toBe('https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?INTDES=2026-123&FORMAT=csv');
    expect(kv['external-only']).toBe('true');
  });

  it('treats curly/smart quotes the same as straight quotes (mismatched pair)', () => {
    // %E2%80%9C is a curly opening quote (U+201C); closing quote is straight (%22).
    setLocation('/?tle=%E2%80%9Chttps://celestrak.org/NORAD/elements/supplemental/sup-gp.php?INTDES=2026-123&FORMAT=csv%22&external-only=true');

    const kv = UrlManager.getKeyValuePairs();

    expect(kv.tle).toBe('https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?INTDES=2026-123&FORMAT=csv');
    expect(kv['external-only']).toBe('true');
  });
});

describe('UrlManager.updateURL', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    Url.lastUpdateTime_ = 0;
    const cam = ServiceLocator.getMainCamera();

    cam.zoomLevel = vi.fn(() => 0.5) as never;
    cam.state = { ftsPitch: 0, ftsYaw: 0, camPitch: 0, camYaw: 0, camDistBuffer: 100 } as never;
    const tm = ServiceLocator.getTimeManager();

    tm.staticOffset = 0;
    tm.dynamicOffsetEpoch = Date.now();
  });

  it('throttles rapid successive calls', () => {
    Url.lastUpdateTime_ = Date.now();
    expect(() => UrlManager.updateURL()).not.toThrow();
  });

  it('writes nothing when the URL bar is disabled', () => {
    settingsManager.isDisableUrlBar = true;
    expect(() => UrlManager.updateURL()).not.toThrow();
    settingsManager.isDisableUrlBar = false;
  });

  it('builds a URL from the current state with extended params enabled', () => {
    settingsManager.isShowExtendedUrlParams = true;
    settingsManager.isDisableSensors = true;
    settingsManager.isDisableLaunchSites = true;
    settingsManager.isDisableBottomMenu = true;
    settingsManager.isEnableJscCatalog = false;
    settingsManager.limitSats = '25544';

    expect(() => UrlManager.updateURL(true)).not.toThrow();
  });

  it('includes selected-sat, search, rate, fts pitch/yaw and color params', () => {
    Url.selectedSat_ = { sccNum: '25544' };
    Url.searchString_ = 'ISS';
    Url.propRate_ = 2;
    settingsManager.isShowExtendedUrlParams = true;
    settingsManager.core.regimeFilter = ['geo'];
    settingsManager.isOrbitCruncherInEcf = true;
    settingsManager.numberOfEcfOrbitsToDraw = 2;
    ServiceLocator.getMainCamera().state = { ftsPitch: 0.5, ftsYaw: 0.5, camPitch: 0.5, camYaw: 0.5, camDistBuffer: 100 } as never;
    ServiceLocator.getColorSchemeManager().currentColorScheme = { id: 'VelocityColorScheme' } as never;

    expect(() => UrlManager.updateURL()).not.toThrow();
  });

  it('uses camera pitch/yaw when no satellite is selected', () => {
    Url.selectedSat_ = null;
    ServiceLocator.getMainCamera().state = { ftsPitch: 0, ftsYaw: 0, camPitch: 0.5, camYaw: 0.5, camDistBuffer: 100 } as never;

    expect(() => UrlManager.updateURL()).not.toThrow();
  });

  it('skips the write when live updates are off and not forced', () => {
    settingsManager.isUpdateUrlBarLive = false;
    const before = window.location.href;

    UrlManager.updateURL();
    expect(window.location.href).toBe(before);
  });

  it('writes when forced even if live updates are off', () => {
    settingsManager.isUpdateUrlBarLive = false;
    expect(() => UrlManager.updateURL(true, true)).not.toThrow();
  });

  afterEach(() => {
    settingsManager.isUpdateUrlBarLive = false;
    Url.selectedSat_ = null;
    Url.searchString_ = '';
    Url.propRate_ = 1;
    settingsManager.core.regimeFilter = [];
  });
});

describe('UrlManager.getShareUrl', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    const cam = ServiceLocator.getMainCamera();

    cam.zoomLevel = vi.fn(() => 0.5) as never;
    cam.state = { ftsPitch: 0, ftsYaw: 0, camPitch: 0, camYaw: 0, camDistBuffer: 100 } as never;
    const tm = ServiceLocator.getTimeManager();

    tm.staticOffset = 0;
    tm.dynamicOffsetEpoch = Date.now();
  });

  it('returns a non-empty URL containing the current zoom', () => {
    const url = UrlManager.getShareUrl();

    expect(typeof url).toBe('string');
    expect(url).toContain('zoom=0.50');
  });

  it('does not navigate (leaves window.location unchanged)', () => {
    const before = window.location.href;

    UrlManager.getShareUrl();
    expect(window.location.href).toBe(before);
  });
});
