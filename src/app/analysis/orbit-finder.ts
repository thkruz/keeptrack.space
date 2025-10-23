import { Degrees, DetailedSatellite, EciVec3, Kilometers, Sgp4, TleLine1, TleLine2, eci2lla } from '@ootk/src/main';
import { errorManagerInstance } from '../../engine/utils/errorManager';
import { SatMath } from './sat-math';

enum PropagationResults {
  Near = 0,
  Success = 1,
  Error = 2,
  Far = 3,
}

interface OrbitParameters {
  meanAnomaly: number;
  argOfPerigee: number;
  raan: number;
  altitude: number;
  latitude: number;
  longitude: number;
}

export class OrbitFinder {
  static readonly MAX_LAT_ERROR = <Degrees>0.025;
  static readonly MAX_LON_ERROR = <Degrees>0.025;
  static readonly MAX_ALT_ERROR = <Kilometers>10;

  static readonly MAX_ITERATIONS = 5000;
  static readonly COARSE_STEP = 1.0; // degrees
  static readonly FINE_STEP = 0.005; // degrees

  private readonly sat: DetailedSatellite;
  private readonly goalParams: OrbitParameters;
  private readonly now: Date;
  private readonly goalDirection: 'N' | 'S';
  private currentParams: OrbitParameters;
  private lastLatitude: number | null = null;
  private currentDirection: 'N' | 'S' | null = null;

  constructor(
    sat: DetailedSatellite,
    goalLat: Degrees,
    goalLon: Degrees,
    goalDirection: 'N' | 'S',
    now: Date,
    goalAlt?: Kilometers,
    raanOffset: number = 0,
  ) {
    this.sat = sat;
    this.now = now;
    this.goalDirection = goalDirection;
    this.goalParams = {
      meanAnomaly: 0,
      argOfPerigee: sat.argOfPerigee,
      raan: sat.rightAscension + raanOffset,
      altitude: goalAlt || 0,
      latitude: goalLat,
      longitude: goalLon,
    };
    this.currentParams = this.getCurrentOrbitParams();
  }

  private getCurrentOrbitParams(): OrbitParameters {
    if (!this.sat?.satrec) {
      throw new Error('Satellite data is not available');
    }

    const { m, gmst } = SatMath.calculateTimeVariables(this.now, this.sat.satrec);

    if (m === null) {
      throw new Error('Invalid time variables');
    }

    const positionEci = <EciVec3>Sgp4.propagate(this.sat.satrec, m).position;
    const { lat, lon, alt } = eci2lla(positionEci, gmst);

    return {
      meanAnomaly: this.sat.meanAnomaly,
      argOfPerigee: this.sat.argOfPerigee,
      raan: this.sat.rightAscension,
      altitude: alt,
      latitude: lat,
      longitude: lon,
    };
  }

  private determineDirection(newLat: number): 'N' | 'S' | null {
    if (this.lastLatitude === null) {
      errorManagerInstance.debug(`Initial latitude: ${newLat}`);
      this.lastLatitude = newLat;

      return null;
    }

    if (this.currentDirection && Math.abs(newLat - this.lastLatitude) < 0.01) {
      return this.currentDirection; // Maintain current direction if change is negligible
    }

    const direction = newLat > this.lastLatitude ? 'N' : 'S';

    errorManagerInstance.debug(`Current latitude: ${this.lastLatitude} - New latitude: ${newLat} - Direction: ${direction}`);

    this.lastLatitude = newLat;

    errorManagerInstance.debug(`New direction: ${direction}`);

    return direction;
  }

  private isCorrectDirection(): boolean {
    errorManagerInstance.debug(`Current direction: ${this.currentDirection} - Goal direction: ${this.goalDirection}`);

    return this.currentDirection === this.goalDirection;
  }

