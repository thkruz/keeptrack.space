<?php

/**
 * Ported to PHP from gpredict by Bill Shupp
 */

require_once 'Predict.php';
require_once 'Predict/SGPSDP.php';
require_once 'Predict/Vector.php';
require_once 'Predict/SGSDPStatic.php';
require_once 'Predict/SGPObs.php';
require_once 'Predict/Solar.php';
require_once 'Predict/DeepArg.php';
require_once 'Predict/DeepStatic.php';
require_once 'Predict/Geodetic.php';
require_once 'Predict/ObsSet.php';
require_once 'Predict/Time.php';
require_once 'Predict/Math.php';

/**
 * Contains satellite data and related methods.
 */
class Predict_Sat
{
    // Fifth root of a hundred, used for magnitude calculation
    const POGSONS_RATIO = 2.5118864315096;

    public $name     = null;
    public $nickname = null;
    public $website  = null;

    public $tle      = null;   /*!< Keplerian elements */
    public $flags    = 0;      /*!< Flags for algo ctrl */
    public $sgps     = null;
    public $dps      = null;
    public $deep_arg = null;
    public $pos      = null;   /*!< Raw position and range */
    public $vel      = null;   /*!< Raw velocity */

    /*** FIXME: REMOVE */
    public $bearing = null;   /*!< Az, El, range and vel */
    public $astro   = null;   /*!< Ra and Decl */
    /*** END */

    /* time keeping fields */
    public $jul_epoch = null;
    public $jul_utc   = null;
    public $tsince    = null;
    public $aos       = null;    /*!< Next AOS. */
    public $los       = null;    /*!< Next LOS */

    public $az         = null;   /*!< Azimuth [deg] */
    public $el         = null;   /*!< Elevation [deg] */
    public $range      = null;   /*!< Range [km] */
    public $range_rate = null;   /*!< Range Rate [km/sec] */
    public $ra         = null;   /*!< Right Ascension [deg] */
    public $dec        = null;   /*!< Declination [deg] */
    public $ssplat     = null;   /*!< SSP latitude [deg] */
    public $ssplon     = null;   /*!< SSP longitude [deg] */
    public $alt        = null;   /*!< altitude [km] */
    public $velo       = null;   /*!< velocity [km/s] */
    public $ma         = null;   /*!< mean anomaly */
    public $footprint  = null;   /*!< footprint */
    public $phase      = null;   /*!< orbit phase */
    public $meanmo     = null;   /*!< mean motion kept in rev/day */
    public $orbit      = null;   /*!< orbit number */
    public $otype      = null;   /*!< orbit type. */

    public function __construct(Predict_TLE $tle)
    {
        $headerParts    = explode(' ', $tle->header);
        $this->name     = $headerParts[0];
        $this->nickname = $this->name;
        $this->tle      = $tle;
        $this->pos      = new Predict_Vector();
        $this->vel      = new Predict_Vector();
        $this->sgps     = new Predict_SGSDPStatic();
        $this->deep_arg = new Predict_DeepArg();
        $this->dps      = new Predict_DeepStatic();

        $this->select_ephemeris();
        $this->sat_data_init_sat($this);
    }

    /* Selects the apropriate ephemeris type to be used */
    /* for predictions according to the data in the TLE */
    /* It also processes values in the tle set so that  */
    /* they are apropriate for the sgp4/sdp4 routines   */
    public function select_ephemeris()
    {
        /* Preprocess tle set */
        $this->tle->xnodeo *= Predict::de2ra;
        $this->tle->omegao *= Predict::de2ra;
        $this->tle->xmo    *= Predict::de2ra;
        $this->tle->xincl  *= Predict::de2ra;
        $temp = Predict::twopi / Predict::xmnpda / Predict::xmnpda;

        /* store mean motion before conversion */
        $this->meanmo       = $this->tle->xno;
        $this->tle->xno     = $this->tle->xno * $temp * Predict::xmnpda;
        $this->tle->xndt2o *= $temp;
        $this->tle->xndd6o  = $this->tle->xndd6o * $temp / Predict::xmnpda;
        $this->tle->bstar  /= Predict::ae;

        /* Period > 225 minutes is deep space */
        $dd1 = Predict::xke / $this->tle->xno;
        $dd2 = Predict::tothrd;
        $a1 = pow($dd1, $dd2);
        $r1 = cos($this->tle->xincl);
        $dd1 = 1.0 - $this->tle->eo * $this->tle->eo;
        $temp = Predict::ck2 * 1.5 * ($r1 * $r1 * 3.0 - 1.0) / pow($dd1, 1.5);
        $del1 = $temp / ($a1 * $a1);
        $ao = $a1 * (1.0 - $del1 * (Predict::tothrd * 0.5 + $del1 *
                                 ($del1 * 1.654320987654321 + 1.0)));
        $delo = $temp / ($ao * $ao);
        $xnodp = $this->tle->xno / ($delo + 1.0);

        /* Select a deep-space/near-earth ephemeris */
        if (Predict::twopi / $xnodp / Predict::xmnpda >= .15625) {
            $this->flags |= Predict_SGPSDP::DEEP_SPACE_EPHEM_FLAG;
        } else {
            $this->flags &= ~Predict_SGPSDP::DEEP_SPACE_EPHEM_FLAG;
        }
    }

