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
import { SaturnRings } from './saturn-rings';

// TODO: Saturn doesn't occlude the sun yet!

export enum SaturnTextureQuality {
  HIGH = '2k',
  ULTRA = '4k'
}

export class Saturn extends CelestialBody {
  radius = 69911;
  readonly RADIUS = this.radius;
  protected readonly NUM_HEIGHT_SEGS = 64;
  protected readonly NUM_WIDTH_SEGS = 64;
  eci: EciVec3;
  private readonly rings_: SaturnRings;

  constructor() {
    super();
    this.rings_ = new SaturnRings(this);
  }

  async init(gl: WebGL2RenderingContext): Promise<void> {
    await super.init(gl);
    await this.rings_.init(gl);
  }

  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/saturn${SaturnTextureQuality.ULTRA}.jpg`;
  }

  getName(): Body {
    return Body.Saturn;
  }

  updatePosition(simTime: Date): void {
    const pos = backdatePosition(simTime, Body.Earth, Body.Saturn, false);
    const ros = rotationAxis(Body.Saturn, simTime);

    this.position = [pos.x * KM_PER_AU, pos.y * KM_PER_AU, pos.z * KM_PER_AU];
    this.rotation = [0, (ros.dec - 90) * DEG2RAD, ros.spin * DEG2RAD];
  }

  update(simTime: Date): void {
    super.update(simTime);
    this.rings_.update(simTime);
  }

  draw(sunPosition: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_ || settingsManager.isDisablePlanets) {
      return;
    }

    super.draw(sunPosition, tgtBuffer);
    this.rings_.draw(sunPosition, tgtBuffer);
  }
}
