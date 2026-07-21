/**
 * Shared camera-focus logic for deep-space satellites (Voyager 1, etc.).
 * Used by the URL handler (?sat=10321), SelectSatManager dot clicks, and the
 * pro Deep Space Missions menu, so all three paths behave identically.
 */
import { CameraType } from '@app/engine/camera/camera-type';
import { SolarBody } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { settingsManager } from '@app/settings/settings';
import { Kilometers } from '@ootk/src/main';

/** Min zoom distance for heliocentric / interplanetary framing (62 million km). */
export const INTERPLANETARY_MIN_ZOOM = 62e6 as Kilometers;
/** Max zoom distance for heliocentric / interplanetary framing (15 billion km). */
export const INTERPLANETARY_MAX_ZOOM = 1.5e10 as Kilometers;

/**
 * Centers the camera on a deep-space satellite by name (a key of
 * `scene.deepSpaceSatellites`), applying interplanetary zoom limits.
 * @returns false when the probe is not in the scene (ephemeris failed to load
 * or planets are disabled), in which case nothing is changed.
 */
export function focusDeepSpaceSatellite(name: string): boolean {
  const scene = ServiceLocator.getScene();

  if (!scene?.deepSpaceSatellites?.[name]) {
    return false;
  }

  PluginRegistry.getPlugin(SelectSatManager)?.selectSat(-1);
  settingsManager.centerBody = name as SolarBody;
  settingsManager.minZoomDistance = INTERPLANETARY_MIN_ZOOM;
  settingsManager.maxZoomDistance = INTERPLANETARY_MAX_ZOOM;
  ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_EARTH;
  ServiceLocator.getUiManager().hideSideMenus();

  return true;
}
