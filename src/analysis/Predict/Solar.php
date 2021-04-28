<?php

/*
 * Ported from gpredict to PHP by Bill Shupp
 */

require_once 'Predict.php';
require_once 'Predict/Math.php';
require_once 'Predict/Time.php';
require_once 'Predict/Vector.php';
require_once 'Predict/Geodetic.php';
require_once 'Predict/ObsSet.php';
require_once 'Predict/SGPObs.php';

/*
 * Unit Solar
 *           Author:  Dr TS Kelso
 * Original Version:  1990 Jul 29
 * Current Revision:  1999 Nov 27
 *          Version:  1.30
 *        Copyright:  1990-1999, All Rights Reserved
 *
 *   Ported to C by: Neoklis Kyriazis  April 1 2001
 */
class Predict_Solar
{
    /* Calculates solar position vector */
    public static function Calculate_Solar_Position($time, Predict_Vector $solar_vector)
    {
        $mjd = $time - 2415020.0;
        $year = 1900 + $mjd / 365.25;
        $T = ($mjd + Predict_Time::Delta_ET($year) / Predict::secday) / 36525.0;
        $M = Predict_Math::Radians(Predict_Math::Modulus(358.47583 + Predict_Math::Modulus(35999.04975 * $T, 360.0)
             - (0.000150 + 0.0000033 * $T) * ($T * $T), 360.0));
        $L = Predict_Math::Radians(Predict_Math::Modulus(279.69668 + Predict_Math::Modulus(36000.76892 * $T, 360.0)
             + 0.0003025 * ($T * $T), 360.0));
        $e = 0.01675104 - (0.0000418 + 0.000000126 * $T) * $T;
        $C = Predict_Math::Radians((1.919460 - (0.004789 + 0.000014 * $T) * $T) * sin($M)
             + (0.020094 - 0.000100 * $T) * sin(2 * $M) + 0.000293 * sin(3 * $M));
        $O = Predict_Math::Radians(Predict_Math::Modulus(259.18 - 1934.142 * $T, 360.0));
        $Lsa = Predict_Math::Modulus($L + $C - Predict_Math::Radians(0.00569 - 0.00479 * sin($O)), Predict::twopi);
        $nu = Predict_Math::Modulus($M + $C, Predict::twopi);
        $R = 1.0000002 * (1 - ($e * $e)) / (1 + $e * cos($nu));
        $eps = Predict_Math::Radians(23.452294 - (0.0130125 + (0.00000164 - 0.000000503 * $T) * $T) * $T + 0.00256 * cos($O));
        $R = Predict::AU * $R;

        $solar_vector->x = $R * cos($Lsa);
        $solar_vector->y = $R * sin($Lsa) * cos($eps);
        $solar_vector->z = $R * sin($Lsa) * sin($eps);
        $solar_vector->w = $R;
    }

    /* Calculates stellite's eclipse status and depth */
    public static function Sat_Eclipsed(Predict_Vector $pos, Predict_Vector $sol, &$depth)
    {
        $Rho   = new Predict_Vector();
        $earth = new Predict_Vector();

        /* Determine partial eclipse */
        $sd_earth = Predict_Math::ArcSin(Predict::xkmper / $pos->w);
        Predict_Math::Vec_Sub($sol, $pos, $Rho);
        $sd_sun = Predict_Math::ArcSin(Predict::__sr__ / $Rho->w);
        Predict_Math::Scalar_Multiply(-1, $pos, $earth);
        $delta = Predict_Math::Angle($sol, $earth);
        $depth = $sd_earth - $sd_sun - $delta;

        if ($sd_earth < $sd_sun) {
            return 0;
        } else if ($depth >= 0) {
            return 1;
        } else {
            return 0;
        }
    }

    /**
     * Finds the current location of the sun based on the observer location
     *
     * @param Predict_QTH $qth    The observer location
     * @param int         $daynum The daynum or null to use the current daynum
     *
     * @return Predict_ObsSet
     */
    public static function FindSun(Predict_QTH $qth, $daynum = null)
    {
        if ($daynum === null) {
            $daynum = Predict_Time::get_current_daynum();
        }

        $obs_geodetic = new Predict_Geodetic();
        $obs_geodetic->lon   = $qth->lon * Predict::de2ra;
        $obs_geodetic->lat   = $qth->lat * Predict::de2ra;
        $obs_geodetic->alt   = $qth->alt / 1000.0;
        $obs_geodetic->theta = 0;

        $solar_vector = new Predict_Vector();
        $zero_vector  = new Predict_Vector();
        $solar_set    = new Predict_ObsSet();

        self::Calculate_Solar_Position($daynum, $solar_vector);
        Predict_SGPObs::Calculate_Obs(
            $daynum,
            $solar_vector,
            $zero_vector,
            $obs_geodetic,
            $solar_set
        );

        $solar_set->az = Predict_Math::Degrees($solar_set->az);
        $solar_set->el = Predict_Math::Degrees($solar_set->el);

        return $solar_set;
    }
}
