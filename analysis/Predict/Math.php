<?php
/**
 * Predict_Math
 *
 * Ported to PHP by Bill Shupp.  Original comments below
 */

require_once 'Predict.php';

/*
 * Unit SGP_Math
 *       Author:  Dr TS Kelso
 * Original Version:  1991 Oct 30
 * Current Revision:  1998 Mar 17
 *          Version:  3.00
 *        Copyright:  1991-1998, All Rights Reserved
 *
 *   ported to C by:  Neoklis Kyriazis  April 9 2001
 */
class Predict_Math
{
    /* Returns sign of a float */
    public static function Sign($arg)
    {
        if ($arg > 0 ) {
            return 1;
        } else if ($arg < 0 ) {
            return -1;
        } else {
            return 0;
        }
    }

    /* Returns the arcsine of the argument */
    public static function ArcSin($arg)
    {
        if (abs($arg) >= 1 ) {
            return (self::Sign($arg) * Predict::pio2);
        } else {
            return(atan($arg / sqrt(1 - $arg * $arg)));
        }
    }

    /* Returns arccosine of rgument */
    public static function ArcCos($arg)
    {
        return Predict::pio2 - self::ArcSin($arg);
    }

    /* Adds vectors v1 and v2 together to produce v3 */
    public static function Vec_Add(Predict_Vector $v1, Predict_Vector $v2, Predict_Vector $v3)
    {
        $v3->x = $v1->x + $v2->x;
        $v3->y = $v1->y + $v2->y;
        $v3->z = $v1->z + $v2->z;

        $v3->w = sqrt($v3->x * $v3->x + $v3->y * $v3->y + $v3->z * $v3->z);
    }

    /* Subtracts vector v2 from v1 to produce v3 */
    public static function Vec_Sub(Predict_Vector $v1, Predict_Vector $v2, Predict_Vector $v3)
    {
        $v3->x = $v1->x - $v2->x;
        $v3->y = $v1->y - $v2->y;
        $v3->z = $v1->z - $v2->z;

        $v3->w = sqrt($v3->x * $v3->x + $v3->y * $v3->y + $v3->z * $v3->z);
    }

    /* Multiplies the vector v1 by the scalar k to produce the vector v2 */
    public static function Scalar_Multiply($k, Predict_Vector $v1, Predict_Vector $v2)
    {
        $v2->x = $k * $v1->x;
        $v2->y = $k * $v1->y;
        $v2->z = $k * $v1->z;
        $v2->w = abs($k) * $v1->w;
    }

    /* Multiplies the vector v1 by the scalar k */
    public static function Scale_Vector($k, Predict_Vector $v)
    {
        $v->x *= $k;
        $v->y *= $k;
        $v->z *= $k;

        $v->w = sqrt($v->x * $v->x + $v->y * $v->y + $v->z * $v->z);
    }

    /* Returns the dot product of two vectors */
    public static function Dot(Predict_Vector $v1, Predict_Vector $v2)
    {
        return ($v1->x * $v2->x + $v1->y * $v2->y + $v1->z * $v2->z);
    }

    /* Calculates the angle between vectors v1 and v2 */
    public static function Angle(Predict_Vector $v1, Predict_Vector $v2)
    {
        $v1->w = sqrt($v1->x * $v1->x + $v1->y * $v1->y + $v1->z * $v1->z);
        $v2->w = sqrt($v2->x * $v2->x + $v2->y * $v2->y + $v2->z * $v2->z);
        return (self::ArcCos(self::Dot($v1, $v2) / ($v1->w * $v2->w)));
    }

    /* Produces cross product of v1 and v2, and returns in v3 */
    public static function Cross(Predict_Vector $v1, Predict_Vector $v2 ,Predict_Vector $v3)
    {
        $v3->x = $v1->y * $v2->z - $v1->z * $v2->y;
        $v3->y = $v1->z * $v2->x - $v1->x * $v2->z;
        $v3->z = $v1->x * $v2->y - $v1->y * $v2->x;

        $v3->w = sqrt($v3->x * $v3->x + $v3->y * $v3->y + $v3->z * $v3->z);
    }

    /* Normalizes a vector */
    public static function Normalize(Predict_Vector $v )
    {
        $v->x /= $v->w;
        $v->y /= $v->w;
        $v->z /= $v->w;
    }

    /* Four-quadrant arctan function */
    public static function AcTan($sinx, $cosx)
    {
        if ($cosx == 0) {
            if ($sinx > 0) {
                return Predict::pio2;
            } else {
                return Predict::x3pio2;
            }
        } else {
            if ($cosx > 0) {
                if ($sinx > 0) {
                    return atan($sinx / $cosx);
                } else {
                    return Predict::twopi + atan($sinx / $cosx);
                }
            } else {
                return Predict::pi + atan($sinx / $cosx);
            }
        }
    }

    /* Returns mod 2pi of argument */
    public static function FMod2p($x)
    {
        $ret_val  = $x;
        $i        = (int) ($ret_val / Predict::twopi);
        $ret_val -= $i * Predict::twopi;

        if ($ret_val < 0) {
            $ret_val += Predict::twopi;
        }

        return $ret_val;
    }

    /* Returns arg1 mod arg2 */
    public static function Modulus($arg1, $arg2)
    {
        $ret_val  = $arg1;
        $i        = (int) ($ret_val / $arg2);
        $ret_val -= $i * $arg2;

        if ($ret_val < 0) {
            $ret_val += $arg2;
        }

        return $ret_val;
    }

    /* Returns fractional part of double argument */
    public static function Frac($arg)
    {
        return $arg - floor($arg);
    }

    /* Converts the satellite's position and velocity  */
    /* vectors from normalised values to km and km/sec */
    public static function Convert_Sat_State(Predict_Vector $pos, Predict_Vector $vel)
    {
        self::Scale_Vector(Predict::xkmper, $pos);
        self::Scale_Vector(Predict::xkmper * Predict::xmnpda / Predict::secday, $vel);
    }

    /* Returns angle in radians from arg in degrees */
    public static function Radians($arg)
    {
        return $arg * Predict::de2ra;
    }

    /* Returns angle in degrees from arg in rads */
    public static function Degrees($arg)
    {
      return $arg / Predict::de2ra;
    }
}
