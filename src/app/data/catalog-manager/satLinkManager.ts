/* eslint-disable max-depth */
import { SensorMath } from '@app/app/sensors/sensor-math';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { TimeManager } from '@app/engine/core/time-manager';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { LineManager } from '@app/engine/rendering/line-manager';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { DetailedSatellite, DetailedSensor, RAD2DEG } from '@ootk/src/main';
import numeric from 'numeric';
import type { ControlSite } from './ControlSite';

export enum SatConstellationString {
  Aehf = 'aehf',
  Dscs = 'dscs',
  Wgs = 'wgs',
  Iridium = 'iridium',
  Galileo = 'galileo',
  Starlink = 'starlink',
  Sbirs = 'sbirs',
}

export enum LinkType {
  Users = 1, // Only show the users connected to the satellites
  Crosslink = 2, // Unused atm
  Both = 3, // Show the users connected to the satellites and the satellites connected to each other
}

export class SatLinkManager {
  aehfUsers: string[] = [];
  wgsUsers: string[] = [];
  iridiumUsers: string[] = [];
  starlinkUsers: string[] = [];
  galileoUsers: string[] = [];
  aehf = [22988, 23712, 26715, 27168, 27711, 36868, 38254, 39256, 43651, 44481, 45465]; // Milstar and AEHF
  dscs = [25019, 26052, 27691, 27875]; // Dead: 22915, 23628
  wgs = [32258, 34713, 36108, 38070, 39168, 39222, 40746, 41879, 42075, 44071];
  iridium = [
    24841, 24870, 41917, 41918, 41919, 41920, 41921, 41922, 41923, 41924, 41925, 41926, 42803, 42804, 42805, 42806, 42807, 42808, 42809, 42810, 42811, 42812, 43569, 43570, 43571,
    43572, 43573, 43754, 43575, 43576, 24903, 24907, 24944, 24948, 25105, 25527, 24946, 24967, 25042, 25043, 24796, 25077, 25078, 25104, 24795, 25262, 25273, 25286, 25319, 24793,
    25320, 25344, 25467, 24836, 24842, 24871, 24873,
  ];

  galileo = [
    37846, 37847, 38857, 38858, 40128, 40129, 40544, 40545, 40889, 40890, 41174, 41175, 41549, 41550, 41859, 41860, 41861, 41862, 43055, 43056, 43057, 43058, 43564, 43565, 43566,
    43567,
  ];

  sbirs = [37481, 39120, 43162, 41937, 48618, 53355];
  dsp = [4630, 5204, 5851, 6691, 8482, 8916, 9803, 11397, 12339, 13086, 14930, 15453, 18583, 20066, 20929, 21805, 23435, 24737, 26356, 26880, 28158];

