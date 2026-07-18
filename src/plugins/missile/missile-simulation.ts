/* eslint-disable max-lines */
/* eslint-disable max-params */
/* eslint-disable max-statements */
/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
import { ToastMsgType } from '@app/engine/core/interfaces';
import { Degrees, Kilometers } from '@ootk/src/main';
import { MissileSimulationResult, MissileSpec } from './missile-types';

/**
 * Per-call ballistic missile flight simulation.
 *
 * Each `createMissile` invocation constructs a fresh `MissileSimulation`. The
 * physics constants and iteratively-mutated state (BurnRate, EarthRadius, h,
 * etc.) that previously lived at module scope in `missile-manager.ts` are now
 * instance fields, eliminating shared mutable state.
 *
 * The physics formulas are copied verbatim from the pre-refactor `Missile()`
 * function. The golden-trajectory snapshot tests in `missile-manager.test.ts`
 * lock the output across this move - if a snapshot diff appears, the math
 * drifted and the cause needs to be hunted down before merging.
 */
export class MissileSimulation {
  private readonly spec_: MissileSpec;

  // Universal physics constants (would be `const` if not for the instance pattern;
  // kept as fields for symmetry with the per-launch values below).
  private readonly earthRadius_ = 6_371_000; // m
  private readonly earthMass_ = 5.9726 * 10 ** 24; // kg
  private readonly gravConstant_ = 6.67384 * 10 ** -11; // m^3 kg^-1 s^-2
  private readonly gasConstant_ = 287; // J K^-1 kg^-1
  private readonly fuelDensity_ = 1750; // kg/m^3
  private readonly stepSize_ = 1; // s

  /**
   * Hard ceiling on integration steps (= seconds of flight at `stepSize_`). A real
   * ballistic flight tops out near ~1900 s; a coast loop only runs longer than this if
   * the motor reached near-orbital velocity and the vehicle never falls back (Altitude
   * stays > 0 forever). That used to hang the whole simulation on certain oversized
   * motor / short-range combinations, so every flight loop is bounded by this.
   */
  private static readonly MAX_FLIGHT_STEPS = 6000;

  // Per-launch derived state.
  private readonly burnRate_: number;
  private readonly warheadMass_: number;

  constructor(spec: MissileSpec) {
    this.spec_ = spec;
    this.burnRate_ = spec.burnRate || 0.042;
    this.warheadMass_ = 500 * spec.numberOfWarheads;
  }