  private updateOrbit(newParams: Partial<OrbitParameters>): boolean {
    // Create new TLE with updated parameters
    const tle1 = this.generateTle1();
    const tle2 = this.generateTle2(newParams);

    const satrec = Sgp4.createSatrec(tle1, tle2);

    if (!satrec) {
      throw new Error('Invalid orbit parameters');
    }

    // Update current parameters and check direction
    const { m, gmst } = SatMath.calculateTimeVariables(this.now, satrec);

    if (m === null) {
      throw new Error('Invalid time variables');
    }
    const positionEci = <EciVec3>Sgp4.propagate(satrec, m).position;
    const { lat, lon, alt } = eci2lla(positionEci, gmst);

    // Update direction
    const newDirection = this.determineDirection(lat);

    if (newDirection !== null) {
      this.currentDirection = newDirection;
    }

    // Update current parameters
    this.currentParams = {
      ...this.currentParams,
      ...newParams,
      latitude: lat,
      longitude: lon,
      altitude: alt,
    };

    return this.isCorrectDirection();
  }

  private meanACalcLoop(direction: 'N' | 'S'): PropagationResults {
    // Start searching from different points based on desired direction
    const startVal = direction === 'N' ? 0 : 180;
    const endVal = direction === 'N' ? 360 : 540; // For 'S', search beyond 360 to handle wrap-around

    for (let posVal = startVal * 10; posVal < endVal * 10; posVal += 0.25) {
      const normalizedVal = posVal % (360 * 10); // Normalize to 0-360 range
      const result = this.meanACalc(normalizedVal, this.now);

      if (result === PropagationResults.Success) {
        if (this.currentDirection !== direction) {
          posVal += 20; // Skip ahead if direction is wrong
        } else {
          return PropagationResults.Success;
        }
      }

      if (result === PropagationResults.Far) {
        posVal += 100;
      }

      if (result === PropagationResults.Error) {
        return PropagationResults.Error;
      }
    }

    return PropagationResults.Near;
  }

  private meanACalc(meana: number, now: Date): PropagationResults {
    meana /= 10;
    meana %= 360; // Normalize to 0-360 range

    const tle1 = this.generateTle1();
    const tle2 = this.generateTle2({ meanAnomaly: meana });

    const satrec = Sgp4.createSatrec(tle1, tle2);

    if (!satrec) {
      return PropagationResults.Error;
    }

    const { m, gmst } = SatMath.calculateTimeVariables(now, satrec);

    if (m === null) {
      return PropagationResults.Error;
    }
    const positionEci = <EciVec3>Sgp4.propagate(satrec, m).position;
    const { lat } = eci2lla(positionEci, gmst);

    // Update direction
    if (this.lastLatitude !== null) {
      if (Math.abs(lat - this.lastLatitude) > 0.001) {
        this.currentDirection = lat > this.lastLatitude ? 'N' : 'S';
      }
    }
    this.lastLatitude = lat;

    // Check if we're at the target latitude with correct direction
    if (Math.abs(lat - this.goalParams.latitude) <= OrbitFinder.MAX_LAT_ERROR) {
      if (this.currentDirection === this.goalDirection) {
        this.currentParams.meanAnomaly = meana;

        return PropagationResults.Success;
      }
    }

    // Check if we're far from target
    if (Math.abs(lat - this.goalParams.latitude) > 11) {
      return PropagationResults.Far;
    }

    return PropagationResults.Near;
  }

  private linearSearchRaan(): number {
    let bestValue = this.currentParams.raan;
    let bestError = Infinity;

    // Initial coarse search
    for (let raan = 0; raan < 360; raan += OrbitFinder.COARSE_STEP) {
      // Don't check direction for RAAN adjustments
      this.updateOrbit({ raan });
      const error = Math.abs(this.calculateError('raan'));

      if (error < Math.abs(bestError)) {
        bestError = error;
        bestValue = raan;
      }

      if (error < OrbitFinder.MAX_LON_ERROR) {
        // Fine tune around best value
        for (let fineRaan = bestValue - 5; fineRaan <= bestValue + 5; fineRaan += OrbitFinder.FINE_STEP) {
          const normalizedRaan = ((fineRaan % 360) + 360) % 360;

          this.updateOrbit({ raan: normalizedRaan });
          const fineError = Math.abs(this.calculateError('raan'));

          if (fineError < error) {
            bestValue = normalizedRaan;
            bestError = fineError;
          }
        }

        return bestValue;
      }
    }

    return bestValue;
  }

