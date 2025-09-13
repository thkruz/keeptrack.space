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

import { BackdatePosition as backdatePosition, Body, KM_PER_AU, RotationAxis as rotationAxis } from 'astronomy-engine';
import { vec3 } from 'gl-matrix';
import { DEG2RAD, EciVec3 } from 'ootk';
import { settingsManager } from '../../../../settings/settings';
import { CelestialBody } from './celestial-body';

// TODO: Uranus doesn't occlude the sun yet!

export enum UranusTextureQuality {
  HIGH = '4k',
  ULTRA = '2k'
}

export class Uranus extends CelestialBody {
  protected readonly RADIUS = 24622;
  protected readonly NUM_HEIGHT_SEGS = 64;
  protected readonly NUM_WIDTH_SEGS = 64;
  eci: EciVec3;

  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/uranus${UranusTextureQuality.ULTRA}.jpg`;
  }

  getName(): string {
    return Body.Uranus;
  }

  updatePosition(simTime: Date): void {
    const pos = backdatePosition(simTime, Body.Earth, Body.Uranus, false);
    const ros = rotationAxis(Body.Uranus, simTime);

    this.position = [pos.x * KM_PER_AU, pos.y * KM_PER_AU, pos.z * KM_PER_AU];
    this.rotation = [0, (ros.dec - 90) * DEG2RAD, ros.spin * DEG2RAD];
  }

  draw(sunPosition: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_ || settingsManager.isDisablePlanets) {
      return;
    }
    super.draw(sunPosition, tgtBuffer);
  }
}
