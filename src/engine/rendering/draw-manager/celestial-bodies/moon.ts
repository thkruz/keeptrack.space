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

import { BackdatePosition as backdatePosition, Body, KM_PER_AU } from 'astronomy-engine';
import { vec3 } from 'gl-matrix';
import { EciVec3 } from 'ootk';
import { settingsManager } from '../../../../settings/settings';
import { CelestialBody } from './celestial-body';

// TODO: Moon doesn't occlude the sun yet!

export enum MoonTextureQuality {
  POTATO = '512',
  LOW = '1k',
  MEDIUM = '2k',
  HIGH = '4k',
  ULTRA = '8k'
}

export class Moon extends CelestialBody {
  protected readonly RADIUS = 1737.4;
  protected readonly NUM_HEIGHT_SEGS = 64;
  protected readonly NUM_WIDTH_SEGS = 64;
  eci: EciVec3;
  rotation = [0, 0, Math.PI] as vec3;

  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/moonmap${MoonTextureQuality.ULTRA}.jpg`;
  }

  getName(): string {
    return Body.Moon;
  }

  updatePosition(simTime: Date): void {
    const pos = backdatePosition(simTime, Body.Earth, Body.Moon, false);

    this.position = [pos.x * KM_PER_AU, pos.y * KM_PER_AU, pos.z * KM_PER_AU];
  }

  draw(sunPosition: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_ || settingsManager.isDisablePlanets) {
      return;
    }
    super.draw(sunPosition, tgtBuffer);
  }
}
