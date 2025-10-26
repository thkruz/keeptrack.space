/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { SolarBody } from '@app/engine/core/interfaces';
import { EciVec3, Kilometers, Seconds, SpaceObjectType } from '@ootk/src/main';
import { vec3 } from 'gl-matrix';
import { settingsManager } from '../../../../settings/settings';
import { CelestialBody, PlanetColors } from './celestial-body';

export enum JupiterTextureQuality {
  POTATO = '512',
  HIGH = '2k',
  ULTRA = '4k'
}

export class Jupiter extends CelestialBody {
  readonly RADIUS = 69911;
  protected readonly NUM_HEIGHT_SEGS = 64;
  protected readonly NUM_WIDTH_SEGS = 64;
  orbitalPeriod = 11.862 * 365.25 * 24 * 3600 as Seconds;
  meanDistanceToSun = 778340821 as Kilometers;
  type: SpaceObjectType = SpaceObjectType.GAS_GIANT;
  eci: EciVec3;
  color = PlanetColors.JUPITER;
  textureQuality: JupiterTextureQuality = JupiterTextureQuality.POTATO;

  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/jupiter${this.textureQuality}.jpg`;
  }

  getName(): SolarBody {
    return SolarBody.Jupiter;
  }

  useHighestQualityTexture(): void {
    this.textureQuality = JupiterTextureQuality.ULTRA;
    this.loadTexture();
  }

  draw(sunPosition: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_ || settingsManager.isDisablePlanets) {
      return;
    }
    super.draw(sunPosition, tgtBuffer);
  }
}
