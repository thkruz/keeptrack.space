import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import soundOffPng from '@public/img/icons/sound-off.png';
import soundOnPng from '@public/img/icons/sound-on.png';
import { TopMenu } from '../top-menu/top-menu';

export class SoundToggle extends KeepTrackPlugin {
  readonly id = 'SoundToggle';
  dependencies_ = ['TopMenu'];

  init() {
    super.init();

    // Add button to TopMenu
    PluginRegistry.getPlugin(TopMenu)?.navItems.push({
      id: 'sound-btn',
      order: 1,
      classInner: 'bmenu-item-selected',
      icon: soundOnPng,
      tooltip: 'Toggle Sound On/Off',
    });

    // Listen to mute state changes from SoundManager
    EventBus.getInstance().on(EventBusEvent.soundMuteChanged, this.onMuteChanged_.bind(this));

    // Setup click handler
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      const soundBtn = getEl('sound-btn');

      if (soundBtn) {
        soundBtn.onclick = () => {
          const soundManager = ServiceLocator.getSoundManager();

          if (!soundManager) {
            errorManagerInstance.warn('SoundManager is not enabled. Check your settings!');

            return;
          }

          soundManager.toggleMute();
        };
      }
    });
  }

  private onMuteChanged_(isMuted: boolean) {
    const soundIcon = getEl('sound-icon') as HTMLImageElement;
    const soundBtn = getEl('sound-btn');

    if (soundIcon && soundBtn) {
      if (isMuted) {
        soundIcon.src = soundOffPng;
        soundBtn.classList.remove('bmenu-item-selected');
        soundBtn.classList.add('bmenu-item-error');
      } else {
        soundIcon.src = soundOnPng;
        soundBtn.classList.add('bmenu-item-selected');
        soundBtn.classList.remove('bmenu-item-error');
      }
    }
  }
}