  run(): MissileSimulationResult {
    const spec = this.spec_;
    const Length = spec.length || 17;
    const Diameter = spec.diameter || 3.1;
    const MaxMissileRange = spec.maxRangeKm;
    const minAltitude = spec.minAltitudeKm ?? 0;

    const LatList: Degrees[] = [];
    const LongList: Degrees[] = [];

    const [EstLatList, EstLongList, , ArcLength, EstDistanceList, GoalDistance] = this.calculateCoordinates_(
      spec.launchLatitude,
      spec.launchLongitude,
      spec.targetLatitude,
      spec.targetLongitude
    );

    if (ArcLength < 320_000) {
      return {
        kind: 'error',
        errorMessage: 'Error: This missile has a minimum distance of 320 km.',
        errorType: ToastMsgType.critical,
      };
    }

    if (ArcLength > MaxMissileRange * 1000) {
      return {
        kind: 'error',
        errorMessage: `Error: This missile has a maximum distance of ${MaxMissileRange} km.`,
        errorType: ToastMsgType.critical,
      };
    }

    const minAltitudeTrue = minAltitude * (Math.min(3, MaxMissileRange / (ArcLength / 1000)) / 2);

    // Casing geometry
    const Thickness = 0.050389573 * Diameter;
    const RocketArea = 0.25 * Math.PI * Diameter ** 2;
    const RocketCasingDensity = 1628.75;
    const RocketCasingVolume = 0.25 * Math.PI * Length * (Diameter ** 2 - (Diameter - Thickness) ** 2);
    const RocketCasingMass1 = RocketCasingDensity * RocketCasingVolume;
    const RocketCasingMass2 = RocketCasingDensity * 0.25 * Math.PI * (Length * 0.4937) * (Diameter ** 2 - (Diameter - Thickness) ** 2);
    const RocketCasingMass3 = RocketCasingDensity * 0.25 * Math.PI * (Length * 0.157) * ((Diameter * 0.75) ** 2 - (Diameter * 0.75 - (Thickness / 2) ** 2));

    // Fuel geometry
    const FuelArea1 = 0.25 * Math.PI * (Diameter - Thickness) ** 2;
    const FuelArea2 = 0.25 * Math.PI * (Diameter * 0.75 - Thickness) ** 2;
    const FuelVolume = FuelArea1 * (Length * 0.651) + FuelArea2 * (Length * 0.178);
    let FuelMass = this.fuelDensity_ * FuelVolume;

    // Initial conditions
    let dthetadt = 0.001;
    let drdt = 0.001;
    let Altitude = 0;
    const NozzleAltitude1 = 0;
    let Distance = 0;
    let ArcDistance = 0;
    const MassIn = 0;

    const AltitudeList: Kilometers[] = [];
    const hList: number[] = [];

    let NozzleAltitude2: number | undefined;
    let NozzleAltitude3: number | undefined;

    const AngleCoefficient = this.calculateAngle_(
      FuelArea1,
      FuelArea2,
      FuelMass,
      FuelVolume,
      RocketArea,
      Altitude,
      RocketCasingMass1,
      RocketCasingMass2,
      RocketCasingMass3,
      NozzleAltitude1,
      drdt,
      dthetadt,
      Distance,
      ArcDistance,
      MassIn,
      ArcLength,
      GoalDistance
    );

    while (FuelMass / this.fuelDensity_ / FuelVolume > 0.4 && Altitude >= 0) {
      const out = this.launchDetailed_(
        FuelArea1,
        FuelMass,
        RocketArea,
        Altitude,
        RocketCasingMass1,
        NozzleAltitude1,
        drdt,
        dthetadt,
        Distance,
        ArcDistance,
        MassIn,
        AngleCoefficient
      );

      FuelMass = out[0];
      drdt = out[12];
      Altitude = out[13];
      Distance = out[14];
      ArcDistance = out[16];
      dthetadt = out[18];
      NozzleAltitude2 = Altitude;

      AltitudeList.push((Altitude / 1000) as Kilometers);
      this.pushCoordsAtDistance_(LatList, LongList, EstLatList, EstLongList, EstDistanceList, Distance);

      let hListSum = 0;

      for (const h_ of hList) {
        hListSum += h_;
      }
      hList.push(this.stepSize_ + hListSum);
    }

    while (FuelMass / this.fuelDensity_ / FuelVolume > 0.19 && Altitude >= 0) {
      const out = this.launchDetailed_(
        FuelArea1,
        FuelMass,
        RocketArea,
        Altitude,
        RocketCasingMass2,
        NozzleAltitude2!,
        drdt,
        dthetadt,
        Distance,
        ArcDistance,
        MassIn,
        AngleCoefficient
      );

      FuelMass = out[0];
      drdt = out[12];
      Altitude = out[13];
      Distance = out[14];
      ArcDistance = out[16];
      dthetadt = out[18];
      NozzleAltitude3 = Altitude;

      AltitudeList.push((Altitude / 1000) as Kilometers);
      this.pushCoordsAtDistance_(LatList, LongList, EstLatList, EstLongList, EstDistanceList, Distance);

      let hListSum = 0;

      for (const h_ of hList) {
        hListSum += h_;
      }
      hList.push(this.stepSize_ + hListSum);
    }

    while (FuelMass / this.fuelDensity_ / FuelVolume > 0 && Altitude >= 0) {
      const out = this.launchDetailed_(
        FuelArea2,
        FuelMass,
        RocketArea,
        Altitude,
        RocketCasingMass3,
        NozzleAltitude3!,
        drdt,
        dthetadt,
        Distance,
        ArcDistance,
        MassIn,
        AngleCoefficient
      );

      FuelMass = out[0];
      drdt = out[12];
      Altitude = out[13];
      Distance = out[14];
      ArcDistance = out[16];
      dthetadt = out[18];

      AltitudeList.push((Altitude / 1000) as Kilometers);
      this.pushCoordsAtDistance_(LatList, LongList, EstLatList, EstLongList, EstDistanceList, Distance);

      let hListSum = 0;

      for (const h_ of hList) {
        hListSum += h_;
      }
      hList.push(this.stepSize_ + hListSum);
    }

    // Ballistic coast to impact. Bounded by MAX_FLIGHT_STEPS: if the burn left the vehicle
    // at (near-)orbital velocity it never falls back and this loop would spin forever.
    while (Altitude > 0 && AltitudeList.length < MissileSimulation.MAX_FLIGHT_STEPS) {
      FuelMass = 0;
      const out = this.launchDetailed_(
        FuelArea2,
        FuelMass,
        RocketArea,
        Altitude,
        RocketCasingMass3,
        NozzleAltitude3!,
        drdt,
        dthetadt,
        Distance,
        ArcDistance,
        MassIn,
        AngleCoefficient
      );

      FuelMass = out[0];
      drdt = out[12];
      Altitude = out[13];
      Distance = out[14];
      ArcDistance = out[16];
      dthetadt = out[18];

      AltitudeList.push((Altitude / 1000) as Kilometers);
      this.pushCoordsAtDistance_(LatList, LongList, EstLatList, EstLongList, EstDistanceList, Distance);
    }

    // Runaway guard: hitting the step ceiling means the vehicle never came back down
    // (effectively went to orbit), so there is no ballistic impact to report.
    if (AltitudeList.length >= MissileSimulation.MAX_FLIGHT_STEPS) {
      return {
        kind: 'error',
        errorMessage: 'Error: The missile reached orbital velocity<br>(motor too large for this range).',
        errorType: ToastMsgType.critical,
      };
    }

    // Guard against overshoot corruption. The coordinate table (EstDistanceList) only
    // spans ~1.2x the great-circle arc to the target. When the motor carries more energy
    // than the range needs - e.g. an ICBM-sized rocket fired at a short regional target -
    // the missile flies past that span, pushCoordsAtDistance_ finds no bracketing sample
    // and stops appending, so the lat/lon lists fall short of the altitude list and their
    // tail reads as `undefined`/NaN. This used to slip through as a `success` with a broken
    // track (the regional IRBM/SRBM scenarios were full of them). Report it instead so the
    // caller retries with a smaller motor or skips the shot.
    if (LatList.length !== AltitudeList.length || LongList.length !== AltitudeList.length) {
      return {
        kind: 'error',
        errorMessage: 'Error: The missile overshot its target<br>(motor too large for this range).',
        errorType: ToastMsgType.critical,
      };
    }

    const MaxAltitude = AltitudeList.reduce((a, b) => Math.max(a, b), 0);

    if (MaxAltitude < minAltitudeTrue) {
      const burnMultiplier = Math.min(3, minAltitudeTrue / MaxAltitude);

      return { kind: 'lowApogee', burnMultiplier };
    }

    if (minAltitudeTrue === (minAltitude * 3) / 2) {
      return {
        kind: 'tooClose',
        errorMessage: 'Error: This distance is too close for the selected missile.',
        errorType: ToastMsgType.critical,
      };
    }

    // Guard against a non-converged solve. The angle search should land the missile on
    // the aimpoint (GoalDistance); if the downrange distance it actually flew misses that
    // by more than 10% of the range, the trajectory ends in open country short of - or well
    // past - the target. Reject rather than bake a track that does not reach its target.
    const impactErrorFraction = Math.abs(Distance - GoalDistance) / GoalDistance;

    if (impactErrorFraction > 0.1) {
      return {
        kind: 'error',
        errorMessage: 'Error: The missile could not be guided<br>to its target at this range.',
        errorType: ToastMsgType.critical,
      };
    }

    return {
      kind: 'success',
      trajectory: {
        latList: LatList,
        lonList: LongList,
        altList: AltitudeList,
        maxAltitudeKm: MaxAltitude,
      },
    };
  }

