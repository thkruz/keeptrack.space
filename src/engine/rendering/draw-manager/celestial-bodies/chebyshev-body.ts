/**
 * Base class for celestial objects that use Chebyshev polynomial interpolation
 * for compact ephemeris storage. Used by both dwarf planets and deep-space satellites.
 */
import { SolarBody } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { ChebyshevInterpolator } from '@ootk/src/interpolator/ChebyshevInterpolator';
import { EpochUTC, J2000, Kilometers, KilometersPerSecond, Seconds, TEME, Vector3D } from '@ootk/src/main';
import { vec3 } from 'gl-matrix';
import { CelestialBody } from './celestial-body';

export abstract class ChebyshevBody extends CelestialBody {
  protected abstract interpolator_: ChebyshevInterpolator;

  draw(sunPosition: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_ || settingsManager.isDisablePlanets) {
      return;
    }
    super.draw(sunPosition, tgtBuffer);
  }

  updatePosition(simTime: Date): void {
    if (this.canReusePosition_(simTime)) {
      return;
    }

    const epoch = new EpochUTC((simTime.getTime() / 1000) as Seconds);
    const j2000 = this.interpolator_.interpolate(epoch);

    if (!j2000) {
      // Time is outside the Chebyshev ephemeris range — skip update silently
      return;
    }

    const posTeme = j2000.toTEME().position;
    const sunEntity = ServiceLocator.getScene().sun;

    sunEntity.updateEci();
    const sunPos = sunEntity.eci;

    posTeme.x = posTeme.x + sunPos.x as Kilometers;
    posTeme.y = posTeme.y + sunPos.y as Kilometers;
    posTeme.z = posTeme.z + sunPos.z as Kilometers;

    this.position = [posTeme.x, posTeme.y, posTeme.z];

    // There is intentionally no rotation update for Chebyshev bodies at this time
  }

  /**
   * Get J2000 state for the body.
   * Chebyshev data is heliocentric (Sun-centered); center body adjustment is applied when needed.
   */
  getJ2000(simTime: Date, centerBody = SolarBody.Earth): J2000 | null {
    const epoch = new EpochUTC((simTime.getTime() / 1000) as Seconds);
    const j2000 = this.interpolator_.interpolate(epoch);

    if (!j2000) {
      return null;
    }

    // Data is heliocentric — return directly for Sun-centered queries
    if (centerBody === SolarBody.Sun) {
      return j2000;
    }

    // Convert to geocentric: geocentric = heliocentric + sunEci
    if (centerBody === SolarBody.Earth || centerBody === SolarBody.Moon) {
      const sunEci = ServiceLocator.getScene().sun.getEci(simTime);

      return new J2000(
        epoch,
        new Vector3D(
          j2000.position.x + sunEci[0] as Kilometers,
          j2000.position.y + sunEci[1] as Kilometers,
          j2000.position.z + sunEci[2] as Kilometers,
        ),
        new Vector3D(
          j2000.velocity.x as KilometersPerSecond,
          j2000.velocity.y as KilometersPerSecond,
          j2000.velocity.z as KilometersPerSecond,
        ),
      );
    }

    // For other center bodies: convert heliocentric -> that body's frame
    const centerBodyPlanet = ServiceLocator.getScene().getBodyById(centerBody);
    const centerBodyTeme = centerBodyPlanet?.getTeme(simTime);
    const sunEci = ServiceLocator.getScene().sun.getEci(simTime);

    // heliocentric + sunEci = geocentric, then subtract center body position
    if (centerBodyTeme) {
      return new J2000(
        epoch,
        new Vector3D(
          j2000.position.x + sunEci[0] - centerBodyTeme.position.x as Kilometers,
          j2000.position.y + sunEci[1] - centerBodyTeme.position.y as Kilometers,
          j2000.position.z + sunEci[2] - centerBodyTeme.position.z as Kilometers,
        ),
        new Vector3D(
          j2000.velocity.x as KilometersPerSecond,
          j2000.velocity.y as KilometersPerSecond,
          j2000.velocity.z as KilometersPerSecond,
        ),
      );
    }

    return j2000;
  }

  getTeme(simTime: Date, centerBody = SolarBody.Earth): TEME | null {
    return this.getJ2000(simTime, centerBody)?.toTEME() ?? null;
  }

  lastUpdateTime: number = 0;
  minimumUpdateInterval: number = 7 * 24 * 3600 * 1000;

  drawFullOrbitPath(): void {
    if (!this.interpolator_) {
      return;
    }

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

        this.svCache[i] ??= this.getTeme(new Date(tMs), SolarBody.Sun)?.position;
        if (!this.svCache[i]) {
          continue;
        }
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

      // Add the current position as the final trail point so the line reaches the body
      if (isTrail && nowMs >= startMs && nowMs <= endMs) {
        const currentPos = this.getTeme(new Date(nowMs), SolarBody.Sun)?.position;

        if (currentPos) {
          orbitPositions.push([currentPos.x, currentPos.y, currentPos.z, 1.0]);
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

      // Path exists but was removed from lines (e.g. after lineManager.clear()) — re-add it
      if (orbitPositions.length !== 0) {
        this.fullOrbitPath.updateVertBuf(orbitPositions);
      }
      lineManager.add(this.fullOrbitPath);

      return;
    }

    // Looks like we need a new fullOrbitPath
    this.fullOrbitPath = lineManager.createOrbitPath(orbitPositions, this.color, SolarBody.Sun);
  }
}
