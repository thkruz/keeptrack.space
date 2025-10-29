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
import { EciVec3, Kilometers, Seconds } from '@ootk/src/main';
import { vec3 } from 'gl-matrix';
import { settingsManager } from '../../../../settings/settings';
import { CelestialBody, PlanetColors } from './celestial-body';

export enum VenusTextureQuality {
  POTATO = '512',
  HIGH = '4k',
  ULTRA = '8k'
}

export class Venus extends CelestialBody {
  readonly RADIUS = 6051.8;
  protected readonly NUM_HEIGHT_SEGS = 64;
  protected readonly NUM_WIDTH_SEGS = 64;
  color = PlanetColors.VENUS;
  orbitalPeriod = 0.61519726 * 365 * 24 * 3600 as Seconds;
  meanDistanceToSun = 108209475 as Kilometers;
  eci: EciVec3;
  textureQuality: VenusTextureQuality = VenusTextureQuality.POTATO;

  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/venus${this.textureQuality}.jpg`;
  }

  useHighestQualityTexture(): void {
    this.textureQuality = VenusTextureQuality.ULTRA;
    this.loadTexture();
  }

  getName(): SolarBody {
    return SolarBody.Venus;
  }

  draw(sunPosition: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_ || settingsManager.isDisablePlanets) {
      return;
    }
    super.draw(sunPosition, tgtBuffer);
  }
}