  /**
   * Find the (lat, lon) on the great-circle path that corresponds to the current
   * Distance and append it to the running trajectory lists, interpolated between the
   * two bracketing samples at full precision.
   *
   * The previous implementation snapped to the nearest sample and rounded to
   * `0.01deg` (~1 km), which turned the 1 Hz track into a visible staircase once the
   * renderer drew every sample. Interpolating along the bracketing chord and keeping
   * full precision yields the smooth arc (the interceptor/launch trajectories never
   * quantize their coordinates, which is why only this solver looked jagged).
   */
  private pushCoordsAtDistance_(LatList: Degrees[], LongList: Degrees[], EstLatList: number[], EstLongList: number[], EstDistanceList: number[], Distance: number): void {
    const distanceKm = Distance / 1000;

    for (let i = 0; i < EstDistanceList.length; i++) {
      if (EstDistanceList[i] <= distanceKm && EstDistanceList[i + 1] > distanceKm) {
        const d0 = EstDistanceList[i];
        const d1 = EstDistanceList[i + 1];
        const lat0 = EstLatList[i];
        const lon0 = EstLongList[i];
        const lat1 = EstLatList[i + 1];
        const lon1 = EstLongList[i + 1];
        const frac = d1 > d0 ? Math.max(0, Math.min((distanceKm - d0) / (d1 - d0), 1)) : 0;

        // Blend longitude along the shorter arc so an antimeridian step interpolates cleanly.
        let lonStep = lon1 - lon0;

        if (lonStep > 180) {
          lonStep -= 360;
        } else if (lonStep < -180) {
          lonStep += 360;
        }

        LatList.push((lat0 + (lat1 - lat0) * frac) as Degrees);
        LongList.push((lon0 + lonStep * frac) as Degrees);
        break;
      }
    }
  }

