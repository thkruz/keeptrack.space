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

export enum MercuryTextureQuality {
  POTATO = '512',
  HIGH = '4k',
  ULTRA = '8k'
}

export class Mercury extends CelestialBody {
  readonly RADIUS = 2439.7;
  protected readonly NUM_HEIGHT_SEGS = 64;
  protected readonly NUM_WIDTH_SEGS = 64;
  color = PlanetColors.MERCURY;
  orbitalPeriod = 0.2408467 * 365 * 24 * 3600 as Seconds;
  meanDistanceToSun = 57909227 as Kilometers;
  eci: EciVec3;
  textureQuality: MercuryTextureQuality = MercuryTextureQuality.POTATO;

  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/mercury${this.textureQuality}.jpg`;
  }

  getName(): SolarBody {
    return SolarBody.Mercury;
  }

  useHighestQualityTexture(): void {
    this.textureQuality = MercuryTextureQuality.ULTRA;
    this.loadTexture();
  }

  draw(sunPosition: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_ || settingsManager.isDisablePlanets) {
      return;
    }
    super.draw(sunPosition, tgtBuffer);
  }
}