    /** Initialise satellite data.
     *  @param sat The satellite to initialise.
     *  @param qth Optional QTH info, use (0,0) if NULL.
     *
     * This function calculates the satellite data at t = 0, ie. epoch time
     * The function is called automatically by gtk_sat_data_read_sat.
     */
    public function sat_data_init_sat(Predict_Sat $sat, Predict_QTH $qth = null)
    {
        $obs_geodetic = new Predict_Geodetic();
        $obs_set = new Predict_ObsSet();
        $sat_geodetic = new Predict_Geodetic();
        /* double jul_utc, age; */

        $jul_utc = Predict_Time::Julian_Date_of_Epoch($sat->tle->epoch); // => tsince = 0.0
        $sat->jul_epoch = $jul_utc;

        /* initialise observer location */
        if ($qth != null) {
            $obs_geodetic->lon = $qth->lon * Predict::de2ra;
            $obs_geodetic->lat = $qth->lat * Predict::de2ra;
            $obs_geodetic->alt = $qth->alt / 1000.0;
            $obs_geodetic->theta = 0;
        }
        else {
            $obs_geodetic->lon = 0.0;
            $obs_geodetic->lat = 0.0;
            $obs_geodetic->alt = 0.0;
            $obs_geodetic->theta = 0;
        }

        /* execute computations */
        $sdpsgp = Predict_SGPSDP::getInstance($sat);
        if ($sat->flags & Predict_SGPSDP::DEEP_SPACE_EPHEM_FLAG) {
            $sdpsgp->SDP4($sat, 0.0);
        } else {
            $sdpsgp->SGP4($sat, 0.0);
        }

        /* scale position and velocity to km and km/sec */
        Predict_Math::Convert_Sat_State($sat->pos, $sat->vel);

        /* get the velocity of the satellite */
        $sat->vel->w = sqrt($sat->vel->x * $sat->vel->x + $sat->vel->y * $sat->vel->y + $sat->vel->z * $sat->vel->z);
        $sat->velo = $sat->vel->w;
        Predict_SGPObs::Calculate_Obs($jul_utc, $sat->pos, $sat->vel, $obs_geodetic, $obs_set);
        Predict_SGPObs::Calculate_LatLonAlt($jul_utc, $sat->pos, $sat_geodetic);

        while ($sat_geodetic->lon < -Predict::pi) {
            $sat_geodetic->lon += Predict::twopi;
        }

        while ($sat_geodetic->lon > Predict::pi) {
            $sat_geodetic->lon -= Predict::twopi;
        }

        $sat->az = Predict_Math::Degrees($obs_set->az);
        $sat->el = Predict_Math::Degrees($obs_set->el);
        $sat->range = $obs_set->range;
        $sat->range_rate = $obs_set->range_rate;
        $sat->ssplat = Predict_Math::Degrees($sat_geodetic->lat);
        $sat->ssplon = Predict_Math::Degrees($sat_geodetic->lon);
        $sat->alt = $sat_geodetic->alt;
        $sat->ma = Predict_Math::Degrees($sat->phase);
        $sat->ma *= 256.0 / 360.0;
        $sat->footprint = 2.0 * Predict::xkmper * acos (Predict::xkmper/$sat->pos->w);
        $age = 0.0;
        $sat->orbit = floor(($sat->tle->xno * Predict::xmnpda / Predict::twopi +
                                   $age * $sat->tle->bstar * Predict::ae) * $age +
                                  $sat->tle->xmo / Predict::twopi) + $sat->tle->revnum - 1;

        /* orbit type */
        $sat->otype = $sat->get_orbit_type($sat);
    }

