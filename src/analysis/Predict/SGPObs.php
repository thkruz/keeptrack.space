<?php

/**
 * Predict_SGPObs
 *
 * Ported to PHP by Bill Shupp.  Original comments below
 */

require_once 'Predict/Math.php';
require_once 'Predict/Time.php';
require_once 'Predict.php';
require_once 'Predict/Vector.php';
require_once 'Predict/ObsSet.php';

/*
 * Unit SGP_Obs
 *           Author:  Dr TS Kelso
 * Original Version:  1992 Jun 02
 * Current Revision:  1992 Sep 28
 *          Version:  1.40
 *        Copyright:  1992, All Rights Reserved
 *
 *   Ported to C by:  Neoklis Kyriazis  April 9 2001
 *   Ported to PHP by Bill Shupp August, 2011
 */
class Predict_SGPObs
{
    /* Procedure Calculate_User_PosVel passes the user's geodetic position */
    /* and the time of interest and returns the ECI position and velocity  */
    /* of the observer. The velocity calculation assumes the geodetic      */
    /* position is stationary relative to the earth's surface.             */
    public static function Calculate_User_PosVel(
        $_time, Predict_Geodetic $geodetic, Predict_Vector $obs_pos, Predict_Vector $obs_vel
    )
    {
        /* Reference:  The 1992 Astronomical Almanac, page K11. */

        $sinGeodeticLat = sin($geodetic->lat); /* Only run sin($geodetic->lat) once */

        $geodetic->theta = Predict_Math::FMod2p(Predict_Time::ThetaG_JD($_time) + $geodetic->lon);/*LMST*/
        $c = 1 / sqrt(1 + Predict::__f * (Predict::__f - 2) * $sinGeodeticLat * $sinGeodeticLat);
        $sq = (1 - Predict::__f) * (1 - Predict::__f) * $c;
        $achcp = (Predict::xkmper * $c + $geodetic->alt) * cos($geodetic->lat);
        $obs_pos->x = $achcp * cos($geodetic->theta); /*kilometers*/
        $obs_pos->y = $achcp * sin($geodetic->theta);
        $obs_pos->z = (Predict::xkmper * $sq + $geodetic->alt) * $sinGeodeticLat;
        $obs_vel->x = -Predict::mfactor * $obs_pos->y; /*kilometers/second*/
        $obs_vel->y =  Predict::mfactor * $obs_pos->x;
        $obs_vel->z =  0;
        $obs_pos->w = sqrt($obs_pos->x * $obs_pos->x + $obs_pos->y * $obs_pos->y + $obs_pos->z * $obs_pos->z);
        $obs_vel->w = sqrt($obs_vel->x * $obs_vel->x + $obs_vel->y * $obs_vel->y + $obs_vel->z * $obs_vel->z);
    }

    /* Procedure Calculate_LatLonAlt will calculate the geodetic  */
    /* position of an object given its ECI position pos and time. */
    /* It is intended to be used to determine the ground track of */
    /* a satellite.  The calculations  assume the earth to be an  */
    /* oblate spheroid as defined in WGS '72.                     */
    public static function Calculate_LatLonAlt($_time, Predict_Vector $pos,  Predict_Geodetic $geodetic)
    {
        /* Reference:  The 1992 Astronomical Almanac, page K12. */

        /* double r,e2,phi,c; */

        $geodetic->theta = Predict_Math::AcTan($pos->y, $pos->x); /*radians*/
        $geodetic->lon = Predict_Math::FMod2p($geodetic->theta - Predict_Time::ThetaG_JD($_time)); /*radians*/
        $r = sqrt(($pos->x * $pos->x) + ($pos->y * $pos->y));
        $e2 = Predict::__f * (2 - Predict::__f);
        $geodetic->lat = Predict_Math::AcTan($pos->z, $r); /*radians*/

        do {
            $phi    = $geodetic->lat;
            $sinPhi = sin($phi);
            $c      = 1 / sqrt(1 - $e2 * ($sinPhi * $sinPhi));
            $geodetic->lat = Predict_Math::AcTan($pos->z + Predict::xkmper * $c * $e2 * $sinPhi, $r);
        } while (abs($geodetic->lat - $phi) >= 1E-10);

        $geodetic->alt = $r / cos($geodetic->lat) - Predict::xkmper * $c;/*kilometers*/

        if ($geodetic->lat > Predict::pio2) {
            $geodetic->lat -= Predict::twopi;
        }
    }

