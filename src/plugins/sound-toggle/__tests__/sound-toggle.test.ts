import { SoundManager } from '@app/engine/audio/sound-manager';
import { Container } from '@app/engine/core/container';
import { Singletons } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';
import { SoundToggle } from '../sound-toggle';

describe('SoundToggle_class', () => {
  let topMenu: TopMenu;
  let soundToggle: SoundToggle;

  beforeEach(() => {
    setupStandardEnvironment();

    topMenu = new TopMenu();
    topMenu.init();
    soundToggle = new SoundToggle();
  });

  standardPluginSuite(SoundToggle, 'SoundToggle');

  // Tests that sound button toggles sound on/off
  it('test_sound_button_toggle', () => {
    soundToggle.init();
    ServiceLocator.getSoundManager()?.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

    const soundBtn = getEl('sound-btn') as HTMLAnchorElement;
    const soundIcon = getEl('sound-icon') as HTMLImageElement;
    const soundManagerPlugin = new SoundManager();

    Container.getInstance().registerSingleton(Singletons.SoundManager, soundManagerPlugin);
    const soundManager = ServiceLocator.getSoundManager();

    soundBtn.click();
    EventBus.getInstance().on(EventBusEvent.soundMuteChanged, () => {
      expect(soundManager!.isMute).toBe(true);
      expect(soundIcon.parentElement!.classList.contains('bmenu-item-selected')).toBe(false);

      soundBtn.click();
      EventBus.getInstance().on(EventBusEvent.soundMuteChanged, () => {
        expect(soundManager!.isMute).toBe(false);
        expect(soundIcon.parentElement!.classList.contains('bmenu-item-selected')).toBe(true);
      });
    });
  });

});

describe('SoundToggle methods', () => {
  let plugin: SoundToggle;

  beforeEach(() => {
    setupStandardEnvironment();
    new TopMenu().init();
    plugin = new SoundToggle();
    plugin.init();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('binds the "M" shortcut to toggleMute', () => {
    const shortcuts = plugin.getKeyboardShortcuts();

    expect(shortcuts[0].key).toBe('M');
    const spy = vi.spyOn(plugin, 'toggleMute').mockImplementation(() => undefined);

    shortcuts[0].callback();
    expect(spy).toHaveBeenCalled();
  });

  it('toggleMute delegates to the sound manager when available', () => {
    const soundManager = ServiceLocator.getSoundManager()!;
    const spy = vi.spyOn(soundManager, 'toggleMute').mockImplementation(() => undefined);

    plugin.toggleMute();
    expect(spy).toHaveBeenCalled();
  });

  it('toggleMute warns when no sound manager is available', () => {
    vi.spyOn(ServiceLocator, 'getSoundManager').mockReturnValue(null);
    const warn = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);

    plugin.toggleMute();
    expect(warn).toHaveBeenCalled();
  });

  it('updates the sound icon/button on soundMuteChanged (muted then unmuted)', () => {
    const icon = document.createElement('img');

    icon.id = 'sound-icon';
    document.body.appendChild(icon);
    const btn = getEl('sound-btn')!;

    EventBus.getInstance().emit(EventBusEvent.soundMuteChanged, true);
    expect(btn.classList.contains('bmenu-item-error')).toBe(true);
    expect(btn.classList.contains('bmenu-item-selected')).toBe(false);

    EventBus.getInstance().emit(EventBusEvent.soundMuteChanged, false);
    expect(btn.classList.contains('bmenu-item-selected')).toBe(true);
    expect(btn.classList.contains('bmenu-item-error')).toBe(false);
  });

  it('wires the sound-btn click handler on uiManagerFinal', () => {
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    const btn = getEl('sound-btn')! as HTMLElement;
    const spy = vi.spyOn(plugin, 'toggleMute').mockImplementation(() => undefined);

    btn.onclick?.(new MouseEvent('click'));
    expect(spy).toHaveBeenCalled();
  });
});
