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
import { UranusRings } from './uranus-rings';

export enum UranusTextureQuality {
  POTATO = '512',
  ULTRA = '2k'
}

export class Uranus extends CelestialBody {
  radius = 24622;
  readonly RADIUS = this.radius;
  protected readonly NUM_HEIGHT_SEGS = 64;
  protected readonly NUM_WIDTH_SEGS = 64;
  orbitalPeriod = 84 * 365.25 * 24 * 3600 as Seconds;
  meanDistanceToSun = 2870658186 as Kilometers;
  eci: EciVec3;
  type: SpaceObjectType = SpaceObjectType.ICE_GIANT;
  private readonly rings_: UranusRings;
  color = PlanetColors.URANUS;
  textureQuality: UranusTextureQuality = UranusTextureQuality.POTATO;

  constructor() {
    super();
    this.rings_ = new UranusRings(this);
  }
  async init(gl: WebGL2RenderingContext): Promise<void> {
    await super.init(gl);
    await this.rings_.init(gl);
  }

  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/uranus${this.textureQuality}.jpg`;
  }

  useHighestQualityTexture(): void {
    this.textureQuality = UranusTextureQuality.ULTRA;
    this.loadTexture();
  }

  getName(): SolarBody {
    return SolarBody.Uranus;
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
