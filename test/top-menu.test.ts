import { keepTrackContainer } from '@app/engine/core/container';
import { Singletons } from '@app/engine/core/interfaces';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import { SoundManager } from '@app/plugins/sounds/sound-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupMinimumHtml } from './environment/standard-env';
import { standardPluginSuite } from './generic-tests';

describe('TopMenu_class', () => {
  beforeEach(() => {
    // eslint-disable-next-line guard-for-in
    for (const callback in keepTrackApi.events) {
      keepTrackApi.events[callback] = [];
    }
    setupMinimumHtml();
  });

  standardPluginSuite(TopMenu, 'TopMenu');

  // Tests that sound button throws warning if sound plugin is not loaded
  it('test_sound_button_toggle_without_sound_plugin', () => {
    const topMenu = new TopMenu();

    topMenu.init();
    keepTrackApi.emit(EventBusEvent.uiManagerInit);
    keepTrackApi.emit(EventBusEvent.uiManagerFinal);
    const soundBtn = getEl('sound-btn') as HTMLAnchorElement;

    errorManagerInstance.warn = jest.fn();
    keepTrackContainer.registerSingleton(Singletons.SoundManager, null);
    soundBtn.click();
    expect(errorManagerInstance.warn).toHaveBeenCalled();
  });

  // Tests that sound button toggles sound on/off
  it('test_sound_button_toggle', () => {
    const topMenu = new TopMenu();

    topMenu.init();
    keepTrackApi.emit(EventBusEvent.uiManagerInit);
    keepTrackApi.emit(EventBusEvent.uiManagerFinal);

    const soundBtn = getEl('sound-btn') as HTMLAnchorElement;
    const soundIcon = getEl('sound-icon') as HTMLImageElement;
    const soundManagerPlugin = new SoundManager();

    keepTrackContainer.registerSingleton(Singletons.SoundManager, soundManagerPlugin);
    const soundManager = keepTrackApi.getSoundManager();

    soundBtn.click();
    expect(soundManager!.isMute).toBe(true);
    expect(soundIcon.parentElement!.classList.contains('bmenu-item-selected')).toBe(false);
    soundBtn.click();
    expect(soundManager!.isMute).toBe(false);
    expect(soundIcon.parentElement!.classList.contains('bmenu-item-selected')).toBe(true);
  });
});