  private calculateCoordinates_(
    CurrentLatitude: number,
    CurrentLongitude: number,
    TargetLatitude: number,
    TargetLongitude: number
  ): [number[], number[], number, number, number[], number] {
    const r = this.earthRadius_;
    const Phi1 = (CurrentLatitude * Math.PI) / 180;
    const Lambda1 = (CurrentLongitude * Math.PI) / 180;
    const Phi2 = (TargetLatitude * Math.PI) / 180;
    const Lambda2 = (TargetLongitude * Math.PI) / 180;
    let Lambda12: number | undefined;

    if (Lambda2 - Lambda1 >= -Math.PI && Lambda2 - Lambda1 <= Math.PI) {
      Lambda12 = Lambda2 - Lambda1;
    }
    if (Lambda2 - Lambda1 > Math.PI) {
      Lambda12 = Lambda2 - Lambda1 - 2 * Math.PI;
    }
    if (Lambda2 - Lambda1 < -Math.PI) {
      Lambda12 = Lambda2 - Lambda1 + 2 * Math.PI;
    }

    const Alpha1 = Math.atan2(Math.sin(Lambda12!), Math.cos(Phi1) * Math.tan(Phi2) - Math.sin(Phi1) * Math.cos(Lambda12!));
    const DeltaTheta12 = Math.acos(Math.sin(Phi1) * Math.sin(Phi2) + Math.cos(Phi1) * Math.cos(Phi2) * Math.cos(Lambda12!));
    const ArcLength = DeltaTheta12 * r;
    const Alphao = Math.asin(Math.sin(Alpha1) * Math.cos(Phi1));
    const DeltaSigma01 = Math.atan2(Math.tan(Phi1), Math.cos(Alpha1));
    const DeltaSigma02 = DeltaSigma01 + DeltaTheta12;
    const Lambda01 = Math.atan2(Math.sin(Alphao) * Math.sin(DeltaSigma01), Math.cos(DeltaSigma01));
    const Lambdao = Lambda1 - Lambda01;
    const EstLatList: number[] = [];
    const latList1: number[] = [];
    const latList2: number[] = [];
    const latList3: number[] = [];
    const EstLongList: number[] = [];
    const lonList1: number[] = [];
    const lonList2: number[] = [];
    const lonList3: number[] = [];
    const EstDistanceList: number[] = [];
    let GoalDistance = 0;

    for (let i = 0; i <= 2400; i++) {
      const Sigma = DeltaSigma01 + (i * (DeltaSigma02 - DeltaSigma01)) / 2000;
      const Phi = (Math.asin(Math.cos(Alphao) * Math.sin(Sigma)) * 180) / Math.PI;
      const Lambda = ((Lambdao + Math.atan2(Math.sin(Alphao) * Math.sin(Sigma), Math.cos(Sigma))) * 180) / Math.PI;

      if (i === 2000) {
        GoalDistance = (Sigma - DeltaSigma01) * r;
      }
      EstDistanceList.push(((Sigma - DeltaSigma01) * r) / 1000);
      if (Lambda >= -180 && Lambda <= 180) {
        lonList1.push(Lambda);
        latList1.push(Phi);
      } else if (Lambda < -180) {
        lonList3.push(Lambda + 360);
        latList3.push(Phi);
      } else if (Lambda > 180) {
        lonList2.push(Lambda - 360);
        latList2.push(Phi);
      }
    }

    for (const lat of latList1) {
      EstLatList.push(lat);
    }
    for (const lat of latList2) {
      EstLatList.push(lat);
    }
    for (const lat of latList3) {
      EstLatList.push(lat);
    }
    for (const lon of lonList1) {
      EstLongList.push(lon);
    }
    for (const lon of lonList2) {
      EstLongList.push(lon);
    }
    for (const lon of lonList3) {
      EstLongList.push(lon);
    }

    return [EstLatList, EstLongList, (Alpha1 * 180) / Math.PI, ArcLength, EstDistanceList, GoalDistance];
  }

