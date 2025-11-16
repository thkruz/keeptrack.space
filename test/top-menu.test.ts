import { Container } from '@app/engine/core/container';
import { Singletons } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { SoundManager } from '@app/plugins/sounds/sound-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite } from './generic-tests';
import { EventBus } from '@app/engine/events/event-bus';

describe('TopMenu_class', () => {
  let topMenu: TopMenu;

  beforeEach(() => {
    setupStandardEnvironment();
    topMenu = new TopMenu();
    const soundManagerPlugin = new SoundManager();

    Container.getInstance().registerSingleton(Singletons.SoundManager, soundManagerPlugin);
  });

  standardPluginSuite(TopMenu, 'TopMenu');

  // Tests that sound button throws warning if sound plugin is not loaded
  it('test_sound_button_toggle_without_sound_plugin', () => {
    topMenu.init();
    ServiceLocator.getSoundManager()?.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    const soundBtn = getEl('sound-btn') as HTMLAnchorElement;

    errorManagerInstance.warn = jest.fn();
    Container.getInstance().registerSingleton(Singletons.SoundManager, null);
    soundBtn.click();
    expect(errorManagerInstance.warn).toHaveBeenCalled();
  });

  // Tests that sound button toggles sound on/off
  it('test_sound_button_toggle', () => {
    topMenu.init();
    ServiceLocator.getSoundManager()?.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

    const soundBtn = getEl('sound-btn') as HTMLAnchorElement;
    const soundIcon = getEl('sound-icon') as HTMLImageElement;
    const soundManagerPlugin = new SoundManager();

    Container.getInstance().registerSingleton(Singletons.SoundManager, soundManagerPlugin);
    const soundManager = ServiceLocator.getSoundManager();

    soundBtn.click();
    expect(soundManager!.isMute).toBe(true);
    expect(soundIcon.parentElement!.classList.contains('bmenu-item-selected')).toBe(false);
    soundBtn.click();
    expect(soundManager!.isMute).toBe(false);
    expect(soundIcon.parentElement!.classList.contains('bmenu-item-selected')).toBe(true);
  });
});
