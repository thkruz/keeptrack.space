import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { NewLaunch } from '@app/plugins/new-launch/new-launch';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('NewLaunch (base) bottomIconCallback', () => {
  let plugin: NewLaunch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    plugin = new NewLaunch();
    websiteInit(plugin);
    p().isMenuButtonActive = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('populates the SCC and inclination fields from the selected satellite', () => {
    vi.spyOn(plugin, 'verifySatelliteSelected').mockReturnValue(true);
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue(defaultSat);

    plugin.bottomIconCallback();

    expect((getEl('nl-scc') as HTMLInputElement).value).toBe(defaultSat.sccNum);
    expect((getEl('nl-inc') as HTMLInputElement).value).toBe(defaultSat.inclination.toFixed(4).padStart(8, '0'));
  });

  it('is a no-op when the menu button is inactive', () => {
    p().isMenuButtonActive = false;
    (getEl('nl-scc') as HTMLInputElement).value = 'untouched';

    plugin.bottomIconCallback();

    expect((getEl('nl-scc') as HTMLInputElement).value).toBe('untouched');
  });

  it('is a no-op when no satellite is selected', () => {
    vi.spyOn(plugin, 'verifySatelliteSelected').mockReturnValue(false);
    (getEl('nl-scc') as HTMLInputElement).value = 'untouched';

    plugin.bottomIconCallback();

    expect((getEl('nl-scc') as HTMLInputElement).value).toBe('untouched');
  });

  it('is a no-op when the resolved object is not a valid satellite', () => {
    vi.spyOn(plugin, 'verifySatelliteSelected').mockReturnValue(true);
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue({ sccNum: '', inclination: NaN } as never);
    (getEl('nl-scc') as HTMLInputElement).value = 'untouched';

    plugin.bottomIconCallback();

    expect((getEl('nl-scc') as HTMLInputElement).value).toBe('untouched');
  });
});