  private launchDetailed_(
    FuelArea: number,
    FuelMass: number,
    RocketArea: number,
    Altitude: number,
    RocketCasingMass: number,
    NozzleAltitude: number,
    drdt: number,
    dthetadt: number,
    Distance: number,
    ArcDistance: number,
    MassIn: number,
    AngleCoefficient: number
  ): number[] {
    let ThrustAngle: number;

    if (Altitude < 1_200_000) {
      ThrustAngle =
        (90 -
          AngleCoefficient *
            (1.5336118956 +
              0.00443173537387 * Altitude -
              9.30373890848 * 10 ** -8 * Altitude ** 2 +
              8.37838197732 * 10 ** -13 * Altitude ** 3 -
              2.71228576626 * 10 ** -18 * Altitude ** 4)) *
        0.0174533;
    } else {
      ThrustAngle = 30;
    }

    const Radius = this.earthRadius_ + Altitude;
    const DragAngle = Math.atan2(drdt, dthetadt);

    let MassOut = 0;

    if (FuelMass > 0) {
      MassOut = this.fuelDensity_ * FuelArea * this.burnRate_;
      const dmdt = MassIn - MassOut;

      FuelMass += dmdt * this.stepSize_;
    } else {
      FuelMass = 0;
    }

    const RocketMass = FuelMass + RocketCasingMass + this.warheadMass_;
    const Tatm = this.calculateTemperature_(Altitude);
    const Patm = this.calculatePressure_(Altitude);
    const AirDensity = Patm / (this.gasConstant_ * Tatm);

    const c = (1.4 * this.gasConstant_ * Tatm) ** (1 / 2);
    const M = Math.sqrt(drdt ** 2 + dthetadt ** 2) / c;
    const cD = this.calculateDrag_(Math.abs(M));

    let Thrust = 0;

    if (FuelMass > 0) {
      Thrust = this.calculateThrust_(MassOut, Altitude, FuelArea, NozzleAltitude);
    }

    const DragForce = (1 / 2) * AirDensity * (drdt ** 2 + dthetadt ** 2) * RocketArea * cD;
    const WeightForce = (this.gravConstant_ * this.earthMass_ * RocketMass) / Radius ** 2;

    const dr2dt = (Thrust * Math.sin(ThrustAngle) - DragForce * Math.sin(DragAngle) - WeightForce) / RocketMass + Radius * (dthetadt / Radius) ** 2;

    drdt += dr2dt * this.stepSize_;
    Altitude += drdt * this.stepSize_;
    Distance += dthetadt * this.stepSize_;

    const ArcVelocity = (dthetadt * this.earthRadius_) / Radius;

    ArcDistance += ArcVelocity * this.stepSize_;

    const dtheta2dt = (Thrust * Math.cos(ThrustAngle) - DragForce * Math.cos(DragAngle)) / RocketMass - 2 * drdt * (dthetadt / Radius);

    dthetadt += dtheta2dt * this.stepSize_;

    return [FuelMass, RocketMass, Tatm, Patm, AirDensity, c, M, cD, Thrust, DragForce, WeightForce, dr2dt, drdt, Altitude, Distance, ArcVelocity, ArcDistance, dtheta2dt, dthetadt];
  }

