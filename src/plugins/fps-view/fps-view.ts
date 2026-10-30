import { SoundNames } from '@app/engine/audio/sounds';
import { CameraType } from '@app/engine/camera/camera-type';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IconPlacement, IKeyboardShortcut, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import videocamPng from '@public/img/icons/videocam.png';

export class FpsView extends KeepTrackPlugin {
  readonly id = 'FpsView';
  dependencies_: string[] = [];

  /** The camera mode to return to when FPS View is toggled off. */
  private previousCameraType_: CameraType = CameraType.FIXED_TO_EARTH;
  /** Camera was FPS on the previous update loop (detects entry by any route). */
  private wasFps_ = false;

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
      const cameraType = ServiceLocator.getMainCamera().cameraType;
      const isFps = cameraType === CameraType.FPS;

      if (isFps && !this.wasFps_) {
        // Entered FPS by any route (icon, key, palette or the camera cycle key)
        this.showFirstUseHint_();
      } else if (!isFps) {
        this.previousCameraType_ = cameraType;
      }
      this.wasFps_ = isFps;

      if (isFps && !this.isMenuButtonActive) {
        this.setBottomIconToSelected();
      } else if (!isFps && this.isMenuButtonActive) {
        // Icon sync only: the camera changed elsewhere, so leave the user's open menu alone.
        this.setBottomIconToUnselected(false);
      }
    });
  }

  /** Toggles: enters FPS View, or returns to the camera mode it was entered from. */
  bottomIconCallback = (): void => {
    if (ServiceLocator.getMainCamera().cameraType === CameraType.FPS) {
      this.exitFps_();
    } else {
      this.enterFps_();
    }
  };

  private enterFps_(): void {
    const camera = ServiceLocator.getMainCamera();

    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    this.previousCameraType_ = camera.cameraType;
    // setCameraType resets the pose, so every entry starts from the default FPS position
    camera.setCameraType(CameraType.FPS);
    this.setBottomIconToSelected();
  }

  private exitFps_(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
    ServiceLocator.getMainCamera().restoreCameraType(this.previousCameraType_);
    this.setBottomIconToUnselected(false);
  }

  /** One toast per device listing the fly keys, the first time FPS View is entered. */
  private showFirstUseHint_(): void {
    const persistence = PersistenceManager.getInstance();

    if (persistence.getItem(StorageKey.FPS_VIEW_HINT_SEEN) === 'true') {
      return;
    }
    persistence.saveItem(StorageKey.FPS_VIEW_HINT_SEEN, 'true');
    ServiceLocator.getUiManager().toast(t7e('plugins.FpsView.firstUseHint'), ToastMsgType.normal, true);
  }
}
