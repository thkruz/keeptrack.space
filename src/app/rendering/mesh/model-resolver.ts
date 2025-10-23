import type { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import type { MeshModel } from '@app/engine/rendering/mesh-manager';
import { BaseObject, DetailedSatellite, SpaceObjectType } from '@ootk/src/main';

export const SatelliteModels = {
  aehf: 'aehf',
  debris0: 'debris0',
  debris1: 'debris1',
  debris2: 'debris2',
  dsp: 'dsp',
  flock: 'flock',
  galileo: 'galileo',
  globalstar: 'globalstar',
  glonass: 'glonass',
  gps: 'gps',
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
  rocketbody: 'rocketbody',
  rv: 'rv',
  s1u: 's1u',
  s2u: 's2u',
  s3u: 's3u',
  s6u: 's6u',
  s12u: 's12u',
  sat2: 'sat2',
  sbirs: 'sbirs',
  ses: 'ses',
  spacebee1gen: 'spacebee1gen',
  spacebee2gen: 'spacebee2gen',
  spacebee3gen: 'spacebee3gen',
  starlink: 'starlink',
  sateliotsat: 'sateliotsat',
  sateliotsat2: 'sateliotsat2',
  issmodel: 'issmodel',
  jwst: 'jwst',
} as const;

enum SatelliteNumber {
  iss = '25544',
  tianhe = '48274',
  jwst = '50463',
}

export class ModelResolver {
  modelMap = {
    'aehf': null as MeshModel | null,
    // beidou: null,
    'debris0': null as MeshModel | null,
    'debris1': null as MeshModel | null,
    'debris2': null as MeshModel | null,
    'dsp': null as MeshModel | null,
    'flock': null as MeshModel | null,
    'galileo': null as MeshModel | null,
    'globalstar': null as MeshModel | null,
    'glonass': null as MeshModel | null,
    'gps': null as MeshModel | null,
    'iridium': null as MeshModel | null,
    'iss': null as MeshModel | null,
    'lemur': null as MeshModel | null,
    'misl': null as MeshModel | null,
    'misl2': null as MeshModel | null,
    'misl3': null as MeshModel | null,
    'misl4': null as MeshModel | null,
    'o3b': null as MeshModel | null,
    'oneweb': null as MeshModel | null,
    'orbcomm': null as MeshModel | null,
    // other: null,
    'rocketbody': null as MeshModel | null,
    'rv': null as MeshModel | null,
    's1u': null as MeshModel | null,
    's2u': null as MeshModel | null,
    's3u': null as MeshModel | null,
    's6u': null as MeshModel | null,
    's12u': null as MeshModel | null,
    'sat2': null as MeshModel | null,
    'sbirs': null as MeshModel | null,
    'ses': null as MeshModel | null,
    'spacebee1gen': null as MeshModel | null,
    'spacebee2gen': null as MeshModel | null,
    'spacebee3gen': null as MeshModel | null,
    'starlink': null as MeshModel | null,
    'sateliotsat': null as MeshModel | null,
    'sateliotsat2': null as MeshModel | null,
  };

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
      const sat = obj as DetailedSatellite;

      switch (sat.type) {
        case SpaceObjectType.PAYLOAD:
          return this.resolveSatModelName_(sat);
        case SpaceObjectType.ROCKET_BODY:
          // TODO: Add more rocket body models
          return SatelliteModels.rocketbody;
        case SpaceObjectType.DEBRIS:
          // TODO: Add more debris models
          if (parseInt(sat.sccNum) <= 20000) {
            return SatelliteModels.debris0;
          } else if (parseInt(sat.sccNum) <= 35000) {
            return SatelliteModels.debris1;
          } else if (parseInt(sat.sccNum) > 35000) {
            return SatelliteModels.debris2;
          }

          return SatelliteModels.debris0;
        default:
        // Generic Model
      }
    }

    return SatelliteModels.sat2;
  }

  // eslint-disable-next-line complexity
  private resolveSatModelName_(sat: DetailedSatellite): string {
    const knownSatelliteModel = this.resolveByName_(sat.name);

    if (knownSatelliteModel) {
      return knownSatelliteModel;
    }

    if (sat.sccNum === SatelliteNumber.iss) {
      return SatelliteModels.iss;
    }

    /**
     * Temporary solution for Tianhe-1
     * TODO: Create a real model for Tianhe-1
     */
    if (sat.sccNum === SatelliteNumber.tianhe) {
      return SatelliteModels.iss;
    }

    // JWST not ready yet.
    // eslint-disable-next-line no-constant-condition
    if (false && sat.sccNum === SatelliteNumber.jwst) {
      return SatelliteModels.jwst;
    }

    if (this.sccNumAehf_.findIndex((num) => sat.sccNum === num) !== -1) {
      return SatelliteModels.aehf;
    }

    if (this.sccNumDsp_.findIndex((num) => sat.sccNum === num) !== -1) {
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

    switch (!isNaN(sat.rcs as number)) {
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

  private resolveByName_(name: string): string | null {
    // TODO: Currently all named models aim at nadir - that isn't always true

    if (name.startsWith('STARLINK')) {
      return SatelliteModels.starlink;
    }
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
      const number = parseInt(lastNumberInName[0]);

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
