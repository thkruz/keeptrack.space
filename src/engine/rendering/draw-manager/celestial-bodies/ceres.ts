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
import { settingsManager } from '@app/settings/settings';
import { ChebyshevInterpolator } from '@ootk/src/interpolator/ChebyshevInterpolator';
import { Kilometers, Seconds, SpaceObjectType, TemeVec3 } from '@ootk/src/main';
import { KM_PER_AU } from 'astronomy-engine';
import { PlanetColors } from './celestial-body';
import { ceresChebyshevCoeffs } from './ceres-chebyshev';
import { DwarfPlanet } from './dwarf-planet';

export enum CeresTextureQuality {
  POTATO = '512',
  MEDIUM = '2k',
  HIGH = '4k',
}

export class Ceres extends DwarfPlanet {
  readonly RADIUS = 469.7;
  protected readonly NUM_HEIGHT_SEGS = 64;
  protected readonly NUM_WIDTH_SEGS = 64;
  orbitalPeriod = (4.6 * 365.25 * 24 * 3600) as Seconds;
  meanDistanceToSun = (2.77 * KM_PER_AU) as Kilometers;
  type: SpaceObjectType = SpaceObjectType.DWARF_PLANET;
  eci: TemeVec3;
  rotation = [0, 0, 0];
  color = PlanetColors.CERES;
  textureQuality: CeresTextureQuality = CeresTextureQuality.POTATO;
  protected interpolator_ = new ChebyshevInterpolator(ceresChebyshevCoeffs);

  getName(): SolarBody {
    return 'Ceres' as SolarBody;
  }
  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/ceres${this.textureQuality}.jpg`;
  }

  useHighestQualityTexture(): void {
    this.textureQuality = CeresTextureQuality.HIGH;
    this.loadTexture();
  }
}