  private normalizeAngleDifference(angle1: number, angle2: number): number {
    const diff = (angle1 - angle2) % 360;


    if (diff > 180) {
      return diff - 360;
    } else if (diff < -180) {
      return diff + 360;
    }

    return diff;

  }

  private calculateError(param: keyof OrbitParameters): number {
    switch (param) {
      case 'meanAnomaly':
        return this.currentParams.latitude - this.goalParams.latitude;
      case 'raan':
        // Handle longitude wrapping at ±180°
        return this.normalizeAngleDifference(
          this.currentParams.longitude,
          this.goalParams.longitude,
        );
      case 'argOfPerigee':
        errorManagerInstance.info(`Current altitude: ${this.currentParams.altitude} - Goal altitude: ${this.goalParams.altitude}`);

        return this.currentParams.altitude - this.goalParams.altitude;
      default:
        return 0;
    }
  }


  private updateOrbitWithoutDirectionCheck(newParams: Partial<OrbitParameters>): void {
    // Create new TLE with updated parameters
    const tle1 = this.generateTle1();
    const tle2 = this.generateTle2(newParams);

    const satrec = Sgp4.createSatrec(tle1, tle2);

    if (!satrec) {
      throw new Error('Invalid orbit parameters');
    }

    // Update current parameters without direction check
    const { m, gmst } = SatMath.calculateTimeVariables(this.now, satrec);

    if (m === null) {
      throw new Error('Invalid time variables');
    }
    const positionEci = <EciVec3>Sgp4.propagate(satrec, m).position;
    const { lat, lon, alt } = eci2lla(positionEci, gmst);

    // Update current parameters
    this.currentParams = {
      ...this.currentParams,
      ...newParams,
      latitude: lat,
      longitude: lon,
      altitude: alt,
    };
  }

  rotateOrbitToLatLon(): [TleLine1, TleLine2] | ['Error', string] {
    try {
      if (this.goalParams.altitude > 0) {
        // 1. Find original perigee position
        const perigeeParams = this.findPerigeePosition();

        errorManagerInstance.log(`Original perigee position: ${perigeeParams.latitude} - ${perigeeParams.longitude} - ${perigeeParams.altitude}`);

        // 2. Move new satellite to perigee without direction check
        this.updateOrbitWithoutDirectionCheck({
          meanAnomaly: 0,
        });
        errorManagerInstance.log(`Positioned at initial perigee: ${this.currentParams.latitude} - ${this.currentParams.longitude} - ${this.currentParams.altitude}`);

        // 3. Rotate argument of perigee to match original latitude
        let bestArgPerigee = this.currentParams.argOfPerigee;
        let bestLatError = Infinity;

        // Search for arg perigee that puts perigee at original latitude
        for (let argPer = 0; argPer < 360; argPer += 0.25) {
          this.updateOrbitWithoutDirectionCheck({
            meanAnomaly: 0,
            argOfPerigee: argPer,
          });

          const latError = Math.abs(this.currentParams.latitude - perigeeParams.latitude);

          if (latError < bestLatError) {
            bestLatError = latError;
            bestArgPerigee = argPer;
            errorManagerInstance.log(`New best arg perigee: ${argPer} with lat error ${latError}`);
          }

          if (latError <= OrbitFinder.MAX_LAT_ERROR) {
            break;
          }
        }

        // Apply best found arg perigee
        this.updateOrbitWithoutDirectionCheck({
          meanAnomaly: 0,
          argOfPerigee: bestArgPerigee,
        });

        errorManagerInstance.log(`After arg perigee adjustment: ${this.currentParams.latitude} - ${this.currentParams.longitude} - ${this.currentParams.altitude}`);

        // 4. Now find the correct mean anomaly for target position
        this.lastLatitude = null;
        this.currentDirection = null;

        const finalMeanAResult = this.meanACalcLoop(this.goalDirection);

        if (finalMeanAResult !== PropagationResults.Success) {
          return ['Error', 'Failed to find final target position'];
        }

        // 5. Adjust RAAN for longitude
        const successfulDirection = this.currentDirection;
        const newRaan = this.linearSearchRaan();

        // 6. Final combined update
        this.currentDirection = successfulDirection;
        const finalSuccess = this.updateOrbit({
          meanAnomaly: this.currentParams.meanAnomaly,
          raan: newRaan,
          argOfPerigee: bestArgPerigee,
        });

        if (!finalSuccess) {
          return ['Error', 'Final position adjustment failed'];
        }

        // Verify final position
        errorManagerInstance.log(`Final position: ${this.currentParams.latitude}, ${this.currentParams.longitude}, ${this.currentParams.altitude}`);
        errorManagerInstance.log(`Target altitude: ${this.goalParams.altitude}, Current altitude: ${this.currentParams.altitude}`);

      } else {
        // Original logic for circular orbits
        const result = this.meanACalcLoop(this.goalDirection);

        if (result !== PropagationResults.Success) {
          return ['Error', `Failed to find solution with ${this.goalDirection} bound direction`];
        }

        const meanAnomalySuccess = this.updateOrbit({
          meanAnomaly: this.currentParams.meanAnomaly,
        });

        if (!meanAnomalySuccess) {
          return ['Error', 'Mean anomaly adjustment resulted in incorrect direction'];
        }

        const successfulDirection = this.currentDirection;
        const newRaan = this.linearSearchRaan();

        this.currentDirection = successfulDirection;
        const combinedSuccess = this.updateOrbit({
          meanAnomaly: this.currentParams.meanAnomaly,
          raan: newRaan,
        });

        if (!combinedSuccess) {
          return ['Error', 'Combined mean anomaly and RAAN adjustment failed'];
        }
      }

      return [
        this.generateTle1(),
        this.generateTle2(this.currentParams),
      ];

    } catch (error) {
      errorManagerInstance.log(`Error in rotateOrbitToLatLon: ${error.message}`);

      return ['Error', error.message];
    }
  }

