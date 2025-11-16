import type { CatalogManager } from '@app/app/data/catalog-manager';
import type { GroupsManager } from '@app/app/data/groups-manager';
import type { SensorMath } from '@app/app/sensors/sensor-math';
import type { SensorManager } from '@app/app/sensors/sensorManager';
import type { HoverManager } from '@app/app/ui/hover-manager';
import type { UiManager } from '@app/app/ui/ui-manager';
import { Container } from '@app/engine/core/container';
import { Singletons } from '@app/engine/core/interfaces';
import type { SoundManager } from '@app/plugins/sounds/sound-manager';
import type { OrbitManager } from '../../app/rendering/orbit-manager';
import type { Camera } from '../camera/camera';
import type { InputManager } from '../input/input-manager';
import type { ColorSchemeManager } from '../rendering/color-scheme-manager';
import type { DotsManager } from '../rendering/dots-manager';
import type { LineManager } from '../rendering/line-manager';
import type { MeshManager } from '../rendering/mesh-manager';
import type { WebGLRenderer } from '../rendering/webgl-renderer';
import type { Scene } from './scene';
import type { TimeManager } from './time-manager';

export class ServiceLocator {
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
  static readonly getMainCamera = () => Container.getInstance().get<Camera>(Singletons.MainCamera);
  static readonly getMeshManager = () => Container.getInstance().get<MeshManager>(Singletons.MeshManager);
}
