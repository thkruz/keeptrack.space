import { SoundManager } from '@app/engine/audio/sound-manager';
import { Container } from '@app/engine/core/container';
import { Singletons } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
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
