/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { getEl } from '@app/engine/utils/get-el';
import { ProximityOps, ProximityOpsEvent } from '@app/plugins/proximity-ops/proximity-ops';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsMenuPlugin } from '@app/plugins/settings-menu/settings-menu';
import { settingsManager as moduleSettingsManager } from '@app/settings/settings';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const rpoEvent = (over: Partial<ProximityOpsEvent> = {}): ProximityOpsEvent => ({
  sat1Id: 0,
  sat1SccNum: '00005',
  sat1Name: 'ISS',
  sat2Id: 1,
  sat2SccNum: '25544',
  sat2Name: 'TIANGONG',
  date: new Date('2026-05-31T00:00:00.000Z'),
  ric: { position: { x: 1, y: 2, z: 3 }, velocity: { x: 0.1, y: 0.2, z: 0.3 } },
  dist: 12.34,
  vel: 0.56,
  pc: null,
  ...over,
});

const cloneSat = (over: Record<string, unknown> = {}) =>
  Object.assign(Object.create(Object.getPrototypeOf(defaultSat)), defaultSat, { id: 2, ...over });

describe('ProximityOps lifecycle / search orchestration', () => {
  let plugin: ProximityOps;
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new ProximityOps();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getKeyboardShortcuts callback', () => {
    it("the 'X' shortcut callback invokes bottomMenuClicked without throwing", () => {
      const spy = vi.spyOn(plugin, 'bottomMenuClicked').mockImplementation(() => undefined);
      const shortcut = plugin.getKeyboardShortcuts()[0];

      expect(() => shortcut.callback()).not.toThrow();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('bottomIconCallback', () => {
    it('opens the secondary menu when results exist and the settings menu is closed', () => {
      plugin.RPOs = [rpoEvent()];
      p().isSideMenuSettingsOpen = false;
      const spy = vi.spyOn(plugin, 'openSecondaryMenu').mockImplementation(() => undefined);

      plugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });

    it('does not open the secondary menu when there are no results', () => {
      plugin.RPOs = [];
      const spy = vi.spyOn(plugin, 'openSecondaryMenu').mockImplementation(() => undefined);

      plugin.bottomIconCallback();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('canUseWorker_', () => {
    it('returns false under Node (isThisNode) even with a ready thread manager', () => {
      p().threadManager_ = { isReady: true };

      expect(p().canUseWorker_()).toBe(false);
    });
  });

  describe('onFormSubmit', () => {
    it('cancels the in-flight survey when one is already running', () => {
      p().isSearching_ = true;
      const cancel = vi.spyOn(p(), 'cancelSearch_').mockImplementation(() => undefined);
      const gather = vi.spyOn(p(), 'gatherSearch_');

      plugin.onFormSubmit();

      expect(cancel).toHaveBeenCalled();
      expect(gather).not.toHaveBeenCalled();
    });

    it('runs the synchronous fallback search and finalizes results in Node', () => {
      const request = { mode: 'single', sats: [], params: {} };

      vi.spyOn(p(), 'persistInputs_').mockImplementation(() => undefined);
      vi.spyOn(p(), 'gatherSearch_').mockReturnValue(request);
      const run = vi.spyOn(p(), 'runSearch_').mockReturnValue([rpoEvent()]);
      const finalize = vi.spyOn(p(), 'finalizeResults_').mockImplementation(() => undefined);

      plugin.onFormSubmit();

      expect(run).toHaveBeenCalledWith(request);
      expect(finalize).toHaveBeenCalledWith([rpoEvent()]);
    });

    it('bails out when gatherSearch_ returns null (already toasted)', () => {
      vi.spyOn(p(), 'persistInputs_').mockImplementation(() => undefined);
      vi.spyOn(p(), 'gatherSearch_').mockReturnValue(null);
      const run = vi.spyOn(p(), 'runSearch_');

      plugin.onFormSubmit();

      expect(run).not.toHaveBeenCalled();
    });
  });

  describe('runSearch_ mode dispatch', () => {
    const params = {
      maxDis: 1e9, maxVel: 1e9, durationSec: 600, baseTimeMs: Date.parse('2022-01-01T00:00:00Z'),
      stepSeconds: 60, refineToleranceMs: 500,
    };

    it('dispatches the GEO all-vs-all survey', () => {
      const out = p().runSearch_({ mode: 'ava-geo', sats: [], params });

      expect(Array.isArray(out)).toBe(true);
    });

    it('dispatches the LEO all-vs-all survey', () => {
      const out = p().runSearch_({ mode: 'ava-leo', sats: [], params });

      expect(Array.isArray(out)).toBe(true);
    });

    it('dispatches the single-satellite pairwise search', () => {
      const out = p().runSearch_({ mode: 'single', sats: [defaultSat, cloneSat()], params });

      expect(Array.isArray(out)).toBe(true);
    });
  });

  describe('gatherSearch_ all-vs-all path', () => {
    it('returns an ava-geo request with the filtered candidate set', () => {
      (getEl('proximity-ops-ava') as HTMLInputElement).checked = true;
      (getEl('proximity-ops-type') as HTMLInputElement).value = 'GEO';
      vi.spyOn(p(), 'getFilteredSatellites').mockReturnValue([defaultSat]);

      const request = p().gatherSearch_();

      expect(request.mode).toBe('ava-geo');
      expect(request.sats).toHaveLength(1);
    });

    it('returns an ava-leo request when the orbit type is LEO', () => {
      (getEl('proximity-ops-ava') as HTMLInputElement).checked = true;
      (getEl('proximity-ops-type') as HTMLInputElement).value = 'LEO';
      vi.spyOn(p(), 'getFilteredSatellites').mockReturnValue([defaultSat]);

      const request = p().gatherSearch_();

      expect(request.mode).toBe('ava-leo');
    });

    it('returns a single-mode request resolving the typed NORAD id', () => {
      (getEl('proximity-ops-ava') as HTMLInputElement).checked = false;
      (getEl('proximity-ops-type') as HTMLInputElement).value = 'GEO';
      (getEl('proximity-ops-norad') as HTMLInputElement).value = '5';
      // A truthy (non-zero) catalog id so the not-found guard does not trip.
      ServiceLocator.getCatalogManager().sccNum2Id = vi.fn(() => 5) as never;
      vi.spyOn(p(), 'findSatsById_').mockReturnValue([defaultSat]);

      const request = p().gatherSearch_();

      expect(request.mode).toBe('single');
      expect(request.sats).toHaveLength(1);
    });
  });

  describe('buildParams_', () => {
    it('converts the duration field from hours to seconds', () => {
      (getEl('proximity-ops-maxDis') as HTMLInputElement).value = '100';
      (getEl('proximity-ops-maxVel') as HTMLInputElement).value = '0.1';
      (getEl('proximity-ops-duration') as HTMLInputElement).value = '2';

      const params = p().buildParams_();

      expect(params.maxDis).toBe(100);
      expect(params.maxVel).toBeCloseTo(0.1);
      expect(params.durationSec).toBe(2 * 3600);
    });
  });

  describe('finalizeResults_', () => {
    it('stores, sorts, renders, counts the results, and opens the secondary menu', () => {
      vi.spyOn(p(), 'isSideMenuSettingsOpen', 'get').mockReturnValue(false);
      const open = vi.spyOn(plugin, 'openSecondaryMenu').mockImplementation(() => undefined);

      p().finalizeResults_([rpoEvent({ dist: 9 }), rpoEvent({ dist: 3 })]);

      expect(plugin.RPOs).toHaveLength(2);
      expect(open).toHaveBeenCalled();
      const count = getEl('proximity-ops-count');

      expect(count?.textContent).toBeTruthy();
    });

    it('toasts when no approaches are found', () => {
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');

      p().finalizeResults_([]);

      expect(plugin.RPOs).toHaveLength(0);
      expect(toast).toHaveBeenCalled();
    });
  });

  describe('updateCount_', () => {
    it('renders a closest-approach summary for a non-empty set', () => {
      plugin.RPOs = [rpoEvent({ dist: 5 }), rpoEvent({ dist: 1.5 })];

      p().updateCount_(2);

      const el = getEl('proximity-ops-count');

      // The closest miss distance (1.50) is surfaced regardless of sort.
      expect(el?.textContent).toContain('1.50');
    });

    it('renders the no-results message for an empty set', () => {
      plugin.RPOs = [];

      p().updateCount_(0);

      expect(getEl('proximity-ops-count')?.textContent).toBeTruthy();
    });
  });

  describe('sorting', () => {
    it('onSortHeaderClicked_ toggles direction on the active column', () => {
      plugin.RPOs = [rpoEvent({ dist: 9 }), rpoEvent({ dist: 3 })];
      p().sortKey_ = 'dist';
      p().sortAsc_ = true;

      p().onSortHeaderClicked_('dist');

      expect(p().sortAsc_).toBe(false);
    });

    it('onSortHeaderClicked_ switches to a new column ascending', () => {
      plugin.RPOs = [rpoEvent()];
      p().sortKey_ = 'date';
      p().sortAsc_ = false;

      p().onSortHeaderClicked_('vel');

      expect(p().sortKey_).toBe('vel');
      expect(p().sortAsc_).toBe(true);
    });

    it('applySortAndRender_ orders RPOs by the active key', () => {
      plugin.RPOs = [rpoEvent({ dist: 9 }), rpoEvent({ dist: 3 })];
      p().sortKey_ = 'dist';
      p().sortAsc_ = true;

      p().applySortAndRender_();

      expect(plugin.RPOs[0].dist).toBe(3);
    });
  });

  describe('progress + searching state', () => {
    it('setSearchingState_(true) shows the progress section and relabels the button', () => {
      p().setSearchingState_(true);

      expect((getEl('proximity-ops-progress-section') as HTMLElement).style.display).toBe('flex');
      expect(getEl('proximity-ops-submit')!.classList.contains('proximity-ops-cancel')).toBe(true);
    });

    it('setSearchingState_(false) hides the section and resets the bar to 0%', () => {
      p().setSearchingState_(true);
      p().setSearchingState_(false);

      expect((getEl('proximity-ops-progress-section') as HTMLElement).style.display).toBe('none');
      expect(getEl('proximity-ops-progress-label')?.textContent).toBe('0%');
    });

    it('updateProgress_ converts done/total into a clamped percentage', () => {
      p().updateProgress_(1, 4);

      expect(getEl('proximity-ops-progress-bar')!.style.width).toBe('25%');
      expect(getEl('proximity-ops-progress-label')?.textContent).toBe('25%');
    });

    it('updateProgress_ renders 0% when the total is zero', () => {
      p().updateProgress_(0, 0);

      expect(getEl('proximity-ops-progress-label')?.textContent).toBe('0%');
    });
  });

  describe('cancelSearch_', () => {
    it('cancels the thread manager survey and clears the searching state', () => {
      const cancelSurvey = vi.fn();

      p().threadManager_ = { cancelSurvey };
      p().isSearching_ = true;

      p().cancelSearch_();

      expect(cancelSurvey).toHaveBeenCalled();
      expect(p().isSearching_).toBe(false);
    });
  });

  describe('input persistence', () => {
    it('persistInputs_ then restoreInputs_ round-trips the form values', () => {
      (getEl('proximity-ops-maxDis') as HTMLInputElement).value = '250';
      (getEl('proximity-ops-maxVel') as HTMLInputElement).value = '0.3';
      (getEl('proximity-ops-duration') as HTMLInputElement).value = '12';
      (getEl('proximity-ops-type') as HTMLInputElement).value = 'LEO';
      (getEl('proximity-ops-payload-only') as HTMLInputElement).checked = true;
      (getEl('proximity-ops-no-vimpel') as HTMLInputElement).checked = true;

      p().persistInputs_();

      const stored = PersistenceManager.getInstance().getItem(StorageKey.PROXIMITY_OPS_SETTINGS);

      expect(stored).toBeTruthy();

      // Reset the fields then restore from storage.
      (getEl('proximity-ops-maxDis') as HTMLInputElement).value = '0';
      (getEl('proximity-ops-payload-only') as HTMLInputElement).checked = false;

      p().restoreInputs_();

      expect((getEl('proximity-ops-maxDis') as HTMLInputElement).value).toBe('250');
      expect((getEl('proximity-ops-type') as HTMLInputElement).value).toBe('LEO');
      expect((getEl('proximity-ops-payload-only') as HTMLInputElement).checked).toBe(true);
    });

    it('restoreInputs_ is a no-op when nothing is stored', () => {
      PersistenceManager.getInstance().saveItem(StorageKey.PROXIMITY_OPS_SETTINGS, '');

      expect(() => p().restoreInputs_()).not.toThrow();
    });

    it('restoreInputs_ swallows malformed JSON', () => {
      PersistenceManager.getInstance().saveItem(StorageKey.PROXIMITY_OPS_SETTINGS, '{not json');

      expect(() => p().restoreInputs_()).not.toThrow();
    });
  });

  describe('findSatsById_', () => {
    it('returns an empty list (GEO) when the primary has no LLA', () => {
      vi.spyOn(errorManagerInstance, 'error').mockImplementation(() => undefined);
      const primary = cloneSat({ id: 7, lla: () => null });

      ServiceLocator.getCatalogManager().getSat = vi.fn(() => primary) as never;
      vi.spyOn(p(), 'getFilteredSatellites').mockReturnValue([primary]);

      const sats = p().findSatsById_(7, 'GEO', 86400);

      expect(sats).toHaveLength(0);
    });

    it('keeps the primary first for an unknown orbit type', () => {
      vi.spyOn(errorManagerInstance, 'error').mockImplementation(() => undefined);
      const primary = cloneSat({ id: 7 });

      ServiceLocator.getCatalogManager().getSat = vi.fn(() => primary) as never;
      vi.spyOn(p(), 'getFilteredSatellites').mockReturnValue([primary, cloneSat({ id: 8 })]);

      const sats = p().findSatsById_(7, 'UNKNOWN', 86400);

      expect(sats[0]).toBe(primary);
    });
  });

  describe('updateNoradId_ GEO + VIMPEL branches', () => {
    it('selects the GEO preset for a high-period, low-inclination satellite', () => {
      const geoSat = {
        isSatellite: () => true,
        period: 24 * 60,
        inclination: 0.05,
        source: 999,
        sccNum: '40000',
      };

      vi.spyOn(SelectSatManager.prototype, 'getSelectedSat').mockReturnValue(geoSat as never);

      p().updateNoradId_();

      expect((getEl('proximity-ops-type') as HTMLInputElement).value).toBe('GEO');
      expect((getEl('proximity-ops-maxDis') as HTMLInputElement).value).toBe('100');
      expect((getEl('proximity-ops-norad') as HTMLInputElement).value).toBe('40000');
    });
  });

  describe('onEventClicked_ ECF toggling', () => {
    beforeEach(() => {
      vi.spyOn(ServiceLocator.getTimeManager(), 'changeStaticOffset').mockImplementation(() => undefined);
      vi.spyOn(p().selectSatManagerInstance, 'setSecondarySat').mockImplementation(() => undefined);
      vi.spyOn(p().selectSatManagerInstance, 'selectSat').mockImplementation(() => undefined);
      vi.spyOn(SettingsMenuPlugin, 'syncOnLoad').mockImplementation(() => undefined);
      vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);
    });

    it('switches GEO orbits into ECF when a high-perigee primary is selected', () => {
      moduleSettingsManager.isOrbitCruncherInEcf = false;
      p().selectSatManagerInstance.primarySatObj = { perigee: 35000 };

      p().onEventClicked_(rpoEvent());

      expect(moduleSettingsManager.isOrbitCruncherInEcf).toBe(true);
    });

    it('switches back to ECI when already in ECF', () => {
      moduleSettingsManager.isOrbitCruncherInEcf = true;
      p().selectSatManagerInstance.primarySatObj = { perigee: 35000 };

      p().onEventClicked_(rpoEvent());

      expect(moduleSettingsManager.isOrbitCruncherInEcf).toBe(false);
    });
  });

  describe('drawApproachLine_', () => {
    it('never throws even when the catalog lookup fails', () => {
      ServiceLocator.getCatalogManager().getSat = vi.fn(() => {
        throw new Error('no sat');
      }) as never;

      expect(() => p().drawApproachLine_(rpoEvent())).not.toThrow();
    });
  });

  describe('tableLabels_', () => {
    it('returns a label for every results column', () => {
      const labels = p().tableLabels_();

      expect(labels.target).toBeDefined();
      expect(labels.date).toBeDefined();
      expect(labels.relDistance).toBeDefined();
      expect(labels.pc).toBeDefined();
    });
  });
});
