/**
 * Base class for rendering non-Earth celestial bodies (Moon, Mars, etc.)
 */
import { rgbaArray, SolarBody } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EpochUTC, J2000, Kilometers, KilometersPerSecond, Milliseconds, Seconds, TEME, Vector3D } from '@ootk/src/main';
import { vec3 } from 'gl-matrix';
import { CelestialBody } from './celestial-body';

export const PlanetColors = {
  MERCURY: [0.59, 0.4, 0.6, 0.95] as rgbaArray,
  VENUS: [0.69, 0.47, 0.1, 0.95] as rgbaArray,
  EARTH: [0, 0.6, 0.8, 0.95] as rgbaArray,
  MOON: [0, 0.6, 0.8, 0.7] as rgbaArray,
  MARS: [0.6, 0.3, 0.1, 0.95] as rgbaArray,
  JUPITER: [0.95, 0.71, 0.64, 0.7] as rgbaArray,
  SATURN: [0.72, 0.65, 0.52, 0.7] as rgbaArray,
  URANUS: [0.67, 0.92, 1, 0.7] as rgbaArray,
  NEPTUNE: [0.48, 0.69, 1, 0.7] as rgbaArray,
} as const;

/**
 * Type for storing Horizons state vector data for Mars.
 */
export type HorizonsSVData = [number, [number, number, number], [number, number, number]?];

export abstract class DwarfPlanet extends CelestialBody {
  svDatabase: {
    [key in SolarBody.Earth | SolarBody.Sun]: HorizonsSVData[];
  } = {
      [SolarBody.Earth]: [] as HorizonsSVData[],
      [SolarBody.Sun]: [] as HorizonsSVData[],
    };

  // Cache indices for state vector lookup optimization
  private stateVectorIdx_: number = 0;