    public function get_orbit_type(Predict_Sat $sat)
    {
         $orbit = Predict_SGPSDP::ORBIT_TYPE_UNKNOWN;

         if ($this->geostationary($sat)) {
              $orbit = Predict_SGPSDP::ORBIT_TYPE_GEO;
         } else if ($this->decayed($sat)) {
              $orbit = Predict_SGPSDP::ORBIT_TYPE_DECAYED;
         } else {
              $orbit = Predict_SGPSDP::ORBIT_TYPE_UNKNOWN;
         }

         return $orbit;
    }


    /** Determinte whether satellite is in geostationary orbit.
     *  @author John A. Magliacane, KD2BD
     *  @param sat Pointer to satellite data.
     *  @return TRUE if the satellite appears to be in geostationary orbit,
     *          FALSE otherwise.
     *
     * A satellite is in geostationary orbit if
     *
     *     fabs (sat.meanmotion - 1.0027) < 0.0002
     *
     * Note: Appearantly, the mean motion can deviate much more from 1.0027 than 0.0002
     */
    public function geostationary(Predict_Sat $sat)
    {
         if (abs($sat->meanmo - 1.0027) < 0.0002) {
              return true;
         } else {
              return false;
        }
    }


    /** Determine whether satellite has decayed.
     *  @author John A. Magliacane, KD2BD
     *  @author Alexandru Csete, OZ9AEC
     *  @param sat Pointer to satellite data.
     *  @return TRUE if the satellite appears to have decayed, FALSE otherwise.
     *  @bug Modified version of the predict code but it is not tested.
     *
     * A satellite is decayed if
     *
     *    satepoch + ((16.666666 - sat.meanmo) / (10.0*fabs(sat.drag))) < "now"
     *
     */
    public function decayed(Predict_Sat $sat)
    {
        /* tle.xndt2o/(twopi/xmnpda/xmnpda) is the value before converted the
           value matches up with the value in predict 2.2.3 */
        /*** FIXME decayed is treated as a static quantity.
             It is time dependent. Also sat->jul_utc is often zero
             when this function is called
        ***/
        if ($sat->jul_epoch + ((16.666666 - $sat->meanmo) /
                               (10.0 * abs($sat->tle->xndt2o / (Predict::twopi / Predict::xmnpda / Predict::xmnpda)))) < $sat->jul_utc) {
              return true;
        } else {
              return false;
        }
    }

    /**
     * Experimental attempt at calculating apparent magnitude.  Known intrinsic
     * magnitudes are listed inside the function for now.
     *
     * @param float       $time The daynum the satellite is calculated for
     * @param Predict_QTH $qth  The observer location
     *
     * @return null on failure, float otherwise
     */
    public function calculateApparentMagnitude($time, Predict_QTH $qth)
    {
        // Recorded intrinsic magnitudes and their respective
        // illumination and distance from heavens-above.com
        static $intrinsicMagnitudes = array(
            '25544' => array(
                'mag'      => -1.3,
                'illum'    => .5,
                'distance' => 1000,
            )
        );

        // Return null if we don't have a record of the intrinsic mag
        if (!isset($intrinsicMagnitudes[$this->tle->catnr])) {
            return null;
        }
        $imag = $intrinsicMagnitudes[$this->tle->catnr];

        // Convert the observer's geodetic info to radians and km so
        // we can compare vectors
        $observerGeo      = new Predict_Geodetic();
        $observerGeo->lat = Predict_Math::Radians($qth->lat);
        $observerGeo->lon = Predict_Math::Radians($qth->lon);
        $observerGeo->alt = $qth->alt * 1000;

        // Now determine the sun and observer positions
        $observerPos      = new Predict_Vector();
        $observerVel      = new Predict_Vector();
        $solarVector      = new Predict_Vector();
        Predict_Solar::Calculate_Solar_Position($time, $solarVector);
        Predict_SGPObs::Calculate_User_PosVel($time, $observerGeo, $observerPos, $observerVel);

        // Determine the solar phase and and thus the percent illumination
        $observerSatPos = new Predict_Vector();
        Predict_Math::Vec_Sub($this->pos, $observerPos, $observerSatPos);
        $phaseAngle = Predict_Math::Degrees(Predict_Math::Angle($solarVector, $observerSatPos));
        $illum      = $phaseAngle / 180;

        $illuminationChange            = $illum / $imag['illum'];
        $inverseSquareOfDistanceChange = pow(($imag['distance'] / $this->range), 2);
        $changeInMagnitude             = log(
            $illuminationChange * $inverseSquareOfDistanceChange,
            self::POGSONS_RATIO
        );

        return $imag['mag'] - $changeInMagnitude;
    }
}