  starlink = [
    44235, 44236, 44237, 44238, 44239, 44240, 44241, 44242, 44243, 44244, 44245, 44247, 44248, 44249, 44250, 44251, 44252, 44253, 44254, 44255, 44256, 44257, 44258, 44259, 44260,
    44261, 44262, 44263, 44264, 44265, 44266, 44267, 44268, 44269, 44270, 44271, 44272, 44273, 44274, 44275, 44276, 44277, 44278, 44279, 44280, 44281, 44282, 44283, 44284, 44285,
    44286, 44287, 44288, 44289, 44290, 44291, 44292, 44293, 44294, 44713, 44714, 44715, 44716, 44717, 44718, 44719, 44720, 44721, 44722, 44723, 44724, 44725, 44726, 44727, 44728,
    44729, 44730, 44731, 44732, 44733, 44734, 44735, 44736, 44737, 44738, 44739, 44740, 44741, 44742, 44743, 44744, 44745, 44746, 44747, 44748, 44749, 44750, 44751, 44752, 44753,
    44754, 44755, 44756, 44757, 44758, 44759, 44760, 44761, 44762, 44763, 44764, 44765, 44766, 44767, 44768, 44769, 44770, 44771, 44772, 44914, 44915, 44916, 44917, 44918, 44919,
    44920, 44921, 44922, 44923, 44924, 44925, 44926, 44927, 44928, 44929, 44930, 44931, 44932, 44933, 44934, 44935, 44936, 44937, 44938, 44939, 44940, 44941, 44942, 44943, 44944,
    44945, 44946, 44947, 44949, 44950, 44951, 44952, 44953, 44954, 44955, 44956, 44957, 44958, 44959, 44960, 44961, 44962, 44963, 44964, 44965, 44966, 44967, 44968, 44969, 44970,
    44971, 44972, 44973, 45044, 45045, 45046, 45047, 45048, 45049, 45050, 45051, 45052, 45053, 45054, 45055, 45056, 45057, 45058, 45059, 45060, 45061, 45062, 45063, 45064, 45065,
    45066, 45067, 45068, 45069, 45070, 45071, 45072, 45073, 45074, 45075, 45076, 45077, 45078, 45079, 45080, 45081, 45082, 45083, 45084, 45085, 45086, 45087, 45088, 45089, 45090,
    45091, 45092, 45093, 45094, 45095, 45096, 45097, 45098, 45099, 45100, 45101, 45102, 45103, 45178, 45179, 45180, 45181, 45182, 45183, 45184, 45185, 45186, 45187, 45188, 45189,
    45190, 45191, 45192, 45193, 45194, 45195, 45196, 45197, 45198, 45199, 45200, 45201, 45202, 45203, 45204, 45205, 45206, 45207, 45208, 45209, 45210, 45212, 45213, 45214, 45215,
    45216, 45217, 45218, 45219, 45220, 45221, 45222, 45223, 45224, 45225, 45226, 45227, 45228, 45229, 45230, 45231, 45232, 45233, 45234, 45235, 45236, 45237, 45360, 45361, 45362,
    45363, 45364, 45365, 45366, 45367, 45368, 45369, 45370, 45371, 45372, 45373, 45374, 45375, 45376, 45377, 45378, 45379, 45380, 45381, 45382, 45383, 45384, 45385, 45386, 45387,
    45388, 45389, 45390, 45391, 45392, 45393, 45394, 45395, 45396, 45397, 45398, 45399, 45400, 45401, 45402, 45403, 45404, 45405, 45406, 45407, 45408, 45409, 45410, 45411, 45412,
    45413, 45414, 45415, 45416, 45417, 45418, 45419, 45565, 45573, 45581, 45589, 45533, 45541, 45549, 45557, 45558, 45566, 45574, 45582, 45590, 45534, 45542, 45550, 45559, 45567,
    45575, 45583, 45535, 45543, 45551, 45560, 45568, 45576, 45584, 45536, 45544, 45552, 45561, 45569, 45577, 45585, 45537, 45545, 45553, 45562, 45570, 45578, 45586, 45538, 45546,
  ];

  private idToSatnum_(): void {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    this.aehf = catalogManagerInstance.satnums2ids(this.aehf);
    this.dscs = catalogManagerInstance.satnums2ids(this.dscs);
    this.wgs = catalogManagerInstance.satnums2ids(this.wgs);
    this.iridium = catalogManagerInstance.satnums2ids(this.iridium);
    this.galileo = catalogManagerInstance.satnums2ids(this.galileo);
    this.sbirs = catalogManagerInstance.satnums2ids(this.sbirs);
    this.dsp = catalogManagerInstance.satnums2ids(this.dsp);
    this.starlink = catalogManagerInstance.satnums2ids(this.starlink);
  }

  init(controlSiteList: ControlSite[]) {
    EventBus.getInstance().on(
      EventBusEvent.onCruncherReady,
      () => this.onCruncher_(controlSiteList),
    );
  }

