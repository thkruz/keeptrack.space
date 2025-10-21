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

import { ServiceLocator } from '@app/engine/core/service-locator';
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
  rotation = [0, 0, Math.PI];
  moonOrbitPathSegments_ = 512;

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

  drawOrbitPath(): void {
    const timeForOneOrbit = 27.321661 * 24 * 3600; // in seconds
    const now = ServiceLocator.getTimeManager().simulationTimeObj.getTime() / 1000 as Seconds; // convert ms to s
    const timeslice = timeForOneOrbit / this.moonOrbitPathSegments_;
    const orbitPositions: [number, number, number][] = [];
    const lineManagerInstance = ServiceLocator.getLineManager();

    for (let i = 0; i < this.moonOrbitPathSegments_; i++) {
      const t = now + i * timeslice;
      const sv = this.getTeme(new Date(t * 1000)).position; // convert s to ms

      orbitPositions.push([sv.x as number, sv.y as number, sv.z as number]);
    }

    for (let i = 0; i < (this.moonOrbitPathSegments_ - 1); i++) {
      lineManagerInstance.createRef2Ref(
        orbitPositions[i],
        orbitPositions[(i + 1) % this.moonOrbitPathSegments_],
        LineColors.WHITE,
      );
    }
  }

  protected calculateRelativeSatPos() {
    // Nothing to do in the test cases we have
  }
}
