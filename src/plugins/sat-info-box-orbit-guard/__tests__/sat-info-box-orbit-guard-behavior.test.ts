import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SatInfoBoxOrbitGuard } from '@app/plugins/sat-info-box-orbit-guard/sat-info-box-orbit-guard';
import { EL, SECTIONS } from '@app/plugins/sat-info-box-orbit-guard/sat-info-box-orbit-guard-html';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Satellite } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SatInfoBoxOrbitGuard behavior', () => {
  let plugin: SatInfoBoxOrbitGuard;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    plugin = new SatInfoBoxOrbitGuard();
    websiteInit(plugin);
    // Replace any section websiteInit created with a fresh one so listener
    // wiring in these tests is the only handler attached.
    document.getElementById(SECTIONS.MANEUVER)?.remove();
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div id="${SECTIONS.MANEUVER}" style="display:none;"><span id="${EL.COLLAPSE}">expand_less</span><div id="${EL.DATA}"></div></div>`
    );
    // createHistorical2dPlot_ builds echarts; isolate it.
    vi.spyOn(p(), 'createHistorical2dPlot_').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updateManeuverData_ hides the section for a non-satellite object', () => {
    p().updateManeuverData_({ isSatellite: () => false });

    expect(document.getElementById(SECTIONS.MANEUVER)!.style.display).toBe('none');
  });

  it('updateManeuverData_ uses cached data when available', () => {
    const processSpy = vi.spyOn(p(), 'processHistoricalData_');

    p().maneuverDataCache_.set(defaultSat.sccNum, [{ name: 'Elset', value: [1, 2] }]);

    p().updateManeuverData_(defaultSat);

    expect(processSpy).toHaveBeenCalled();
  });

  it('updateManeuverData_ fetches and caches when the data is not cached', async () => {
    const data = [{ name: 'Elset', value: [1] }];

    vi.spyOn(p(), 'fetchHistoricalPlotData_').mockResolvedValue(data);
    const processSpy = vi.spyOn(p(), 'processHistoricalData_').mockImplementation(() => undefined);

    p().updateManeuverData_(defaultSat);

    await vi.waitFor(() => expect(processSpy).toHaveBeenCalled());
    expect(p().maneuverDataCache_.get(defaultSat.sccNum)).toBe(data);
  });

  it('ignores historical success after deselection while still allowing cache population', async () => {
    let resolve: (data: unknown) => void = () => undefined;
    const data = [{ name: 'Elset', value: [1] }];

    vi.spyOn(p(), 'fetchHistoricalPlotData_').mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const process = vi.spyOn(p(), 'processHistoricalData_');

    p().updateManeuverData_(defaultSat);
    p().updateManeuverData_(undefined);
    resolve(data);
    await Promise.resolve();
    expect(process).not.toHaveBeenCalled();
    expect(p().maneuverDataCache_.get(defaultSat.sccNum)).toBe(data);
    expect(document.getElementById(SECTIONS.MANEUVER)!.style.display).toBe('none');
  });

  it('ignores stale success and error after selecting a newer identity', async () => {
    let resolveOld: (data: unknown) => void = () => undefined;
    let rejectOld: (error: Error) => void = () => undefined;
    const old = new Satellite({ ...defaultSat, id: 1, sccNum: '25545' });
    const latestData = [{ name: 'Elset current', value: [2] }];
    const oldData = [{ name: 'Elset old', value: [1] }];
    const fetch = vi.spyOn(p(), 'fetchHistoricalPlotData_');

    fetch.mockReturnValueOnce(
      new Promise((done) => {
        resolveOld = done;
      })
    );
    p().updateManeuverData_(old);
    p().maneuverDataCache_.set(defaultSat.sccNum, latestData);
    p().updateManeuverData_(defaultSat);
    const process = vi.spyOn(p(), 'processHistoricalData_');

    resolveOld(oldData);
    await Promise.resolve();
    expect(process).not.toHaveBeenCalled();
    expect(document.getElementById(SECTIONS.MANEUVER)!.style.display).not.toBe('none');
    p().maneuverDataCache_.delete(old.sccNum);
    fetch.mockReturnValueOnce(
      new Promise((_done, reject) => {
        rejectOld = reject;
      })
    );
    p().updateManeuverData_(old);
    p().updateManeuverData_(defaultSat);
    rejectOld(new Error('late request failure'));
    await Promise.resolve();
    await Promise.resolve();
    expect(document.getElementById(SECTIONS.MANEUVER)!.style.display).not.toBe('none');
  });

  it('processHistoricalData_ hides the section when there is no data', () => {
    p().processHistoricalData_([
      { name: 'Elset', value: [] },
      { name: 'EO Data', value: [] },
    ]);

    expect(document.getElementById(SECTIONS.MANEUVER)!.style.display).toBe('none');
  });

  it('processHistoricalData_ shows the section and draws the plot when data exists', () => {
    const plotSpy = vi.spyOn(p(), 'createHistorical2dPlot_');

    p().processHistoricalData_([{ name: 'Elset', value: [1, 2, 3] }]);

    expect(document.getElementById(SECTIONS.MANEUVER)!.style.display).not.toBe('none');
    expect(plotSpy).toHaveBeenCalled();
  });

  it('satInfoBoxAddListeners_ toggles the maneuver collapse on click', () => {
    p().satInfoBoxAddListeners_();

    const icon = document.getElementById(EL.COLLAPSE)!;
    const section = document.getElementById(SECTIONS.MANEUVER)!;

    icon.dispatchEvent(new MouseEvent('click'));
    expect(section.classList.contains('collapsed')).toBe(true);
    expect(icon.textContent).toBe('expand_more');

    icon.dispatchEvent(new MouseEvent('click'));
    expect(section.classList.contains('collapsed')).toBe(false);
  });
});