  private calculateAngle_(
    FuelArea1: number,
    FuelArea2: number,
    FuelMass: number,
    FuelVolume: number,
    RocketArea: number,
    Altitude: number,
    RocketCasingMass1: number,
    RocketCasingMass2: number,
    RocketCasingMass3: number,
    NozzleAltitude1: number,
    drdt: number,
    dthetadt: number,
    Distance: number,
    ArcDistance: number,
    MassIn: number,
    _ArcLength: number,
    GoalDistance: number
  ): number {
    const DistanceSteps: number[] = [];
    let AngleCoefficient = 0;
    let DistanceClosePossition = 0;
    let AC1 = 0;
    let AC2 = 0;
    const Steps = 500;

    for (let i = 0; i < Steps; i++) {
      AngleCoefficient = (i * 1) / Steps / 2 + 0.5;
      DistanceSteps.push(
        this.launchSimple_(
          FuelArea1,
          FuelArea2,
          FuelMass,
          FuelVolume,
          RocketArea,
          Altitude,
          RocketCasingMass1,
          RocketCasingMass2,
          RocketCasingMass3,
          NozzleAltitude1,
          drdt,
          dthetadt,
          Distance,
          ArcDistance,
          MassIn,
          AngleCoefficient
        )
      );
    }

    let DistanceClosest = DistanceSteps[0];
    let oldDistanceClosest = Math.abs(DistanceSteps[0] - GoalDistance);

    for (const distance_ of DistanceSteps) {
      const newDistanceClosest = Math.abs(distance_ - GoalDistance);

      if (newDistanceClosest < oldDistanceClosest) {
        oldDistanceClosest = newDistanceClosest;
        DistanceClosest = distance_;
      }
    }
    for (let i = 0; i < Steps; i++) {
      if (DistanceSteps[i] === DistanceClosest) {
        DistanceClosePossition = i;
        break;
      }
    }
    AngleCoefficient = (DistanceClosePossition * 1) / Steps / 2 + 0.5;

    AC1 = (DistanceClosePossition - 2) / Steps / 2 + 0.5;
    AC2 = (DistanceClosePossition + 2) / Steps / 2 + 0.5;
    let ACNew = (AC1 + AC2) / 2;
    const qRunACNew = this.launchSimple_(
      FuelArea1,
      FuelArea2,
      FuelMass,
      FuelVolume,
      RocketArea,
      Altitude,
      RocketCasingMass1,
      RocketCasingMass2,
      RocketCasingMass3,
      NozzleAltitude1,
      drdt,
      dthetadt,
      Distance,
      ArcDistance,
      MassIn,
      ACNew
    );
    let error = Math.abs((GoalDistance - qRunACNew) / GoalDistance) * 100;

    while (error > 0.01 && Math.abs(AC2 - AC1) >= 0.0001) {
      ACNew = (AC1 + AC2) / 2;
      error =
        Math.abs(
          (GoalDistance -
            this.launchSimple_(
              FuelArea1,
              FuelArea2,
              FuelMass,
              FuelVolume,
              RocketArea,
              Altitude,
              RocketCasingMass1,
              RocketCasingMass2,
              RocketCasingMass3,
              NozzleAltitude1,
              drdt,
              dthetadt,
              Distance,
              ArcDistance,
              MassIn,
              ACNew
            )) /
            GoalDistance
        ) * 100;
      if (
        this.launchSimple_(
          FuelArea1,
          FuelArea2,
          FuelMass,
          FuelVolume,
          RocketArea,
          Altitude,
          RocketCasingMass1,
          RocketCasingMass2,
          RocketCasingMass3,
          NozzleAltitude1,
          drdt,
          dthetadt,
          Distance,
          ArcDistance,
          MassIn,
          ACNew
        ) > GoalDistance
      ) {
        AC2 = ACNew;
      } else {
        AC1 = ACNew;
      }
    }
    AngleCoefficient = ACNew;

    return AngleCoefficient;
  }

