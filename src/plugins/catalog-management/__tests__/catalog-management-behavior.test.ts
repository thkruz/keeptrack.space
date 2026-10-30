import { CatalogExporter } from '@app/app/data/catalog-exporter';
import { CatalogLoader } from '@app/app/data/catalog-loader';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { CatalogManagementPlugin } from '@app/plugins/catalog-management/catalog-management';
import { formatStkEpoch } from '@app/plugins/catalog-management/catalog-management-export';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { saveAs } from 'file-saver';
import { vi } from 'vitest';

vi.mock('file-saver', () => ({ __esModule: true, default: vi.fn(), saveAs: vi.fn() }));

describe('CatalogManagementPlugin behavior', () => {
  let plugin: CatalogManagementPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new CatalogManagementPlugin();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
    vi.mocked(saveAs).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formatStkEpoch formats a UTC date as the STK epoch string', () => {
    const out = formatStkEpoch(new Date('2026-05-31T04:05:06.007Z'));

    expect(out).toBe('31 May 2026 04:05:06.007');
  });

  it('updateEphemerisButton_ enables for a satellite and disables otherwise', () => {
    p().updateEphemerisButton_({ isSatellite: () => true });
    expect((getEl('de-export-ephem') as HTMLButtonElement).disabled).toBe(false);

    p().updateEphemerisButton_({ isSatellite: () => false });
    expect((getEl('de-export-ephem') as HTMLButtonElement).disabled).toBe(true);
  });

  it('handleImportFile_ rejects unsupported file extensions', () => {
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    p().handleImportFile_(new File(['x'], 'data.pdf'));

    expect(toastSpy).toHaveBeenCalled();
    expect(p().isLoading_).toBe(false);
  });

  it('handleImportFile_ reloads the catalog from a supported file', async () => {
    const reloadSpy = vi.spyOn(CatalogLoader, 'reloadCatalog').mockResolvedValue(undefined as never);

    vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    p().handleImportFile_(new File(['1 25544U\n2 25544'], 'cat.tle'));

    await vi.waitFor(() => expect(reloadSpy).toHaveBeenCalled());
  });

  it('handleImportFile_ merges when keepSatInfo_ is set', async () => {
    p().keepSatInfo_ = true;
    const mergeSpy = vi.spyOn(CatalogLoader, 'mergeAndReloadCatalog').mockResolvedValue(undefined as never);

    vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    p().handleImportFile_(new File(['1 25544U\n2 25544'], 'cat.txt'));

    await vi.waitFor(() => expect(mergeSpy).toHaveBeenCalled());
  });

  it('exportEphemeris_ toasts when no satellite is selected', () => {
    vi.spyOn(SelectSatManager.prototype, 'getSelectedSat').mockReturnValue(null as never);
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);

    p().exportEphemeris_();

    expect(toastSpy).toHaveBeenCalled();
    expect(saveAs).not.toHaveBeenCalled();
  });

  it('exportEphemeris_ propagates the selected satellite and saves a .e file', () => {
    vi.spyOn(SelectSatManager.prototype, 'getSelectedSat').mockReturnValue(defaultSat as never);
    (getEl('de-ephem-span') as HTMLInputElement).value = '0.05'; // ~3 points
    (getEl('de-ephem-step') as HTMLInputElement).value = '60';

    p().exportEphemeris_();

    expect(saveAs).toHaveBeenCalledTimes(1);
  });

  it('the export buttons delegate to the matching CatalogExporter methods', () => {
    const txtSpy = vi.spyOn(CatalogExporter, 'exportTle2Txt').mockImplementation(() => undefined);
    const csvSpy = vi.spyOn(CatalogExporter, 'exportTle2Csv').mockImplementation(() => undefined);

    p().initExportHandlers_();
    getEl('de-export-tle')!.dispatchEvent(new Event('click'));
    getEl('de-export-csv')!.dispatchEvent(new Event('click'));

    expect(txtSpy).toHaveBeenCalled();
    expect(csvSpy).toHaveBeenCalled();
  });

  it('Export Satellites in FOV with no sensor toasts "No sensor selected!" and writes no file', () => {
    const fovSpy = vi.spyOn(CatalogExporter, 'exportSatInFov2Csv').mockImplementation(() => undefined);
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined);
    const sensorSpy = vi.spyOn(ServiceLocator.getSensorManager(), 'isSensorSelected').mockReturnValue(false);

    // websiteInit already ran uiManagerFinal, which wired the export handlers.
    getEl('de-export-fov')!.dispatchEvent(new Event('click'));

    expect(fovSpy).not.toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalledWith(t7e('plugins.CatalogManagementPlugin.toasts.noSensorSelected' as Parameters<typeof t7e>[0]), ToastMsgType.critical);

    sensorSpy.mockReturnValue(true);
    getEl('de-export-fov')!.dispatchEvent(new Event('click'));
    expect(fovSpy).toHaveBeenCalledTimes(1);
  });

  it('the Replace (import button) and Keep Info tooltips say the Vimpel-only objects are dropped', () => {
    const tip = (selector: string): string => document.querySelector(selector)?.getAttribute('kt-tooltip') ?? '';

    expect(tip('#cm-import-btn')).toBe(t7e('plugins.CatalogManagementPlugin.labels.replaceCatalogTooltip' as Parameters<typeof t7e>[0]));
    expect(tip('label[for="cm-keep-sat-info"]')).toBe(t7e('plugins.CatalogManagementPlugin.labels.keepSatInfoTooltip' as Parameters<typeof t7e>[0]));
    expect(tip('#cm-import-btn')).toContain('JSC Vimpel');
    expect(tip('label[for="cm-keep-sat-info"]')).toContain('JSC Vimpel');
  });

  it('hideDropzone_ removes the visible/dragging classes', () => {
    const dz = getEl('catalog-mgmt-dropzone', true);

    if (dz) {
      dz.classList.add('visible');
    }

    expect(() => p().hideDropzone_()).not.toThrow();
  });
});
