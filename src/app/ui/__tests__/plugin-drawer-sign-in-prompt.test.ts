import { drawerRowFeatureName, isSignedOutGatedRow, showSignInPrompt, syncDrawerItemReason } from '@app/app/ui/plugin-drawer-helpers';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import * as keys from '@app/locales/keys';
import { setupStandardEnvironment } from '@test/environment/standard-env';

describe('drawer signed-out sign-in prompt', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    PluginRegistry.unregisterAllPlugins();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    PluginRegistry.unregisterAllPlugins();
    KeepTrackPlugin.loginGateOpenModal = null;
    document.body.innerHTML = '';
  });

  const makeRow = (gated: boolean): HTMLElement => {
    const row = document.createElement('div');

    row.className = 'drawer-item';
    row.dataset.pluginId = 'best-pass-bottom-icon';
    if (gated) {
      row.dataset.proGated = '';
    }
    row.innerHTML = '<span class="drawer-item-label">Best Passes</span>';
    document.body.append(row);

    return row;
  };

  it('treats a gated row as locked when the plugin gate is closed', () => {
    PluginRegistry.addPlugin({ bottomIconElementName: 'best-pass-bottom-icon', isLoginRequired: true, isLoginGateValid_: () => false } as never);
    expect(isSignedOutGatedRow(makeRow(true))).toBe(true);
  });

  it('does not lock an ungated row or a signed-in gated row', () => {
    PluginRegistry.addPlugin({ bottomIconElementName: 'best-pass-bottom-icon', isLoginRequired: true, isLoginGateValid_: () => true } as never);
    expect(isSignedOutGatedRow(makeRow(true))).toBe(false);
    expect(isSignedOutGatedRow(makeRow(false))).toBe(false);
  });

  it('names the feature and opens the existing login modal from Sign in', () => {
    const openModal = vi.fn();

    KeepTrackPlugin.loginGateOpenModal = openModal;
    expect(drawerRowFeatureName(makeRow(true))).toBe('Best Passes');
    const t7eSpy = vi.spyOn(keys, 't7e');
    const prompt = showSignInPrompt('Best Passes');

    expect(t7eSpy).toHaveBeenCalledWith('pluginDrawer.signInPromptTitle', { feature: 'Best Passes' });
    (prompt.querySelector('.drawer-sign-in-prompt__action') as HTMLButtonElement).click();
    expect(openModal).toHaveBeenCalledTimes(1);
    expect(document.getElementById('drawer-sign-in-prompt')).toBeNull();
  });

  it('closes on Not now without opening the login modal', () => {
    const openModal = vi.fn();

    KeepTrackPlugin.loginGateOpenModal = openModal;
    const prompt = showSignInPrompt('Sensors');

    (prompt.querySelector('.drawer-sign-in-prompt__cancel') as HTMLButtonElement).click();
    expect(openModal).not.toHaveBeenCalled();
    expect(document.getElementById('drawer-sign-in-prompt')).toBeNull();
  });

  it('#438: the account hint follows the gate on enabled and disabled rows, and re-syncs after the tokens change', () => {
    let gateOpen = false;

    PluginRegistry.addPlugin({ bottomIconElementName: 'best-pass-bottom-icon', isLoginRequired: true, isLoginGateValid_: () => gateOpen, getDisabledReason: () => null } as never);
    const row = makeRow(true);

    row.insertAdjacentHTML('beforeend', '<span class="drawer-item-account-hint" id="hint-bp">Free account unlocks this</span>');
    const hint = row.querySelector<HTMLElement>('.drawer-item-account-hint')!;

    // Real order: userLogin used to fire before the tokens were distributed.
    syncDrawerItemReason(row, false);
    expect(hint.hidden).toBe(false);

    gateOpen = true;
    syncDrawerItemReason(row, false);
    expect(hint.hidden).toBe(true);

    // A disabled row (waiting for a sensor) must update its hint too, not keep a stale value.
    hint.hidden = false;
    syncDrawerItemReason(row, true);
    expect(hint.hidden).toBe(true);

    gateOpen = false;
    syncDrawerItemReason(row, true);
    expect(hint.hidden).toBe(false);
  });
});