    /* The procedures Calculate_Obs and Calculate_RADec calculate         */
    /* the *topocentric* coordinates of the object with ECI position,     */
    /* {pos}, and velocity, {vel}, from location {geodetic} at {time}.    */
    /* The {obs_set} returned for Calculate_Obs consists of azimuth,      */
    /* elevation, range, and range rate (in that order) with units of     */
    /* radians, radians, kilometers, and kilometers/second, respectively. */
    /* The WGS '72 geoid is used and the effect of atmospheric refraction */
    /* (under standard temperature and pressure) is incorporated into the */
    /* elevation calculation; the effect of atmospheric refraction on     */
    /* range and range rate has not yet been quantified.                  */

    /* The {obs_set} for Calculate_RADec consists of right ascension and  */
    /* declination (in that order) in radians.  Again, calculations are   */
    /* based on *topocentric* position using the WGS '72 geoid and        */
    /* incorporating atmospheric refraction.                              */
    public static function Calculate_Obs($_time, Predict_Vector $pos, Predict_Vector $vel, Predict_Geodetic $geodetic, Predict_ObsSet $obs_set)
    {
        $obs_pos = new Predict_Vector();
        $obs_vel = new Predict_Vector();
        $range   = new Predict_Vector();
        $rgvel   = new Predict_Vector();

        self::Calculate_User_PosVel($_time, $geodetic, $obs_pos, $obs_vel);

        $range->x = $pos->x - $obs_pos->x;
        $range->y = $pos->y - $obs_pos->y;
        $range->z = $pos->z - $obs_pos->z;

        $rgvel->x = $vel->x - $obs_vel->x;
        $rgvel->y = $vel->y - $obs_vel->y;
        $rgvel->z = $vel->z - $obs_vel->z;

        $range->w = sqrt($range->x * $range->x + $range->y * $range->y + $range->z * $range->z);

        $sin_lat   = sin($geodetic->lat);
        $cos_lat   = cos($geodetic->lat);
        $sin_theta = sin($geodetic->theta);
        $cos_theta = cos($geodetic->theta);
        $top_s = $sin_lat * $cos_theta * $range->x
            + $sin_lat * $sin_theta * $range->y
            - $cos_lat * $range->z;
        $top_e = -$sin_theta * $range->x
            + $cos_theta * $range->y;
        $top_z = $cos_lat * $cos_theta * $range->x
            + $cos_lat * $sin_theta * $range->y
            + $sin_lat * $range->z;
        $azim = atan(-$top_e / $top_s); /*Azimuth*/
        if ($top_s > 0) {
            $azim = $azim + Predict::pi;
        }
        if ($azim < 0 ) {
            $azim = $azim + Predict::twopi;
        }
        $el = Predict_Math::ArcSin($top_z / $range->w);
        $obs_set->az = $azim;        /* Azimuth (radians)  */
        $obs_set->el = $el;          /* Elevation (radians)*/
        $obs_set->range = $range->w; /* Range (kilometers) */

        /* Range Rate (kilometers/second)*/
        $obs_set->range_rate = Predict_Math::Dot($range, $rgvel) / $range->w;

        /* Corrections for atmospheric refraction */
        /* Reference:  Astronomical Algorithms by Jean Meeus, pp. 101-104    */
        /* Correction is meaningless when apparent elevation is below horizon */
        //	obs_set->el = obs_set->el + Radians((1.02/tan(Radians(Degrees(el)+
        //							      10.3/(Degrees(el)+5.11))))/60);
        if ($obs_set->el < 0) {
            $obs_set->el = $el;  /*Reset to true elevation*/
        }
    }
}
