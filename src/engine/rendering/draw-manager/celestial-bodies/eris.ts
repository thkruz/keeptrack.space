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
import { ChebyshevInterpolator } from '@ootk/src/interpolator/ChebyshevInterpolator';
import { Kilometers, Seconds, SpaceObjectType, TemeVec3 } from '@ootk/src/main';
import { KM_PER_AU } from 'astronomy-engine';
import { PlanetColors } from './celestial-body';
import { DwarfPlanet } from './dwarf-planet';
import { erisChebyshevCoeffs } from './eris-chebyshev';

export enum ErisTextureQuality {
  POTATO = '512',
  MEDIUM = '2k',
  HIGH = '4k',
}

export class Eris extends DwarfPlanet {
  readonly RADIUS = 1163;
  protected readonly NUM_HEIGHT_SEGS = 64;
  protected readonly NUM_WIDTH_SEGS = 64;
  orbitalPeriod = (558.01 * 365.25 * 24 * 3600) as Seconds;
  meanDistanceToSun = (67.668 * KM_PER_AU) as Kilometers;
  type: SpaceObjectType = SpaceObjectType.DWARF_PLANET;
  eci: TemeVec3;
  rotation = [0, 0, 0];
  color = PlanetColors.ERIS;
  textureQuality: ErisTextureQuality = ErisTextureQuality.POTATO;
  protected interpolator_ = new ChebyshevInterpolator(erisChebyshevCoeffs);

  getName(): SolarBody {
    return 'Eris' as SolarBody;
  }
  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/eris${this.textureQuality}.jpg`;
  }

  useHighestQualityTexture(): void {
    this.textureQuality = ErisTextureQuality.HIGH;
    this.loadTexture();
  }
}
