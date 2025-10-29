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
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { Scene } from '@app/engine/core/scene';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Seconds } from '@ootk/src/main';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { settingsManager } from '../../../../settings/settings';
import { CelestialBody, PlanetColors } from './celestial-body';

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
  orbitalPeriod = 27.321661 * 24 * 3600 as Seconds;
  color = PlanetColors.MOON;
  rotation = [0, 0, Math.PI];
  textureQuality: MoonTextureQuality = MoonTextureQuality.POTATO;

  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/moonmap${this.textureQuality}.jpg`;
  }

  getName(): SolarBody {
    return SolarBody.Moon;
  }

  useHighestQualityTexture(): void {
    this.textureQuality = MoonTextureQuality.ULTRA;
    this.loadTexture();
  }

  update(simTime: Date) {
    if (!this.isLoaded_) {
      return;
    }
    this.updatePosition(simTime);
    this.modelViewMatrix_ = mat4.clone(this.mesh.geometry.localMvMatrix);
    if (settingsManager.centerBody !== this.getName() || (PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? -1) !== -1) {
      mat4.translate(this.modelViewMatrix_, this.modelViewMatrix_, this.position);
      const worldShift = Scene.getInstance().worldShift;

      mat4.translate(this.modelViewMatrix_, this.modelViewMatrix_, vec3.fromValues(worldShift[0], worldShift[1], worldShift[2]));
    }
    mat4.rotateX(this.modelViewMatrix_, this.modelViewMatrix_, this.rotation[0]);
    mat4.rotateY(this.modelViewMatrix_, this.modelViewMatrix_, this.rotation[1]);
    mat4.rotateZ(this.modelViewMatrix_, this.modelViewMatrix_, this.rotation[2]);
    mat3.normalFromMat4(this.normalMatrix_, this.modelViewMatrix_);

    this.calculateRelativeSatPos();
  }

  updatePosition(simTime: Date): void {
    const posTeme = this.getTeme(simTime, SolarBody.Earth).position;

    this.position = [posTeme.x, posTeme.y, posTeme.z];
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
