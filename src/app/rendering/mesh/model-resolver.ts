import type { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import type { MeshModel } from '@app/engine/rendering/mesh-manager';
import { BaseObject, Satellite, SpaceObjectType } from '@ootk/src/main';

export const SatelliteModels = {
  aehf: 'aehf',
  'amazon-leo': 'amazon-leo',
  debris0: 'debris0',
  debris1: 'debris1',
  debris2: 'debris2',
  'deb-panel-01': 'deb-panel-01',
  'deb-panel-02': 'deb-panel-02',
  'deb-panel-03': 'deb-panel-03',
  'deb-bracket-01': 'deb-bracket-01',
  'deb-bracket-02': 'deb-bracket-02',
  'deb-bracket-03': 'deb-bracket-03',
  'deb-skin-01': 'deb-skin-01',
  'deb-skin-02': 'deb-skin-02',
  'deb-skin-03': 'deb-skin-03',
  'deb-clampband-01': 'deb-clampband-01',
  'deb-clampband-02': 'deb-clampband-02',
  'deb-clampband-03': 'deb-clampband-03',
  'deb-mli-01': 'deb-mli-01',
  'deb-mli-02': 'deb-mli-02',
  'deb-mli-03': 'deb-mli-03',
  'deb-mli-04': 'deb-mli-04',
  'deb-strut-01': 'deb-strut-01',
  'deb-strut-02': 'deb-strut-02',
  'deb-strut-03': 'deb-strut-03',
  'deb-cone-01': 'deb-cone-01',
  'deb-cone-02': 'deb-cone-02',
  'deb-torus-01': 'deb-torus-01',
  'deb-torus-02': 'deb-torus-02',
  'deb-cyl-01': 'deb-cyl-01',
  'deb-cyl-02': 'deb-cyl-02',
  dsp: 'dsp',
  flock: 'flock',
  galileo: 'galileo',
  globalstar: 'globalstar',
  glonass: 'glonass',
  gps: 'gps',
  hubble: 'hubble',
  iridium: 'iridium',
  iss: 'iss',
  lemur: 'lemur',
  misl: 'misl',
  misl2: 'misl2',
  misl3: 'misl3',
  misl4: 'misl4',
  o3b: 'o3b',
  oneweb: 'oneweb',
  orbcomm: 'orbcomm',
  orion: 'orion',
  'rb-cyl-centaur': 'rb-cyl-centaur',
  'rb-cyl-china': 'rb-cyl-china',
  'rb-cyl-delta': 'rb-cyl-delta',
  'rb-cyl-electron': 'rb-cyl-electron',
  'rb-cyl-euro': 'rb-cyl-euro',
  'rb-cyl-gray-s': 'rb-cyl-gray-s',
  'rb-cyl-gray-m': 'rb-cyl-gray-m',
  'rb-cyl-gray-l': 'rb-cyl-gray-l',
  'rb-cyl-kerolox': 'rb-cyl-kerolox',
  'rb-cyl-proton': 'rb-cyl-proton',
  'rb-cyl-soviet': 'rb-cyl-soviet',
  'rb-cyl-soviet-b': 'rb-cyl-soviet-b',
  'rb-cyl2n-legacy': 'rb-cyl2n-legacy',
  'rb-cylcone-soviet': 'rb-cylcone-soviet',
  'rb-sphercone-kick': 'rb-sphercone-kick',
  'rb-stepcyl-soviet': 'rb-stepcyl-soviet',
  'rb-trunccone-gray': 'rb-trunccone-gray',
  rv: 'rv',
  s1u: 's1u',
  s2u: 's2u',
  s3u: 's3u',
  s6u: 's6u',
  s12u: 's12u',
  sat2: 'sat2',
  'saturn-iv-b': 'saturn-iv-b',
  sbirs: 'sbirs',
  ses: 'ses',
  spacebee1gen: 'spacebee1gen',
  spacebee2gen: 'spacebee2gen',
  spacebee3gen: 'spacebee3gen',
  starlink: 'starlink',
  'starlink-v2mini': 'starlink-v2mini',
  sateliotsat: 'sateliotsat',
  sateliotsat2: 'sateliotsat2',
  tiangong: 'tiangong',
  issmodel: 'issmodel',
  jwst: 'jwst',
} as const;

enum SatelliteNumber {
  iss = '25544',
  tiangong = '48274',
  jwst = '50463',
  hubble = '20580',
}

export class ModelResolver {
  /** One slot per registered model; existence of a key gates meshOverride. */
  modelMap: Record<string, MeshModel | null> = Object.fromEntries(
    Object.values(SatelliteModels).map((name) => [name, null]),
  );

  private readonly sccNumAehf_ = ['36868', '38254', '39256', '43651', '44481', '45465'];
  private readonly sccNumDsp_ = [
    '04630', '05204', '05851', '06691', '08482', '08916', '09803', '11397', '12339', '13086', '14930',
    '15453', '18583', '20066', '20929', '21805', '23435', '24737', '26356', '26880', '28158',
  ];

  resolve(obj: BaseObject): string {
    return this.resolveModelName_(obj);
  }

  private resolveModelName_(obj: BaseObject): string {
    if (obj.isMissile()) {
      this.resolveMislModelName_(obj as MissileObject);
    } else if (obj instanceof OemSatellite) {
      if (obj.model) {
        return obj.model;
      }

      // Currently no specific model for OEM satellites - default to aehf
      return SatelliteModels.aehf;
    } else {
      const sat = obj as Satellite;

      switch (sat.type) {
        case SpaceObjectType.PAYLOAD:
          return this.resolveSatModelName_(sat);
        case SpaceObjectType.ROCKET_BODY:
          return this.resolveRocketBodyModelName_(sat);
        case SpaceObjectType.DEBRIS:
          return this.resolveDebrisModelName_(sat);
        default:
        // Generic Model
      }
    }

    return SatelliteModels.sat2;
  }

  /**
   * Non-cylinder silhouettes, matched on the catalog `shape` field with all
   * whitespace stripped (the data mixes "Sphere + Cone" / "Sphere+Cone" etc.).
   */
  private static readonly rbSilhouettes_: Record<string, string> = {
    'sphere+cone': SatelliteModels['rb-sphercone-kick'],
    'trunccone': SatelliteModels['rb-trunccone-gray'],
    'truncatedcone': SatelliteModels['rb-trunccone-gray'],
    'stepcyl': SatelliteModels['rb-stepcyl-soviet'],
    'cyl+cyl': SatelliteModels['rb-stepcyl-soviet'],
    'cyl+cone': SatelliteModels['rb-cylcone-soviet'],
    'cyl+2nozzle': SatelliteModels['rb-cyl2n-legacy'],
  };

  /**
   * Launch-vehicle families for cylinder stages, checked in order. A null
   * model is a deliberate opt-out (e.g. hydrolox Delta IV is not the teal
   * Delta II) that falls through to the size buckets. Soviet vehicles are
   * handled separately because they split by length.
   */
  private static readonly rbFamilies_: { match: RegExp; model: string | null }[] = [
    { match: /falcon/u, model: SatelliteModels['rb-cyl-kerolox'] },
    { match: /electron/u, model: SatelliteModels['rb-cyl-electron'] },
    { match: /ariane|vega/u, model: SatelliteModels['rb-cyl-euro'] },
    { match: /chang zheng|long march|^cz[\s-]/u, model: SatelliteModels['rb-cyl-china'] },
    { match: /atlas|centaur|titan/u, model: SatelliteModels['rb-cyl-centaur'] },
    { match: /delta (?:iv|4)/u, model: null },
    { match: /delta/u, model: SatelliteModels['rb-cyl-delta'] },
    { match: /proton|briz|fregat/u, model: SatelliteModels['rb-cyl-proton'] },
  ];

  private static readonly rbSovietVehicles_ =
    /kosmos|cosmos|tsiklon|tsyklon|cyclone|vostok|voskhod|molniya|soyuz|rokot|dnepr|zenit|shtil|angara|sputnik/u;

  /**
   * Rocket bodies, most-specific signal first: catalog `shape` picks the
   * silhouette, `launchVehicle` picks the palette family for plain cylinders,
   * and real dimensions bucket everything else into the gray sizes.
   */
  private resolveRocketBodyModelName_(sat: Satellite): string {
    const shape = sat.shape.toLowerCase().replace(/\s+/gu, '');
    const silhouette = ModelResolver.rbSilhouettes_[shape];

    if (silhouette) {
      return silhouette;
    }

    const family = this.resolveRbFamilyModelName_(sat);

    if (family) {
      return family;
    }

    return this.resolveRbSizeBucket_(sat);
  }

  private resolveRbFamilyModelName_(sat: Satellite): string | null {
    const launchVehicle = sat.launchVehicle.toLowerCase();

    if (!launchVehicle) {
      return null;
    }

    for (const { match, model } of ModelResolver.rbFamilies_) {
      if (match.test(launchVehicle)) {
        return model;
      }
    }

    if (ModelResolver.rbSovietVehicles_.test(launchVehicle)) {
      const length = Number.parseFloat(sat.length);

      // Short Soviet stages (Tsiklon S5M class) get the squat variant
      return length > 0 && length <= 4 ? SatelliteModels['rb-cyl-soviet-b'] : SatelliteModels['rb-cyl-soviet'];
    }

    return null;
  }

  /**
   * Size-bucketed generic gray stages. Catalog diameter (meters) drives the
   * bucket, length is the fallback, medium the default; 99.7% of rocket-body
   * records carry both fields.
   */
  private resolveRbSizeBucket_(sat: Satellite): string {
    const diameter = Number.parseFloat(sat.diameter);

    if (diameter > 0) {
      if (diameter < 2.0) {
        return SatelliteModels['rb-cyl-gray-s'];
      }

      return diameter <= 3.2 ? SatelliteModels['rb-cyl-gray-m'] : SatelliteModels['rb-cyl-gray-l'];
    }

    const length = Number.parseFloat(sat.length);

    if (length > 0) {
      if (length < 5) {
        return SatelliteModels['rb-cyl-gray-s'];
      }

      return length <= 9 ? SatelliteModels['rb-cyl-gray-m'] : SatelliteModels['rb-cyl-gray-l'];
    }

    return SatelliteModels['rb-cyl-gray-m'];
  }

  /**
   * Generic debris archetype pool (6 archetypes x 3-4 seeds). Objects with no
   * distinguishing catalog metadata are spread across these by a stable hash of
   * their sccNum.
   */
  private static readonly debrisGenericPool_ = [
    SatelliteModels['deb-panel-01'], SatelliteModels['deb-panel-02'], SatelliteModels['deb-panel-03'],
    SatelliteModels['deb-bracket-01'], SatelliteModels['deb-bracket-02'], SatelliteModels['deb-bracket-03'],
    SatelliteModels['deb-skin-01'], SatelliteModels['deb-skin-02'], SatelliteModels['deb-skin-03'],
    SatelliteModels['deb-clampband-01'], SatelliteModels['deb-clampband-02'], SatelliteModels['deb-clampband-03'],
    SatelliteModels['deb-mli-01'], SatelliteModels['deb-mli-02'], SatelliteModels['deb-mli-03'], SatelliteModels['deb-mli-04'],
    SatelliteModels['deb-strut-01'], SatelliteModels['deb-strut-02'], SatelliteModels['deb-strut-03'],
  ];

  /**
   * Shape-driven debris specials, matched on the catalog `shape` field (all
   * whitespace stripped, lowercased) BEFORE the generic hash. Covers the ~4% of
   * debris that carry a shape: cone (154 records), cyl (108), torus (83 - the
   * Proton SOZ ullage-motor rings). Each maps to a small sub-pool; the hash then
   * picks a variant within it. disk / disk+cable fall through to the generic pool.
   */
  private static readonly debrisShapeSpecials_: Record<string, string[]> = {
    cone: [SatelliteModels['deb-cone-01'], SatelliteModels['deb-cone-02']],
    cyl: [SatelliteModels['deb-cyl-01'], SatelliteModels['deb-cyl-02']],
    cylinder: [SatelliteModels['deb-cyl-01'], SatelliteModels['deb-cyl-02']],
    torus: [SatelliteModels['deb-torus-01'], SatelliteModels['deb-torus-02']],
    toroid: [SatelliteModels['deb-torus-01'], SatelliteModels['deb-torus-02']],
  };

  /**
   * Debris. The catalog gives almost no signal here (`shape` is empty on ~96%
   * of records and `rcs` is null): match the shape special when present, else
   * spread across the generic archetype pool. Either way a stable per-object
   * hash of the sccNum picks the variant, so a given piece always renders the
   * same mesh across sessions and screenshots.
   */
  private resolveDebrisModelName_(sat: Satellite): string {
    const shape = sat.shape.toLowerCase().replace(/\s+/gu, '');
    const pool = ModelResolver.debrisShapeSpecials_[shape] ?? ModelResolver.debrisGenericPool_;

    return pool[this.variantIndex_(sat.sccNum, pool.length)];
  }

  /**
   * Stable FNV-1a hash of an identity string into [0, count). Spreads objects
   * with no distinguishing metadata across a variant pool while guaranteeing
   * the same object always maps to the same variant. Handles alpha-5 and
   * extended sccNums (it hashes characters), unlike the parseInt bucketing it
   * replaced, which collapsed every non-5-digit id into one bucket.
   */
  private variantIndex_(key: string, count: number): number {
    let h = 0x811c9dc5;

    for (const ch of key) {
      h = Math.imul(h ^ (ch.codePointAt(0) ?? 0), 0x01000193);
    }

    return (h >>> 0) % count;
  }

  // eslint-disable-next-line complexity
  private resolveSatModelName_(sat: Satellite): string {
    if (sat.name.startsWith('STARLINK')) {
      return this.resolveStarlinkModelName_(sat);
    }

    // Amazon Leo (Project Kuiper): bus metadata first, name-prefix fallback
    // so prototypes (KUIPER-P*) and records missing bus data still match.
    if (sat.bus === 'Kuiper' || sat.name.startsWith('KUIPER')) {
      return SatelliteModels['amazon-leo'];
    }

    const knownSatelliteModel = this.resolveByName_(sat.name);

    if (knownSatelliteModel) {
      return knownSatelliteModel;
    }

    if (sat.sccNum === SatelliteNumber.iss) {
      return SatelliteModels.iss;
    }

    if (sat.sccNum === SatelliteNumber.hubble) {
      return SatelliteModels.hubble;
    }

    if (sat.sccNum === SatelliteNumber.tiangong) {
      return SatelliteModels.tiangong;
    }

    // JWST not ready yet.
    // eslint-disable-next-line no-constant-condition
    if (false && sat.sccNum === SatelliteNumber.jwst) {
      return SatelliteModels.jwst;
    }

    if (this.sccNumAehf_.indexOf(sat.sccNum) !== -1) {
      return SatelliteModels.aehf;
    }

    if (this.sccNumDsp_.indexOf(sat.sccNum) !== -1) {
      return SatelliteModels.dsp;
    }

    switch (sat.payload) {
      case 'Platform-3':
      case 'Sateliot-1':
        return SatelliteModels.sateliotsat;
      case 'Sateliot-2':
      case 'Sateliot-3':
      case 'Sateliot-4':
        return SatelliteModels.sateliotsat2;
      default:
        // Do Nothing
        break;
    }

    switch (sat.bus) {
      case 'sateliotsat':
        return SatelliteModels.sateliotsat;
      case 'Cubesat 0.25U':
        if (sat.intlDes.startsWith('2018')) {
          return SatelliteModels.spacebee1gen;
        } else if (sat.name.startsWith('SPACEBEE')) {
          return SatelliteModels.spacebee3gen;
        }

        return SatelliteModels.spacebee1gen;
      case 'Cubesat':
      case 'Cubesat 1U':
        if (sat.name.startsWith('SPACEBEE')) {
          return SatelliteModels.spacebee2gen;
        }

        return SatelliteModels.s1u;
      case 'Cubesat 2U':
        return SatelliteModels.s2u;
      case 'Cubesat 3U':
      case 'Cubesat 3U+':
        return SatelliteModels.s3u;
      case 'Cubesat 6U':
        return SatelliteModels.s6u;
      case 'Cubesat 12U':
        return SatelliteModels.s12u;
      case 'DSP':
      case 'DSP B14':
      case 'DSP B18':
      case 'DSP MOS/PIM':
      case 'DSP P2U':
      case 'DSP P2':
        return SatelliteModels.dsp;
      case 'GPS':
      case 'GPS II':
      case 'GPS IIA':
      case 'GPS IIF':
      case 'GPS IIR':
        return SatelliteModels.gps;
      case 'Iridium':
        return SatelliteModels.iridium;
      case 'ARROW':
        return SatelliteModels.oneweb;
      case 'Cubesat 1.5U':
      case 'Cubesat 0.5U':
      case 'Cubesat 16U':
      case 'Cubesat 0.3U':
      default:
      // Do Nothing
    }

    switch (!Number.isNaN(sat.rcs as number)) {
      case sat.rcs! < 0.1 && sat.rcs! > 0.04:
        return SatelliteModels.s1u;
      case sat.rcs! < 0.22 && sat.rcs! >= 0.1:
        return SatelliteModels.s2u;
      case sat.rcs! < 0.33 && sat.rcs! >= 0.22:
        return SatelliteModels.s3u;
      default:
      // Generic Model
    }

    return SatelliteModels.sat2;
  }

  /**
   * The catalog metadata marks v2 Mini variants with a "Starlink V2M" bus
   * prefix (V2M, V2MD direct-to-cell, V2MO optimized). When bus metadata is
   * missing, fall back on SpaceX naming: v1.x names are 4-digit (max 6380),
   * v2 Mini names are 5-digit (11072+).
   */
  private resolveStarlinkModelName_(sat: Satellite): string {
    if (sat.bus.startsWith('Starlink V2M')) {
      return SatelliteModels['starlink-v2mini'];
    }
    if (sat.bus === 'Starlink') {
      return SatelliteModels.starlink;
    }

    const nameNumber = Number.parseInt(sat.name.replace(/\D+/gu, ''), 10);

    return nameNumber >= 10000 ? SatelliteModels['starlink-v2mini'] : SatelliteModels.starlink;
  }

  private resolveByName_(name: string): string | null {
    // TODO: Currently all named models aim at nadir - that isn't always true

    if (name.startsWith('GLOBALSTAR')) {
      return SatelliteModels.globalstar;
    }
    if (name.startsWith('IRIDIUM')) {
      return SatelliteModels.iridium;
    }
    if (name.startsWith('ORBCOMM')) {
      return SatelliteModels.orbcomm;
    }
    if (RegExp(/SES\s\d+/u, 'u').exec(name)) {
      return SatelliteModels.ses;
    }
    if (name.startsWith('O3B')) {
      return SatelliteModels.o3b;
    }
    if (name.startsWith('NAVSTAR')) {
      return SatelliteModels.gps;
    }
    if (name.startsWith('GALILEO')) {
      return SatelliteModels.galileo;
    }
    if (name.includes('GLONASS')) {
      return SatelliteModels.glonass;
    }
    if (name.startsWith('SBIRS')) {
      return SatelliteModels.sbirs;
    }
    if (name.startsWith('FLOCK')) {
      return SatelliteModels.flock;
    }
    if (name.startsWith('LEMUR')) {
      return SatelliteModels.lemur;
    }

    return null;
  }

  private resolveMislModelName_(misl: MissileObject): string {
    // After max alt it looks like an RV
    if (!misl.isGoingUp() && misl.lastTime > 20) {
      return SatelliteModels.rv;
    }

    /*
     * Otherwise pick a random missile model, but use the
     * name so that it stays consistent between draws
     */
    const lastNumberInName = RegExp(/\d+$/u, 'u').exec(misl.name);

    if (lastNumberInName) {
      const number = Number.parseInt(lastNumberInName[0]);

      if (number <= 2) {
        return SatelliteModels.misl;
      } else if (number <= 4) {
        return SatelliteModels.misl2;
      } else if (number <= 6) {
        return SatelliteModels.misl3;
      } else if (number <= 8) {
        return SatelliteModels.misl4;
      }

      return SatelliteModels.misl;
    }

    return SatelliteModels.misl;

  }
}
