import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { SatelliteFov } from '@app/plugins/satellite-fov/satellite-fov';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('SatelliteFov', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SatelliteFov, 'SatelliteFov');
  standardPluginMenuButtonTests(SatelliteFov, 'SatelliteFov');
  standardClickTests(SatelliteFov);
  standardChangeTests(SatelliteFov);
});

describe('SatelliteFov_class', () => {
  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
    ServiceLocator.getCatalogManager().getObject = () => defaultSat;
    ServiceLocator.getCatalogManager().satCruncherThread = {
      postMessage: vi.fn(),
      sendMarkerUpdate: vi.fn(),
    } as any;
  });

  standardPluginSuite(SatelliteFov);
  standardPluginMenuButtonTests(SatelliteFov);
});

// The pre-fix sat-to-sat handler did `sccNum2Id(parseInt(sccInput))`, collapsing
// any typed alpha-5 ("T0001") target to NaN. The fix passes the raw string
// through so alpha-5 / extended targets resolve.
describe('SatelliteFov_satToSat_sccNumForms', () => {
  let plugin: SatelliteFov;
  let sccNumSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
    plugin = new SatelliteFov();
    websiteInit(plugin);
    // A source sat must be selected for the handler to reach the lookup.
    PluginRegistry.getPlugin(SelectSatManager)!.getSelectedSat = () => defaultSat as any;
    // Return null so the handler short-circuits at "target not found" without
    // building real cones; we only assert what the spy received.
    sccNumSpy = vi.fn().mockReturnValue(null);
    ServiceLocator.getCatalogManager().sccNum2Id = sccNumSpy;
  });

  const createWithTargetScc = (scc: string): void => {
    (getEl('sat-fov-s2s-target-scc') as HTMLInputElement).value = scc;
    getEl('sat-fov-s2s-create-btn')!.click();
  };

  it('passes alpha-5 target through unchanged (not collapsed to NaN by parseInt)', () => {
    createWithTargetScc('T0001');
    expect(sccNumSpy).toHaveBeenCalledWith('T0001');
  });

  it('passes 9-digit extended target through unchanged', () => {
    createWithTargetScc('799500766');
    expect(sccNumSpy).toHaveBeenCalledWith('799500766');
  });

  it('trims user-typed whitespace before lookup', () => {
    createWithTargetScc('  T0001  ');
    expect(sccNumSpy).toHaveBeenCalledWith('T0001');
  });
});
