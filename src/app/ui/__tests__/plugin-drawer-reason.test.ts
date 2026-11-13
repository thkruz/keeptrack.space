import { syncDrawerItemState } from '@app/app/ui/plugin-drawer-helpers';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('drawer row disabled reason (pro issue #193)', () => {
  const makePlugin = (over: Record<string, unknown> = {}) => ({
    id: 'LookAngles',
    bottomIconElementName: 'look-angles-bottom-icon',
    isRequireSensorSelected: true,
    isRequireSatelliteSelected: false,
    getDisabledReason: () => null,
    verifySatelliteSelected: () => true,
    ...over,
  });

  const setup = (disabled: boolean) => {
    document.body.innerHTML = `<div id="look-angles-bottom-icon" class="${disabled ? 'bmenu-item-disabled' : ''}"></div>
      <div class="drawer-item" data-plugin-id="look-angles-bottom-icon"><span class="drawer-item-label">Look Angles</span></div>`;

    return document.querySelector('.drawer-item') as HTMLElement;
  };

  beforeEach(() => {
    setupStandardEnvironment();
    PluginRegistry.unregisterAllPlugins();
    vi.spyOn(ServiceLocator, 'getSensorManager').mockReturnValue({ isSensorSelected: () => false } as never);
  });

  afterEach(() => {
    PluginRegistry.unregisterAllPlugins();
    vi.restoreAllMocks();
  });

  it('shows the reason, aria-disabled and aria-describedby on a disabled row', () => {
    PluginRegistry.addPlugin(makePlugin() as never);
    const row = setup(true);

    syncDrawerItemState(row);
    const reason = row.querySelector('.drawer-item-reason') as HTMLElement;

    expect(reason.textContent).not.toBe('');
    expect(row.getAttribute('aria-disabled')).toBe('true');
    expect(row.getAttribute('aria-describedby')).toBe(reason.id);
  });

  it('clears the reason when the row is enabled again', () => {
    PluginRegistry.addPlugin(makePlugin() as never);
    const row = setup(true);

    syncDrawerItemState(row);
    document.getElementById('look-angles-bottom-icon')?.classList.remove('bmenu-item-disabled');
    syncDrawerItemState(row);
    expect(row.querySelector('.drawer-item-reason')?.textContent).toBe('');
    expect(row.getAttribute('aria-disabled')).toBe('false');
    expect(row.hasAttribute('aria-describedby')).toBe(false);
  });

  it('falls back to the plugin getDisabledReason', () => {
    PluginRegistry.addPlugin(makePlugin({ isRequireSensorSelected: false, getDisabledReason: () => 'Add satellites first' }) as never);
    const row = setup(true);

    syncDrawerItemState(row);
    expect(row.querySelector('.drawer-item-reason')?.textContent).toBe('Add satellites first');
  });
});
