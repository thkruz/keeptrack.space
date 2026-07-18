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
import { charonChebyshevCoeffs } from './charon-chebyshev';
import { DwarfPlanet } from './dwarf-planet';

export enum CharonTextureQuality {
  POTATO = '512',
  MEDIUM = '2k',
  HIGH = '4k',
}

export class Charon extends DwarfPlanet {
  readonly RADIUS = 606;
  protected readonly NUM_HEIGHT_SEGS = 64;
  protected readonly NUM_WIDTH_SEGS = 64;
  orbitalPeriod = (247.94 * 365.25 * 24 * 3600) as Seconds;
  meanDistanceToSun = (39.482 * KM_PER_AU) as Kilometers;
  type: SpaceObjectType = SpaceObjectType.DWARF_PLANET;
  eci: TemeVec3;
  rotation = [0, 0, 0];
  color = PlanetColors.CHARON;
  tintColor: [number, number, number] = [0.85, 0.85, 0.88];
  textureQuality: CharonTextureQuality = CharonTextureQuality.POTATO;
  protected interpolator_ = new ChebyshevInterpolator(charonChebyshevCoeffs);

  getName(): SolarBody {
    return 'Charon' as SolarBody;
  }
  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/pluto${this.textureQuality}.jpg`;
  }

  useHighestQualityTexture(): void {
    this.textureQuality = CharonTextureQuality.HIGH;
    this.loadTexture();
  }
}
