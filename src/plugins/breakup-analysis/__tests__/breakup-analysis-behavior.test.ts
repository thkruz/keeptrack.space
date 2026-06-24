import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { BreakupAnalysis } from '@app/plugins/breakup-analysis/breakup-analysis';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SpaceObjectType } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const fakeSat = (over: Record<string, unknown> = {}) => ({
  isSatellite: () => true,
  type: SpaceObjectType.DEBRIS,
  intlDes: '1999-025A',
  active: true,
  sccNum: '25730',
  name: 'FENGYUN 1C DEB',
  perigee: 800,
  apogee: 900,
  inclination: 98.5,
  eccentricity: 0.005,
  getTypeString: () => 'Debris',
  ...over,
});

describe('BreakupAnalysis behavior', () => {
  let plugin: BreakupAnalysis;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new BreakupAnalysis();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('findDebrisForEvent_ collects active sats whose intlDes matches the prefix', () => {
    const matching = fakeSat({ intlDes: '1999-025A', sccNum: '1' });
    const other = fakeSat({ intlDes: '2000-001A', sccNum: '2' });
    const inactive = fakeSat({ intlDes: '1999-025B', active: false, sccNum: '3' });

    vi.spyOn(ServiceLocator.getCatalogManager(), 'numSatellites', 'get').mockReturnValue(3);
    ServiceLocator.getCatalogManager().objectCache = [matching, other, inactive] as never;

    const results = p().findDebrisForEvent_({ intlDesPrefix: '1999-025' });

    expect(results).toHaveLength(1);
    expect(results[0].sccNum).toBe('1');
  });

  it('filterDebrisOnGlobe_ searches the joined sccNums', () => {
    const searchSpy = vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);

    p().debrisResults_ = [fakeSat({ sccNum: '111' }), fakeSat({ sccNum: '222' })];
    p().filterDebrisOnGlobe_();

    expect(searchSpy).toHaveBeenCalledWith('111,222');
  });

  it('bumps the search limit then restores it on back/close', () => {
    vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);
    settingsManager.searchLimit = 2;
    p().debrisResults_ = [fakeSat({ sccNum: '1' }), fakeSat({ sccNum: '2' }), fakeSat({ sccNum: '3' })];

    p().filterDebrisOnGlobe_();
    expect(settingsManager.searchLimit).toBe(3);

    p().showEventList_();
    expect(settingsManager.searchLimit).toBe(2);
  });

  it('onBottomIconDeselect restores the search limit', () => {
    vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);
    settingsManager.searchLimit = 1;
    p().debrisResults_ = [fakeSat({ sccNum: '1' }), fakeSat({ sccNum: '2' })];

    p().filterDebrisOnGlobe_();
    expect(settingsManager.searchLimit).toBe(2);

    plugin.onBottomIconDeselect();
    expect(settingsManager.searchLimit).toBe(1);
  });

  it('selectEvent_ renders the detail panel and reveals it', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'numSatellites', 'get').mockReturnValue(1);
    ServiceLocator.getCatalogManager().objectCache = [fakeSat({ intlDes: '1999-025A' })] as never;
    vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);

    p().selectEvent_('fengyun1c');

    expect(p().selectedEventId_).toBe('fengyun1c');
    expect(getEl('breakup-analysis-detail')!.style.display).toBe('block');
    expect(getEl('breakup-analysis-event-info')!.innerHTML.length).toBeGreaterThan(0);
    expect(getEl('breakup-analysis-stats')!.innerHTML.length).toBeGreaterThan(0);
  });

  it('selectEvent_ ignores an unknown event id', () => {
    p().selectEvent_('does-not-exist');

    expect(p().selectedEventId_).not.toBe('does-not-exist');
  });

  it('showEventList_ resets selection and shows the list view', () => {
    vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);
    p().selectedEventId_ = 'fengyun1c';
    p().debrisResults_ = [fakeSat()];

    p().showEventList_();

    expect(p().selectedEventId_).toBeNull();
    expect(p().debrisResults_).toStrictEqual([]);
    expect(getEl('breakup-analysis-event-list')!.style.display).toBe('block');
  });

  it('selecting a fragment row jumps to that satellite (single delegated listener)', () => {
    p().debrisResults_ = [fakeSat({ sccNum: '25730' })];
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Id').mockReturnValue(7);
    const selectSpy = vi.spyOn(SelectSatManager.prototype, 'selectSat').mockImplementation(() => undefined as never);

    // Render the table twice; the delegated listener lives on the persistent
    // container, so a row click must fire selectSat exactly once (no per-render leak).
    p().renderDispersion_();
    p().renderDispersion_();

    const row = getEl('breakup-analysis-dispersion')!.querySelector('[data-scc]')!;

    row.querySelector('td')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(selectSpy).toHaveBeenCalledTimes(1);
    expect(selectSpy).toHaveBeenCalledWith(7);
  });

  it('clicking a sortable header flips the sort direction', () => {
    p().debrisResults_ = [fakeSat({ perigee: 900, sccNum: '1' }), fakeSat({ perigee: 700, sccNum: '2' })];
    p().sortKey_ = 'perigee';
    p().sortDir_ = 'asc';
    p().renderDispersion_();

    const header = getEl('breakup-analysis-dispersion')!.querySelector('[data-sort-key="perigee"]')!;

    header.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(p().sortDir_).toBe('desc');
    expect(p().debrisResults_.map((s: { perigee: number }) => s.perigee)).toEqual([900, 700]);
  });

  it('exportCsv_ warns instead of saving when there are no fragments', () => {
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined as never);

    p().debrisResults_ = [];
    p().exportCsv_();

    expect(toastSpy).toHaveBeenCalled();
  });
});
