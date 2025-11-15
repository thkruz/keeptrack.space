/* eslint-disable max-params */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable complexity */
/* eslint-disable max-statements */
/* eslint-disable max-lines-per-function */
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { RADIUS_OF_EARTH } from '@app/engine/utils/constants';
import { Kilometers, Meters, SpaceObjectType } from '@ootk/src/main';
import { missileManager } from './missile-manager';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class Missile {
  static EarthMass = 5.9726 * 10 ** 24; // (kg)
  static R = 287; // (J * K^-1 * kg^-1)
  static G = 6.67384 * 10 ** -11; // (m^3 * kg^-1 * s^-2)

  /**
   * This function calculates the path of the rocket across the earth in terms of coordinates by using
   * great-circle equations. It will also calculate which direction will be the shortest distance to the
   * target and then calculate the distance across the surface of the earth to the target. There is only
   * one constant for this function and that is the radius of the earth. After finding all the variables
   * for the final and initial points it will the calculate the coordinates along the path by first extending
   * the line between the two points until it reaches the equator. To calculate coordinates along the path it
   * needs the angle the line makes at the equator and also at what longitude the line intersects the equator.
   * The iMathuts for this function are:
   * Phi1:    Latitude coordinate of the starting point
   * Lambda1: Longitude coordinate of the starting point
   * Phi2:    Latitude coordinate of the ending point
   * Lambda2: Longitude coordinate of the ending point
   * The variables that are calculated are:
   * Lambda12:     Angle difference between the starting and ending longitude coordinates
   * Alpha1:       Angle from north the initial point will start its travel at
   * Alpha2:       Angle from north the final point will be traveling at
   * DeltaTheta12: Angle between the two initial and final coordinates
   * ArcLength:    Distance along the earth between the two points
   * Alphao:       Angle off of the great circle line and north when extended back to the equator.
   * DeltaSigma01: Angular distance between the point at the equator and the initial point.
   * DeltaSigma02: Angular distance between the point at the equator and the final point
   * Lambda01:     Longitude difference between the initial point and the point at the equator
   * Lambdao:      Longitude at the point where the great circle intersects the equator
   * Sigma:        Arc distance between the first point and any point along the great circle.
   * Phi:          Latitude at the arbitrary point on the great circle
   * Lambda:       Longitude at the arbitrary point on the great circle
   * This function generates 100 points along the great circle and calculates each longitude and latitude
   * and then stores them in lists. Because these list will be used to plot the great circle path the
   * coordinate will be broken up into multiple lists if the path passes over edge of the map. The last thing
   * the function does before returning the outputs is plotting the great circle onto a map of the globe.
   * The outputs are:
   * The list of latitudes
   * The list of longitudes
   * The angle from north to start the great circle
   * The angular distance between the starting and ending point
   * @param CurrentLatitude
   * @param CurrentLongitude
   * @param TargetLatitude
   * @param TargetLongitude
   * @returns
   */
  private static calcCoordinates_(
    CurrentLatitude: number,
    CurrentLongitude: number,
    TargetLatitude: number,
    TargetLongitude: number,
  ): [number[], number[], number, number, number[], number] {
    const r = RADIUS_OF_EARTH * 1000; // (m)
    const Phi1 = (CurrentLatitude * Math.PI) / 180; // (Rad)
    const Lambda1 = (CurrentLongitude * Math.PI) / 180; // (Rad)
    const Phi2 = (TargetLatitude * Math.PI) / 180; // (Rad)
    const Lambda2 = (TargetLongitude * Math.PI) / 180; // (Rad)
    let Lambda12;

    if (Lambda2 - Lambda1 >= -180 && Lambda2 - Lambda1 <= 180) {
      Lambda12 = Lambda2 - Lambda1;
    } // (Rad)
    if (Lambda2 - Lambda1 > 180) {
      Lambda12 = Lambda2 - Lambda1 - 2 * Math.PI;
    } // (Rad)
    if (Lambda2 - Lambda1 < -180) {
      Lambda12 = Lambda2 - Lambda1 + 2 * Math.PI;
    } // (Rad)

    const Alpha1 = Math.atan2(Math.sin(Lambda12), Math.cos(Phi1) * Math.tan(Phi2) - Math.sin(Phi1) * Math.cos(Lambda12)); // (Rad)
    const DeltaTheta12 = Math.acos(Math.sin(Phi1) * Math.sin(Phi2) + Math.cos(Phi1) * Math.cos(Phi2) * Math.cos(Lambda12)); // (Rad)
    const ArcLength = DeltaTheta12 * r; // (m)
    const Alphao = Math.asin(Math.sin(Alpha1) * Math.cos(Phi1)); // (Rad)
    const DeltaSigma01 = Math.atan2(Math.tan(Phi1), Math.cos(Alpha1)); // (Rad)
    const DeltaSigma02 = DeltaSigma01 + DeltaTheta12; // (Rad)
    const Lambda01 = Math.atan2(Math.sin(Alphao) * Math.sin(DeltaSigma01), Math.cos(DeltaSigma01)); // (Rad)
    const Lambdao = Lambda1 - Lambda01; // (Rad)
    const EstLatList = [];
    const LatList1 = [];
    const LatList2 = [];
    const LatList3 = [];
    const EstLongList = [];
    const LongList1 = [];
    const LongList2 = [];
    const LongList3 = [];
    const EstDistanceList: number[] = [];
    let GoalDistance;

    for (let i = 0; i <= 2400; i++) {
      const Sigma = DeltaSigma01 + (i * (DeltaSigma02 - DeltaSigma01)) / 2000; // (Rad)
      const Phi = (Math.asin(Math.cos(Alphao) * Math.sin(Sigma)) * 180) / Math.PI; // (Degrees)
      const Lambda = ((Lambdao + Math.atan2(Math.sin(Alphao) * Math.sin(Sigma), Math.cos(Sigma))) * 180) / Math.PI; // (Degrees)

      if (i === 2000) {
        GoalDistance = (Sigma - DeltaSigma01) * r;
      }
      EstDistanceList.push(((Sigma - DeltaSigma01) * r) / 1000);
      if (Lambda >= -180 && Lambda <= 180) {
        LongList1.push(Lambda); // (Degrees)
        LatList1.push(Phi); // (Degrees)
      } else if (Lambda < -180) {
        LongList3.push(Lambda + 360); // (Degrees)
        LatList3.push(Phi); // (Degrees)
      } else if (Lambda > 180) {
        LongList2.push(Lambda - 360); // (Degrees)
        LatList2.push(Phi); // (Degrees)
      } else {
        // Do nothing
      }
    }

    for (const lat of LatList1) {
      EstLatList.push(lat);
    }
    for (const lat of LatList2) {
      EstLatList.push(lat);
    }
    for (const lat of LatList3) {
      EstLatList.push(lat);
    }
    for (const lon of LongList1) {
      EstLongList.push(lon);
    }
    for (const lon of LongList2) {
      EstLongList.push(lon);
    }
    for (const lon of LongList3) {
      EstLongList.push(lon);
    }

    return [EstLatList, EstLongList, (Alpha1 * 180) / Math.PI, ArcLength, EstDistanceList, GoalDistance];
  }

  /**
   * This function calculates the entire simularion of the missiles tragectory without
   * collecting any information along the way. It's purpose is for the angle cooefficeint
   * optimizer to have a quick way to run the simulation and retreive the final distance
   * the missile traveled along the surface of the earth. The functions inputs are:
   * FuelArea1:         Area of the fuel surface being burned for the first and second stages of the missile
   * FuelArea2:         Area of the fuel surface being burned for the third stage of the missile
   * FuelMass:          Mass left in the missile
   * FuelVolume:        Initial value of the total volume of fuel stored in the missile
   * RocketArea:        Cross sectional area of the missile
   * Altitude:          Initial condition for the altitude (0 meters)
   * RocketCasingMass1: Mass of the casing for the missiles during the first stage
   * RocketCasingMass2: Mass of the casing for the missiles during the second stage
   * RocketCasingMass3: Mass of the casing for the missiles during the third stage
   * NozzleAltitude1:   The altitude used to calculate the nozzle for the first stage (0 meters)
   * drdt:              Initial condition for the velocity in the vertical direction (0 m/s)
   * dthetadt:          Initial condition for the angular velocity around the earth (0 m/s)
   * Distance:          Initial condition for the distance traveled by the missile (0 meters)
   * ArcDistance:       Initial condition for the distance traveled along the earths surface (0 meters)
   * MassIn:            Initial condition for the mass entering the missile (always 0)
   * AngleCoefficient:  Coefficient used to govern the angle of the thrust to dirrect the missile towards its target
   * The output for this function is:
   * ArcDistance:       The total distance traveled by the missile along the surface of the earth
   * var RocketMass, Tatm, Patm, AirDensity, c, M, cD, Thrust, DragForce, WeightForce, dr2dt, ArcVelocity, theta2dt;
   * @param FuelArea1
   * @param FuelArea2
   * @param FuelMass
   * @param FuelVolume
   * @param RocketArea
   * @param Altitude
   * @param RocketCasingMass1
   * @param RocketCasingMass2
   * @param RocketCasingMass3
   * @param NozzleAltitude1
   * @param drdt
   * @param dthetadt
   * @param Distance
   * @param ArcDistance
   * @param MassIn
   * @param AngleCoefficient
   * @returns
   */
  private static testTrajectory_(
    FuelArea1: any,
    FuelArea2: any,
    FuelMass: number,
    FuelVolume: number,
    RocketArea: any,
    Altitude: number,
    RocketCasingMass1: any,
    RocketCasingMass2: any,
    RocketCasingMass3: any,
    NozzleAltitude1: any,
    drdt: any,
    dthetadt: any,
    Distance: number,
    ArcDistance: any,
    MassIn: any,
    AngleCoefficient: number,
    FuelDensity,
    BurnRate,
    WarheadMass,
  ) {
    let NozzleAltitude2, NozzleAltitude3;
    let iterationFunOutput = [];
    const MaxAltitude = [];

    while (FuelMass / FuelDensity / FuelVolume > 0.4 && Altitude >= 0) {
      iterationFunOutput = Missile.iterationFun_(
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
        AngleCoefficient,
        FuelDensity,
        BurnRate,
        WarheadMass,
      );
      FuelMass = iterationFunOutput[0];
      drdt = iterationFunOutput[12];
      Altitude = iterationFunOutput[13];
      MaxAltitude.push(Altitude);
      Distance = iterationFunOutput[14];
      ArcDistance = iterationFunOutput[16];
      dthetadt = iterationFunOutput[18];
      NozzleAltitude2 = Altitude;
    }
    while (FuelMass / FuelDensity / FuelVolume > 0.19 && Altitude >= 0) {
      iterationFunOutput = Missile.iterationFun_(
        FuelArea1,
        FuelMass,
        RocketArea,
        Altitude,
        RocketCasingMass2,
        NozzleAltitude2,
        drdt,
        dthetadt,
        Distance,
        ArcDistance,
        MassIn,
        AngleCoefficient,
        FuelDensity,
        BurnRate,
        WarheadMass,
      );
      FuelMass = iterationFunOutput[0];
      drdt = iterationFunOutput[12];
      Altitude = iterationFunOutput[13];
      MaxAltitude.push(Altitude);
      Distance = iterationFunOutput[14];
      ArcDistance = iterationFunOutput[16];
      dthetadt = iterationFunOutput[18];
      NozzleAltitude3 = Altitude;
    }
    while (FuelMass / FuelDensity / FuelVolume > 0 && Altitude >= 0) {
      iterationFunOutput = Missile.iterationFun_(
        FuelArea2,
        FuelMass,
        RocketArea,
        Altitude,
        RocketCasingMass3,
        NozzleAltitude3,
        drdt,
        dthetadt,
        Distance,
        ArcDistance,
        MassIn,
        AngleCoefficient,
        FuelDensity,
        BurnRate,
        WarheadMass,
      );
      FuelMass = iterationFunOutput[0];
      drdt = iterationFunOutput[12];
      Altitude = iterationFunOutput[13];
      MaxAltitude.push(Altitude);
      Distance = iterationFunOutput[14];
      ArcDistance = iterationFunOutput[16];
      dthetadt = iterationFunOutput[18];
    }
    while (Altitude > 0) {
      FuelMass = 0;
      iterationFunOutput = Missile.iterationFun_(
        FuelArea2,
        FuelMass,
        RocketArea,
        Altitude,
        RocketCasingMass3,
        NozzleAltitude3,
        drdt,
        dthetadt,
        Distance,
        ArcDistance,
        MassIn,
        AngleCoefficient,
        FuelDensity,
        BurnRate,
        WarheadMass,
      );
      FuelMass = iterationFunOutput[0];
      drdt = iterationFunOutput[12];
      Altitude = iterationFunOutput[13];
      MaxAltitude.push(Altitude);
      Distance = iterationFunOutput[14];
      ArcDistance = iterationFunOutput[16];
      dthetadt = iterationFunOutput[18];
    }

    let MaxAltitudeMax = 0;

    for (let i = 0; i < MaxAltitude.length; i++) {
      if (MaxAltitude[i] > MaxAltitudeMax) {
        MaxAltitudeMax = MaxAltitude[i];
      }
    }

    return Distance;
  }

  /**
   * This function is designed to calculate the needed angle coefficient to for the trust
   * to govern the missiles path into its designated target. Because this missile has the
   * capability of entering into orbit, more complicated calculations needed to be used to
   * ensure that the program would be successful in finding the correct drag coefficient
   * in all instances. How the function works is by running the missile simulation multiple
   * times with different angle coefficients to find with one lands the missile closest to
   * its target. Once it has a ball park region for the angle coefficient it runs a modified
   * bisection method to further bring the angle coefficient closer to the needed value to
   * land the missile on the target. The inputs for the program are:
   * FuelArea1:         Area of the fuel surface being burned for the first and second stages of the missile
   * FuelArea2:         Area of the fuel surface being burned for the third stage of the missile
   * FuelMass:          Mass left in the missile
   * FuelVolume:        Initial value of the total volume of fuel stored in the missile
   * RocketArea:        Cross sectional area of the missile
   * Altitude:          Initial condition for the altitude (0 meters)
   * RocketCasingMass1: Mass of the casing for the missiles during the first stage
   * RocketCasingMass2: Mass of the casing for the missiles during the second stage
   * RocketCasingMass3: Mass of the casing for the missiles during the third stage
   * NozzleAltitude1:   The altitude used to calculate the nozzle for the first stage (0 meters)
   * drdt:              Initial condition for the velocity in the vertical direction (0 m/s)
   * dthetadt:          Initial condition for the angular velocity around the earth (0 m/s)
   * Distance:          Initial condition for the distance traveled by the missile (0 meters)
   * ArcDistance:       Initial condition for the distance traveled along the earths surface (0 meters)
   * MassIn:            Initial condition for the mass entering the missile (always 0)
   * ArcLength:         Distance from the starting point to the target along the surface of the earth
   * The functions output it:
   * AngleCoefficient:  The angle coefficient which directs the missile directly to it's target
   * @param FuelArea1
   * @param FuelArea2
   * @param FuelMass
   * @param FuelVolume
   * @param RocketArea
   * @param Altitude
   * @param RocketCasingMass1
   * @param RocketCasingMass2
   * @param RocketCasingMass3
   * @param NozzleAltitude1
   * @param drdt
   * @param dthetadt
   * @param Distance
   * @param ArcDistance
   * @param MassIn
   * @param _ArcLength
   * @param GoalDistance
   * @returns
   */
  private static calcBisection(
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
    GoalDistance: number,
    FuelDensity,
    BurnRate,
    WarheadMass,
  ) {
    const DistanceSteps = [];
    let AngleCoefficient = 0;
    let DistanceClosePossition = 0;
    let AC1 = 0;
    let AC2 = 0;
    const Steps = 500;

    for (let i = 0; i < Steps; i++) {
      AngleCoefficient = (i * 1) / Steps / 2 + 0.5;
      DistanceSteps.push(
        Missile.testTrajectory_(
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
          AngleCoefficient,
          FuelDensity,
          BurnRate,
          WarheadMass,
        ),
      );
    }
    let DistanceClosest = DistanceSteps[0];
    let oldDistanceClosest = Math.abs(DistanceSteps[0] - GoalDistance);

    for (let i = 0; i < DistanceSteps.length; i++) {
      const newDistanceClosest = Math.abs(DistanceSteps[i] - GoalDistance);

      if (newDistanceClosest < oldDistanceClosest) {
        oldDistanceClosest = newDistanceClosest;
        DistanceClosest = DistanceSteps[i];
      }
    }
    for (let i = 0; i < Steps; i++) {
      if (DistanceSteps[i] === DistanceClosest) {
        DistanceClosePossition = i;
        break;
      }
    }
    AngleCoefficient = (DistanceClosePossition * 1) / Steps / 2 + 0.5;

    // bisection method
    AC1 = (DistanceClosePossition - 2) / Steps / 2 + 0.5;
    AC2 = (DistanceClosePossition + 2) / Steps / 2 + 0.5;
    let ACNew: number = (AC1 + AC2) / 2;
    const qRunACNew = Missile.testTrajectory_(
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
      ACNew,
      FuelDensity,
      BurnRate,
      WarheadMass,
    );
    let error = Math.abs((GoalDistance - qRunACNew) / GoalDistance) * 100;

    while (error > 0.01 && Math.abs(AC2 - AC1) >= 0.0001) {
      ACNew = (AC1 + AC2) / 2;
      error =
        Math.abs(
          (GoalDistance -
            Missile.testTrajectory_(
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
              ACNew,
              FuelDensity,
              BurnRate,
              WarheadMass,
            )) /
          GoalDistance,
        ) * 100;
      if (
        Missile.testTrajectory_(
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
          ACNew,
          FuelDensity,
          BurnRate,
          WarheadMass,
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

  /**
   * This function calculates the atmospheric pressure. The only iMathut is the
   * Altitude. The constiables in the function are:
   *
   * Po:   Atmospheric pressure at sea level
   * mol:  Amount of air in one gram
   * Tsea: Temperature at sea level
   * R:    Gas constant for air
   * g:    Gravitational constant
   *
   * The function will return the calculated atmospheric pressure
   */
  private static calcPressure_(Altitude: number) {
    const Po = 101325; // (Pa)
    const mol = 0.02897; // (mol)
    const Tsea = 288; // (K)
    const _R = 8.31451; // (J / K mol)
    const g = 9.81; // (m/s^2)


    return Po * Math.exp((-mol * g * Altitude) / (_R * Tsea)); // (Pa)
  }

  /**
   * This function calculates the atmospheric temperature at any given altitude.
   * The function has one iMathut for altitude. Because atmospheric temperature can not
   * be represented as one equation, this function is made up of a series of curve fits
   * which each make up a section of the atmosphere. After an elevation of 120 km
   * the atmosphere becomes so sparse that it become negligible so the function keeps a
   * constant temperature after that point.
   * @param alt The altitude of the rocket
   * @returns The atmospheric temperature at the given altitude
   */
  private static calcTemperature_(inAlt: Meters): Kilometers {
    const alt = <Kilometers>(inAlt / 1000);

    if (alt < 12.5) {
      return <Kilometers>(276.642857143 - 5.02285714286 * alt);
    }
    if (alt < 20) {
      return <Kilometers>213.0;
    }
    if (alt < 47.5) {
      return <Kilometers>(171.224358974 + 2.05384615385 * alt);
    }
    if (alt < 52.5) {
      return <Kilometers>270.0;
    }
    if (alt < 80) {
      return <Kilometers>(435.344405594 - 3.13916083916 * alt);
    }
    if (alt < 90) {
      return <Kilometers>183.0;
    }
    if (alt < 110) {
      return <Kilometers>(-221.111111111 + 4.47 * alt);
    }
    if (alt < 120) {
      return <Kilometers>(-894.0 + 10.6 * alt);
    }
    if (alt >= 120) {
      return <Kilometers>(-894.0 + 10.6 * 120);
    }

    // Catch All
    return <Kilometers>(-894.0 + 10.6 * 120);
  }

  /**
   * This function calculates the drag coefficient of the rocket. This function is based
   * off of a plot that relates the drag coefficient with the mach number of the rocket.
   * Because the plot can not be represented with one equation it is broken up into multiple
   * curve fits. The only iMathut for the function is the mach number the rocket is traveling.
   * @param M The mach number of the rocket
   * @returns The drag coefficient of the rocket
   */
  private static calcDragCoefficient_(M: number) {
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

    // Catch All
    return 0.25;
  }

  /**
   * This function calculates the thrust force of the rocket by maximizing the efficiency
   * through designing the correct shaped nozzle for the given rocket scenario. For this
   * function is gives the option for stages of the rocket to be introduced. Theoretically
   * this function can have an unlimited amount of stages but for this particular use there
   * will only be 3 stages. The iMathuts for the function are:
   *
   * MassOut:            Mass leaving the nozzle
   * Altitude:           Rockets current elevation
   * FuelArea:           Burn area in the combustion chamber
   * NozzleAltitude:     Altitude immediately after a rocket stage detaches
   *
   * The constants for the function were based off of data found for the Trident II Intercontinental
   * ballistic missile. These constants are:
   * k:  Specific heat ratio for the fuel
   * Ru:  Universal gas constant
   * Tc: Chamber temperature
   * Pc: Chamber pressure
   * Mw: Molecular weight of the fuel
   * q:  Mass flow out through the nozzle
   * Pa: Atmospheric pressure used for optimizing nozzle diameters
   * The iteratively calculated variables for this function are:
   * Pe: Current atmospheric pressure
   * Pt: Throat pressure
   * Tt: Throat temperature
   * At: Throat area
   * Nm: Mach number of the exiting gas
   * Ae: Exit area of the nozzle
   * Ve: Velocity of the fuel exiting the nozzle
   * After making all of these calculations the function will return the force generated by the trust
   * of the fuel in units of Newtons. This function will also make sure that the exit nozzle area will
   * not exceed that of the cross sectional area for the inside of rocket casing.
   * @param MassOut
   * @param Altitude
   * @param FuelArea
   * @param NozzleAltitude
   * @returns
   */
  private static calcThrustForce_(MassOut: number, Altitude: any, FuelArea: number, NozzleAltitude: any) {
    const k = 1.2; // Heat Ratio
    const Ru = 8314.4621; // Universal Gas Constant (m^3 Pa / K mol)
    const Tc = 3700; // (K)
    const Pc = 25 * 10 ** 6; // Chamber Pressure (Pa)
    const Mw = 22; // Molecular Weight
    const q = MassOut; // Mass Flow Rate (kg/s)
    const Pa = this.calcPressure_(NozzleAltitude); // Ambient pressure used to calculate nozzle (Pa)
    const Pe = this.calcPressure_(Altitude); // Actual Atmospheric Pressure (Pa)
    const Pt = (Pc * (1 + (k - 1) / 2)) ** (-k / (k - 1)); // Throat Pressure (Pa)
    const Tt = Tc / (1 + (k - 1) / 2); // Throat Temperature (k)
    const At = (q / Pt) * Math.sqrt((Ru * Tt) / (Mw * k)); // Throat Area (m^2)
    const Nm = Math.sqrt((2 / (k - 1)) * (Pc / Pa) ** ((k - 1) / k - 1)); // Mach Number
    let Ae = (At / Nm) * (1 + (((k - 1) / 2) * Nm ** 2) / ((k + 1) / 2)) ** ((k + 1) / (2 * (k - 1))); // Exit Nozzle Area (m^2)

    if (Ae > FuelArea) {
      Ae = FuelArea;
    }
    const VeSub = ((2 * k) / (k - 1)) * ((Ru * Tc) / Mw) * (1 - Pe / Pc) ** ((k - 1) / k);
    const Ve = Math.sqrt(VeSub); // Partical Exit Velocity (m/s)


    return q * Ve + (Pe - Pa) * Ae; // Thrust (N)
  }

  /**
   * This function is the heart of the program. It calculates the simulated flight
   * of the missile. This is only one step of the flight, to get the whole flight
   * simulated it must be iterated in a loop. The iMathuts for the function are:
   * FuelArea:         Area of the fuel surface being burned
   * FuelMass:         Current mass left in the rocket
   * RocketArea:       Cross sectional area of the missile
   * Altitude:         Current altitude of the missile
   * RocketCasingMass: Mass of the casing for the missile
   * NozzleAltitude:   Altitude when the casing stage detaches
   * drdt:             Current velocity in the vertical direction
   * dthetadt:         Current angular velocity around the earth
   * Distance:         Current distance traveled by the missile
   * ArcDistance:      Current distance traveled along the earths surface
   * MassIn:           Current fuel mass entering the rocket (always 0)
   * AngleCoefficient: The coefficient used to govern the missiles trajectory
   * The outputs for this function are:
   * FuelMass:    Mass left in the missile
   * RocketMass:  Total Mass of the missile
   * Tatm:        Atmospheric temperature
   * Patm:        Atmospheric pressure
   * AirDensity:  Density of the atmosphere
   * c:           Current speed of sound of the atmosphere
   * M:           Missiles mach number
   * cD:          Missiles drag Coefficient
   * Thrust:      Thrust produced by the missile
   * DragForce:   Drag force acting upon the missile
   * WeightForce: Gravitational attraction exerted by the earth
   * dr2dt:       Acceleration in the vertical direction
   * drdt:        New velocity in the vertical direction
   * Altitude:    New altitude of the missile
   * Distance:    New distance traveled by the missile
   * ArcVelocity: Velocity of the missile across the surface of the earth
   * ArcDistance: New distance traveled along the earths surface
   * dtheta2dt:   Angular acceleration around the earth
   * dthetadt:    New angular velocity around the earth
   * Some of these values do not need to be returned for calculations in later
   * iterations but are returned anyways to present the data later on in plots
   * in order to understand the flight of the missile and its governing principles
   *
   * This governs the thrust angle as a function of altitude
   */
  private static iterationFun_(
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
    AngleCoefficient: number,
    FuelDensity: number,
    BurnRate: number,
    WarheadMass: number,
  ) {
    let ThrustAngle;

    if (Altitude < 1200000) {
      ThrustAngle =
        (90 -
          AngleCoefficient *
          (1.5336118956 +
            0.00443173537387 * Altitude -
            9.30373890848 * 10 ** -8 * Altitude ** 2 +
            8.37838197732 * 10 ** -13 * Altitude ** 3 -
            2.71228576626 * 10 ** -18 * Altitude ** 4)) *
        0.0174533;
      // (Degrees)
    } else {
      ThrustAngle = 30;
    }

    // This calculates the angle the drag force acts upon the missile
    const Radius = RADIUS_OF_EARTH + Altitude; // (m)
    const DragAngle = Math.atan2(drdt, dthetadt); // (Degrees)

    let MassOut = 0; // (kg)

    // This calculates fuel mass vs time
    if (FuelMass > 0) {
      MassOut = FuelDensity * FuelArea * BurnRate; // (kg)
      const dmdt = MassIn - MassOut; // (kg/s)

      FuelMass += dmdt * Missile.h; // (kg)
    } else {
      FuelMass = 0;
    }

    const RocketMass = FuelMass + RocketCasingMass + WarheadMass; // (Kg)
    const Tatm = Missile.calcTemperature_(<Meters>Altitude); // (K)
    const Patm = Missile.calcPressure_(Altitude); // (pa)
    const AirDensity = Patm / (Missile.R * Tatm); // (kg/m^3)

    // This calculates the drag coeficiant
    const c = (1.4 * Missile.R * Tatm) ** (1 / 2); // (m/s)
    const M = Math.sqrt(drdt ** 2 + dthetadt ** 2) / c; // (Unitless)
    const cD = Missile.calcDragCoefficient_(Math.abs(M)); // (Unitless)

    // This calculates all the forces acting upon the missile
    let Thrust = 0;

    if (FuelMass > 0) {
      Thrust = Missile.calcThrustForce_(MassOut, Altitude, FuelArea, NozzleAltitude);
    } // (N)

    const DragForce = (1 / 2) * AirDensity * (drdt ** 2 + dthetadt ** 2) * RocketArea * cD; // (N)
    const WeightForce = (Missile.G * Missile.EarthMass * RocketMass) / Radius ** 2; // (N)

    // Vertical Acceleration and velocity
    const dr2dt = (Thrust * Math.sin(ThrustAngle) - DragForce * Math.sin(DragAngle) - WeightForce) / RocketMass + Radius * (dthetadt / Radius) ** 2; // (m/s^2)

    drdt += dr2dt * Missile.h; // (m/s)

    Altitude += drdt * Missile.h; // (m)

    Distance += dthetadt * Missile.h; // (m)

    // Angular distance the missile traveled vs time
    const ArcVelocity = (dthetadt * RADIUS_OF_EARTH) / Radius; // (m/s)

    ArcDistance += ArcVelocity * Missile.h; // (m)

    // Angular acceleration and velocity
    const dtheta2dt = (Thrust * Math.cos(ThrustAngle) - DragForce * Math.cos(DragAngle)) / RocketMass - 2 * drdt * (dthetadt / Radius); // (m/s^2)

    dthetadt += dtheta2dt * Missile.h; // (m/s)

    return [FuelMass, RocketMass, Tatm, Patm, AirDensity, c, M, cD, Thrust, DragForce, WeightForce, dr2dt, drdt, Altitude, Distance, ArcVelocity, ArcDistance, dtheta2dt, dthetadt];
  }

  static h = 1;

  // This function stalls Jest for multiple minutes.
  /* istanbul ignore next */
  /**
   * This is the main function for this program. It calculates and designs the flight path of an intercontinental
   * ballistic missile (ICBM). This function calls upon many sub-functions to help it iteratively calculate many of the
   * changing variables as the rocket makes its path around the world. Changing variables that had to be taken into
   * account include:
   * Air density vs altitude
   * Air pressure vs altitude
   * Air temperature vs altitude
   * Drag coefficient vs mach number
   * Speed of sound vs altitude
   * Drag force vs time
   * Gravitational attraction vs altitude
   * Fuel mass vs time
   * Thrust vs time
   * Vertical velocity vs time
   * Angular velocity vs time
   * Vertical acceleration vs time
   * Angular acceleration vs time
   * Angular distance rocket travels vs time
   * Total distance rocket travels vs time
   * Many of these variables are dependent on each other. The inputs of this function are:
   * Currentlat:  Latitude of the starting position
   * Currentlon: Longitude of the starting position
   * Targetlat:   Latitude of the ending position
   * Targetlon:  Longitude of the ending position
   * NumberWarheads:   Number of warhead loaded onto the missile
   * The coordinates are to be inputed as degrees and NumberWarheads must be an intagure. The first thing the
   * program does is calculate everything regarding the path the rocket will take to minimize
   * distance needed to travel. It uses the CoordinateCalculator function to accomplish this.
   * It then calculates everything regarding the casing and fuel of the rocket. After calculating all
   * the necessary constants it starts its iterative calculation of the rockets actual path and collects
   * information into lists as it moves through its times steps. It changes its iterative approach once
   * the rocket runs out of fuel by dropping out everything used to calculate the trust. Once the rocket
   * reaches an altitude of zero meters it ends the iterations. Using all the information gathers it
   * presents them in the form of print statements and also plots.
   * @param CurrentLatitude
   * @param CurrentLongitude
   * @param TargetLatitude
   * @param TargetLongitude
   * @param NumberWarheads
   * @param MissileObjectNum
   * @param CurrentTime
   * @param MissileDesc
   * @param Length
   * @param Diameter
   * @param NewBurnRate
   * @param MaxMissileRange
   * @param country
   * @param minAltitude
   * @returns
   */
  static create({
    CurrentLatitude,
    CurrentLongitude,
    TargetLatitude,
    TargetLongitude,
    NumberWarheads,
    MissileObjectNum,
    CurrentTime,
    MissileDesc,
    Length,
    Diameter,
    NewBurnRate,
    MaxMissileRange,
    country,
    minAltitude,
  }: {
    CurrentLatitude: number;
    CurrentLongitude: number;
    TargetLatitude: number;
    TargetLongitude: number;
    NumberWarheads: number;
    MissileObjectNum: any;
    CurrentTime: any;
    MissileDesc: any;
    Length: number;
    Diameter: number;
    NewBurnRate: number;
    MaxMissileRange: number;
    country: any;
    minAltitude: number;
  }) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const missileObj: MissileObject = catalogManagerInstance.getMissile(MissileObjectNum);

    // Dimensions of the rocket
    Length = Length || 17; // (m)
    Diameter = Diameter || 3.1; // (m)

    // Validate inputs
    if (CurrentLatitude > 90 || CurrentLatitude < -90) {
      return null;
    }
    if (CurrentLongitude > 180 || CurrentLongitude < -180) {
      return null;
    }
    if (TargetLatitude > 90 || TargetLatitude < -90) {
      missileManager.lastMissileErrorType = ToastMsgType.critical;
      missileManager.lastMissileError = 'Error: Target Latitude must be<br>between 90 and -90 degrees';

      return null;
    }
    if (TargetLongitude > 180 || TargetLongitude < -180) {
      missileManager.lastMissileErrorType = ToastMsgType.critical;
      missileManager.lastMissileError = 'Error: Target Longitude must be<br>between 90 and -90 degrees';

      return null;
    }
    if (NumberWarheads > 12) {
      return null;
    }
    if (NumberWarheads % 1 > 0) {
      return null;
    }

    if (typeof minAltitude === 'undefined') {
      minAltitude = 0;
    }

    // This function will calculate the path the rocket will take in terms of coordinates
    const LatList = [];
    const LongList = [];

    const [EstLatList, EstLongList, , ArcLength, EstDistanceList, GoalDistance] = Missile.calcCoordinates_(CurrentLatitude, CurrentLongitude, TargetLatitude, TargetLongitude);

    if (ArcLength < 320000) {
      missileManager.lastMissileErrorType = ToastMsgType.critical;
      missileManager.lastMissileError = 'Error: This missile has a minimum distance of 320 km.';

      return null;
    }

    if (ArcLength > MaxMissileRange * 1000) {
      missileManager.lastMissileErrorType = ToastMsgType.critical;
      missileManager.lastMissileError = `Error: This missile has a maximum distance of ${MaxMissileRange} km.`;

      return null;
    }

    // Calculate Notional Altitude
    const minAltitudeTrue = minAltitude * (Math.min(3, MaxMissileRange / (ArcLength / 1000)) / 2);

    // Calculations for the warheads
    const WarheadMass = 500 * NumberWarheads; // (Kg)

    // Calculations for the casing
    const Thickness = 0.050389573 * Diameter; // (m)
    const RocketArea = 0.25 * Math.PI * Diameter ** 2; // (m^2)

    const RocketCasingDensity = 1628.75; // (kg/m^3)http://scholar.lib.vt.edu/theses/available/etd-101198-161441/unrestricted/appendix.pdf
    const RocketCasingVolume = 0.25 * Math.PI * Length * (Diameter ** 2 - (Diameter - Thickness) ** 2); // (m^3)
    const RocketCasingMass1 = RocketCasingDensity * RocketCasingVolume; // (kg)
    const RocketCasingMass2 = RocketCasingDensity * 0.25 * Math.PI * (Length * 0.4937) * (Diameter ** 2 - (Diameter - Thickness) ** 2); // (kg)
    const RocketCasingMass3 = RocketCasingDensity * 0.25 * Math.PI * (Length * 0.157) * ((Diameter * 0.75) ** 2 - (Diameter * 0.75 - (Thickness / 2) ** 2)); // (kg)

    // Calculations for the fuel
    const BurnRate = NewBurnRate || 0.042; // (m/s)
    const FuelDensity = 1750; // (kg/m^2)
    const FuelArea1 = 0.25 * Math.PI * (Diameter - Thickness) ** 2; // (m^2)
    const FuelArea2 = 0.25 * Math.PI * (Diameter * 0.75 - Thickness) ** 2; // (m^2)
    const FuelVolume = FuelArea1 * (Length * 0.651) + FuelArea2 * (Length * 0.178); // (m^3)
    // eslint-disable-next-line max-len
    // http://www.lr.tudelft.nl/en/organisation/departments/space-engineering/space-systems-engineering/expertise-areas/space-propulsion/design-of-elements/rocket-propellants/solids/
    let FuelMass = FuelDensity * FuelVolume;

    // Here are the initial conditions
    let dthetadt = 0.001; // (m/s)
    let drdt = 0.001; // (m/s)
    let Altitude = 0; // (m)
    const NozzleAltitude1 = 0; // (m)
    let Distance = 0; // (m)
    let ArcDistance = 0; // (m)
    const MassIn = 0; // (kg/s)

    // Here are the time steps and counters
    Missile.h = 1;

    // Here are the definitions for all the lists
    const AltitudeList = [];

    const hList = [];

    let NozzleAltitude2, NozzleAltitude3;

    const AngleCoefficient = Missile.calcBisection(
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
      GoalDistance,
      FuelDensity,
      BurnRate,
      WarheadMass,
    );

    while (FuelMass / FuelDensity / FuelVolume > 0.4 && Altitude >= 0) {
      const iterationFunOutput = Missile.iterationFun_(
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
        AngleCoefficient,
        FuelDensity,
        BurnRate,
        WarheadMass,
      );

      FuelMass = iterationFunOutput[0];
      drdt = iterationFunOutput[12];
      Altitude = iterationFunOutput[13];
      Distance = iterationFunOutput[14];

      ArcDistance = iterationFunOutput[16];
      dthetadt = iterationFunOutput[18];
      NozzleAltitude2 = Altitude;

      AltitudeList.push(Math.round((Altitude / 1000) * 100) / 100);

      for (let i = 0; i < EstDistanceList.length; i++) {
        if (EstDistanceList[i] <= Distance / 1000 && !(EstDistanceList[i + 1] <= Distance / 1000)) {
          LatList.push(Math.round(EstLatList[i] * 100) / 100);
          LongList.push(Math.round(EstLongList[i] * 100) / 100);
          break;
        }
      }

      let hListSum = 0;

      for (let i = 0; i < hList.length; i++) {
        hListSum += hList[i];
      }
      hList.push(Missile.h + hListSum);
    }

    while (FuelMass / FuelDensity / FuelVolume > 0.19 && Altitude >= 0) {
      const iterationFunOutput = Missile.iterationFun_(
        FuelArea1,
        FuelMass,
        RocketArea,
        Altitude,
        RocketCasingMass2,
        NozzleAltitude2,
        drdt,
        dthetadt,
        Distance,
        ArcDistance,
        MassIn,
        AngleCoefficient,
        FuelDensity,
        BurnRate,
        WarheadMass,
      );

      FuelMass = iterationFunOutput[0];
      drdt = iterationFunOutput[12];
      Altitude = iterationFunOutput[13];
      Distance = iterationFunOutput[14];

      ArcDistance = iterationFunOutput[16];
      dthetadt = iterationFunOutput[18];
      NozzleAltitude3 = Altitude;

      AltitudeList.push(Math.round((Altitude / 1000) * 100) / 100);

      for (let i = 0; i < EstDistanceList.length; i++) {
        if (EstDistanceList[i] <= Distance / 1000 && !(EstDistanceList[i + 1] <= Distance / 1000)) {
          LatList.push(Math.round(EstLatList[i] * 100) / 100);
          LongList.push(Math.round(EstLongList[i] * 100) / 100);
          break;
        }
      }

      let hListSum = 0;

      for (const h of hList) {
        hListSum += h;
      }
      hList.push(Missile.h + hListSum);
    }

    while (FuelMass / FuelDensity / FuelVolume > 0 && Altitude >= 0) {
      const iterationFunOutput = Missile.iterationFun_(
        FuelArea2,
        FuelMass,
        RocketArea,
        Altitude,
        RocketCasingMass3,
        NozzleAltitude3,
        drdt,
        dthetadt,
        Distance,
        ArcDistance,
        MassIn,
        AngleCoefficient,
        FuelDensity,
        BurnRate,
        WarheadMass,
      );

      FuelMass = iterationFunOutput[0];
      drdt = iterationFunOutput[12];
      Altitude = iterationFunOutput[13];
      Distance = iterationFunOutput[14];
      ArcDistance = iterationFunOutput[16];
      dthetadt = iterationFunOutput[18];

      AltitudeList.push(Math.round((Altitude / 1000) * 100) / 100);

      for (let i = 0; i < EstDistanceList.length; i++) {
        if (EstDistanceList[i] <= Distance / 1000 && EstDistanceList[i + 1] > Distance / 1000) {
          LatList.push(Math.round(EstLatList[i] * 100) / 100);
          LongList.push(Math.round(EstLongList[i] * 100) / 100);
          break;
        }
      }

      let hListSum = 0;

      for (const h of hList) {
        hListSum += h;
      }
      hList.push(Missile.h + hListSum);
    }

    while (Altitude > 0) {
      FuelMass = 0;
      const iterationFunOutput = Missile.iterationFun_(
        FuelArea2,
        FuelMass,
        RocketArea,
        Altitude,
        RocketCasingMass3,
        NozzleAltitude3,
        drdt,
        dthetadt,
        Distance,
        ArcDistance,
        MassIn,
        AngleCoefficient,
        FuelDensity,
        BurnRate,
        WarheadMass,
      );

      FuelMass = iterationFunOutput[0];
      drdt = iterationFunOutput[12];
      Altitude = iterationFunOutput[13];
      Distance = iterationFunOutput[14];
      ArcDistance = iterationFunOutput[16];
      dthetadt = iterationFunOutput[18];

      AltitudeList.push(Math.round((Altitude / 1000) * 100) / 100);

      for (let i = 0; i < EstDistanceList.length; i++) {
        if (EstDistanceList[i] <= Distance / 1000 && !(EstDistanceList[i + 1] <= Distance / 1000)) {
          LatList.push(Math.round(EstLatList[i] * 100) / 100);
          LongList.push(Math.round(EstLongList[i] * 100) / 100);
          break;
        }
      }
    }

    const MaxAltitude = AltitudeList.reduce((a, b) => Math.max(a, b));

    if (MaxAltitude < minAltitudeTrue) {
      // Try again with 25% increase to burn rate
      const burnMultiplier = Math.max(Math.min(3, minAltitudeTrue / MaxAltitude), 1.25);
      // setTimeout(function () {

      return {
        isRetry: true,
        CurrentLatitude,
        CurrentLongitude,
        TargetLatitude,
        TargetLongitude,
        NumberWarheads,
        MissileObjectNum,
        CurrentTime,
        MissileDesc,
        Length,
        Diameter,
        NewBurnRate: NewBurnRate * burnMultiplier,
        MaxMissileRange,
        country,
        minAltitude,
      };
      // }, 10);
    }

    if (minAltitudeTrue === (minAltitude * 3) / 2) {
      missileManager.lastMissileErrorType = ToastMsgType.critical;
      missileManager.lastMissileError = 'Error: This distance is too close for the selected missile.';

      return null;
    }

    missileObj.altList = AltitudeList;
    missileObj.latList = LatList;
    missileObj.lonList = LongList;
    missileObj.active = true;
    missileObj.type = SpaceObjectType.UNKNOWN;
    missileObj.id = MissileObjectNum;
    missileObj.name = `RV_${missileObj.id}`;
    // maxAlt is used for zoom controls
    missileObj.maxAlt = MaxAltitude;
    missileObj.startTime = CurrentTime;
    if (country) {
      missileObj.country = country;
    }

    if (MissileDesc) {
      missileObj.desc = MissileDesc;
    }

    return missileObj; // Successful Launch
  }
}