  private launchSimple_(
    FuelArea1: number,
    FuelArea2: number,
    FuelMass: number,
    FuelVolume: number,
    RocketArea: number,
    Altitude: number,
    RocketCasingMass1: number,
    RocketCasingMass2: number,
    RocketCasingMass3: number,
    NozzleAltitude1: number,
    drdt: number,
    dthetadt: number,
    Distance: number,
    ArcDistance: number,
    MassIn: number,
    AngleCoefficient: number
  ): number {
    let NozzleAltitude2: number | undefined;
    let NozzleAltitude3: number | undefined;
    let out: number[] = [];

    while (FuelMass / this.fuelDensity_ / FuelVolume > 0.4 && Altitude >= 0) {
      out = this.launchDetailed_(FuelArea1, FuelMass, RocketArea, Altitude, RocketCasingMass1, NozzleAltitude1, drdt, dthetadt, Distance, ArcDistance, MassIn, AngleCoefficient);
      FuelMass = out[0];
      drdt = out[12];
      Altitude = out[13];
      Distance = out[14];
      ArcDistance = out[16];
      dthetadt = out[18];
      NozzleAltitude2 = Altitude;
    }
    while (FuelMass / this.fuelDensity_ / FuelVolume > 0.19 && Altitude >= 0) {
      out = this.launchDetailed_(FuelArea1, FuelMass, RocketArea, Altitude, RocketCasingMass2, NozzleAltitude2!, drdt, dthetadt, Distance, ArcDistance, MassIn, AngleCoefficient);
      FuelMass = out[0];
      drdt = out[12];
      Altitude = out[13];
      Distance = out[14];
      ArcDistance = out[16];
      dthetadt = out[18];
      NozzleAltitude3 = Altitude;
    }
    while (FuelMass / this.fuelDensity_ / FuelVolume > 0 && Altitude >= 0) {
      out = this.launchDetailed_(FuelArea2, FuelMass, RocketArea, Altitude, RocketCasingMass3, NozzleAltitude3!, drdt, dthetadt, Distance, ArcDistance, MassIn, AngleCoefficient);
      FuelMass = out[0];
      drdt = out[12];
      Altitude = out[13];
      Distance = out[14];
      ArcDistance = out[16];
      dthetadt = out[18];
    }
    // Coast to impact, bounded so a near-orbital solve cannot spin this predictor forever
    // (it runs 500+ times inside the angle search, so an unbounded loop here hangs the solve).
    let coastSteps = 0;

    while (Altitude > 0 && coastSteps < MissileSimulation.MAX_FLIGHT_STEPS) {
      FuelMass = 0;
      out = this.launchDetailed_(FuelArea2, FuelMass, RocketArea, Altitude, RocketCasingMass3, NozzleAltitude3!, drdt, dthetadt, Distance, ArcDistance, MassIn, AngleCoefficient);
      FuelMass = out[0];
      drdt = out[12];
      Altitude = out[13];
      Distance = out[14];
      ArcDistance = out[16];
      dthetadt = out[18];
      coastSteps++;
    }

    return Distance;
  }

