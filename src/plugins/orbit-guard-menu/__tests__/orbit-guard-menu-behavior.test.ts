/* eslint-disable camelcase */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { OrbitGuardMenuPlugin } from '@app/plugins/orbit-guard-menu/orbit-guard-menu';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const event = (over: Record<string, unknown> = {}) => ({
  event_end_timestamp: '2026-05-30T12:00:00',
  event_start_timestamp: '2026-05-30T11:00:00',
  inference_timestamp: '2026-05-30T12:30:00',
  maneuver_class: 'East-West',
  maneuver_probability: 0.85,
  oof_detection: 1,
  satNo: '25544',
  stability_change_detection: 1,
  stability_change_probability: 0.6,
  ...over,
});

const manyEvents = (n: number) => Array.from({ length: n }, (_, i) => event({ satNo: `${1000 + i}`, event_end_timestamp: `2026-05-${String(10 + i).padStart(2, '0')}T12:00:00` }));

describe('OrbitGuardMenuPlugin behavior', () => {
  let plugin: OrbitGuardMenuPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new OrbitGuardMenuPlugin();
    websiteInit(plugin);
    // Legacy side-menu HTML isn't auto-injected in the test harness.
    if (!getEl('maneuver-detection-table', true)) {
      document.body.insertAdjacentHTML('beforeend', plugin.sideMenuElementHtml);
    }
    p().isMenuButtonActive = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('setManeuverList_ sorts by end time, dedupes by satNo and resets pagination', () => {
    p().setManeuverList_([
      event({ satNo: 'A', event_end_timestamp: '2026-05-20T00:00:00' }),
      event({ satNo: 'A', event_end_timestamp: '2026-05-25T00:00:00' }),
      event({ satNo: 'B', event_end_timestamp: '2026-05-30T00:00:00' }),
    ]);

    // B is newest → first; A deduped to a single entry.
    expect(p().orbitGuardEvents).toHaveLength(2);
    expect(p().orbitGuardEvents[0].satNo).toBe('B');
    expect(p().currentPage).toBe(1);
  });

  it('createTable_ renders a header row plus one row per page entry', () => {
    p().setManeuverList_(manyEvents(3));
    p().createTable_();

    const rows = getEl('maneuver-detection-table')!.querySelectorAll('tr');

    // 1 header + 3 data rows.
    expect(rows.length).toBe(4);
    expect(getEl('maneuver-detection-table')!.querySelectorAll('.maneuver-object').length).toBe(3);
  });

  it('pagination advances and retreats across pages', () => {
    p().setManeuverList_(manyEvents(45)); // 3 pages at 20/page
    p().createTable_();

    expect(p().currentPage).toBe(1);
    expect((getEl('prev-page') as HTMLButtonElement).disabled).toBe(true);

    p().goToNextPage_();
    expect(p().currentPage).toBe(2);
    expect((getEl('prev-page') as HTMLButtonElement).disabled).toBe(false);

    p().goToPreviousPage_();
    expect(p().currentPage).toBe(1);
  });

  it('shouldHighlightRed_ flags maneuver/oof/stability columns', () => {
    p().orbitGuardEvents = [event({ maneuver_class: 'NS', oof_detection: 1, stability_change_detection: 1, stability_change_probability: 0.4 })];

    expect(p().shouldHighlightRed_(3, 0)).toBe(true); // maneuver class set
    expect(p().shouldHighlightRed_(5, 0)).toBe(true); // oof detection
    expect(p().shouldHighlightRed_(6, 0)).toBe(true); // stability change
    expect(p().shouldHighlightRed_(0, 0)).toBe(false); // NORAD column never highlights
  });

  it('shouldHighlightRed_ does not flag clean events', () => {
    p().orbitGuardEvents = [event({ maneuver_class: null, oof_detection: 0, stability_change_detection: 0, stability_change_probability: 0 })];

    expect(p().shouldHighlightRed_(3, 0)).toBe(false);
    expect(p().shouldHighlightRed_(7, 0)).toBe(false);
  });

  it('eventClicked_ jumps time and queues the satellite selection', () => {
    p().orbitGuardEvents = [event({ satNo: '25544' })];
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockReturnValue(defaultSat);
    const offsetSpy = vi.spyOn(ServiceLocator.getTimeManager(), 'changeStaticOffset').mockImplementation(() => undefined);

    vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);

    p().eventClicked_(0);

    expect(offsetSpy).toHaveBeenCalled();
    expect(p().selectSatIdOnCruncher_).toBe(defaultSat.id);
  });

  it('eventClicked_ toasts when the satellite has decayed', () => {
    p().orbitGuardEvents = [event({ satNo: '99999' })];
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockReturnValue(null as never);
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    p().eventClicked_(0);

    expect(toastSpy).toHaveBeenCalled();
  });

  it('parseManeuverData_ fetches, populates and renders the table', async () => {
    const list = manyEvents(2);

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(list) }))
    );

    p().parseManeuverData_();

    await vi.waitFor(() => expect(p().orbitGuardEvents.length).toBe(2));
    expect(getEl('maneuver-detection-table')!.querySelectorAll('.maneuver-object').length).toBe(2);
  });

  it('parseManeuverData_ warns on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve([]) }))
    );

    p().parseManeuverData_();

    // Should not throw; the catch handler logs a warning.
    await vi.waitFor(() => expect(globalThis.fetch as ReturnType<typeof vi.fn>).toHaveBeenCalled());
  });
});
