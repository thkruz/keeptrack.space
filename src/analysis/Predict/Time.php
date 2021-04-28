<?php

/*
 * Functions from sgp_time.c and time-tools.c (except where noted)
 * ported to PHP by Bill Shupp
 */

require_once 'Predict.php';
require_once 'Predict/Math.php';

/*
 * Unit SGP_Time
 *       Author:  Dr TS Kelso
 * Original Version:  1992 Jun 02
 * Current Revision:  2000 Jan 22
 * Modified for Y2K:  1999 Mar 07
 *          Version:  2.05
 *        Copyright:  1992-1999, All Rights Reserved
 * Version 1.50 added Y2K support. Due to limitations in the current
 * format of the NORAD two-line element sets, however, only dates
 * through 2056 December 31/2359 UTC are valid.
 * Version 1.60 modifies Calendar_Date to ensure date matches time
 * resolution and modifies Time_of_Day to make it more robust.
 * Version 2.00 adds Julian_Date, Date_Time, and Check_Date to support
 * checking for valid date/times, permitting the use of Time_to_UTC and
 * Time_from_UTC for UTC/local time conversions.
 * Version 2.05 modifies UTC_offset to allow non-integer offsets.
 *
 *   Ported to C by: Neoklis Kyriazis  April 9  2001
 */
class Predict_Time
{
    /* The function Julian_Date_of_Epoch returns the Julian Date of     */
    /* an epoch specified in the format used in the NORAD two-line      */
    /* element sets. It has been modified to support dates beyond       */
    /* the year 1999 assuming that two-digit years in the range 00-56   */
    /* correspond to 2000-2056. Until the two-line element set format   */
    /* is changed, it is only valid for dates through 2056 December 31. */
    public static function Julian_Date_of_Epoch($epoch)
    {
        $year = 0;

        /* Modification to support Y2K */
        /* Valid 1957 through 2056     */
        $day = self::modf($epoch * 1E-3, $year) * 1E3;
        if ($year < 57) {
            $year = $year + 2000;
        } else {
            $year = $year + 1900;
        }
        /* End modification */

        return self::Julian_Date_of_Year($year) + $day;
    }

    /* Equivalent to the C modf function */
    public static function modf($x, &$ipart) {
        $ipart = (int)$x;
        return $x - $ipart;
    }

    /* The function Julian_Date_of_Year calculates the Julian Date  */
    /* of Day 0.0 of {year}. This function is used to calculate the */
    /* Julian Date of any date by using Julian_Date_of_Year, DOY,   */
    /* and Fraction_of_Day. */
    public static function Julian_Date_of_Year($year)
    {
        /* Astronomical Formulae for Calculators, Jean Meeus, */
        /* pages 23-25. Calculate Julian Date of 0.0 Jan year */
        $year = $year - 1;
        $i = (int) ($year / 100);
        $A = $i;
        $i = (int) ($A / 4);
        $B = (int) (2 - $A + $i);
        $i = (int) (365.25 * $year);
        $i += (int) (30.6001 * 14);
        $jdoy = $i + 1720994.5 + $B;

        return $jdoy;
    }

    /* The function ThetaG calculates the Greenwich Mean Sidereal Time */
    /* for an epoch specified in the format used in the NORAD two-line */
    /* element sets. It has now been adapted for dates beyond the year */
    /* 1999, as described above. The function ThetaG_JD provides the   */
    /* same calculation except that it is based on an input in the     */
    /* form of a Julian Date. */
    public static function ThetaG($epoch, Predict_DeepArg $deep_arg)
    {
        /* Reference:  The 1992 Astronomical Almanac, page B6. */
        // double year,day,UT,jd,TU,GMST,_ThetaG;

        /* Modification to support Y2K */
        /* Valid 1957 through 2056     */
        $year = 0;
        $day = self::modf($epoch * 1E-3, $year) * 1E3;

        if ($year < 57) {
            $year += 2000;
        } else {
            $year += 1900;
        }
        /* End modification */

        $UT = fmod($day, $day);
        $jd = self::Julian_Date_of_Year($year) + $day;
        $TU = ($jd - 2451545.0) / 36525;
        $GMST = 24110.54841 + $TU * (8640184.812866 + $TU * (0.093104 - $TU * 6.2E-6));
        $GMST = Predict_Math::Modulus($GMST + Predict::secday * Predict::omega_E * $UT, Predict::secday);
        $deep_arg->ds50 = $jd - 2433281.5 + $UT;

        return Predict_Math::FMod2p(6.3003880987 * $deep_arg->ds50 + 1.72944494);
    }

