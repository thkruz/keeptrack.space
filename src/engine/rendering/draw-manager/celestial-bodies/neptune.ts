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

export enum NeptuneTextureQuality {
  POTATO = '512',
  HIGH = '4k',
  ULTRA = '2k'
}

export class Neptune extends CelestialBody {
  readonly RADIUS = 24622;
  protected readonly NUM_HEIGHT_SEGS = 64;
  protected readonly NUM_WIDTH_SEGS = 64;
  orbitalPeriod = 164.8 * 365.25 * 24 * 3600 as Seconds;
  meanDistanceToSun = 4498396441 as Kilometers;
  type = SpaceObjectType.ICE_GIANT;
  eci: EciVec3;
  color = PlanetColors.NEPTUNE;
  textureQuality: NeptuneTextureQuality = NeptuneTextureQuality.POTATO;

  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/neptune${this.textureQuality}.jpg`;
  }

  getName(): SolarBody {
    return SolarBody.Neptune;
  }

  useHighestQualityTexture(): void {
    this.textureQuality = NeptuneTextureQuality.ULTRA;
    this.loadTexture();
  }

  draw(sunPosition: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_ || settingsManager.isDisablePlanets) {
      return;
    }
    super.draw(sunPosition, tgtBuffer);
  }
}