  private findPerigeePosition(): OrbitParameters {
    let lowestAltitude = Infinity;
    let perigeeParams: OrbitParameters | null = null;

    // More granular search through mean anomaly
    for (let meanA = 0; meanA < 360; meanA += 0.05) {
      const tle1 = this.generateTle1();
      const tle2 = this.generateTle2({ meanAnomaly: meanA });
      const satrec = Sgp4.createSatrec(tle1, tle2);

      if (!satrec) {
        continue;
      }

      const { m, gmst } = SatMath.calculateTimeVariables(this.now, satrec);

      if (m === null) {
        throw new Error('Invalid time variables');
      }
      const positionEci = <EciVec3>Sgp4.propagate(satrec, m).position;
      const { lat, lon, alt } = eci2lla(positionEci, gmst);

      if (alt < lowestAltitude) {
        lowestAltitude = alt;
        perigeeParams = {
          meanAnomaly: meanA,
          argOfPerigee: this.currentParams.argOfPerigee,
          raan: this.currentParams.raan,
          altitude: alt,
          latitude: lat,
          longitude: lon,
        };
      }
    }

    if (!perigeeParams) {
      throw new Error('Failed to find perigee position');
    }

    errorManagerInstance.log(`Found perigee at altitude ${perigeeParams.altitude} km`);

    return perigeeParams;
  }

  private generateTle1(): TleLine1 {
    return `1 ${this.sat.sccNum}U ${this.sat.tle1.substring(9, 17)} ${this.sat.tle1.substring(18, 32)}${this.sat.tle1.substring(32, 71)}` as TleLine1;
  }

  private generateTle2(newParams: Partial<OrbitParameters>): TleLine2 {
    // Merge provided parameters with current parameters
    const mergedParams = {
      ...this.currentParams, // Use current parameters as base
      ...newParams, // Override with any provided parameters
    };

    const inc = this.sat.inclination.toFixed(4).padStart(8, '0');
    const raan = mergedParams.raan.toFixed(4).padStart(8, '0');
    const ecc = this.sat.eccentricity.toFixed(7).substring(2, 9);
    const argPer = mergedParams.argOfPerigee.toFixed(4).padStart(8, '0');
    const meanA = mergedParams.meanAnomaly.toFixed(4).padStart(8, '0');
    const meanMo = this.sat.tle2.substring(52, 63);

    return `2 ${this.sat.sccNum} ${inc} ${raan} ${ecc} ${argPer} ${meanA} ${meanMo}    10` as TleLine2;
  }
}
