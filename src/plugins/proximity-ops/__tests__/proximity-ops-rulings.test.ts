/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Gap batch 2 fixes and product rulings for Rendezvous and Proximity Operations: empty default target, Vimpel "0"
 * rejected, threshold validation, singular count, "Searching..." state, co-located pairs hidden, window-edge labels,
 * download toasts, close paths, Use Current Satellite, sim-time candidate filter and the cancellable chunked search.
 */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { ProximityOps, ProximityOpsEvent, SINGLE_SEARCH_CHUNK_SIZE } from '@app/plugins/proximity-ops/proximity-ops';
import { CO_LOCATED_MAX_KM, findClosestApproach, isCoLocated, partitionCoLocated, windowEdgeOf } from '@app/plugins/proximity-ops/proximity-ops-core';
import { rpoDateCell } from '@app/plugins/proximity-ops/proximity-ops-table';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { CatalogSource } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/** t7e for keys added in this change (the key union is regenerated later by generate-t7e). */
const tr = (key: string): string => t7e(`plugins.ProximityOps.${key}` as never);

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
  vel: 0.056,
  pc: null,
  maxDist: 40,
  windowEdge: null,
  ...over,
});

const cloneSat = (over: Record<string, unknown> = {}) => Object.assign(Object.create(Object.getPrototypeOf(defaultSat)), defaultSat, { id: 2, ...over });

const input = (id: string) => getEl(id) as HTMLInputElement;

