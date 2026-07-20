import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SatInfoBoxOrbitGuard } from '@app/plugins/sat-info-box-orbit-guard/sat-info-box-orbit-guard';
import { EL, SECTIONS } from '@app/plugins/sat-info-box-orbit-guard/sat-info-box-orbit-guard-html';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
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
      `<div id="${SECTIONS.MANEUVER}" style="display:none;">` + `<span id="${EL.COLLAPSE}">expand_less</span>` + `<div id="${EL.DATA}"></div></div>`
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
