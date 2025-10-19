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

// TODO: Mars doesn't occlude the sun yet!

export enum MarsTextureQuality {
  HIGH = '4k',
  ULTRA = '8k'
}

export class Mars extends CelestialBody {
  readonly RADIUS = 3389.5;
  protected readonly NUM_HEIGHT_SEGS = 64;
  protected readonly NUM_WIDTH_SEGS = 64;
  eci: EciVec3;
  rotation = [0, 0, Math.PI * 7 / 10];

  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/mars${MarsTextureQuality.ULTRA}.jpg`;
  }

  getName(): Body {
    return Body.Mars;
  }

  updatePosition(simTime: Date): void {
    const pos = backdatePosition(simTime, Body.Earth, Body.Mars, false);
    const ros = rotationAxis(Body.Mars, simTime);

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