  private onCruncher_(controlSiteList: ControlSite[]) {
    try {
      this.idToSatnum_();

      for (const controlSite in controlSiteList) {
        if (!Object.prototype.hasOwnProperty.call(controlSiteList, controlSite)) {
          continue;
        }

        if (controlSiteList[controlSite].linkAehf) {
          this.aehfUsers.push(controlSiteList[controlSite].name);
        }
        if (controlSiteList[controlSite].linkWgs) {
          this.wgsUsers.push(controlSiteList[controlSite].name);
        }
        if (controlSiteList[controlSite].linkIridium) {
          this.wgsUsers.push(controlSiteList[controlSite].name);
        }
        if (controlSiteList[controlSite].linkGalileo) {
          this.galileoUsers.push(controlSiteList[controlSite].name);
        }
        if (controlSiteList[controlSite].linkStarlink) {
          this.starlinkUsers.push(controlSiteList[controlSite].name);
        }
      }
    } catch {
      errorManagerInstance.info('controlSiteManager unable to load!');
    }

    const staticSet = ServiceLocator.getCatalogManager().staticSet;

    for (const sensor in staticSet) {
      if (!Object.prototype.hasOwnProperty.call(staticSet, sensor)) {
        continue;
      }
      if (staticSet[sensor].linkAehf) {
        this.aehfUsers.push(staticSet[sensor].name);
      }
      if (staticSet[sensor].linkWgs) {
        this.wgsUsers.push(staticSet[sensor].name);
      }
      if (staticSet[sensor].linkIridium) {
        this.wgsUsers.push(staticSet[sensor].name);
      }
      if (staticSet[sensor].linkGalileo) {
        this.galileoUsers.push(staticSet[sensor].name);
      }
      if (staticSet[sensor].linkStarlink) {
        this.starlinkUsers.push(staticSet[sensor].name);
      }
    }
  }

