import type { CatalogManager } from '@app/app/data/catalog-manager';
import type { GroupsManager } from '@app/app/data/groups-manager';
import type { SensorMath } from '@app/app/sensors/sensor-math';
import type { SensorManager } from '@app/app/sensors/sensorManager';
import type { HoverManager } from '@app/app/ui/hover-manager';
import type { UiManager } from '@app/app/ui/ui-manager';
import type { SoundManager } from '@app/engine/audio/sound-manager';
import { Container } from '@app/engine/core/container';
import { Singletons } from '@app/engine/core/interfaces';
import type { OrbitManager } from '../../app/rendering/orbit-manager';
import type { Camera } from '../camera/camera';
import type { InputManager } from '../input/input-manager';
import type { ColorSchemeManager } from '../rendering/color-scheme-manager';
import type { DotsManager } from '../rendering/dots-manager';
import type { LineManager } from '../rendering/line-manager';
import type { MeshManager } from '../rendering/mesh-manager';
import type { SatLabelManager } from '../rendering/sat-label-manager';
import type { ViewportManager } from '../rendering/viewport-manager';
import type { WebGLRenderer } from '../rendering/webgl-renderer';
import type { Scene } from './scene';
import type { TimeManager } from './time-manager';

export class ServiceLocator {
  /**
   * Camera currently being rendered by a viewport pass. While set (synchronously,
   * inside the render loop only), getMainCamera() resolves to it so all draw code
   * transparently uses the correct camera in multi-viewport rendering. Outside a
   * render pass this MUST be null. Managed by ViewportManager via try/finally.
   */
  private static activeRenderCamera_: Camera | null = null;

  static setActiveRenderCamera(camera: Camera | null): void {
    ServiceLocator.activeRenderCamera_ = camera;
  }

  static getActiveRenderCamera(): Camera | null {
    return ServiceLocator.activeRenderCamera_;
  }

  static readonly getSoundManager = () => Container.getInstance().get<SoundManager>(Singletons.SoundManager) as SoundManager | null;
  static readonly getRenderer = () => Container.getInstance().get<WebGLRenderer>(Singletons.WebGLRenderer);
  static readonly getScene = () => Container.getInstance().get<Scene>(Singletons.Scene);
  static readonly getCatalogManager = () => Container.getInstance().get<CatalogManager>(Singletons.CatalogManager);
  static readonly getSensorManager = () => Container.getInstance().get<SensorManager>(Singletons.SensorManager);
  static readonly getUiManager = () => Container.getInstance().get<UiManager>(Singletons.UiManager);
  static readonly getInputManager = () => Container.getInstance().get<InputManager>(Singletons.InputManager);
  static readonly getGroupsManager = () => Container.getInstance().get<GroupsManager>(Singletons.GroupsManager);
  static readonly getTimeManager = () => Container.getInstance().get<TimeManager>(Singletons.TimeManager);
  static readonly getOrbitManager = () => Container.getInstance().get<OrbitManager>(Singletons.OrbitManager);
  static readonly getColorSchemeManager = () => Container.getInstance().get<ColorSchemeManager>(Singletons.ColorSchemeManager);
  static readonly getDotsManager = () => Container.getInstance().get<DotsManager>(Singletons.DotsManager);
  static readonly getSensorMath = () => Container.getInstance().get<SensorMath>(Singletons.SensorMath);
  static readonly getLineManager = () => Container.getInstance().get<LineManager>(Singletons.LineManager);
  static readonly getHoverManager = () => Container.getInstance().get<HoverManager>(Singletons.HoverManager);
  static readonly getMainCamera = () => ServiceLocator.activeRenderCamera_ ?? Container.getInstance().get<Camera>(Singletons.MainCamera);
  static readonly getViewportManager = () => Container.getInstance().get<ViewportManager>(Singletons.ViewportManager) as ViewportManager | null;
  static readonly getMeshManager = () => Container.getInstance().get<MeshManager>(Singletons.MeshManager);
  static readonly getSatLabelManager = () => Container.getInstance().get<SatLabelManager>(Singletons.SatLabelManager);
}
