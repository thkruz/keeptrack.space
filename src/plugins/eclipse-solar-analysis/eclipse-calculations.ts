/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * eclipse-calculations.ts - Core calculation functions for eclipse and solar analysis
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

import { SatMath, SunStatus } from '@app/app/analysis/sat-math';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Degrees, DetailedSatellite, EciVec3, Kilometers, Milliseconds, RAD2DEG, StateVectorSgp4 } from '@ootk/src/main';
import { vec3 } from 'gl-matrix';
import {
  BetaAngleDataPoint,
  EclipseEvent,
  EclipseEventType,
  EclipsePeriod,
  EclipsePredictionConfig,
  EclipseStatistics,
  SunGeometry,
} from './eclipse-types';

export class EclipseCalculations {
  /**
   * Predict eclipse transitions for a satellite over a time range
   */
  static predictEclipseTransitions(
    satellite: DetailedSatellite,
    startTime: Date,
    config: EclipsePredictionConfig,
  ): { events: EclipseEvent[]; periods: EclipsePeriod[] } {
    const events: EclipseEvent[] = [];
    const periods: EclipsePeriod[] = [];

    const endTime = new Date(startTime.getTime() + config.predictionDurationHours * 3600 * 1000);
    const stepMs = config.timeStepSeconds * 1000;

    let previousStatus = SunStatus.UNKNOWN;
    let currentPeriod: Partial<EclipsePeriod> | null = null;
    let orbitNumber = 0;

    // Calculate orbital period to track orbit numbers
    const orbitalPeriod = this.calculateOrbitalPeriod(satellite);

    let elapsedTime = 0;

    for (let time = startTime.getTime(); time <= endTime.getTime(); time += stepMs) {
      const currentTime = new Date(time);

      // Update orbit number based on elapsed time
      if (orbitalPeriod > 0) {
        orbitNumber = Math.floor(elapsedTime / orbitalPeriod);
      }

      // Get satellite position at this time
      const posvel = SatMath.getEci(satellite, currentTime);

      if (!posvel?.position) {
        continue;
      }

      // Get sun position
      const sunEci = ServiceLocator.getScene().sun.getEci(currentTime);
      const sunEciVec: EciVec3 = {
        x: sunEci[0] as Kilometers,
        y: sunEci[1] as Kilometers,
        z: sunEci[2] as Kilometers,
      };

      // Check eclipse status
      const status = SatMath.calculateIsInSun({ position: posvel.position } as StateVectorSgp4, sunEciVec);

      // Detect transitions
      if (previousStatus !== SunStatus.UNKNOWN && status !== previousStatus) {
        // Handle transitions
        if (previousStatus === SunStatus.SUN && status === SunStatus.PENUMBRAL) {
          events.push({
            type: EclipseEventType.ENTER_PENUMBRA,
            time: currentTime,
            orbitNumber,
          });
          currentPeriod = {
            startTime: currentTime,
            orbitNumber,
            isUmbral: false,
          };
        } else if (previousStatus === SunStatus.SUN && status === SunStatus.UMBRAL) {
          events.push({
            type: EclipseEventType.ENTER_UMBRA,
            time: currentTime,
            orbitNumber,
          });
          currentPeriod = {
            startTime: currentTime,
            orbitNumber,
            isUmbral: true,
          };
        } else if (previousStatus === SunStatus.PENUMBRAL && status === SunStatus.UMBRAL) {
          // Transition from penumbra to umbra
          if (currentPeriod && !currentPeriod.isUmbral) {
            // Close penumbral period
            periods.push({
              startTime: currentPeriod.startTime!,
              endTime: currentTime,
              duration: (currentTime.getTime() - currentPeriod.startTime!.getTime()) as Milliseconds,
              orbitNumber: currentPeriod.orbitNumber!,
              isUmbral: false,
            });
          }
          events.push({
            type: EclipseEventType.ENTER_UMBRA,
            time: currentTime,
            orbitNumber,
          });
          currentPeriod = {
            startTime: currentTime,
            orbitNumber,
            isUmbral: true,
          };
        } else if (previousStatus === SunStatus.UMBRAL && status === SunStatus.PENUMBRAL) {
          events.push({
            type: EclipseEventType.EXIT_UMBRA,
            time: currentTime,
            orbitNumber,
          });
          if (currentPeriod?.isUmbral) {
            periods.push({
              startTime: currentPeriod.startTime!,
              endTime: currentTime,
              duration: (currentTime.getTime() - currentPeriod.startTime!.getTime()) as Milliseconds,
              orbitNumber: currentPeriod.orbitNumber!,
              isUmbral: true,
            });
          }
          currentPeriod = {
            startTime: currentTime,
            orbitNumber,
            isUmbral: false,
          };
        } else if (previousStatus === SunStatus.PENUMBRAL && status === SunStatus.SUN) {
          events.push({
            type: EclipseEventType.EXIT_PENUMBRA,
            time: currentTime,
            orbitNumber,
          });
          if (currentPeriod && !currentPeriod.isUmbral) {
            periods.push({
              startTime: currentPeriod.startTime!,
              endTime: currentTime,
              duration: (currentTime.getTime() - currentPeriod.startTime!.getTime()) as Milliseconds,
              orbitNumber: currentPeriod.orbitNumber!,
              isUmbral: false,
            });
          }
          currentPeriod = null;
        } else if (previousStatus === SunStatus.UMBRAL && status === SunStatus.SUN) {
          events.push({
            type: EclipseEventType.EXIT_UMBRA,
            time: currentTime,
            orbitNumber,
          });
          if (currentPeriod?.isUmbral) {
            periods.push({
              startTime: currentPeriod.startTime!,
              endTime: currentTime,
              duration: (currentTime.getTime() - currentPeriod.startTime!.getTime()) as Milliseconds,
              orbitNumber: currentPeriod.orbitNumber!,
              isUmbral: true,
            });
          }
          currentPeriod = null;
        }
      }

      previousStatus = status;
      elapsedTime += stepMs;
    }

    // Close any open period at the end
    if (currentPeriod?.startTime) {
      periods.push({
        startTime: currentPeriod.startTime,
        endTime,
        duration: (endTime.getTime() - currentPeriod.startTime.getTime()) as Milliseconds,
        orbitNumber: currentPeriod.orbitNumber!,
        isUmbral: currentPeriod.isUmbral!,
      });
    }

    return { events, periods };
  }