  /** Currently not used */
  showLinks(lineManager: LineManager, group: SatConstellationString, timeManager: TimeManager) {
    lineManager.clear();

    let satlist: number[];
    let userlist: string[] = [];
    let minTheta: number;
    let elevationMask: number;
    let linkType: LinkType;

    switch (group) {
      case SatConstellationString.Aehf:
        satlist = this.aehf;
        userlist = this.aehfUsers;
        minTheta = 10;
        linkType = LinkType.Users;
        elevationMask = 5;
        break;
      case SatConstellationString.Dscs:
        satlist = this.dscs;
        satlist = satlist.concat(this.wgs);
        minTheta = 10;
        linkType = LinkType.Both;
        elevationMask = 5;
        break;
      case SatConstellationString.Wgs:
        satlist = this.wgs;
        satlist = satlist.concat(this.dscs);
        userlist = this.wgsUsers;
        minTheta = 10;
        linkType = LinkType.Both;
        elevationMask = 5;
        break;
      case SatConstellationString.Iridium:
        satlist = this.iridium;
        userlist = this.iridiumUsers;
        minTheta = 66;
        linkType = LinkType.Both;
        elevationMask = 5;
        break;
      case SatConstellationString.Starlink:
        satlist = this.starlink;
        userlist = this.starlinkUsers;
        minTheta = 66;
        linkType = LinkType.Users;
        elevationMask = 5;
        break;
      case SatConstellationString.Galileo:
        satlist = this.galileo;
        userlist = [];
        minTheta = 20; // Not Used
        linkType = LinkType.Users;
        elevationMask = 5;
        break;
      case SatConstellationString.Sbirs:
        satlist = this.sbirs;
        satlist = satlist.concat(this.dsp);
        userlist = [];
        minTheta = 10;
        linkType = LinkType.Both;
        elevationMask = 5;
        break;
      default:
        return;
    }

    if (linkType === LinkType.Both) {
      try {
        for (let i = 0; i < satlist.length; i++) {
          for (let j = 0; j < satlist.length; j++) {
            if (i !== j) {
              const catalogManagerInstance = ServiceLocator.getCatalogManager();
              const sat1 = catalogManagerInstance.getSat(satlist[i]);
              const sat2 = catalogManagerInstance.getSat(satlist[j]);

              if (!sat1 || !sat2) {
                continue;
              }

              if ((sat1.position.x === 0 && sat1.position.y === 0 && sat1.position.z === 0) || (sat2.position.x === 0 && sat2.position.y === 0 && sat2.position.z === 0)) {
                continue;
              }
              // NOTE: Reference old version for debug code
              const theta =
                Math.acos(
                  <number>(
                    numeric.dot(
                      [-sat1.position.x, -sat1.position.y, -sat1.position.z],
                      [-sat1.position.x + sat2.position.x, -sat1.position.y + sat2.position.y, -sat1.position.z + sat2.position.z],
                    )
                  ) /
                  (Math.sqrt((-sat1.position.x) ** 2 + (-sat1.position.y) ** 2 + (-sat1.position.z) ** 2) *
                    Math.sqrt(
                      (-sat1.position.x + sat2.position.x) ** 2 + (-sat1.position.y + sat2.position.y) ** 2 + (-sat1.position.z + sat2.position.z) ** 2,
                    )),
                ) * RAD2DEG;

              if (theta < minTheta) {
                // Intentional
              } else {
                lineManager.createObjToObj(sat1, sat2, [0, 0.6, 1, 1]);
              }
            }
          }
        }
        const catalogManagerInstance = ServiceLocator.getCatalogManager();

        for (const sensorName of userlist) {
          const id = catalogManagerInstance.getSensorFromSensorName(sensorName.toString());
          const user = catalogManagerInstance.getObject(id) as DetailedSensor;
          let bestSat = null as unknown as DetailedSatellite;
          let bestRange = 1000000;

          for (const satId of satlist) {
            const sat = catalogManagerInstance.getObject(satId) as DetailedSatellite;
            const tearr = SensorMath.getTearr(sat, [user], timeManager.simulationTimeObj);

            if ((tearr.el ?? -Infinity) > elevationMask) {
              if ((tearr.rng ?? Infinity) < bestRange) {
                bestSat = sat;
                bestRange = tearr.rng!;
              }
            }
          }
          if (bestSat) {
            lineManager.createSensorToSat(ServiceLocator.getSensorManager().getSensor(), bestSat, [0, 1.0, 0.6, 1.0]);
          }
        }
      } catch {
        // Intentionally empty
      }
    }

    if (linkType === LinkType.Users) {
      try {
        // Loop through all the users
        const catalogManagerInstance = ServiceLocator.getCatalogManager();

        for (const sensorName of userlist) {
          // Select the current user
          const user = catalogManagerInstance.getObject(catalogManagerInstance.getSensorFromSensorName(sensorName.toString())) as DetailedSensor;

          if (!user) {
            continue;
          }
          // Loop through all of the satellites
          let bestSat = null as unknown as DetailedSatellite;
          let bestRange = 1000000;

          for (const satId of satlist) {
            // Select the current satelltie
            const sat = catalogManagerInstance.getObject(satId) as DetailedSatellite;
            /*
             * Calculate Time, Elevation, Azimuth, Range, and Range Rate data
             * of the current satellite relevant to the current user. This allows
             * us to figure out if the user can see the satellite
             */
            const tearr = SensorMath.getTearr(sat, [user], timeManager.simulationTimeObj);

            /*
             * Only draw the line between the user and the satellite if the
             * elevation angle is greater than the elevation mask. This simulates
             * the effects of hills, trees, and atmospheric ducting along the
             * horizon.
             *
             */
            if ((tearr.el ?? -Infinity) > elevationMask) {
              /*
               * If the satellite is visible, then check to see if it is the best
               * satellite to draw a line to. The best satellite is the one that
               * is closest to the user.
               */
              if ((tearr.rng ?? Infinity) < bestRange) {
                bestSat = sat;
                bestRange = tearr.rng!;
              }
            }
          }
          // Draw a line from the user to the satellite
          lineManager.createSensorToSat(ServiceLocator.getSensorManager().getSensor(), bestSat, [0, 1.0, 0.6, 1.0]);
        }
      } catch (e) {
        errorManagerInstance.info(e);
      }
    }
  }
}