  draw(sunPosition: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_ || settingsManager.isDisablePlanets) {
      return;
    }
    super.draw(sunPosition, tgtBuffer);
  }

  updatePosition(simTime: Date): void {
    const posTeme = this.getTeme(simTime, SolarBody.Sun).position;
    const sunEntity = ServiceLocator.getScene().sun;

    sunEntity.updateEci();
    const sunPos = sunEntity.eci;

    posTeme.x = posTeme.x + sunPos.x as Kilometers;
    posTeme.y = posTeme.y + sunPos.y as Kilometers;
    posTeme.z = posTeme.z + sunPos.z as Kilometers;

    this.position = [posTeme.x, posTeme.y, posTeme.z];

    // There is intentionally no rotation update for dwarf planets at this time
  }

  getJ2000(simTime: Date, centerBody = SolarBody.Earth): J2000 {
    const teme = this.getTeme(simTime, centerBody);

    return teme.toJ2000();
  }

  getTeme(simTime: Date, centerBody = SolarBody.Earth): TEME {
    const simulatedTimeInSeconds = simTime.getTime() / 1000 as Seconds;
    const state = this.getStateAtTime(simTime.getTime() as Milliseconds, centerBody);

    if (!state) {
      throw new Error('State not found');
    }

    return new TEME(
      new EpochUTC(simulatedTimeInSeconds),
      new Vector3D(state[0] as Kilometers, state[1] as Kilometers, state[2] as Kilometers),
      new Vector3D(state[3] as KilometersPerSecond, state[4] as KilometersPerSecond, state[5] as KilometersPerSecond),
    );
  }

  lastUpdateTime: number = 0;
  minimumUpdateInterval: number = 7 * 24 * 3600 * 1000;

  drawFullOrbitPath(): void {
    const nowMs = ServiceLocator.getTimeManager().simulationTimeObj.getTime();
    const isDataOld = Math.abs(nowMs - this.lastUpdateTime) > this.minimumUpdateInterval;

    if (this.fullOrbitPath?.isGarbage === false && !isDataOld) {
      // We are already drawing the full orbit path
      return;
    }

    // If orbital period is less than 20 years, use the parent class method
    if (this.orbitalPeriod < (20 * 365.25 * 24 * 3600 as Seconds)) {
      super.drawFullOrbitPath();

      return;
    }

    const lineManager = ServiceLocator.getLineManager();
    const orbitPositions: [number, number, number, number][] = [];

    // If the absolute difference between now and last update time is greater
    // than minimum interval do math
    if (isDataOld) {
      const isTrail = true;
      const startMs = Date.UTC(1990, 0, 1, 0, 0, 0); // 1 Jan 1990 UTC
      const endMs = Date.UTC(2048, 0, 1, 0, 0, 0); // 1 Jan 2048 UTC
      const totalMs = endMs - startMs;
      const segments = this.orbitPathSegments_ > 1 ? this.orbitPathSegments_ : 2;
      const timesliceMs = totalMs / (segments - 1);

      for (let i = 0; i < this.orbitPathSegments_; i++) {
        const tMs = startMs + i * timesliceMs;

        this.svCache[i] ??= this.getTeme(new Date(tMs), SolarBody.Sun).position;
        const x = this.svCache[i].x;
        const y = this.svCache[i].y;
        const z = this.svCache[i].z;

        if (isTrail && tMs <= nowMs) {
          orbitPositions.push([x, y, z, (i * timesliceMs) / (nowMs - startMs)]);
        } else if (isTrail && tMs > nowMs) {
          // Don't add future points in trail mode
          break;
        } else {
          orbitPositions.push([x, y, z, 1.0]);
        }
      }

      this.lastUpdateTime = nowMs;
    }

    // Try to reuse existing fullOrbitPath
    if (this.fullOrbitPath) {
      this.fullOrbitPath.isGarbage = false;

      // Loop through lineManager.lines to find this.fullOrbitPath. Replace the entry.
      for (let i = 0; i < lineManager.lines.length; i++) {
        if (lineManager.lines[i] === this.fullOrbitPath) {

          // If new positions were calculated, update the vertex buffer
          if (orbitPositions.length !== 0) {
            this.fullOrbitPath.updateVertBuf(orbitPositions);
          }
          lineManager.lines[i] = this.fullOrbitPath;

          return;
        }
      }

    }

    // Looks like we need a new fullOrbitPath
    this.fullOrbitPath = lineManager.createOrbitPath(orbitPositions, this.color, SolarBody.Sun);
  }

  /**
   * Get interpolated position and velocity at a given time
   * @param simTime - Simulation time in milliseconds since epoch
   * @returns Tuple of [x, y, z, vx, vy, vz] or null if time is out of bounds
   */
  getStateAtTime(simTime: Milliseconds, centerBody = SolarBody.Earth): [number, number, number, number, number, number] | null {
    if (!this.svDatabase[centerBody] || this.svDatabase[centerBody].length === 0) {
      return null;
    }

    // Find the appropriate state vector index
    const svIdx = this.findStateVectorTime_(simTime, centerBody);

    if (svIdx === null) {
      return null;
    }

    const currentSv = this.svDatabase[centerBody][svIdx];
    const nextSv = this.svDatabase[centerBody][svIdx + 1] ?? currentSv;

    const currentTime = currentSv[0] as Seconds;
    const nextTime = nextSv[0] as Seconds;
    const dt = (simTime - currentTime) as Seconds;
    const totalDt = (nextTime - currentTime) as Seconds;

    simTime = currentTime === nextTime ? currentTime * 1000 as Milliseconds : simTime;

    const posAndVel: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
    const stateVectorCount = this.svDatabase[centerBody].length;

    // Linear interpolation of position
    if (totalDt > 0 && svIdx < stateVectorCount - 1) {
      posAndVel[0] = currentSv[1][0] + ((nextSv[1][0] - currentSv[1][0]) * dt) / totalDt;
      posAndVel[1] = currentSv[1][1] + ((nextSv[1][1] - currentSv[1][1]) * dt) / totalDt;
      posAndVel[2] = currentSv[1][2] + ((nextSv[1][2] - currentSv[1][2]) * dt) / totalDt;
    } else {
      // Use current position if we're at the last state vector or dt is 0
      posAndVel[0] = currentSv[1][0];
      posAndVel[1] = currentSv[1][1];
      posAndVel[2] = currentSv[1][2];
    }

    // Set velocity if available, otherwise estimate from position difference
    if (currentSv[2]) {
      if (totalDt > 0 && svIdx < stateVectorCount - 1 && nextSv[2]) {
        // Interpolate velocity if both current and next have velocity data
        posAndVel[3] = currentSv[2][0] + ((nextSv[2][0] - currentSv[2][0]) * dt) / totalDt;
        posAndVel[4] = currentSv[2][1] + ((nextSv[2][1] - currentSv[2][1]) * dt) / totalDt;
        posAndVel[5] = currentSv[2][2] + ((nextSv[2][2] - currentSv[2][2]) * dt) / totalDt;
      } else {
        // Use current velocity
        posAndVel[3] = currentSv[2][0];
        posAndVel[4] = currentSv[2][1];
        posAndVel[5] = currentSv[2][2];
      }
    } else if (totalDt > 0 && svIdx < stateVectorCount - 1) {
      // Estimate velocity from position difference if velocity data is not available
      posAndVel[3] = (nextSv[1][0] - currentSv[1][0]) / totalDt;
      posAndVel[4] = (nextSv[1][1] - currentSv[1][1]) / totalDt;
      posAndVel[5] = (nextSv[1][2] - currentSv[1][2]) / totalDt;
    }

    if (centerBody === SolarBody.Sun) {
      // Subtract the Sun's position to get heliocentric values
      const sunEci = ServiceLocator.getScene().sun.getEci(new Date(simTime));

      posAndVel[0] -= sunEci[0];
      posAndVel[1] -= sunEci[1];
      posAndVel[2] -= sunEci[2];
    } else if (centerBody !== SolarBody.Earth && centerBody !== SolarBody.Moon) {
      const centerBodyPlanet = ServiceLocator.getScene().getBodyById(centerBody);
      const centerBodyEci = centerBodyPlanet?.getTeme(new Date(simTime)) ?? [0, 0, 0];

      posAndVel[0] -= centerBodyEci[0];
      posAndVel[1] -= centerBodyEci[1];
      posAndVel[2] -= centerBodyEci[2];
    }

    return posAndVel;
  }

  /**
   * Find the index of the state vector that corresponds to the given simulation time
   * Uses binary search for efficient lookup with caching optimization
   * @param simTime - Simulation time in seconds since epoch
   * @returns Index of the state vector or null if time is out of bounds
   */
  private findStateVectorTime_(simTime: Milliseconds, centerBody: SolarBody): number | null {
    if (!this.svDatabase || this.svDatabase[centerBody].length === 0) {
      return null;
    }

    // Check if time is within database bounds
    const firstTime = this.svDatabase[centerBody][0][0];
    const lastTime = this.svDatabase[centerBody][this.svDatabase[centerBody].length - 1][0];

    if (simTime <= firstTime) {
      this.stateVectorIdx_ = 0;

      return this.stateVectorIdx_;
    }

    if (simTime >= lastTime) {
      this.stateVectorIdx_ = this.svDatabase[centerBody].length - 1;

      return this.stateVectorIdx_;
    }

    // If we're at the last state vector, return it
    if (simTime >= lastTime) {
      this.stateVectorIdx_ = this.svDatabase[centerBody].length - 1;

      return this.stateVectorIdx_;
    }

    // Optimize starting position for forward time progression
    let left = 0;
    let right = this.svDatabase[centerBody].length - 1;

    // Start search from cached position if it's still valid
    if (this.stateVectorIdx_ < this.svDatabase[centerBody].length &&
      simTime >= this.svDatabase[centerBody][this.stateVectorIdx_][0]) {
      left = this.stateVectorIdx_;
    }

    // Binary search to find the correct interval
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const currentTime: number = this.svDatabase[centerBody][mid][0];
      const nextTime: number = this.svDatabase[centerBody][mid + 1]?.[0] ?? Infinity;

      if (currentTime <= simTime && nextTime > simTime) {
        // Found the correct interval
        this.stateVectorIdx_ = mid;

        return mid;
      } else if (currentTime > simTime) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    // Fallback: return the last valid index
    this.stateVectorIdx_ = this.svDatabase[centerBody].length - 1;

    return this.stateVectorIdx_;
  }
}
