import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { saveXlsx } from '@app/engine/utils/saveVariable';
import { BestPassPlugin } from '@app/plugins/best-pass/best-pass';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

vi.mock('@app/engine/utils/saveVariable', () => ({
  saveXlsx: vi.fn(),
  saveCsv: vi.fn(),
  saveVariable: vi.fn(),
  copyTsvToClipboard: vi.fn(),
  getCircularReplacer: vi.fn(),
}));

describe('BestPassPlugin behavior', () => {
  let plugin: BestPassPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = BestPassPlugin as any;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new BestPassPlugin();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
    ServiceLocator.getSensorManager().currentSensors = [defaultSensor];
    vi.mocked(saveXlsx).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emptyRow_ returns an all-null row', () => {
    const row = C.emptyRow_();

    expect(row.PASS_SCORE).toBeNull();
    expect(row.START_DTG).toBeNull();
    expect(Object.values(row).every((v) => v === null)).toBe(true);
  });

  it('updateSensorButton_ enables/disables the submit button', () => {
    C.updateSensorButton_(defaultSensor);
    expect((getEl('bp-submit') as HTMLButtonElement).disabled).toBe(false);

    C.updateSensorButton_('');
    expect((getEl('bp-submit') as HTMLButtonElement).disabled).toBe(true);
  });

  it('onSubmit_ toasts when no sensor is selected', () => {
    vi.spyOn(ServiceLocator.getSensorManager(), 'isSensorSelected').mockReturnValue(false);
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    p().onSubmit_();

    expect(toastSpy).toHaveBeenCalled();
    expect(saveXlsx).not.toHaveBeenCalled();
  });

  it('onSubmit_ runs the pass finder and exports when a sensor is selected', () => {
    vi.spyOn(ServiceLocator.getSensorManager(), 'isSensorSelected').mockReturnValue(true);
    vi.spyOn(ServiceLocator.getSensorManager(), 'getSensor').mockReturnValue(defaultSensor);
    const findSpy = vi.spyOn(p(), 'findBestPasses_').mockReturnValue([]);

    p().onSubmit_();

    expect(findSpy).toHaveBeenCalled();
    expect(saveXlsx).toHaveBeenCalledWith([], 'bestSatTimes');
  });

  it('findBestPass_ toasts and returns empty when the sensor has no minAz', () => {
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
    const badSensor = defaultSensor.clone();

    (badSensor as unknown as { minAz: number | undefined }).minAz = undefined;

    expect(p().findBestPass_(defaultSat, [badSensor])).toStrictEqual([]);
    expect(toastSpy).toHaveBeenCalled();
  });

  it('findBestPasses_ resolves sccNums and formats pass dates without throwing', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockReturnValue(defaultSat);
    // Keep the propagation window tiny so the 5s loop stays bounded.
    p().looksLength_ = 0.02;

    let passes: unknown[] = [];

    expect(() => {
      passes = p().findBestPasses_('25544,00005', defaultSensor);
    }).not.toThrow();
    expect(Array.isArray(passes)).toBe(true);
  });

  it('findBestPasses_ skips blank and unresolved entries', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockReturnValue(null as never);

    expect(p().findBestPasses_(' , ,', defaultSensor)).toStrictEqual([]);
  });
});
