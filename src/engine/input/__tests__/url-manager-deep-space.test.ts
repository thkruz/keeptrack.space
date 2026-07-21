import { DeepSpaceDesignators } from '@app/app/data/deep-space-designators';
import { CameraType } from '@app/engine/camera/camera-type';
import { SolarBody } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { UrlManager } from '@app/engine/input/url-manager';
import { createDeepSpaceSatellites } from '@app/engine/rendering/draw-manager/celestial-bodies/deep-space-satellite-catalog';
import { settingsManager } from '@app/settings/settings';
import { ChebyshevCoefficients } from '@ootk/src/interpolator/ChebyshevCoefficients';
import { Seconds } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

/*
 * ?sat=/?intldes= resolution for deep-space objects with no TLE (Voyager 1 is
 * NORAD 10321). External sites link with real NORAD IDs; these must route to
 * the deep-space catalog instead of "not found".
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Url = UrlManager as any;

const VOYAGER_1 = 'Voyager 1';

/** Loads real (dummy-valued) Chebyshev coefficients so the probe reports ready. */
const makeProbeReady = async (name: string): Promise<void> => {
  const probe = ServiceLocator.getScene().deepSpaceSatellites[name];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await probe.init((global as any).mocks.glMock);
  probe.setCoefficients([new ChebyshevCoefficients(0 as Seconds, 1 as Seconds, new Float64Array(3), new Float64Array(3), new Float64Array(3))]);
};

describe('UrlManager deep-space designator fallback', () => {
  let toastSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupStandardEnvironment();

    // Probes are held on the Scene singleton; re-create them so per-test
    // mutations (readiness, deletion) cannot leak across tests.
    ServiceLocator.getScene().deepSpaceSatellites = createDeepSpaceSatellites();

    const catalog = ServiceLocator.getCatalogManager();

    catalog.sccNum2Id = vi.fn(() => null) as never;
    catalog.intlDes2id = vi.fn(() => null) as never;

    toastSpy = vi.fn();
    ServiceLocator.getUiManager().toast = toastSpy as never;
  });

  afterEach(() => {
    DeepSpaceDesignators.reset();
    settingsManager.centerBody = SolarBody.Earth;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('focuses Voyager 1 for sat=10321 when the ephemeris is ready', async () => {
    await makeProbeReady(VOYAGER_1);

    Url.handleSatParam_('10321');

    expect(settingsManager.centerBody).toBe(VOYAGER_1);
    expect(ServiceLocator.getMainCamera().cameraType).toBe(CameraType.FIXED_TO_EARTH);
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('focuses Voyager 1 for intldes=1977-084a (case-insensitive)', async () => {
    await makeProbeReady(VOYAGER_1);

    Url.handleIntldesParam_('1977-084a');

    expect(settingsManager.centerBody).toBe(VOYAGER_1);
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('waits for the async ephemeris load before focusing', async () => {
    vi.useFakeTimers();

    Url.handleSatParam_('10321');

    // Not ready yet: nothing focused, no toast
    expect(settingsManager.centerBody).toBe(SolarBody.Earth);
    expect(toastSpy).not.toHaveBeenCalled();

    await makeProbeReady(VOYAGER_1);
    vi.advanceTimersByTime(500);

    expect(settingsManager.centerBody).toBe(VOYAGER_1);
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('toasts the object name when the ephemeris never loads (timeout)', () => {
    vi.useFakeTimers();

    Url.handleSatParam_('10321');
    vi.advanceTimersByTime(500 * 31);

    expect(settingsManager.centerBody).toBe(SolarBody.Earth);
    expect(toastSpy).toHaveBeenCalledWith(expect.stringContaining(VOYAGER_1), expect.anything(), true);
  });

  it('toasts the object name when the probe was removed (fetch failed)', () => {
    delete ServiceLocator.getScene().deepSpaceSatellites[VOYAGER_1];

    Url.handleSatParam_('10321');

    expect(toastSpy).toHaveBeenCalledWith(expect.stringContaining(VOYAGER_1), expect.anything(), true);
  });

  it('toasts a named message for known objects without ephemeris', () => {
    DeepSpaceDesignators.register({ kind: 'knownObject', displayName: 'Voyager 2', sccNum: '10271' });

    Url.handleSatParam_('10271');

    expect(toastSpy).toHaveBeenCalledWith(expect.stringContaining('Voyager 2'), expect.anything(), true);
  });

  it('delegates to a deferred loader and stays quiet on success', async () => {
    const focus = vi.fn().mockResolvedValue(true);

    DeepSpaceDesignators.register({ kind: 'deferred', displayName: 'LUCY', sccNum: '49328', focus });

    Url.handleSatParam_('49328');

    expect(focus).toHaveBeenCalled();
    await Promise.resolve();
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('toasts when a deferred loader reports failure', async () => {
    const focus = vi.fn().mockResolvedValue(false);

    DeepSpaceDesignators.register({ kind: 'deferred', displayName: 'LUCY', sccNum: '49328', focus });

    Url.handleSatParam_('49328');
    await vi.waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(expect.stringContaining('LUCY'), expect.anything(), true);
    });
  });

  it('still toasts the generic not-found for unknown designators', () => {
    Url.handleSatParam_('99999');

    expect(toastSpy).toHaveBeenCalledWith(expect.stringContaining('99999'), expect.anything(), true);
    expect(settingsManager.centerBody).toBe(SolarBody.Earth);
  });

  it('emits sat=10321 in the share URL when Voyager 1 is the center body', () => {
    const cam = ServiceLocator.getMainCamera();

    cam.zoomLevel = vi.fn(() => 0.5) as never;
    cam.state = { ftsPitch: 0, ftsYaw: 0, camPitch: 0, camYaw: 0, camDistBuffer: 100 } as never;
    const tm = ServiceLocator.getTimeManager();

    tm.staticOffset = 0;
    tm.dynamicOffsetEpoch = Date.now();

    Url.selectedSat_ = null;
    settingsManager.centerBody = VOYAGER_1 as never;

    expect(UrlManager.getShareUrl()).toContain('sat=10321');
  });

  it('omits sat= from the share URL when centered on Earth with no selection', () => {
    const cam = ServiceLocator.getMainCamera();

    cam.zoomLevel = vi.fn(() => 0.5) as never;
    cam.state = { ftsPitch: 0, ftsYaw: 0, camPitch: 0, camYaw: 0, camDistBuffer: 100 } as never;
    const tm = ServiceLocator.getTimeManager();

    tm.staticOffset = 0;
    tm.dynamicOffsetEpoch = Date.now();

    Url.selectedSat_ = null;

    expect(UrlManager.getShareUrl()).not.toContain('sat=');
  });
});