  /**
   * Calculate solar beta angle for a satellite at a given time
   * Beta angle is the angle between the orbital plane and the sun vector
   */
  static calculateSolarBetaAngle(satellite: DetailedSatellite, time: Date): Degrees {
    // Get satellite position and velocity
    const posvel = SatMath.getEci(satellite, time);

    if (!posvel?.position || !posvel.velocity) {
      return 0 as Degrees;
    }

    // Calculate orbital plane normal vector (cross product of position and velocity)
    const position = vec3.fromValues(posvel.position.x, posvel.position.y, posvel.position.z);
    const velocity = vec3.fromValues(posvel.velocity.x, posvel.velocity.y, posvel.velocity.z);
    const orbitalNormal = vec3.create();

    vec3.cross(orbitalNormal, position, velocity);
    vec3.normalize(orbitalNormal, orbitalNormal);

    // Get sun position vector
    const sunEci = ServiceLocator.getScene().sun.getEci(time);
    const sunVector = vec3.fromValues(sunEci[0], sunEci[1], sunEci[2]);

    vec3.normalize(sunVector, sunVector);

    // Calculate angle between orbital plane normal and sun vector
    const dotProduct = vec3.dot(orbitalNormal, sunVector);

    // Beta angle = 90° - angle between normal and sun
    const angleRad = Math.asin(Math.max(-1, Math.min(1, dotProduct)));
    const betaAngle = angleRad * RAD2DEG;

    return betaAngle as Degrees;
  }

