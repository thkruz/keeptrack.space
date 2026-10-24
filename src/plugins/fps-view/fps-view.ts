import { SoundNames } from '@app/engine/audio/sounds';
import { CameraType } from '@app/engine/camera/camera-type';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IconPlacement, IKeyboardShortcut, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import videocamPng from '@public/img/icons/videocam.png';

export class FpsView extends KeepTrackPlugin {
  readonly id = 'FpsView';
  dependencies_: string[] = [];

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'fps-view-bottom-icon',
      label: 'FPS View',
      image: videocamPng,
      placement: IconPlacement.UTILITY_ONLY,
      utilityGroup: UtilityGroup.CAMERA_MODE,
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: '8',
        callback: () => this.bottomIconCallback(),
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'FpsView.activate',
        label: t7e('plugins.FpsView.commandPalette.switch'),
        category: 'View',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  addJs(): void {
    super.addJs();

    // Keep icon state in sync with camera type
    EventBus.getInstance().on(EventBusEvent.updateLoop, () => {
      const isFps = ServiceLocator.getMainCamera().cameraType === CameraType.FPS;

      if (isFps && !this.isMenuButtonActive) {
        this.setBottomIconToSelected();
      } else if (!isFps && this.isMenuButtonActive) {
        // Icon sync only: the camera changed elsewhere, so leave the user's open menu alone.
        this.setBottomIconToUnselected(false);
      }
    });
  }

  bottomIconCallback = (): void => {
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    ServiceLocator.getMainCamera().cameraType = CameraType.FPS;
    this.setBottomIconToSelected();
  };
}