  private calculatePressure_(Altitude: number): number {
    const Po = 101_325;
    const mol = 0.02897;
    const Tsea = 288;
    const _R = 8.31451;
    const g = 9.81;

    return Po * Math.exp((-mol * g * Altitude) / (_R * Tsea));
  }

  private calculateTemperature_(Altitude: number): number {
    Altitude /= 1000;
    if (Altitude < 12.5) {
      return 276.642857143 - 5.02285714286 * Altitude;
    }
    if (Altitude < 20) {
      return 213.0;
    }
    if (Altitude < 47.5) {
      return 171.224358974 + 2.05384615385 * Altitude;
    }
    if (Altitude < 52.5) {
      return 270.0;
    }
    if (Altitude < 80) {
      return 435.344405594 - 3.13916083916 * Altitude;
    }
    if (Altitude < 90) {
      return 183.0;
    }
    if (Altitude < 110) {
      return -221.111111111 + 4.47 * Altitude;
    }
    if (Altitude < 120) {
      return -894.0 + 10.6 * Altitude;
    }
    if (Altitude >= 120) {
      return -894.0 + 10.6 * 120;
    }

    return -894.0 + 10.6 * 120;
  }

  private calculateDrag_(M: number): number {
    if (M < 0.5) {
      return 0.125;
    }
    if (M < 1.1875) {
      return -0.329086061307 + 2.30117394072 * M + -4.06597222013 * M ** 2 + 3.01851851676 * M ** 3 + -0.666666666129 * M ** 4;
    }
    if (M < 1.625) {
      return 0.10937644721 + -4.61979595244 * M + 9.72917139612 * M ** 2 + -6.33333563852 * M ** 3 + 1.33333375211 * M ** 4;
    }
    if (M < 3.625) {
      return 0.97916002909 + -0.540978181863 * M + 0.125235817144 * M ** 2 + -0.00666103733277 * M ** 3 + -0.000558009790208 * M ** 4;
    }
    if (M > 3.625) {
      return 0.25;
    }

    return 0.25;
  }

  private calculateThrust_(MassOut: number, Altitude: number, FuelArea: number, NozzleAltitude: number): number {
    const k = 1.2;
    const Ru = 8314.4621;
    const Tc = 3700;
    const Pc = 25 * 10 ** 6;
    const Mw = 22;
    const q = MassOut;
    const Pa = this.calculatePressure_(NozzleAltitude);
    const Pe = this.calculatePressure_(Altitude);
    const Pt = (Pc * (1 + (k - 1) / 2)) ** (-k / (k - 1));
    const Tt = Tc / (1 + (k - 1) / 2);
    const At = (q / Pt) * Math.sqrt((Ru * Tt) / (Mw * k));
    const Nm = Math.sqrt((2 / (k - 1)) * (Pc / Pa) ** ((k - 1) / k - 1));
    let Ae = (At / Nm) * (1 + (((k - 1) / 2) * Nm ** 2) / ((k + 1) / 2)) ** ((k + 1) / (2 * (k - 1)));

    if (Ae > FuelArea) {
      Ae = FuelArea;
    }
    const VeSub = ((2 * k) / (k - 1)) * ((Ru * Tc) / Mw) * (1 - Pe / Pc) ** ((k - 1) / k);
    const Ve = Math.sqrt(VeSub);

    return q * Ve + (Pe - Pa) * Ae;
  }
}