  /**
   * Calculate beta angle trend over a time period
   */
  static calculateBetaAngleTrend(
    satellite: DetailedSatellite,
    startTime: Date,
    durationHours: number,
    numPoints: number = 100,
  ): BetaAngleDataPoint[] {
    const dataPoints: BetaAngleDataPoint[] = [];
    const stepMs = (durationHours * 3600 * 1000) / numPoints;

    for (let i = 0; i <= numPoints; i++) {
      const time = new Date(startTime.getTime() + i * stepMs);
      const betaAngle = this.calculateSolarBetaAngle(satellite, time);

      dataPoints.push({
        time,
        betaAngle,
      });
    }

    return dataPoints;
  }

  /**
   * Calculate sun-target-satellite geometry
   */
  static calculateSunGeometry(satellite: DetailedSatellite, targetPosition: EciVec3, time: Date): SunGeometry {
    // Get satellite position
    const posvel = SatMath.getEci(satellite, time);

    if (!posvel?.position) {
      return {
        phaseAngle: 0 as Degrees,
        sunElevation: 0 as Degrees,
        sunAzimuth: 0 as Degrees,
        isTargetIlluminated: false,
        isSatelliteIlluminated: false,
      };
    }

    const satPos = vec3.fromValues(posvel.position.x, posvel.position.y, posvel.position.z);

    // Get sun position
    const sunEci = ServiceLocator.getScene().sun.getEci(time);
    const sunPos = vec3.fromValues(sunEci[0], sunEci[1], sunEci[2]);

    // Vector from satellite to sun
    const satToSun = vec3.create();

    vec3.subtract(satToSun, sunPos, satPos);
    vec3.normalize(satToSun, satToSun);

    // Vector from satellite to target
    const satToTarget = vec3.create();
    const targetPos = vec3.fromValues(targetPosition.x, targetPosition.y, targetPosition.z);

    vec3.subtract(satToTarget, targetPos, satPos);
    vec3.normalize(satToTarget, satToTarget);

    // Phase angle (angle between sun-satellite and satellite-target)
    const phaseAngleDot = vec3.dot(satToSun, satToTarget);
    const phaseAngle = (Math.acos(Math.max(-1, Math.min(1, phaseAngleDot))) * RAD2DEG) as Degrees;

    // Sun elevation angle (angle above satellite's horizon)
    // For simplicity, we calculate it relative to the satellite's velocity vector as "forward"
    const velocity = vec3.fromValues(posvel.velocity.x, posvel.velocity.y, posvel.velocity.z);

    vec3.normalize(velocity, velocity);

    const elevationDot = vec3.dot(satToSun, velocity);
    const sunElevation = (Math.asin(Math.max(-1, Math.min(1, elevationDot))) * RAD2DEG) as Degrees;

    // Calculate azimuth using cross product
    const right = vec3.create();

    vec3.cross(right, velocity, satPos);
    vec3.normalize(right, right);

    const azimuthX = vec3.dot(satToSun, right);
    const azimuthY = vec3.dot(satToSun, velocity);
    const sunAzimuth = (Math.atan2(azimuthX, azimuthY) * RAD2DEG) as Degrees;

    // Check if target and satellite are illuminated
    const sunEciVec: EciVec3 = {
      x: sunEci[0] as Kilometers,
      y: sunEci[1] as Kilometers,
      z: sunEci[2] as Kilometers,
    };

    const isSatelliteIlluminated = SatMath.calculateIsInSun({ position: posvel.position } as StateVectorSgp4, sunEciVec) === SunStatus.SUN;
    const isTargetIlluminated = SatMath.calculateIsInSun({ position: targetPosition } as StateVectorSgp4, sunEciVec) === SunStatus.SUN;

    return {
      phaseAngle,
      sunElevation,
      sunAzimuth,
      isTargetIlluminated,
      isSatelliteIlluminated,
    };
  }

