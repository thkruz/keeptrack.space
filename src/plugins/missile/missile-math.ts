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
   * @param currentLatitude
   * @param currentLongitude
   * @param targetLatitude
   * @param targetLongitude
   * @returns
   */
  private static calcCoordinates(
    currentLatitude: number,
    currentLongitude: number,
    targetLatitude: number,
    targetLongitude: number,
  ): [number[], number[], number, number, number[], number] {
    const r = RADIUS_OF_EARTH * 1000; // (m)
    const Phi1 = (currentLatitude * Math.PI) / 180; // (Rad)
    const Lambda1 = (currentLongitude * Math.PI) / 180; // (Rad)
    const Phi2 = (targetLatitude * Math.PI) / 180; // (Rad)
    const Lambda2 = (targetLongitude * Math.PI) / 180; // (Rad)
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
    const estDistanceList: number[] = [];
    let GoalDistance;

    for (let i = 0; i <= 2400; i++) {
      const Sigma = DeltaSigma01 + (i * (DeltaSigma02 - DeltaSigma01)) / 2000; // (Rad)
      const Phi = (Math.asin(Math.cos(Alphao) * Math.sin(Sigma)) * 180) / Math.PI; // (Degrees)
      const Lambda = ((Lambdao + Math.atan2(Math.sin(Alphao) * Math.sin(Sigma), Math.cos(Sigma))) * 180) / Math.PI; // (Degrees)

      if (i === 2000) {
        GoalDistance = (Sigma - DeltaSigma01) * r;
      }
      estDistanceList.push(((Sigma - DeltaSigma01) * r) / 1000);
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

    return [EstLatList, EstLongList, (Alpha1 * 180) / Math.PI, ArcLength, estDistanceList, GoalDistance];
  }

  /**
   * This function calculates the entire simularion of the missiles tragectory without
   * collecting any information along the way. It's purpose is for the angle cooefficeint
   * optimizer to have a quick way to run the simulation and retreive the final distance
   * the missile traveled along the surface of the earth. The functions inputs are:
   * fuelArea1:         Area of the fuel surface being burned for the first and second stages of the missile
   * fuelArea2:         Area of the fuel surface being burned for the third stage of the missile
   * fuelMass:          Mass left in the missile
   * fuelVolume:        Initial value of the total volume of fuel stored in the missile
   * rocketArea:        Cross sectional area of the missile
   * altitude:          Initial condition for the altitude (0 meters)
   * rocketCasingMass1: Mass of the casing for the missiles during the first stage
   * rocketCasingMass2: Mass of the casing for the missiles during the second stage
   * rocketCasingMass3: Mass of the casing for the missiles during the third stage
   * nozzleAltitude1:   The altitude used to calculate the nozzle for the first stage (0 meters)
   * drdt:              Initial condition for the velocity in the vertical direction (0 m/s)
   * dthetadt:          Initial condition for the angular velocity around the earth (0 m/s)
   * distance:          Initial condition for the distance traveled by the missile (0 meters)
   * arcDistance:       Initial condition for the distance traveled along the earths surface (0 meters)
   * massIn:            Initial condition for the mass entering the missile (always 0)
   * angleCoefficient:  Coefficient used to govern the angle of the thrust to dirrect the missile towards its target
   * The output for this function is:
   * arcDistance:       The total distance traveled by the missile along the surface of the earth
   * var rocketMass, tatm, patm, airDensity, c, m, cD, thrust, dragForce, weightForce, dr2dt, arcVelocity, theta2dt;
   * @param fuelArea1
   * @param fuelArea2
   * @param fuelMass
   * @param fuelVolume
   * @param rocketArea
   * @param altitude
   * @param rocketCasingMass1
   * @param rocketCasingMass2
   * @param rocketCasingMass3
   * @param nozzleAltitude1
   * @param drdt
   * @param dthetadt
   * @param distance
   * @param arcDistance
   * @param massIn
   * @param angleCoefficient
   * @returns
   */
  private static testTrajectory(
    fuelArea1: any,
    fuelArea2: any,
    fuelMass: number,
    fuelVolume: number,
    rocketArea: any,
    altitude: number,
    rocketCasingMass1: any,
    rocketCasingMass2: any,
    rocketCasingMass3: any,
    nozzleAltitude1: any,
    drdt: any,
    dthetadt: any,
    distance: number,
    arcDistance: any,
    massIn: any,
    angleCoefficient: number,
    fuelDensity,
    burnRate,
    warheadMass,
  ) {
    let nozzleAltitude2, nozzleAltitude3;
    let iterationFunOutput = [];
    const maxAltitude = [];

    while (fuelMass / fuelDensity / fuelVolume > 0.4 && altitude >= 0) {
      iterationFunOutput = Missile.iterationFun(
        fuelArea1,
        fuelMass,
        rocketArea,
        altitude,
        rocketCasingMass1,
        nozzleAltitude1,
        drdt,
        dthetadt,
        distance,
        arcDistance,
        massIn,
        angleCoefficient,
        fuelDensity,
        burnRate,
        warheadMass,
      );
      fuelMass = iterationFunOutput[0];
      drdt = iterationFunOutput[12];
      altitude = iterationFunOutput[13];
      maxAltitude.push(altitude);
      distance = iterationFunOutput[14];
      arcDistance = iterationFunOutput[16];
      dthetadt = iterationFunOutput[18];
      nozzleAltitude2 = altitude;
    }
    while (fuelMass / fuelDensity / fuelVolume > 0.19 && altitude >= 0) {
      iterationFunOutput = Missile.iterationFun(
        fuelArea1,
        fuelMass,
        rocketArea,
        altitude,
        rocketCasingMass2,
        nozzleAltitude2,
        drdt,
        dthetadt,
        distance,
        arcDistance,
        massIn,
        angleCoefficient,
        fuelDensity,
        burnRate,
        warheadMass,
      );
      fuelMass = iterationFunOutput[0];
      drdt = iterationFunOutput[12];
      altitude = iterationFunOutput[13];
      maxAltitude.push(altitude);
      distance = iterationFunOutput[14];
      arcDistance = iterationFunOutput[16];
      dthetadt = iterationFunOutput[18];
      nozzleAltitude3 = altitude;
    }
    while (fuelMass / fuelDensity / fuelVolume > 0 && altitude >= 0) {
      iterationFunOutput = Missile.iterationFun(
        fuelArea2,
        fuelMass,
        rocketArea,
        altitude,
        rocketCasingMass3,
        nozzleAltitude3,
        drdt,
        dthetadt,
        distance,
        arcDistance,
        massIn,
        angleCoefficient,
        fuelDensity,
        burnRate,
        warheadMass,
      );
      fuelMass = iterationFunOutput[0];
      drdt = iterationFunOutput[12];
      altitude = iterationFunOutput[13];
      maxAltitude.push(altitude);
      distance = iterationFunOutput[14];
      arcDistance = iterationFunOutput[16];
      dthetadt = iterationFunOutput[18];
    }
    while (altitude > 0) {
      fuelMass = 0;
      iterationFunOutput = Missile.iterationFun(
        fuelArea2,
        fuelMass,
        rocketArea,
        altitude,
        rocketCasingMass3,
        nozzleAltitude3,
        drdt,
        dthetadt,
        distance,
        arcDistance,
        massIn,
        angleCoefficient,
        fuelDensity,
        burnRate,
        warheadMass,
      );
      fuelMass = iterationFunOutput[0];
      drdt = iterationFunOutput[12];
      altitude = iterationFunOutput[13];
      maxAltitude.push(altitude);
      distance = iterationFunOutput[14];
      arcDistance = iterationFunOutput[16];
      dthetadt = iterationFunOutput[18];
    }

    let maxAltitudeMax = 0;

    for (let i = 0; i < maxAltitude.length; i++) {
      if (maxAltitude[i] > maxAltitudeMax) {
        maxAltitudeMax = maxAltitude[i];
      }
    }

    return distance;
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
    fuelDensity,
    burnRate,
    warheadMass,
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
          fuelArea1,
          fuelArea2,
          fuelMass,
          FuelVolume,
          rocketArea,
          altitude,
          rocketCasingMass1,
          rocketCasingMass2,
          rocketCasingMass3,
          nozzleAltitude1,
          drdt,
          dthetadt,
          distance,
          arcDistance,
          massIn,
          angleCoefficient,
          fuelDensity,
          burnRate,
          warheadMass,
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
      fuelArea1,
      fuelArea2,
      fuelMass,
      FuelVolume,
      rocketArea,
      altitude,
      rocketCasingMass1,
      rocketCasingMass2,
      rocketCasingMass3,
      nozzleAltitude1,
      drdt,
      dthetadt,
      distance,
      arcDistance,
      massIn,
      ACNew,
      fuelDensity,
      burnRate,
      warheadMass,
    );
    let error = Math.abs((GoalDistance - qRunACNew) / GoalDistance) * 100;

    while (error > 0.01 && Math.abs(AC2 - AC1) >= 0.0001) {
      ACNew = (AC1 + AC2) / 2;
      error =
        Math.abs(
          (GoalDistance -
            Missile.testTrajectory_(
              fuelArea1,
              fuelArea2,
              fuelMass,
              FuelVolume,
              rocketArea,
              altitude,
              rocketCasingMass1,
              rocketCasingMass2,
              rocketCasingMass3,
              nozzleAltitude1,
              drdt,
              dthetadt,
              distance,
              arcDistance,
              massIn,
              ACNew,
              fuelDensity,
              burnRate,
              warheadMass,
            )) /
          goalDistance,
        ) * 100;
      if (
        Missile.testTrajectory_(
          fuelArea1,
          fuelArea2,
          fuelMass,
          FuelVolume,
          rocketArea,
          altitude,
          rocketCasingMass1,
          rocketCasingMass2,
          rocketCasingMass3,
          nozzleAltitude1,
          drdt,
          dthetadt,
          distance,
          arcDistance,
          massIn,
          ACNew,
          fuelDensity,
          burnRate,
          warheadMass,
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
   * altitude. The constiables in the function are:
   *
   * po:   Atmospheric pressure at sea level
   * mol:  Amount of air in one gram
   * tsea: Temperature at sea level
   * r:    Gas constant for air
   * g:    Gravitational constant
   *
   * The function will return the calculated atmospheric pressure
   */
  private static calcPressure(altitude: number) {
    const po = 101325; // (Pa)
    const mol = 0.02897; // (mol)
    const tsea = 288; // (K)
    const r = 8.31451; // (J / K mol)
    const g = 9.81; // (m/s^2)


    return po * Math.exp((-mol * g * altitude) / (r * tsea)); // (Pa)
  }

  /**
   * This function calculates the atmospheric temperature at any given altitude.
   * The function has one iMathut for altitude. Because atmospheric temperature can not
   * be represented as one equation, this function is made up of a series of curve fits
   * which each make up a section of the atmosphere. After an elevation of 120 km
   * the atmosphere becomes so sparse that it become negligible so the function keeps a
   * constant temperature after that point.
   * @param inAlt The altitude of the rocket
   * @returns The atmospheric temperature at the given altitude
   */
  private static calcTemperature(inAlt: Meters): Kilometers {
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
   * @param m The mach number of the rocket
   * @returns The drag coefficient of the rocket
   */
  private static calcDragCoefficient(m: number) {
    if (m < 0.5) {
      return 0.125;
    }
    if (m < 1.1875) {
      return -0.329086061307 + 2.30117394072 * m + -4.06597222013 * m ** 2 + 3.01851851676 * m ** 3 + -0.666666666129 * m ** 4;
    }
    if (m < 1.625) {
      return 0.10937644721 + -4.61979595244 * m + 9.72917139612 * m ** 2 + -6.33333563852 * m ** 3 + 1.33333375211 * m ** 4;
    }
    if (m < 3.625) {
      return 0.97916002909 + -0.540978181863 * m + 0.125235817144 * m ** 2 + -0.00666103733277 * m ** 3 + -0.000558009790208 * m ** 4;
    }
    if (m > 3.625) {
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
   * @param massOut
   * @param altitude
   * @param fuelArea
   * @param nozzleAltitude
   * @returns
   */
  private static calcThrustForce(massOut: number, altitude: any, fuelArea: number, nozzleAltitude: any) {
    const k = 1.2; // Heat Ratio
    const ru = 8314.4621; // Universal Gas Constant (m^3 Pa / K mol)
    const tc = 3700; // (K)
    const pc = 25 * 10 ** 6; // Chamber Pressure (Pa)
    const mw = 22; // Molecular Weight
    const q = massOut; // Mass Flow Rate (kg/s)
    const pa = this.calcPressure(nozzleAltitude); // Ambient pressure used to calculate nozzle (Pa)
    const pe = this.calcPressure(altitude); // Actual Atmospheric Pressure (Pa)
    const pt = (pc * (1 + (k - 1) / 2)) ** (-k / (k - 1)); // Throat Pressure (Pa)
    const tt = tc / (1 + (k - 1) / 2); // Throat Temperature (k)
    const at = (q / pt) * Math.sqrt((ru * tt) / (mw * k)); // Throat Area (m^2)
    const nm = Math.sqrt((2 / (k - 1)) * (pc / pa) ** ((k - 1) / k - 1)); // Mach Number
    let ae = (at / nm) * (1 + (((k - 1) / 2) * nm ** 2) / ((k + 1) / 2)) ** ((k + 1) / (2 * (k - 1))); // Exit Nozzle Area (m^2)

    if (ae > fuelArea) {
      ae = fuelArea;
    }
    const veSub = ((2 * k) / (k - 1)) * ((ru * tc) / mw) * (1 - pe / pc) ** ((k - 1) / k);
    const ve = Math.sqrt(veSub); // Partical Exit Velocity (m/s)


    return q * ve + (pe - pa) * ae; // Thrust (N)
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
  private static iterationFun(
    fuelArea: number,
    fuelMass: number,
    rocketArea: number,
    altitude: number,
    rocketCasingMass: number,
    nozzleAltitude: number,
    drdt: number,
    dthetadt: number,
    distance: number,
    arcDistance: number,
    massIn: number,
    angleCoefficient: number,
    fuelDensity: number,
    burnRate: number,
    warheadMass: number,
  ) {
    let thrustAngle;

    if (altitude < 1200000) {
      thrustAngle =
        (90 -
          angleCoefficient *
          (1.5336118956 +
            0.00443173537387 * altitude -
            9.30373890848 * 10 ** -8 * altitude ** 2 +
            8.37838197732 * 10 ** -13 * altitude ** 3 -
            2.71228576626 * 10 ** -18 * altitude ** 4)) *
        0.0174533;
      // (Degrees)
    } else {
      thrustAngle = 30;
    }

    // This calculates the angle the drag force acts upon the missile
    const radius = RADIUS_OF_EARTH + altitude; // (m)
    const dragAngle = Math.atan2(drdt, dthetadt); // (Degrees)

    let massOut = 0; // (kg)

    // This calculates fuel mass vs time
    if (fuelMass > 0) {
      massOut = fuelDensity * fuelArea * burnRate; // (kg)
      const dmdt = massIn - massOut; // (kg/s)

      fuelMass += dmdt * Missile.h; // (kg)
    } else {
      fuelMass = 0;
    }

    const rocketMass = fuelMass + rocketCasingMass + warheadMass; // (Kg)
    const tatm = Missile.calcTemperature(<Meters>altitude); // (K)
    const patm = Missile.calcPressure(altitude); // (pa)
    const airDensity = patm / (Missile.R * tatm); // (kg/m^3)

    // This calculates the drag coeficiant
    const c = (1.4 * Missile.R * tatm) ** (1 / 2); // (m/s)
    const m = Math.sqrt(drdt ** 2 + dthetadt ** 2) / c; // (Unitless)
    const cD = Missile.calcDragCoefficient(Math.abs(m)); // (Unitless)

    // This calculates all the forces acting upon the missile
    let thrust = 0;

    if (fuelMass > 0) {
      thrust = Missile.calcThrustForce(massOut, altitude, fuelArea, nozzleAltitude);
    } // (N)

    const dragForce = (1 / 2) * airDensity * (drdt ** 2 + dthetadt ** 2) * rocketArea * cD; // (N)
    const weightForce = (Missile.G * Missile.EarthMass * rocketMass) / radius ** 2; // (N)

    // Vertical Acceleration and velocity
    const dr2dt = (thrust * Math.sin(thrustAngle) - dragForce * Math.sin(dragAngle) - weightForce) / rocketMass + radius * (dthetadt / radius) ** 2; // (m/s^2)

    drdt += dr2dt * Missile.h; // (m/s)

    altitude += drdt * Missile.h; // (m)

    distance += dthetadt * Missile.h; // (m)

    // Angular distance the missile traveled vs time
    const arcVelocity = (dthetadt * RADIUS_OF_EARTH) / radius; // (m/s)

    arcDistance += arcVelocity * Missile.h; // (m)

    // Angular acceleration and velocity
    const dtheta2dt = (thrust * Math.cos(thrustAngle) - dragForce * Math.cos(dragAngle)) / rocketMass - 2 * drdt * (dthetadt / radius); // (m/s^2)

    dthetadt += dtheta2dt * Missile.h; // (m/s)

    return [fuelMass, rocketMass, tatm, patm, airDensity, c, m, cD, thrust, dragForce, weightForce, dr2dt, drdt, altitude, distance, arcVelocity, arcDistance, dtheta2dt, dthetadt];
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
    currentLatitude,
    currentLongitude,
    targetLatitude,
    targetLongitude,
    numberWarheads,
    missileObjectNum,
    currentTime,
    missileDesc,
    length,
    diameter,
    newBurnRate,
    maxMissileRange,
    country,
    minAltitude,
  }: {
    currentLatitude: number;
    currentLongitude: number;
    targetLatitude: number;
    targetLongitude: number;
    numberWarheads: number;
    missileObjectNum: any;
    currentTime: any;
    missileDesc: any;
    length: number;
    diameter: number;
    newBurnRate: number;
    maxMissileRange: number;
    country: any;
    minAltitude: number;
  }) {
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const missileObj: MissileObject = catalogManagerInstance.getMissile(missileObjectNum);

    // Dimensions of the rocket
    length = length || 17; // (m)
    diameter = diameter || 3.1; // (m)

    // Validate inputs
    if (currentLatitude > 90 || currentLatitude < -90) {
      return null;
    }
    if (currentLongitude > 180 || currentLongitude < -180) {
      return null;
    }
    if (targetLatitude > 90 || targetLatitude < -90) {
      missileManager.lastMissileErrorType = ToastMsgType.critical;
      missileManager.lastMissileError = 'Error: Target Latitude must be<br>between 90 and -90 degrees';

      return null;
    }
    if (targetLongitude > 180 || targetLongitude < -180) {
      missileManager.lastMissileErrorType = ToastMsgType.critical;
      missileManager.lastMissileError = 'Error: Target Longitude must be<br>between 90 and -90 degrees';

      return null;
    }
    if (numberWarheads > 12) {
      return null;
    }
    if (numberWarheads % 1 > 0) {
      return null;
    }

    if (typeof minAltitude === 'undefined') {
      minAltitude = 0;
    }

    // This function will calculate the path the rocket will take in terms of coordinates
    const latList = [];
    const longList = [];

    const [estLatList, estLongList, , arcLength, estDistanceList, goalDistance] = Missile.calcCoordinates(currentLatitude, currentLongitude, targetLatitude, targetLongitude);

    if (arcLength < 320000) {
      missileManager.lastMissileErrorType = ToastMsgType.critical;
      missileManager.lastMissileError = 'Error: This missile has a minimum distance of 320 km.';

      return null;
    }

    if (arcLength > maxMissileRange * 1000) {
      missileManager.lastMissileErrorType = ToastMsgType.critical;
      missileManager.lastMissileError = `Error: This missile has a maximum distance of ${maxMissileRange} km.`;

      return null;
    }

    // Calculate Notional Altitude
    const minAltitudeTrue = minAltitude * (Math.min(3, maxMissileRange / (arcLength / 1000)) / 2);

    // Calculations for the warheads
    const warheadMass = 500 * numberWarheads; // (Kg)

    // Calculations for the casing
    const thickness = 0.050389573 * diameter; // (m)
    const rocketArea = 0.25 * Math.PI * diameter ** 2; // (m^2)

    const rocketCasingDensity = 1628.75; // (kg/m^3)http://scholar.lib.vt.edu/theses/available/etd-101198-161441/unrestricted/appendix.pdf
    const rocketCasingVolume = 0.25 * Math.PI * length * (diameter ** 2 - (diameter - thickness) ** 2); // (m^3)
    const rocketCasingMass1 = rocketCasingDensity * rocketCasingVolume; // (kg)
    const rocketCasingMass2 = rocketCasingDensity * 0.25 * Math.PI * (length * 0.4937) * (diameter ** 2 - (diameter - thickness) ** 2); // (kg)
    const rocketCasingMass3 = rocketCasingDensity * 0.25 * Math.PI * (length * 0.157) * ((diameter * 0.75) ** 2 - (diameter * 0.75 - (thickness / 2) ** 2)); // (kg)

    // Calculations for the fuel
    const burnRate = newBurnRate || 0.042; // (m/s)
    const fuelDensity = 1750; // (kg/m^2)
    const fuelArea1 = 0.25 * Math.PI * (diameter - thickness) ** 2; // (m^2)
    const fuelArea2 = 0.25 * Math.PI * (diameter * 0.75 - thickness) ** 2; // (m^2)
    const fuelVolume = fuelArea1 * (length * 0.651) + fuelArea2 * (length * 0.178); // (m^3)
    // eslint-disable-next-line max-len
    // http://www.lr.tudelft.nl/en/organisation/departments/space-engineering/space-systems-engineering/expertise-areas/space-propulsion/design-of-elements/rocket-propellants/solids/
    let fuelMass = fuelDensity * fuelVolume;

    // Here are the initial conditions
    let dthetadt = 0.001; // (m/s)
    let drdt = 0.001; // (m/s)
    let altitude = 0; // (m)
    const nozzleAltitude1 = 0; // (m)
    let distance = 0; // (m)
    let arcDistance = 0; // (m)
    const massIn = 0; // (kg/s)

    // Here are the time steps and counters
    Missile.h = 1;

    // Here are the definitions for all the lists
    const altitudeList = [];

    const hList = [];

    let nozzleAltitude2, nozzleAltitude3;

    const angleCoefficient = Missile.calcBisection(
      fuelArea1,
      fuelArea2,
      fuelMass,
      fuelVolume,
      rocketArea,
      altitude,
      rocketCasingMass1,
      rocketCasingMass2,
      rocketCasingMass3,
      nozzleAltitude1,
      drdt,
      dthetadt,
      distance,
      arcDistance,
      massIn,
      arcLength,
      goalDistance,
      fuelDensity,
      burnRate,
      warheadMass,
    );

    while (fuelMass / fuelDensity / fuelVolume > 0.4 && altitude >= 0) {
      const iterationFunOutput = Missile.iterationFun(
        fuelArea1,
        fuelMass,
        rocketArea,
        altitude,
        rocketCasingMass1,
        nozzleAltitude1,
        drdt,
        dthetadt,
        distance,
        arcDistance,
        massIn,
        angleCoefficient,
        fuelDensity,
        burnRate,
        warheadMass,
      );

      fuelMass = iterationFunOutput[0];
      drdt = iterationFunOutput[12];
      altitude = iterationFunOutput[13];
      distance = iterationFunOutput[14];

      arcDistance = iterationFunOutput[16];
      dthetadt = iterationFunOutput[18];
      nozzleAltitude2 = altitude;

      altitudeList.push(Math.round((altitude / 1000) * 100) / 100);

      for (let i = 0; i < estDistanceList.length; i++) {
        if (estDistanceList[i] <= distance / 1000 && !(estDistanceList[i + 1] <= distance / 1000)) {
          latList.push(Math.round(estLatList[i] * 100) / 100);
          longList.push(Math.round(estLongList[i] * 100) / 100);
          break;
        }
      }

      let hListSum = 0;

      for (let i = 0; i < hList.length; i++) {
        hListSum += hList[i];
      }
      hList.push(Missile.h + hListSum);
    }

    while (fuelMass / fuelDensity / fuelVolume > 0.4 && altitude >= 0) {
      const iterationFunOutput = Missile.iterationFun(
        fuelArea1,
        fuelMass,
        rocketArea,
        altitude,
        rocketCasingMass2,
        nozzleAltitude2,
        drdt,
        dthetadt,
        distance,
        arcDistance,
        massIn,
        angleCoefficient,
        fuelDensity,
        burnRate,
        warheadMass,
      );

      fuelMass = iterationFunOutput[0];
      drdt = iterationFunOutput[12];
      altitude = iterationFunOutput[13];
      distance = iterationFunOutput[14];

      arcDistance = iterationFunOutput[16];
      dthetadt = iterationFunOutput[18];
      nozzleAltitude3 = altitude;

      altitudeList.push(Math.round((altitude / 1000) * 100) / 100);

      for (let i = 0; i < estDistanceList.length; i++) {
        if (estDistanceList[i] <= distance / 1000 && !(estDistanceList[i + 1] <= distance / 1000)) {
          latList.push(Math.round(estLatList[i] * 100) / 100);
          longList.push(Math.round(estLongList[i] * 100) / 100);
          break;
        }
      }

      let hListSum = 0;

      for (const h of hList) {
        hListSum += h;
      }
      hList.push(Missile.h + hListSum);
    }

    while (fuelMass / fuelDensity / fuelVolume > 0.4 && altitude >= 0) {
      const iterationFunOutput = Missile.iterationFun(
        fuelArea2,
        fuelMass,
        rocketArea,
        altitude,
        rocketCasingMass3,
        nozzleAltitude3,
        drdt,
        dthetadt,
        distance,
        arcDistance,
        massIn,
        angleCoefficient,
        fuelDensity,
        burnRate,
        warheadMass,
      );

      fuelMass = iterationFunOutput[0];
      drdt = iterationFunOutput[12];
      altitude = iterationFunOutput[13];
      distance = iterationFunOutput[14];
      arcDistance = iterationFunOutput[16];
      dthetadt = iterationFunOutput[18];

      altitudeList.push(Math.round((altitude / 1000) * 100) / 100);

      for (let i = 0; i < estDistanceList.length; i++) {
        if (estDistanceList[i] <= distance / 1000 && estDistanceList[i + 1] > distance / 1000) {
          latList.push(Math.round(estLatList[i] * 100) / 100);
          longList.push(Math.round(estLongList[i] * 100) / 100);
          break;
        }
      }

      let hListSum = 0;

      for (const h of hList) {
        hListSum += h;
      }
      hList.push(Missile.h + hListSum);
    }

    while (altitude > 0) {
      fuelMass = 0;
      const iterationFunOutput = Missile.iterationFun(
        fuelArea2,
        fuelMass,
        rocketArea,
        altitude,
        rocketCasingMass3,
        nozzleAltitude3,
        drdt,
        dthetadt,
        distance,
        arcDistance,
        massIn,
        angleCoefficient,
        fuelDensity,
        burnRate,
        warheadMass,
      );

      fuelMass = iterationFunOutput[0];
      drdt = iterationFunOutput[12];
      altitude = iterationFunOutput[13];
      distance = iterationFunOutput[14];
      arcDistance = iterationFunOutput[16];
      dthetadt = iterationFunOutput[18];

      altitudeList.push(Math.round((altitude / 1000) * 100) / 100);

      for (let i = 0; i < estDistanceList.length; i++) {
        if (estDistanceList[i] <= distance / 1000 && !(estDistanceList[i + 1] <= distance / 1000)) {
          latList.push(Math.round(estLatList[i] * 100) / 100);
          longList.push(Math.round(estLongList[i] * 100) / 100);
          break;
        }
      }
    }

    const maxAltitude = altitudeList.reduce((a, b) => Math.max(a, b));

    if (maxAltitude < minAltitudeTrue) {
      // Try again with 25% increase to burn rate
      const burnMultiplier = Math.max(Math.min(3, minAltitudeTrue / maxAltitude), 1.25);
      // setTimeout(function () {

      return {
        isRetry: true,
        currentLatitude,
        currentLongitude,
        targetLatitude,
        targetLongitude,
        numberWarheads,
        missileObjectNum,
        currentTime,
        missileDesc,
        length,
        diameter,
        newBurnRate: newBurnRate * burnMultiplier,
        maxMissileRange,
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

    missileObj.altList = altitudeList;
    missileObj.latList = latList;
    missileObj.lonList = longList;
    missileObj.active = true;
    missileObj.type = SpaceObjectType.UNKNOWN;
    missileObj.id = missileObjectNum;
    missileObj.name = `RV_${missileObj.id}`;
    // maxAlt is used for zoom controls
    missileObj.maxAlt = maxAltitude;
    missileObj.startTime = currentTime;
    if (country) {
      missileObj.country = country;
    }

    if (missileDesc) {
      missileObj.desc = missileDesc;
    }

    return missileObj; // Successful Launch
  }
}
