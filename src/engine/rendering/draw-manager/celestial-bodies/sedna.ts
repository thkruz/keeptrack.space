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
import { sednaChebyshevCoeffs } from './sedna-chebyshev';

export enum SednaTextureQuality {
  POTATO = '512',
  MEDIUM = '2k',
  HIGH = '4k',
}

export class Sedna extends DwarfPlanet {
  readonly RADIUS = 995;
  protected readonly NUM_HEIGHT_SEGS = 64;
  protected readonly NUM_WIDTH_SEGS = 64;
  orbitalPeriod = (11400 * 365.25 * 24 * 3600) as Seconds;
  meanDistanceToSun = (506 * KM_PER_AU) as Kilometers;
  type: SpaceObjectType = SpaceObjectType.DWARF_PLANET;
  eci: TemeVec3;
  rotation = [0, 0, 0];
  color = PlanetColors.SEDNA;
  tintColor: [number, number, number] = [1.3, 0.6, 0.5];
  textureQuality: SednaTextureQuality = SednaTextureQuality.POTATO;
  protected interpolator_ = new ChebyshevInterpolator(sednaChebyshevCoeffs);

  getName(): SolarBody {
    return 'Sedna' as SolarBody;
  }
  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/makemake${this.textureQuality}.jpg`;
  }

  useHighestQualityTexture(): void {
    this.textureQuality = SednaTextureQuality.HIGH;
    this.loadTexture();
  }
}
