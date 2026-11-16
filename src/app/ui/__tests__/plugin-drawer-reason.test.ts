import { sanitizeDrawerIdToken, syncDrawerItemState } from '@app/app/ui/plugin-drawer-helpers';
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

  it('carries the reason in the tooltip and restores the plain label when enabled', () => {
    PluginRegistry.addPlugin(makePlugin({ isRequireSensorSelected: false, getDisabledReason: () => 'Add satellites first' }) as never);
    const row = setup(true);

    row.setAttribute('kt-tooltip', 'Look Angles');
    syncDrawerItemState(row);
    expect(row.getAttribute('kt-tooltip')).toBe('Look Angles: Add satellites first');
    document.getElementById('look-angles-bottom-icon')!.classList.remove('bmenu-item-disabled');
    syncDrawerItemState(row);
    expect(row.getAttribute('kt-tooltip')).toBe('Look Angles');
  });
});

describe('drawer reason ids (pro issue #193)', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    PluginRegistry.unregisterAllPlugins();
    vi.spyOn(ServiceLocator, 'getSensorManager').mockReturnValue({ isSensorSelected: () => false } as never);
  });

  afterEach(() => {
    PluginRegistry.unregisterAllPlugins();
    vi.restoreAllMocks();
  });

  it('sanitizes whitespace and unsafe characters into a single token', () => {
    expect(sanitizeDrawerIdToken('short-term fence-bottom-icon')).toBe('short-term-fence-bottom-icon');
    expect(sanitizeDrawerIdToken('  a b\tc/d  ')).toBe('a-b-c-d');
    expect(sanitizeDrawerIdToken('plain_id-1')).toBe('plain_id-1');
  });

  it('gives a plugin id with a space a reason id that aria-describedby can resolve', () => {
    PluginRegistry.addPlugin({
      id: 'ShortTermFences',
      bottomIconElementName: 'short-term fence-bottom-icon',
      isRequireSensorSelected: true,
      isRequireSatelliteSelected: false,
      getDisabledReason: () => null,
      verifySatelliteSelected: () => true,
    } as never);
    document.body.innerHTML = `<div id="short-term fence-bottom-icon" class="bmenu-item-disabled"></div>
      <div class="drawer-item" data-plugin-id="short-term fence-bottom-icon"><span class="drawer-item-label">Short Term Fence</span></div>`;
    const row = document.querySelector('.drawer-item') as HTMLElement;

    syncDrawerItemState(row);
    const describedBy = row.getAttribute('aria-describedby') as string;

    expect(describedBy).toMatch(/^[^\s]+$/u);
    expect(document.getElementById(describedBy)).not.toBeNull();
  });

  it('gives rows with an unusable id token distinct fallback ids without randomness', () => {
    const random = vi.spyOn(Math, 'random');

    PluginRegistry.addPlugin({
      bottomIconElementName: '!!!',
      isRequireSensorSelected: true,
      isRequireSatelliteSelected: false,
      getDisabledReason: () => null,
      verifySatelliteSelected: () => true,
    } as never);
    document.body.innerHTML = `<div id="!!!" class="bmenu-item-disabled"></div>
      <div class="drawer-item" data-plugin-id="!!!"></div><div class="drawer-item" data-plugin-id="!!!"></div>`;
    const rows = Array.from(document.querySelectorAll<HTMLElement>('.drawer-item'));

    rows.forEach((r) => syncDrawerItemState(r));
    const ids = rows.map((r) => r.querySelector('.drawer-item-reason')?.id);

    expect(ids[0]).toMatch(/^drawer-reason-r\d+$/u);
    expect(ids[1]).toMatch(/^drawer-reason-r\d+$/u);
    expect(ids[0]).not.toBe(ids[1]);
    expect(random).not.toHaveBeenCalled();
  });
});