describe('ProximityOps gap batch 2 fixes', () => {
  let plugin: ProximityOps;
  const p = () => plugin as any;
  let toast: ReturnType<typeof vi.spyOn>;
  const toastTexts = () => toast.mock.calls.map(([msg]) => String(msg));

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new ProximityOps();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
    toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
    // The UI manager instance outlives a test, so start every test with an empty call log.
    toast.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('target field (bug 1)', () => {
    it('starts empty instead of the NORAD 0 that resolves to a Vimpel object', () => {
      expect(input('proximity-ops-norad').value).toBe('');
    });

    it('an empty target asks for a NORAD ID and runs nothing', () => {
      input('proximity-ops-ava').checked = false;
      input('proximity-ops-norad').value = '';

      expect(p().gatherSearch_()).toBeNull();
      expect(toastTexts()).toEqual([tr('noradRequired')]);
    });

    it('"0" resolving to a JSC Vimpel object is rejected as not found', () => {
      input('proximity-ops-ava').checked = false;
      input('proximity-ops-norad').value = '0';
      ServiceLocator.getCatalogManager().sccNum2Id = vi.fn(() => 0) as never;
      ServiceLocator.getCatalogManager().getSat = vi.fn(() => cloneSat({ id: 0, source: CatalogSource.VIMPEL })) as never;
      const find = vi.spyOn(p(), 'findSatsById_');

      expect(p().gatherSearch_()).toBeNull();
      expect(find).not.toHaveBeenCalled();
      expect(toastTexts()[0]).toBe(tr('satNotFound').replace('{sccNum}', '0'));
    });

    it('an unknown id is rejected as not found', () => {
      input('proximity-ops-ava').checked = false;
      input('proximity-ops-norad').value = 'ZZZZZ';
      ServiceLocator.getCatalogManager().sccNum2Id = vi.fn(() => null) as never;

      expect(p().gatherSearch_()).toBeNull();
      expect(toastTexts()[0]).toBe(tr('satNotFound').replace('{sccNum}', 'ZZZZZ'));
    });

    it('catalog id 0 is a valid primary when it is not a Vimpel object', () => {
      ServiceLocator.getCatalogManager().sccNum2Id = vi.fn(() => 0) as never;
      ServiceLocator.getCatalogManager().getSat = vi.fn(() => cloneSat({ id: 0 })) as never;

      expect(p().resolvePrimaryId_('5')).toBe(0);
    });
  });

  describe('threshold validation (ruling 11)', () => {
    it.each([
      ['proximity-ops-maxDis', 'abc', 'maxDistThreshold'],
      ['proximity-ops-maxVel', '', 'maxRelativeVelocity'],
      ['proximity-ops-duration', '0', 'searchDuration'],
      ['proximity-ops-maxDis', '12abc', 'maxDistThreshold'],
      ['proximity-ops-maxVel', '-1', 'maxRelativeVelocity'],
    ])('rejects %s = "%s" with a toast naming the field', (id, value, labelKey) => {
      input('proximity-ops-maxDis').value = '100';
      input('proximity-ops-maxVel').value = '0.1';
      input('proximity-ops-duration').value = '24';
      input(id).value = value;
      const gather = vi.spyOn(p(), 'gatherSearch_');
      const persist = vi.spyOn(p(), 'persistInputs_');

      plugin.onFormSubmit();

      expect(gather).not.toHaveBeenCalled();
      expect(persist).not.toHaveBeenCalled();
      expect(toastTexts()).toEqual([tr('invalidThreshold').replace('{field}', tr(labelKey))]);
    });

    it('accepts positive numbers', () => {
      input('proximity-ops-maxDis').value = ' 250 ';
      input('proximity-ops-maxVel').value = '0.05';
      input('proximity-ops-duration').value = '6';

      expect(p().validateThresholds_()).toBe(true);
      expect(p().buildParams_().maxDis).toBe(250);
    });
  });

  describe('count text (bug 4)', () => {
    it('uses the singular for one approach', () => {
      plugin.RPOs = [rpoEvent({ dist: 85.17 })];
      p().updateCount_(1);

      expect(getEl('proximity-ops-count')?.textContent).toBe(tr('resultCountOne').replace('{closest}', '85.17'));
    });

    it('uses the plural for several', () => {
      plugin.RPOs = [rpoEvent({ dist: 3 }), rpoEvent({ dist: 4 })];
      p().updateCount_(2);

      expect(getEl('proximity-ops-count')?.textContent).toBe(tr('resultCount').replace('{count}', '2').replace('{closest}', '3.00'));
    });

    it('a new search clears the previous rows and shows "Searching..."', () => {
      p().finalizeResults_([rpoEvent()]);
      expect(getEl('proximity-ops-count')?.textContent).not.toBe(tr('searching'));

      p().startNewResults_();

      expect(getEl('proximity-ops-count')?.textContent).toBe(tr('searching'));
      expect(plugin.RPOs).toHaveLength(0);
      expect(getEl('proximity-ops-table')?.querySelectorAll('tr.proximity-ops-event')).toHaveLength(0);
    });

    it('cancel clears the "Searching..." count', () => {
      p().threadManager_ = { cancelSurvey: vi.fn() };
      p().startNewResults_();
      p().isSearching_ = true;

      p().cancelSearch_();

      expect(getEl('proximity-ops-count')?.textContent).toBe('');
    });
  });

  describe('co-located pairs (ruling 6)', () => {
    it('hides pairs that never separate by more than 1 km and says how many', () => {
      vi.spyOn(plugin, 'openSecondaryMenu').mockImplementation(() => undefined);

      p().finalizeResults_([rpoEvent({ sat2Id: 5, maxDist: 0.2, dist: 0 }), rpoEvent({ sat2Id: 6, maxDist: 0.9, dist: 0 }), rpoEvent({ sat2Id: 7, maxDist: 30, dist: 12 })]);

      expect(plugin.RPOs.map((e) => e.sat2Id)).toEqual([7]);
      const note = getEl('proximity-ops-hidden-note') as HTMLElement;

      expect(note.textContent).toBe(tr('coLocatedHidden').replace('{count}', '2'));
      expect(note.style.display).toBe('');
    });

    it('uses the singular note and hides it when nothing was dropped', () => {
      vi.spyOn(plugin, 'openSecondaryMenu').mockImplementation(() => undefined);
      const note = getEl('proximity-ops-hidden-note') as HTMLElement;

      p().finalizeResults_([rpoEvent({ maxDist: 0.5 })]);
      expect(note.textContent).toBe(tr('coLocatedHiddenOne'));

      p().finalizeResults_([rpoEvent({ maxDist: 5 })]);
      expect(note.style.display).toBe('none');
    });

    it('core helpers classify by the largest separation over the window', () => {
      expect(CO_LOCATED_MAX_KM).toBe(1);
      expect(isCoLocated(rpoEvent({ maxDist: 1 }))).toBe(true);
      expect(isCoLocated(rpoEvent({ maxDist: 1.01 }))).toBe(false);
      // A hand-built event without the field is never hidden.
      expect(isCoLocated(rpoEvent({ maxDist: undefined }))).toBe(false);
      expect(partitionCoLocated([rpoEvent({ maxDist: 0 }), rpoEvent()]).hiddenCount).toBe(1);
    });

    it('findClosestApproach reports a zero max separation for two objects sharing one TLE', () => {
      const event = findClosestApproach(defaultSat, cloneSat(), new Date('2022-01-01T00:00:00Z'), 3600);

      expect(event.maxDist).toBeLessThanOrEqual(CO_LOCATED_MAX_KM);
      expect(isCoLocated(event)).toBe(true);
    });
  });

  describe('window-edge minima (ruling 8)', () => {
    it('classifies a minimum at either edge of the window', () => {
      expect(windowEdgeOf(0, 3_600_000, 500)).toBe('start');
      expect(windowEdgeOf(900, 3_600_000, 500)).toBe('start');
      expect(windowEdgeOf(3_600_000, 3_600_000, 500)).toBe('end');
      expect(windowEdgeOf(1_800_000, 3_600_000, 500)).toBeNull();
    });

    it('labels the date cell', () => {
      const labels = { atWindowStart: 'at window start', atWindowEnd: 'at window end' };

      expect(rpoDateCell(rpoEvent({ windowEdge: 'start' }), labels)).toBe('2026-05-31 00:00 (at window start)');
      expect(rpoDateCell(rpoEvent({ windowEdge: 'end' }), labels)).toBe('2026-05-31 00:00 (at window end)');
      expect(rpoDateCell(rpoEvent(), labels)).toBe('2026-05-31 00:00');
    });
  });

  describe('download toasts (ruling 9)', () => {
    it('before any search: "Run a search first."', () => {
      plugin.downloadIconCb();

      expect(toastTexts()).toEqual([tr('runSearchFirst')]);
    });

    it('after a search with no results: "No RPOs to download."', () => {
      vi.spyOn(plugin, 'openSecondaryMenu').mockImplementation(() => undefined);
      p().finalizeResults_([]);
      toast.mockClear();

      plugin.downloadIconCb();

      expect(toastTexts()).toEqual([tr('noRposToDownload')]);
    });
  });

  describe('closing the menu (ruling 10)', () => {
    it('drawer / Shift+X close also closes the results panel', () => {
      plugin.RPOs = [rpoEvent()];
      p().isMenuButtonActive = false;
      p().isSideMenuSettingsOpen = true;
      const close = vi.spyOn(plugin, 'closeSecondaryMenu').mockImplementation(() => undefined);
      const open = vi.spyOn(plugin, 'openSecondaryMenu').mockImplementation(() => undefined);

      plugin.bottomIconCallback();

      expect(close).toHaveBeenCalled();
      expect(open).not.toHaveBeenCalled();
    });

    it('a close with the panel already shut does not reopen it', () => {
      plugin.RPOs = [rpoEvent()];
      p().isMenuButtonActive = false;
      p().isSideMenuSettingsOpen = false;
      const open = vi.spyOn(plugin, 'openSecondaryMenu').mockImplementation(() => undefined);

      plugin.bottomIconCallback();

      expect(open).not.toHaveBeenCalled();
    });
  });

  describe('Use Current Satellite (rulings 13 and 15)', () => {
    it('turns All vs All off and fills the 100 km LEO preset', () => {
      vi.spyOn(SelectSatManager.prototype, 'getSelectedSat').mockReturnValue(defaultSat as never);
      input('proximity-ops-ava').checked = true;

      p().updateNoradId_();

      expect(input('proximity-ops-ava').checked).toBe(false);
      expect(input('proximity-ops-maxDis').value).toBe('100');
      expect(input('proximity-ops-norad').value).toBe(defaultSat.sccNum);
    });

    it('a Vimpel object toasts instead of writing the message into the NORAD field', () => {
      vi.spyOn(SelectSatManager.prototype, 'getSelectedSat').mockReturnValue(cloneSat({ source: CatalogSource.VIMPEL }) as never);
      input('proximity-ops-norad').value = '';

      p().updateNoradId_();

      expect(input('proximity-ops-norad').value).toBe('');
      expect(toastTexts()).toContain(t7e('plugins.ProximityOps.vimpelNotSupported'));
    });
  });

  describe('results header button (bug 5)', () => {
    it('is named for the results list it opens', () => {
      const btn = getEl('proximityOps-menu-secondary-btn', true);

      // The button only exists when the title bar is rendered in this environment.
      if (btn) {
        expect(btn.querySelector('img')?.getAttribute('alt')).toBe(tr('resultsButton'));
        expect(btn.getAttribute('aria-label')).toBe(tr('resultsButton'));
      }
    });
  });

  describe('candidate filter uses the sim time (bug 6)', () => {
    it('evaluates every GEO longitude at the search date, not the wall clock', () => {
      const searchDate = new Date('2030-01-01T00:00:00Z');
      const primaryLla = vi.fn(() => ({ lat: 0, lon: 10 }));
      const otherLla = vi.fn(() => ({ lat: 0, lon: 10.5 }));
      const primary = cloneSat({ id: 7, lla: primaryLla });
      const other = cloneSat({ id: 8, lla: otherLla, period: 1436 });

      ServiceLocator.getCatalogManager().getSat = vi.fn(() => primary) as never;
      vi.spyOn(p(), 'getFilteredSatellites').mockReturnValue([primary, other]);

      const sats = p().findSatsById_(7, 'GEO', 86400, searchDate);

      expect(primaryLla).toHaveBeenCalledWith(searchDate);
      expect(otherLla).toHaveBeenCalledWith(searchDate);
      expect(sats.map((s: { id: number }) => s.id)).toEqual([7, 8]);
    });
  });

  describe('cancellable single-satellite worker search (bug 3)', () => {
    const fakeCandidates = (n: number) => Array.from({ length: n + 1 }, (_, i) => cloneSat({ id: 100 + i, sccNum: String(100 + i) }));
    const params = { maxDis: 100, maxVel: 0.1, durationSec: 3600, baseTimeMs: 0, stepSeconds: 60, refineToleranceMs: 500 };

    const fakeThreadManager = () => {
      const runs: { sats: { id: number }[]; callbacks: { onComplete: (events: ProximityOpsEvent[]) => void; onProgress: (d: number, t: number) => void } }[] = [];

      return {
        runs,
        manager: {
          startSurvey: vi.fn((request: { sats: { id: number }[] }, callbacks: (typeof runs)[number]['callbacks']) => {
            runs.push({ sats: request.sats, callbacks });

            return runs.length;
          }),
          cancelSurvey: vi.fn(),
        },
      };
    };

    it('screens the candidates in chunks with the primary first and finalizes once', () => {
      vi.useFakeTimers();
      const { runs, manager } = fakeThreadManager();
      const finalize = vi.spyOn(p(), 'finalizeResults_').mockImplementation(() => undefined);
      const total = SINGLE_SEARCH_CHUNK_SIZE * 2 + 3;

      p().threadManager_ = manager;
      p().startNewResults_();
      p().runWorkerSingleSearch_({ mode: 'single', sats: fakeCandidates(total), params });

      for (let i = 0; i < 3; i++) {
        expect(runs).toHaveLength(i + 1);
        expect(runs[i].sats[0].id).toBe(100);
        runs[i].callbacks.onComplete([rpoEvent({ sat2Id: i })]);
        vi.runAllTimers();
      }

      expect(runs.map((r) => r.sats.length - 1)).toEqual([SINGLE_SEARCH_CHUNK_SIZE, SINGLE_SEARCH_CHUNK_SIZE, 3]);
      expect(finalize).toHaveBeenCalledTimes(1);
      expect((finalize.mock.calls[0][0] as ProximityOpsEvent[]).map((e) => e.sat2Id)).toEqual([0, 1, 2]);
      expect(p().isSearching_).toBe(false);
    });

    it('Cancel stops after the current chunk: no further chunk is sent and nothing is finalized', () => {
      vi.useFakeTimers();
      const { runs, manager } = fakeThreadManager();
      const finalize = vi.spyOn(p(), 'finalizeResults_').mockImplementation(() => undefined);

      p().threadManager_ = manager;
      p().startNewResults_();
      p().runWorkerSingleSearch_({ mode: 'single', sats: fakeCandidates(SINGLE_SEARCH_CHUNK_SIZE * 5), params });
      expect(p().isSearching_).toBe(true);

      // The submit row is Cancel while searching.
      plugin.onFormSubmit();

      expect(manager.cancelSurvey).toHaveBeenCalled();
      expect(p().isSearching_).toBe(false);
      // A late completion of the chunk in flight does not schedule the next one.
      runs[0].callbacks.onComplete([]);
      vi.runAllTimers();

      expect(runs).toHaveLength(1);
      expect(finalize).not.toHaveBeenCalled();
    });

    it('maps chunk progress onto the whole candidate list', () => {
      const { runs, manager } = fakeThreadManager();

      p().threadManager_ = manager;
      p().runWorkerSingleSearch_({ mode: 'single', sats: fakeCandidates(SINGLE_SEARCH_CHUNK_SIZE * 2), params });
      runs[0].callbacks.onProgress(SINGLE_SEARCH_CHUNK_SIZE / 2, SINGLE_SEARCH_CHUNK_SIZE);

      expect(getEl('proximity-ops-progress-label')?.textContent).toBe('25%');
    });

    it('a primary with no candidates finalizes an empty result at once', () => {
      const { runs, manager } = fakeThreadManager();
      const finalize = vi.spyOn(p(), 'finalizeResults_').mockImplementation(() => undefined);

      p().threadManager_ = manager;
      p().runWorkerSingleSearch_({ mode: 'single', sats: fakeCandidates(0), params });

      expect(runs).toHaveLength(0);
      expect(finalize).toHaveBeenCalledWith([]);
    });
  });
});
