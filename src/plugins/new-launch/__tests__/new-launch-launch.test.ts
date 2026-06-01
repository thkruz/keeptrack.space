/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { NewLaunch } from '@app/plugins/new-launch/new-launch';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { FormatTle, OrbitFinder } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('NewLaunch launch flow', () => {
  let plugin: NewLaunch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new NewLaunch();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
    p().isDoingCalculations_ = false;

    // launchFromSite_ reads these from the form / catalog.
    if (!getEl('nl-updown', true)) {
      document.body.insertAdjacentHTML('beforeend', '<input id="nl-updown" value="N" />');
    }
    (getEl('nl-facility') as HTMLInputElement).value = 'DLS';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ServiceLocator.getCatalogManager() as any).launchSites = { DLS: { lat: 51, lon: 60 } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ServiceLocator.getColorSchemeManager() as any).calculateColorBuffers = vi.fn();
    vi.spyOn(ServiceLocator.getTimeManager(), 'changeStaticOffset').mockImplementation(() => undefined as never);
    // errorManagerInstance.error re-throws in the test env; the code calls it on TLE-gen failure.
    vi.spyOn(errorManagerInstance, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  describe('launchFromSite_', () => {
    it('toasts and reverts the time offset when the orbit finder fails', () => {
      vi.spyOn(OrbitFinder.prototype, 'rotateOrbitToLatLon').mockReturnValue(['Error', 'boom'] as never);
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

      p().launchFromSite_(defaultSat, 5);

      expect(toast).toHaveBeenCalledWith(expect.stringContaining('Failed to Create TLE'), expect.anything());
      expect(p().isDoingCalculations_).toBe(false);
    });

    it('toasts when the generated TLE1 is not 69 characters', () => {
      vi.spyOn(OrbitFinder.prototype, 'rotateOrbitToLatLon').mockReturnValue(['short', 'y'.repeat(69)] as never);
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

      p().launchFromSite_(defaultSat, 5);

      expect(toast).toHaveBeenCalledWith(expect.stringContaining('Invalid TLE1'), expect.anything());
    });
  });

  describe('createNominalSat_', () => {
    it('returns null when TLE generation fails', () => {
      vi.spyOn(FormatTle, 'createTle').mockReturnValue({ tle1: 'Error', tle2: 'boom' } as never);

      expect(p().createNominalSat_(defaultSat, '00005', 5)).toBeNull();
    });

    it('toasts on an invalid eccentricity format', () => {
      vi.spyOn(FormatTle, 'createTle').mockReturnValue({ tle1: 'Error', tle2: 'boom' } as never);
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
      // 9 fractional digits -> fails the /^\d{7}$/ eccentricity-format check.
      const badSat = Object.assign(Object.create(Object.getPrototypeOf(defaultSat)), defaultSat, { eccentricity: 0.123456789 });

      const result = p().createNominalSat_(badSat, '00005', 5);

      expect(toast).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('executeLaunch_', () => {
    it('creates a nominal sat in the first free slot and launches it', () => {
      const nominal = { active: false, id: 42, sccNum: '90042' };

      vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockReturnValue(nominal as never);
      const createSpy = vi.spyOn(p(), 'createNominalSat_').mockReturnValue(defaultSat as never);
      const launchSpy = vi.spyOn(p(), 'launchFromSite_').mockImplementation(() => undefined);

      p().executeLaunch_(defaultSat);

      expect(createSpy).toHaveBeenCalled();
      expect(launchSpy).toHaveBeenCalledWith(defaultSat, 42);
    });

    it('aborts the launch when nominal-sat creation fails', () => {
      const nominal = { active: false, id: 42, sccNum: '90042' };

      vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockReturnValue(nominal as never);
      vi.spyOn(p(), 'createNominalSat_').mockReturnValue(null as never);
      const launchSpy = vi.spyOn(p(), 'launchFromSite_').mockImplementation(() => undefined);

      p().executeLaunch_(defaultSat);

      expect(launchSpy).not.toHaveBeenCalled();
      expect(p().isDoingCalculations_).toBe(false);
    });
  });
});
