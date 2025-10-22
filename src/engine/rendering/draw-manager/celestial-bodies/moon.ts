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

import { Body } from 'astronomy-engine';
import { vec3 } from 'gl-matrix';
import { Seconds } from 'ootk';
import { settingsManager } from '../../../../settings/settings';
import { LineColors } from '../../line-manager/line';
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
  readonly RADIUS = 1737.4;
  protected readonly NUM_HEIGHT_SEGS = 128;
  protected readonly NUM_WIDTH_SEGS = 128;
  protected timeForOneOrbit = 27.321661 * 24 * 3600 as Seconds;
  color = LineColors.WHITE;
  rotation = [0, 0, Math.PI];

  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/moonmap${MoonTextureQuality.ULTRA}.jpg`;
  }

  getName(): Body {
    return Body.Moon;
  }

  draw(sunPosition: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_ || settingsManager.isDisablePlanets) {
      return;
    }
    super.draw(sunPosition, tgtBuffer);
  }

  protected calculateRelativeSatPos() {
    // Nothing to do in the test cases we have
  }
}