    /* See the ThetaG doc block above */
    public static function ThetaG_JD($jd)
    {
        /* Reference:  The 1992 Astronomical Almanac, page B6. */
        $UT   = Predict_Math::Frac($jd + 0.5);
        $jd   = $jd - $UT;
        $TU   = ($jd - 2451545.0) / 36525;
        $GMST = 24110.54841 + $TU * (8640184.812866 + $TU * (0.093104 - $TU * 6.2E-6));
        $GMST = Predict_Math::Modulus($GMST + Predict::secday * Predict::omega_E * $UT, Predict::secday);

        return Predict::twopi * $GMST / Predict::secday;
    }

    /**
     * Read the system clock and return the current Julian day.  From phpPredict
     *
     * @return float
     */
    public static function get_current_daynum() {
        // Gets the current decimal day number from microtime

        list($usec, $sec) = explode(' ', microtime());
        return self::unix2daynum($sec, $usec);
    }

    /**
     * Converts a standard unix timestamp and optional
     * milliseconds to a daynum
     *
     * @param int $sec  Seconds from the unix epoch
     * @param int $usec Optional milliseconds
     *
     * @return float
     */
    public static function unix2daynum($sec, $usec = 0)
    {
        $time = ((($sec + $usec) / 86400.0) - 3651.0);
        return $time + 2444238.5;
    }

    /* The function Delta_ET has been added to allow calculations on   */
    /* the position of the sun.  It provides the difference between UT */
    /* (approximately the same as UTC) and ET (now referred to as TDT).*/
    /* This function is based on a least squares fit of data from 1950 */
    /* to 1991 and will need to be updated periodically. */
    public static function Delta_ET($year)
    {
      /* Values determined using data from 1950-1991 in the 1990
         Astronomical Almanac.  See DELTA_ET.WQ1 for details. */

      $delta_et = 26.465 + 0.747622 * ($year - 1950) +
                 1.886913 * sin(Predict::twopi * ($year - 1975) / 33);

      return $delta_et;
    }

    /**
     * Converts a daynum to a unix timestamp.  From phpPredict.
     *
     * @param float $dn Julian Daynum
     *
     * @return float
     */
    public static function daynum2unix($dn) {
        // Converts a daynum to a UNIX timestamp

        return (86400.0 * ($dn - 2444238.5 + 3651.0));
    }

    /**
     * Converts a daynum to a readable time format.
     *
     * @param float $dn The julian date
     * @param string $zone The zone string, defaults to America/Los_Angeles
     * @param string $format The date() function's format string.  Defaults to m-d-Y H:i:s
     *
     * @return string
     */
    public static function daynum2readable($dn, $zone = 'UTC', $format = 'm-d-Y H:i:s')
    {
        $unix = self::daynum2unix($dn);
        $date = new DateTime("@" . round($unix));
        $dateTimezone = new DateTimezone($zone);
        $date->setTimezone($dateTimezone);
        return $date->format($format);
    }

    /**
     * Returns the unix timestamp of a TLE's epoch
     *
     * @param Predict_TLE $tle The TLE object
     *
     * @return int
     */
    public static function getEpochTimeStamp(Predict_TLE $tle)
    {
        $year = $tle->epoch_year;
        $day  = $tle->epoch_day;
        $sec  = round(86400 * $tle->epoch_fod);

        $zone = new DateTimeZone('GMT');
        $date = new DateTime();
        $date->setTimezone($zone);
        $date->setDate($year, 1, 1);
        $date->setTime(0, 0, 0);

        return $date->format('U') + (86400 * $day) + $sec - 86400;
    }
}