  /**
   * Calculate eclipse statistics for a set of eclipse periods
   */
  static calculateEclipseStatistics(periods: EclipsePeriod[], totalDuration: Milliseconds): EclipseStatistics {
    if (periods.length === 0) {
      return {
        totalEclipses: 0,
        totalEclipseTime: 0 as Milliseconds,
        totalUmbralTime: 0 as Milliseconds,
        totalPenumbralTime: 0 as Milliseconds,
        eclipseFraction: 0,
        averageEclipseDuration: 0 as Milliseconds,
        maxEclipseDuration: 0 as Milliseconds,
        minEclipseDuration: 0 as Milliseconds,
      };
    }

    let totalEclipseTime = 0;
    let totalUmbralTime = 0;
    let totalPenumbralTime = 0;
    let maxDuration = 0;
    let minDuration = Infinity;

    for (const period of periods) {
      totalEclipseTime += period.duration;

      if (period.isUmbral) {
        totalUmbralTime += period.duration;
      } else {
        totalPenumbralTime += period.duration;
      }

      maxDuration = Math.max(maxDuration, period.duration);
      minDuration = Math.min(minDuration, period.duration);
    }

    return {
      totalEclipses: periods.length,
      totalEclipseTime: totalEclipseTime as Milliseconds,
      totalUmbralTime: totalUmbralTime as Milliseconds,
      totalPenumbralTime: totalPenumbralTime as Milliseconds,
      eclipseFraction: totalDuration > 0 ? totalEclipseTime / totalDuration : 0,
      averageEclipseDuration: (totalEclipseTime / periods.length) as Milliseconds,
      maxEclipseDuration: maxDuration as Milliseconds,
      minEclipseDuration: minDuration as Milliseconds,
    };
  }

  /**
   * Calculate orbital period from satellite TLE
   */
  private static calculateOrbitalPeriod(satellite: DetailedSatellite): Milliseconds {
    if (!satellite.satrec) {
      return 0 as Milliseconds;
    }

    // Mean motion is in revolutions per day
    const meanMotion = satellite.satrec.no;

    if (meanMotion === 0) {
      return 0 as Milliseconds;
    }

    // Convert to milliseconds per orbit
    const orbitalPeriodMs = (24 * 60 * 60 * 1000) / meanMotion;

    return orbitalPeriodMs as Milliseconds;
  }

  /**
   * Get current eclipse status for a satellite
   */
  static getCurrentEclipseStatus(satellite: DetailedSatellite, time: Date): SunStatus {
    const posvel = SatMath.getEci(satellite, time);

    if (!posvel?.position) {
      return SunStatus.UNKNOWN;
    }

    const sunEci = ServiceLocator.getScene().sun.getEci(time);
    const sunEciVec: EciVec3 = {
      x: sunEci[0] as Kilometers,
      y: sunEci[1] as Kilometers,
      z: sunEci[2] as Kilometers,
    };

    return SatMath.calculateIsInSun({ position: posvel.position } as StateVectorSgp4, sunEciVec);
  }

  /**
   * Find the next eclipse event for a satellite
   */
  static findNextEclipse(
    satellite: DetailedSatellite,
    startTime: Date,
    maxSearchHours: number = 24,
  ): { event: EclipseEvent; period: EclipsePeriod } | null {
    const config: EclipsePredictionConfig = {
      predictionDurationHours: maxSearchHours,
      timeStepSeconds: 60,
      numberOfOrbits: 0,
      includePenumbral: true,
    };

    const { events, periods } = this.predictEclipseTransitions(satellite, startTime, config);

    if (events.length === 0 || periods.length === 0) {
      return null;
    }

    return {
      event: events[0],
      period: periods[0],
    };
  }
}
