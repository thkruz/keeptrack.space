import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IKeyboardShortcut } from '@app/engine/plugins/core/plugin-capabilities';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import soundOffPng from '@public/img/icons/sound-off.png';
import soundOnPng from '@public/img/icons/sound-on.png';
import { TopMenu } from '../top-menu/top-menu';

export class SoundToggle extends KeepTrackPlugin {
  readonly id = 'SoundToggle';
  dependencies_ = ['TopMenu'];

  private t_(key: string): string {
    return t7e(`plugins.SoundToggle.${key}` as Parameters<typeof t7e>[0]);
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'M',
        callback: () => this.toggleMute(),
      },
    ];
  }

  init() {
    super.init();

    // Add button to TopMenu
    PluginRegistry.getPlugin(TopMenu)?.navItems.push({
      id: 'sound-btn',
      order: 1,
      class: 'bmenu-item-selected',
      icon: soundOnPng,
      tooltip: this.t_('tooltip'),
    });

    // Listen to mute state changes from SoundManager
    EventBus.getInstance().on(EventBusEvent.soundMuteChanged, this.onMuteChanged_.bind(this));

    // Setup click handler
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
      const soundBtn = getEl('sound-btn');

      if (soundBtn) {
        soundBtn.onclick = () => this.toggleMute();
      }
    });
  }

  toggleMute(): void {
    const soundManager = ServiceLocator.getSoundManager();

    if (!soundManager) {
      errorManagerInstance.warn(this.t_('errorMsgs.notEnabled'));

      return;
    }

    soundManager.toggleMute();
    EventBus.getInstance().emit(EventBusEvent.pluginActionUsed, this.id);
  }

  private onMuteChanged_(isMuted: boolean): void {
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
