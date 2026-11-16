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

import { rgbaArray, SolarBody } from '@app/engine/core/interfaces';
import { IrregularBodyShape } from '@app/engine/rendering/irregular-body-shape';
import { Seconds } from '@ootk/src/main';
import { settingsManager } from '../../../../settings/settings';
import { PlanetMoon } from './planet-moon';
import { MoonElements, moonCentricPositionJ2000, orbitalPeriodSec } from './planet-moon-elements';

/**
 * Everything that distinguishes one moon from another apart from its orbit. Kept as data so
 * the nineteen moons are one readable table (`planet-moon-catalog.ts`) rather than nineteen
 * near-identical classes.
 */
export interface PlanetMoonSpec {
  name: SolarBody;
  parent: SolarBody;
  /** Mean radius, km (JPL). Drives zoom limits, the orbit-path fade and the dot handover. */
  radiusKm: number;
  /** Dot and orbit-ring color. */
  color: rgbaArray;
  /**
   * Texture basename under `public/textures/`. The 512 tier loads at boot and
   * {@link PlanetMoon.useHighestQualityTexture} swaps in {@link highQualityTier} once the
   * camera centers on the body.
   */
  texture: string;
  /** Suffix of the largest texture shipped for this moon, e.g. `4k`. */
  highQualityTier: string;
  /**
   * RGB multiplier applied to the texture in the fragment shader.
   *
   * Most of these maps are monochrome because that is how the mission flew: Cassini ISS
   * imaged Titan through a haze-penetrating filter, Voyager imaged the Uranian moons in
   * clear light. Rendering that data raw makes Titan a grey ball, which is wrong about the
   * one thing everybody knows about Titan. The tint restores each body's measured colour
   * without pretending the map itself carries it. Omit (or [1,1,1]) where the source is
   * already colour.
   */
  tint?: [number, number, number];
  /** Procedural irregular shape, for the moons too small to be round. */
  shape?: IrregularBodyShape;
  /**
   * Rotation about the spin axis applied after the tidal lock, radians. Aligns the
   * texture's prime meridian with the sub-planet point of an irregular shape model.
   */
  primeMeridianOffsetRad?: number;
}

/** Texture tier loaded at boot for every moon. Small enough that nineteen of them are free. */
const DEFAULT_TEXTURE_TIER = '512';

/**
 * A moon whose position comes from a fitted secular element set
 * ({@link moonCentricPositionJ2000}) rather than from an ephemeris library.
 *
 * This covers everything except Jupiter's Galileans, which astronomy-engine already models
 * far better than a mean-element fit can - see `GalileanMoon`.
 */
export class AnalyticMoon extends PlanetMoon {
  /*
   * `declare` on the inherited fields: they are set from the spec in the constructor, so
   * re-declaring them for real would emit a field initializer that shadows the base.
   */
  declare readonly RADIUS: number;
  declare orbitalPeriod: Seconds;
  declare color: rgbaArray;
  declare protected readonly shape?: IrregularBodyShape;
  declare protected readonly primeMeridianOffsetRad: number;
  readonly parentBody: SolarBody;
  readonly semiMajorAxisKm: number;
  readonly elements: MoonElements;

  private readonly name_: SolarBody;
  private readonly textureBase_: string;
  private readonly highQualityTier_: string;
  private textureTier_ = DEFAULT_TEXTURE_TIER;

  constructor(spec: PlanetMoonSpec, elements: MoonElements) {
    super();
    this.name_ = spec.name;
    this.parentBody = spec.parent;
    this.RADIUS = spec.radiusKm;
    this.color = spec.color;
    this.textureBase_ = spec.texture;
    this.highQualityTier_ = spec.highQualityTier;
    this.shape = spec.shape;
    this.primeMeridianOffsetRad = spec.primeMeridianOffsetRad ?? 0;
    this.tintColor = spec.tint ?? [1, 1, 1];
    this.elements = elements;
    this.semiMajorAxisKm = elements.semiMajorAxisKm;
    this.orbitalPeriod = orbitalPeriodSec(elements) as Seconds;
  }

  protected parentCentricPositionJ2000(simTime: Date): [number, number, number] {
    return moonCentricPositionJ2000(this.elements, simTime);
  }

  getName(): SolarBody {
    return this.name_;
  }

  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/${this.textureBase_}${this.textureTier_}.jpg`;
  }

  useHighestQualityTexture(): void {
    if (this.textureTier_ === this.highQualityTier_) {
      return;
    }
    this.textureTier_ = this.highQualityTier_;
    this.loadTexture();
  }
}
