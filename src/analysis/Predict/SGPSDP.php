<?php
/*
 * Ported to PHP by Bill Shupp from the sgp4sdp4 code in gpredict
 *
 * Original comments below
 */

require_once 'Predict.php';
require_once 'Predict/Time.php';
require_once 'Predict/Math.php';

/* -*- Mode: C; tab-width: 4; indent-tabs-mode: t; c-basic-offset: 4 -*- */
/*
 *  Unit SGP4SDP4
 *           Author:  Dr TS Kelso
 * Original Version:  1991 Oct 30
 * Current Revision:  1992 Sep 03
 *          Version:  1.50
 *        Copyright:  1991-1992, All Rights Reserved
 *
 *   Ported to C by:  Neoklis Kyriazis  April 10  2001
 *   Reentrancy mods by Alexandru Csete OZ9AEC
 */
class Predict_SGPSDP
{
    const ALL_FLAGS             = -1;
    const SGP_INITIALIZED_FLAG  = 0x000001;
    const SGP4_INITIALIZED_FLAG = 0x000002;
    const SDP4_INITIALIZED_FLAG = 0x000004;
    const SGP8_INITIALIZED_FLAG = 0x000008;
    const SDP8_INITIALIZED_FLAG = 0x000010;
    const SIMPLE_FLAG           = 0x000020;
    const DEEP_SPACE_EPHEM_FLAG = 0x000040;
    const LUNAR_TERMS_DONE_FLAG = 0x000080;
    const NEW_EPHEMERIS_FLAG    = 0x000100;
    const DO_LOOP_FLAG          = 0x000200;
    const RESONANCE_FLAG        = 0x000400;
    const SYNCHRONOUS_FLAG      = 0x000800;
    const EPOCH_RESTART_FLAG    = 0x001000;
    const VISIBLE_FLAG          = 0x002000;
    const SAT_ECLIPSED_FLAG     = 0x004000;

    /* orbit_type_t struct */
    const ORBIT_TYPE_UNKNOWN = 0;
    const ORBIT_TYPE_LEO     = 1;            /*!< Low Earth orbit, up to 1200 km. */
    const ORBIT_TYPE_ICO     = 2;            /*!< Intermediate Circular Orbit, up to 1400 km. */
    const ORBIT_TYPE_GEO     = 3;            /*!< Geostationary. */
    const ORBIT_TYPE_GSO     = 4;            /*!< Geosynchronuous. */
    const ORBIT_TYPE_MOLNIYA = 5;
    const ORBIT_TYPE_TUNDRA  = 6;
    const ORBIT_TYPE_POLAR   = 7;
    const ORBIT_TYPE_SUNSYNC = 8;
    const ORBIT_TYPE_DECAYED = 9;



    /* Entry points of Deep()
    // FIXME: Change to enu */
    const dpinit = 1; /* Deep-space initialization code */
    const dpsec  = 2; /* Deep-space secular code        */
    const dpper  = 3; /* Deep-space periodic code       */

    /* SGP4 */
    /* This function is used to calculate the position and velocity */
    /* of near-earth (period < 225 minutes) satellites. tsince is   */
    /* time since epoch in minutes, tle is a pointer to a tle_t     */
    /* structure with Keplerian orbital elements and pos and vel    */
    /* are vector_t structures returning ECI satellite position and */
    /* velocity. Use Convert_Sat_State() to convert to km and km/s.*/
    public function SGP4(Predict_Sat $sat, $tsince)
    {
        /* Initialization */
        if (~$sat->flags & self::SGP4_INITIALIZED_FLAG) {
            $sat->flags |= self::SGP4_INITIALIZED_FLAG;

            /* Recover original mean motion (xnodp) and   */
            /* semimajor axis (aodp) from input elements. */
            $a1 = pow(Predict::xke / $sat->tle->xno, Predict::tothrd);
            $sat->sgps->cosio = cos($sat->tle->xincl);
            $theta2 = $sat->sgps->cosio * $sat->sgps->cosio;
            $sat->sgps->x3thm1 = 3 * $theta2 - 1.0;
            $eosq = $sat->tle->eo * $sat->tle->eo;
            $betao2 = 1 - $eosq;
            $betao = sqrt($betao2);
            $del1 = 1.5 * Predict::ck2 * $sat->sgps->x3thm1 / ($a1 * $a1 * $betao * $betao2);
            $ao = $a1 * (1 - $del1 * (0.5 * Predict::tothrd + $del1 * (1 + 134.0 / 81.0 * $del1)));
            $delo = 1.5 * Predict::ck2 * $sat->sgps->x3thm1 / ($ao * $ao * $betao * $betao2);
            $sat->sgps->xnodp = $sat->tle->xno / (1.0 + $delo);
            $sat->sgps->aodp = $ao / (1.0 - $delo);

            /* For perigee less than 220 kilometers, the "simple" flag is set */
            /* and the equations are truncated to linear variation in sqrt a  */
            /* and quadratic variation in mean anomaly.  Also, the c3 term,   */
            /* the delta omega term, and the delta m term are dropped.        */
            if (($sat->sgps->aodp * (1.0 - $sat->tle->eo) / Predict::ae) < (220.0 / Predict::xkmper + Predict::ae)) {
                $sat->flags |= self::SIMPLE_FLAG;
            } else {
                $sat->flags &= ~self::SIMPLE_FLAG;
            }

            /* For perigee below 156 km, the       */
            /* values of s and qoms2t are altered. */
            $s4 = Predict::__s__;
            $qoms24 = Predict::qoms2t;
            $perige = ($sat->sgps->aodp * (1 - $sat->tle->eo) - Predict::ae) * Predict::xkmper;
            if ($perige < 156.0) {
                if ($perige <= 98.0) {
                    $s4 = 20.0;
                } else {
                    $s4 = $perige - 78.0;
                }
                $qoms24 = pow((120.0 - $s4) * Predict::ae / Predict::xkmper, 4);
                $s4 = $s4 / Predict::xkmper + Predict::ae;
            }; /* FIXME FIXME: End of if(perige <= 98) NO WAY!!!! */

            $pinvsq = 1.0 / ($sat->sgps->aodp * $sat->sgps->aodp * $betao2 * $betao2);
            $tsi = 1.0 / ($sat->sgps->aodp - $s4);
            $sat->sgps->eta = $sat->sgps->aodp * $sat->tle->eo * $tsi;
            $etasq = $sat->sgps->eta * $sat->sgps->eta;
            $eeta = $sat->tle->eo * $sat->sgps->eta;
            $psisq = abs(1.0 - $etasq);
            $coef = $qoms24 * pow($tsi, 4);
            $coef1 = $coef / pow($psisq, 3.5);
            $c2 = $coef1 * $sat->sgps->xnodp * ($sat->sgps->aodp *
                            (1.0 + 1.5 * $etasq + $eeta * (4.0 + $etasq)) +
                            0.75 * Predict::ck2 * $tsi / $psisq * $sat->sgps->x3thm1 *
                            (8.0 + 3.0 * $etasq * (8 + $etasq)));
            $sat->sgps->c1 = $c2 * $sat->tle->bstar;
            $sat->sgps->sinio = sin($sat->tle->xincl);
            $a3ovk2 = -Predict::xj3 / Predict::ck2 * pow(Predict::ae, 3);
            $c3 = $coef * $tsi * $a3ovk2 * $sat->sgps->xnodp * Predict::ae * $sat->sgps->sinio / $sat->tle->eo;
            $sat->sgps->x1mth2 = 1.0 - $theta2;
            $sat->sgps->c4 = 2.0 * $sat->sgps->xnodp * $coef1 * $sat->sgps->aodp * $betao2 *
                ($sat->sgps->eta * (2.0 + 0.5 * $etasq) +
                 $sat->tle->eo * (0.5 + 2.0 * $etasq) -
                 2.0 * Predict::ck2 * $tsi / ($sat->sgps->aodp * $psisq) *
                 (-3.0 * $sat->sgps->x3thm1 * (1.0 - 2.0 * $eeta + $etasq * (1.5 - 0.5 * $eeta)) +
                  0.75 * $sat->sgps->x1mth2 * (2.0 * $etasq - $eeta * (1.0 + $etasq)) *
                  cos(2.0 * $sat->tle->omegao)));
            $sat->sgps->c5 = 2.0 * $coef1 * $sat->sgps->aodp * $betao2 *
                (1.0 + 2.75 * ($etasq + $eeta) + $eeta * $etasq);
            $theta4 = $theta2 * $theta2;
            $temp1 = 3.0 * Predict::ck2 * $pinvsq * $sat->sgps->xnodp;
            $temp2 = $temp1 * Predict::ck2 * $pinvsq;
            $temp3 = 1.25 * Predict::ck4 * $pinvsq * $pinvsq * $sat->sgps->xnodp;
            $sat->sgps->xmdot = $sat->sgps->xnodp + 0.5 * $temp1 * $betao * $sat->sgps->x3thm1 +
                0.0625 * $temp2 * $betao * (13.0 - 78.0 * $theta2 + 137.0 * $theta4);
            $x1m5th = 1.0 - 5.0 * $theta2;
            $sat->sgps->omgdot = -0.5 * $temp1 * $x1m5th +
                0.0625 * $temp2 * (7.0 - 114.0 * $theta2 + 395.0 * $theta4) +
                $temp3 * (3.0 - 36.0 * $theta2 + 49.0 * $theta4);
            $xhdot1 = -$temp1 * $sat->sgps->cosio;
            $sat->sgps->xnodot = $xhdot1 + (0.5 * $temp2 * (4.0 - 19.0 * $theta2) +
                             2.0 * $temp3 * (3.0 - 7.0 * $theta2)) * $sat->sgps->cosio;
            $sat->sgps->omgcof = $sat->tle->bstar * $c3 * cos($sat->tle->omegao);
            $sat->sgps->xmcof = -Predict::tothrd * $coef * $sat->tle->bstar * Predict::ae / $eeta;
            $sat->sgps->xnodcf = 3.5 * $betao2 * $xhdot1 * $sat->sgps->c1;
            $sat->sgps->t2cof = 1.5 * $sat->sgps->c1;
            $sat->sgps->xlcof = 0.125 * $a3ovk2 * $sat->sgps->sinio *
                (3.0 + 5.0 * $sat->sgps->cosio) / (1.0 + $sat->sgps->cosio);
            $sat->sgps->aycof = 0.25 * $a3ovk2 * $sat->sgps->sinio;
            $sat->sgps->delmo = pow(1.0 + $sat->sgps->eta * cos($sat->tle->xmo), 3);
            $sat->sgps->sinmo = sin($sat->tle->xmo);
            $sat->sgps->x7thm1 = 7.0 * $theta2 - 1.0;
            if (~$sat->flags & self::SIMPLE_FLAG) {
                $c1sq = $sat->sgps->c1 * $sat->sgps->c1;
                $sat->sgps->d2 = 4.0 * $sat->sgps->aodp * $tsi * $c1sq;
                $temp = $sat->sgps->d2 * $tsi * $sat->sgps->c1 / 3.0;
                $sat->sgps->d3 = (17.0 * $sat->sgps->aodp + $s4) * $temp;
                $sat->sgps->d4 = 0.5 * $temp * $sat->sgps->aodp * $tsi *
                    (221.0 * $sat->sgps->aodp + 31.0 * $s4) * $sat->sgps->c1;
                $sat->sgps->t3cof = $sat->sgps->d2 + 2.0 * $c1sq;
                $sat->sgps->t4cof = 0.25 * (3.0 * $sat->sgps->d3 + $sat->sgps->c1 *
                              (12.0 * $sat->sgps->d2 + 10.0 * $c1sq));
                $sat->sgps->t5cof = 0.2 * (3.0 * $sat->sgps->d4 +
                             12.0 * $sat->sgps->c1 * $sat->sgps->d3 +
                             6.0 * $sat->sgps->d2 * $sat->sgps->d2 +
                             15.0 * $c1sq * (2.0 * $sat->sgps->d2 + $c1sq));
            }; /* End of if (isFlagClear(SIMPLE_FLAG)) */
        }; /* End of SGP4() initialization */

        /* Update for secular gravity and atmospheric drag. */
        $xmdf = $sat->tle->xmo + $sat->sgps->xmdot * $tsince;
        $omgadf = $sat->tle->omegao + $sat->sgps->omgdot * $tsince;
        $xnoddf = $sat->tle->xnodeo + $sat->sgps->xnodot * $tsince;
        $omega = $omgadf;
        $xmp = $xmdf;
        $tsq = $tsince * $tsince;
        $xnode = $xnoddf + $sat->sgps->xnodcf * $tsq;
        $tempa = 1.0 - $sat->sgps->c1 * $tsince;
        $tempe = $sat->tle->bstar * $sat->sgps->c4 * $tsince;
        $templ = $sat->sgps->t2cof * $tsq;
        if (~$sat->flags & self::SIMPLE_FLAG) {
            $delomg = $sat->sgps->omgcof * $tsince;
            $delm = $sat->sgps->xmcof * (pow(1 + $sat->sgps->eta * cos($xmdf), 3) - $sat->sgps->delmo);
            $temp = $delomg + $delm;
            $xmp = $xmdf + $temp;
            $omega = $omgadf - $temp;
            $tcube = $tsq * $tsince;
            $tfour = $tsince * $tcube;
            $tempa = $tempa - $sat->sgps->d2 * $tsq - $sat->sgps->d3 * $tcube - $sat->sgps->d4 * $tfour;
            $tempe = $tempe + $sat->tle->bstar * $sat->sgps->c5 * (sin($xmp) - $sat->sgps->sinmo);
            $templ = $templ + $sat->sgps->t3cof * $tcube + $tfour *
                ($sat->sgps->t4cof + $tsince * $sat->sgps->t5cof);
        }; /* End of if (isFlagClear(SIMPLE_FLAG)) */

        $a = $sat->sgps->aodp * pow($tempa, 2);
        $e = $sat->tle->eo - $tempe;
        $xl = $xmp + $omega + $xnode + $sat->sgps->xnodp * $templ;
        $beta = sqrt(1.0 - ($e * $e));
        $xn = Predict::xke / pow($a, 1.5);

        /* Long period periodics */
        $axn = $e * cos($omega);
        $temp = 1.0 / ($a * $beta * $beta);
        $xll = $temp * $sat->sgps->xlcof * $axn;
        $aynl = $temp * $sat->sgps->aycof;
        $xlt = $xl + $xll;
        $ayn = $e * sin($omega) + $aynl;

        /* Solve Kepler's' Equation */
        $capu = Predict_Math::FMod2p($xlt - $xnode);
        $temp2 = $capu;

        $i = 0;
        do {
            $sinepw = sin($temp2);
            $cosepw = cos($temp2);
            $temp3 = $axn * $sinepw;
            $temp4 = $ayn * $cosepw;
            $temp5 = $axn * $cosepw;
            $temp6 = $ayn * $sinepw;
            $epw = ($capu - $temp4 + $temp3 - $temp2) / (1.0 - $temp5 - $temp6) + $temp2;
            if (abs($epw - $temp2) <= Predict::e6a) {
                break;
            }
            $temp2 = $epw;
        } while ($i++ < 10);

        /* Short period preliminary quantities */
        $ecose = $temp5 + $temp6;
        $esine = $temp3 - $temp4;
        $elsq = $axn * $axn + $ayn * $ayn;
        $temp = 1.0 - $elsq;
        $pl = $a * $temp;
        $r = $a * (1.0 - $ecose);
        $temp1 = 1.0 / $r;
        $rdot = Predict::xke * sqrt($a) * $esine * $temp1;
        $rfdot = Predict::xke * sqrt($pl) * $temp1;
        $temp2 = $a * $temp1;
        $betal = sqrt($temp);
        $temp3 = 1.0 / (1.0 + $betal);
        $cosu = $temp2 * ($cosepw - $axn + $ayn * $esine * $temp3);
        $sinu = $temp2 * ($sinepw - $ayn - $axn * $esine * $temp3);
        $u = Predict_Math::AcTan($sinu, $cosu);
        $sin2u = 2.0 * $sinu * $cosu;
        $cos2u = 2.0 * $cosu * $cosu - 1.0;
        $temp = 1.0 / $pl;
        $temp1 = Predict::ck2 * $temp;
        $temp2 = $temp1 * $temp;

        /* Update for short periodics */
        $rk = $r * (1.0 - 1.5 * $temp2 * $betal * $sat->sgps->x3thm1) +
            0.5 * $temp1 * $sat->sgps->x1mth2 * $cos2u;
        $uk = $u - 0.25 * $temp2 * $sat->sgps->x7thm1 * $sin2u;
        $xnodek = $xnode + 1.5 * $temp2 * $sat->sgps->cosio * $sin2u;
        $xinck = $sat->tle->xincl + 1.5 * $temp2 * $sat->sgps->cosio * $sat->sgps->sinio * $cos2u;
        $rdotk = $rdot - $xn * $temp1 * $sat->sgps->x1mth2 * $sin2u;
        $rfdotk = $rfdot + $xn * $temp1 * ($sat->sgps->x1mth2 * $cos2u + 1.5 * $sat->sgps->x3thm1);


        /* Orientation vectors */
        $sinuk = sin($uk);
        $cosuk = cos($uk);
        $sinik = sin($xinck);
        $cosik = cos($xinck);
        $sinnok = sin($xnodek);
        $cosnok = cos($xnodek);
        $xmx = -$sinnok * $cosik;
        $xmy = $cosnok * $cosik;
        $ux = $xmx * $sinuk + $cosnok * $cosuk;
        $uy = $xmy * $sinuk + $sinnok * $cosuk;
        $uz = $sinik * $sinuk;
        $vx = $xmx * $cosuk - $cosnok * $sinuk;
        $vy = $xmy * $cosuk - $sinnok * $sinuk;
        $vz = $sinik * $cosuk;

        /* Position and velocity */
        $sat->pos->x = $rk * $ux;
        $sat->pos->y = $rk * $uy;
        $sat->pos->z = $rk * $uz;
        $sat->vel->x = $rdotk * $ux + $rfdotk * $vx;
        $sat->vel->y = $rdotk * $uy + $rfdotk * $vy;
        $sat->vel->z = $rdotk * $uz + $rfdotk * $vz;

        $sat->phase = $xlt - $xnode - $omgadf + Predict::twopi;
        if ($sat->phase < 0) {
            $sat->phase += Predict::twopi;
        }
        $sat->phase = Predict_Math::FMod2p($sat->phase);

        $sat->tle->omegao1 = $omega;
        $sat->tle->xincl1  = $xinck;
        $sat->tle->xnodeo1 = $xnodek;

    } /*SGP4*/

    /* SDP4 */
    /* This function is used to calculate the position and velocity */
    /* of deep-space (period > 225 minutes) satellites. tsince is   */
    /* time since epoch in minutes, tle is a pointer to a tle_t     */
    /* structure with Keplerian orbital elements and pos and vel    */
    /* are vector_t structures returning ECI satellite position and */
    /* velocity. Use Convert_Sat_State() to convert to km and km/s. */
    public function SDP4(Predict_Sat $sat, $tsince)
    {
        /* Initialization */
        if (~$sat->flags & self::SDP4_INITIALIZED_FLAG) {

            $sat->flags |= self::SDP4_INITIALIZED_FLAG;

            /* Recover original mean motion (xnodp) and   */
            /* semimajor axis (aodp) from input elements. */
            $a1 = pow(Predict::xke / $sat->tle->xno, Predict::tothrd);
            $sat->deep_arg->cosio = cos($sat->tle->xincl);
            $sat->deep_arg->theta2 = $sat->deep_arg->cosio * $sat->deep_arg->cosio;
            $sat->sgps->x3thm1 = 3.0 * $sat->deep_arg->theta2 - 1.0;
            $sat->deep_arg->eosq = $sat->tle->eo * $sat->tle->eo;
            $sat->deep_arg->betao2 = 1.0 - $sat->deep_arg->eosq;
            $sat->deep_arg->betao = sqrt($sat->deep_arg->betao2);
            $del1 = 1.5 * Predict::ck2 * $sat->sgps->x3thm1 /
                ($a1 * $a1 * $sat->deep_arg->betao * $sat->deep_arg->betao2);
            $ao = $a1 * (1.0 - $del1 * (0.5 * Predict::tothrd + $del1 * (1.0 + 134.0 / 81.0 * $del1)));
            $delo = 1.5 * Predict::ck2 * $sat->sgps->x3thm1 /
                ($ao * $ao * $sat->deep_arg->betao * $sat->deep_arg->betao2);
            $sat->deep_arg->xnodp = $sat->tle->xno / (1.0 + $delo);
            $sat->deep_arg->aodp = $ao / (1.0 - $delo);

            /* For perigee below 156 km, the values */
            /* of s and qoms2t are altered.         */
            $s4 = Predict::__s__;
            $qoms24 = Predict::qoms2t;
            $perige = ($sat->deep_arg->aodp * (1.0 - $sat->tle->eo) - Predict::ae) * Predict::xkmper;
            if ($perige < 156.0) {
                if ($perige <= 98.0) {
                    $s4 = 20.0;
                } else {
                    $s4 = $perige - 78.0;
                }
                $qoms24 = pow((120.0 - $s4) * Predict::ae / Predict::xkmper, 4);
                $s4 = $s4 / Predict::xkmper + Predict::ae;
            }
            $pinvsq = 1.0 / ($sat->deep_arg->aodp * $sat->deep_arg->aodp *
                    $sat->deep_arg->betao2 * $sat->deep_arg->betao2);
            $sat->deep_arg->sing = sin($sat->tle->omegao);
            $sat->deep_arg->cosg = cos($sat->tle->omegao);
            $tsi = 1.0 / ($sat->deep_arg->aodp - $s4);
            $eta = $sat->deep_arg->aodp * $sat->tle->eo * $tsi;
            $etasq = $eta * $eta;
            $eeta = $sat->tle->eo * $eta;
            $psisq = abs(1.0 - $etasq);
            $coef = $qoms24 * pow($tsi, 4);
            $coef1 = $coef / pow($psisq, 3.5);
            $c2 = $coef1 * $sat->deep_arg->xnodp * ($sat->deep_arg->aodp *
                                (1.0 + 1.5 * $etasq + $eeta *
                                 (4.0 + $etasq)) + 0.75 * Predict::ck2 * $tsi / $psisq *
                                $sat->sgps->x3thm1 * (8.0 + 3.0 * $etasq *
                                        (8.0 + $etasq)));
            $sat->sgps->c1 = $sat->tle->bstar * $c2;
            $sat->deep_arg->sinio = sin($sat->tle->xincl);
            $a3ovk2 = -Predict::xj3 / Predict::ck2 * pow(Predict::ae, 3);
            $sat->sgps->x1mth2 = 1.0 - $sat->deep_arg->theta2;
            $sat->sgps->c4 = 2.0 * $sat->deep_arg->xnodp * $coef1 *
                $sat->deep_arg->aodp * $sat->deep_arg->betao2 *
                ($eta * (2.0 + 0.5 * $etasq) + $sat->tle->eo *
                 (0.5 + 2.0 * $etasq) - 2.0 * Predict::ck2 * $tsi /
                 ($sat->deep_arg->aodp * $psisq) * (-3.0 * $sat->sgps->x3thm1 *
                                 (1.0 - 2.0 * $eeta + $etasq *
                                  (1.5 - 0.5 * $eeta)) +
                                 0.75 * $sat->sgps->x1mth2 *
                                 (2.0 * $etasq - $eeta * (1.0 + $etasq)) *
                                 cos(2.0 * $sat->tle->omegao)));
            $theta4 = $sat->deep_arg->theta2 * $sat->deep_arg->theta2;
            $temp1 = 3.0 * Predict::ck2 * $pinvsq * $sat->deep_arg->xnodp;
            $temp2 = $temp1 * Predict::ck2 * $pinvsq;
            $temp3 = 1.25 * Predict::ck4 * $pinvsq * $pinvsq * $sat->deep_arg->xnodp;
            $sat->deep_arg->xmdot = $sat->deep_arg->xnodp + 0.5 * $temp1 * $sat->deep_arg->betao *
                $sat->sgps->x3thm1 + 0.0625 * $temp2 * $sat->deep_arg->betao *
                (13.0 - 78.0 * $sat->deep_arg->theta2 + 137.0 * $theta4);
            $x1m5th = 1.0 - 5.0 * $sat->deep_arg->theta2;
            $sat->deep_arg->omgdot = -0.5 * $temp1 * $x1m5th + 0.0625 * $temp2 *
                            (7.0 - 114.0 * $sat->deep_arg->theta2 + 395.0 * $theta4) +
                        $temp3 * (3.0 - 36.0 * $sat->deep_arg->theta2 + 49.0 * $theta4);
            $xhdot1 = -$temp1 * $sat->deep_arg->cosio;
            $sat->deep_arg->xnodot = $xhdot1 + (0.5 * $temp2 * (4.0 - 19.0 * $sat->deep_arg->theta2) +
                             2.0 * $temp3 * (3.0 - 7.0 * $sat->deep_arg->theta2)) *
                $sat->deep_arg->cosio;
            $sat->sgps->xnodcf = 3.5 * $sat->deep_arg->betao2 * $xhdot1 * $sat->sgps->c1;
            $sat->sgps->t2cof = 1.5 * $sat->sgps->c1;
            $sat->sgps->xlcof = 0.125 * $a3ovk2 * $sat->deep_arg->sinio *
                (3.0 + 5.0 * $sat->deep_arg->cosio) / (1.0 + $sat->deep_arg->cosio);
            $sat->sgps->aycof = 0.25 * $a3ovk2 * $sat->deep_arg->sinio;
            $sat->sgps->x7thm1 = 7.0 * $sat->deep_arg->theta2 - 1.0;

            /* initialize Deep() */
            $this->Deep(self::dpinit, $sat);
        }; /*End of SDP4() initialization */

        /* Update for secular gravity and atmospheric drag */
        $xmdf = $sat->tle->xmo + $sat->deep_arg->xmdot * $tsince;
        $sat->deep_arg->omgadf = $sat->tle->omegao + $sat->deep_arg->omgdot * $tsince;
        $xnoddf = $sat->tle->xnodeo + $sat->deep_arg->xnodot * $tsince;
        $tsq = $tsince * $tsince;
        $sat->deep_arg->xnode = $xnoddf + $sat->sgps->xnodcf * $tsq;
        $tempa = 1.0 - $sat->sgps->c1 * $tsince;
        $tempe = $sat->tle->bstar * $sat->sgps->c4 * $tsince;
        $templ = $sat->sgps->t2cof * $tsq;
        $sat->deep_arg->xn = $sat->deep_arg->xnodp;

        /* Update for deep-space secular effects */
        $sat->deep_arg->xll = $xmdf;
        $sat->deep_arg->t = $tsince;

        $this->Deep(self::dpsec, $sat);

        $xmdf = $sat->deep_arg->xll;
        $a = pow(Predict::xke / $sat->deep_arg->xn, Predict::tothrd) * $tempa * $tempa;
        $sat->deep_arg->em = $sat->deep_arg->em - $tempe;
        $xmam = $xmdf + $sat->deep_arg->xnodp * $templ;

        /* Update for deep-space periodic effects */
        $sat->deep_arg->xll = $xmam;

        $this->Deep(self::dpper, $sat);

        $xmam = $sat->deep_arg->xll;
        $xl = $xmam + $sat->deep_arg->omgadf + $sat->deep_arg->xnode;
        $beta = sqrt(1.0 - $sat->deep_arg->em * $sat->deep_arg->em);
        $sat->deep_arg->xn = Predict::xke / pow($a, 1.5);

        /* Long period periodics */
        $axn = $sat->deep_arg->em * cos($sat->deep_arg->omgadf);
        $temp = 1.0 / ($a * $beta * $beta);
        $xll = $temp * $sat->sgps->xlcof * $axn;
        $aynl = $temp * $sat->sgps->aycof;
        $xlt = $xl + $xll;
        $ayn = $sat->deep_arg->em * sin($sat->deep_arg->omgadf) + $aynl;

        /* Solve Kepler's Equation */
        $capu = Predict_Math::FMod2p ($xlt - $sat->deep_arg->xnode);
        $temp2 = $capu;

        $i = 0;
        do {
            $sinepw = sin($temp2);
            $cosepw = cos($temp2);
            $temp3 = $axn * $sinepw;
            $temp4 = $ayn * $cosepw;
            $temp5 = $axn * $cosepw;
            $temp6 = $ayn * $sinepw;
            $epw = ($capu - $temp4 + $temp3 - $temp2) / (1.0 - $temp5 - $temp6) + $temp2;
            if (abs($epw - $temp2) <= Predict::e6a) {
                break;
            }
            $temp2 = $epw;
        } while ($i++ < 10);

        /* Short period preliminary quantities */
        $ecose = $temp5 + $temp6;
        $esine = $temp3 - $temp4;
        $elsq = $axn * $axn + $ayn * $ayn;
        $temp = 1.0 - $elsq;
        $pl = $a * $temp;
        $r = $a * (1.0 - $ecose);
        $temp1 = 1.0 / $r;
        $rdot = Predict::xke * sqrt($a) * $esine * $temp1;
        $rfdot = Predict::xke * sqrt($pl) * $temp1;
        $temp2 = $a * $temp1;
        $betal = sqrt($temp);
        $temp3 = 1.0 / (1.0 + $betal);
        $cosu = $temp2 * ($cosepw - $axn + $ayn * $esine * $temp3);
        $sinu = $temp2 * ($sinepw - $ayn - $axn * $esine * $temp3);
        $u = Predict_Math::AcTan($sinu, $cosu);
        $sin2u = 2.0 * $sinu * $cosu;
        $cos2u = 2.0 * $cosu * $cosu - 1.0;
        $temp = 1.0 / $pl;
        $temp1 = Predict::ck2 * $temp;
        $temp2 = $temp1 * $temp;

        /* Update for short periodics */
        $rk = $r * (1.0 - 1.5 * $temp2 * $betal * $sat->sgps->x3thm1) +
             0.5 * $temp1 * $sat->sgps->x1mth2 * $cos2u;
        $uk = $u - 0.25 * $temp2 * $sat->sgps->x7thm1 * $sin2u;
        $xnodek = $sat->deep_arg->xnode + 1.5 * $temp2 * $sat->deep_arg->cosio * $sin2u;
        $xinck = $sat->deep_arg->xinc + 1.5 * $temp2 *
             $sat->deep_arg->cosio * $sat->deep_arg->sinio * $cos2u;
        $rdotk = $rdot - $sat->deep_arg->xn * $temp1 * $sat->sgps->x1mth2 * $sin2u;
        $rfdotk = $rfdot + $sat->deep_arg->xn * $temp1 *
             ($sat->sgps->x1mth2 * $cos2u + 1.5 * $sat->sgps->x3thm1);

        /* Orientation vectors */
        $sinuk = sin($uk);
        $cosuk = cos($uk);
        $sinik = sin($xinck);
        $cosik = cos($xinck);
        $sinnok = sin($xnodek);
        $cosnok = cos($xnodek);
        $xmx = -$sinnok * $cosik;
        $xmy = $cosnok * $cosik;
        $ux = $xmx * $sinuk + $cosnok * $cosuk;
        $uy = $xmy * $sinuk + $sinnok * $cosuk;
        $uz = $sinik * $sinuk;
        $vx = $xmx * $cosuk - $cosnok * $sinuk;
        $vy = $xmy * $cosuk - $sinnok * $sinuk;
        $vz = $sinik * $cosuk;

        /* Position and velocity */
        $sat->pos->x = $rk * $ux;
        $sat->pos->y = $rk * $uy;
        $sat->pos->z = $rk * $uz;
        $sat->vel->x = $rdotk * $ux + $rfdotk * $vx;
        $sat->vel->y = $rdotk * $uy + $rfdotk * $vy;
        $sat->vel->z = $rdotk * $uz + $rfdotk * $vz;

        /* Phase in rads */
        $sat->phase = $xlt - $sat->deep_arg->xnode - $sat->deep_arg->omgadf + Predict::twopi;
        if ($sat->phase < 0.0) {
            $sat->phase += Predict::twopi;
        }
        $sat->phase = Predict_Math::FMod2p ($sat->phase);

        $sat->tle->omegao1 = $sat->deep_arg->omgadf;
        $sat->tle->xincl1  = $sat->deep_arg->xinc;
        $sat->tle->xnodeo1 = $sat->deep_arg->xnode;
    } /* SDP4 */


    /* DEEP */
    /* This function is used by SDP4 to add lunar and solar */
    /* perturbation effects to deep-space orbit objects.    */
    public function Deep($ientry, Predict_Sat $sat)
    {
        switch ($ientry) {
        case self::dpinit : /* Entrance for deep space initialization */
            $sat->dps->thgr = Predict_Time::ThetaG($sat->tle->epoch, $sat->deep_arg);
            $eq = $sat->tle->eo;
            $sat->dps->xnq = $sat->deep_arg->xnodp;
            $aqnv = 1.0 / $sat->deep_arg->aodp;
            $sat->dps->xqncl = $sat->tle->xincl;
            $xmao = $sat->tle->xmo;
            $xpidot = $sat->deep_arg->omgdot + $sat->deep_arg->xnodot;
            $sinq = sin($sat->tle->xnodeo);
            $cosq = cos($sat->tle->xnodeo);
            $sat->dps->omegaq = $sat->tle->omegao;
            $sat->dps->preep = 0;

            /* Initialize lunar solar terms */
            $day = $sat->deep_arg->ds50 + 18261.5;  /* Days since 1900 Jan 0.5 */
            if ($day != $sat->dps->preep) {
                $sat->dps->preep = $day;
                $xnodce = 4.5236020 - 9.2422029E-4 * $day;
                $stem = sin($xnodce);
                $ctem = cos($xnodce);
                $sat->dps->zcosil = 0.91375164 - 0.03568096 * $ctem;
                $sat->dps->zsinil = sqrt(1.0 - $sat->dps->zcosil * $sat->dps->zcosil);
                $sat->dps->zsinhl = 0.089683511 * $stem / $sat->dps->zsinil;
                $sat->dps->zcoshl = sqrt(1.0 - $sat->dps->zsinhl * $sat->dps->zsinhl);
                $c = 4.7199672 + 0.22997150 * $day;
                $gam = 5.8351514 + 0.0019443680 * $day;
                $sat->dps->zmol = Predict_Math::FMod2p($c - $gam);
                $zx = 0.39785416 * $stem / $sat->dps->zsinil;
                $zy = $sat->dps->zcoshl * $ctem + 0.91744867 * $sat->dps->zsinhl * $stem;
                $zx = Predict_Math::AcTan($zx, $zy);
                $zx = $gam + $zx - $xnodce;
                $sat->dps->zcosgl = cos($zx);
                $sat->dps->zsingl = sin($zx);
                $sat->dps->zmos = 6.2565837 + 0.017201977 * $day;
                $sat->dps->zmos = Predict_Math::FMod2p($sat->dps->zmos);
            } /* End if(day != preep) */

            /* Do solar terms */
            $sat->dps->savtsn = 1E20;
            $zcosg = Predict::zcosgs;
            $zsing = Predict::zsings;
            $zcosi = Predict::zcosis;
            $zsini = Predict::zsinis;
            $zcosh = $cosq;
            $zsinh = $sinq;
            $cc = Predict::c1ss;
            $zn = Predict::zns;
            $ze = Predict::zes;
            $zmo = $sat->dps->zmos;
            $xnoi = 1.0 / $sat->dps->xnq;

            /* Loop breaks when Solar terms are done a second */
            /* time, after Lunar terms are initialized        */
            for(;;) {
                /* Solar terms done again after Lunar terms are done */
                $a1 = $zcosg * $zcosh + $zsing * $zcosi * $zsinh;
                $a3 = -$zsing * $zcosh + $zcosg * $zcosi * $zsinh;
                $a7 = -$zcosg * $zsinh + $zsing * $zcosi * $zcosh;
                $a8 = $zsing * $zsini;
                $a9 = $zsing * $zsinh + $zcosg * $zcosi * $zcosh;
                $a10 = $zcosg * $zsini;
                $a2 = $sat->deep_arg->cosio * $a7 + $sat->deep_arg->sinio * $a8;
                $a4 = $sat->deep_arg->cosio * $a9 + $sat->deep_arg->sinio * $a10;
                $a5 = -$sat->deep_arg->sinio * $a7 + $sat->deep_arg->cosio * $a8;
                $a6 = -$sat->deep_arg->sinio * $a9 + $sat->deep_arg->cosio * $a10;
                $x1 = $a1 * $sat->deep_arg->cosg + $a2 * $sat->deep_arg->sing;
                $x2 = $a3 * $sat->deep_arg->cosg + $a4 * $sat->deep_arg->sing;
                $x3 = -$a1 * $sat->deep_arg->sing + $a2 * $sat->deep_arg->cosg;
                $x4 = -$a3 * $sat->deep_arg->sing + $a4 * $sat->deep_arg->cosg;
                $x5 = $a5 * $sat->deep_arg->sing;
                $x6 = $a6 * $sat->deep_arg->sing;
                $x7 = $a5 * $sat->deep_arg->cosg;
                $x8 = $a6 * $sat->deep_arg->cosg;
                $z31 = 12 * $x1 * $x1 - 3 * $x3 * $x3;
                $z32 = 24 * $x1 * $x2 - 6 * $x3 * $x4;
                $z33 = 12 * $x2 * $x2 - 3 * $x4 * $x4;
                $z1 = 3 * ($a1 * $a1 + $a2 * $a2) + $z31 * $sat->deep_arg->eosq;
                $z2 = 6 * ($a1 * $a3 + $a2 * $a4) + $z32 * $sat->deep_arg->eosq;
                $z3 = 3 * ($a3 * $a3 + $a4 * $a4) + $z33 * $sat->deep_arg->eosq;
                $z11 = -6 * $a1 * $a5 + $sat->deep_arg->eosq * (-24 * $x1 * $x7 - 6 * $x3 * $x5);
                $z12 = -6 * ($a1 * $a6 + $a3 * $a5) + $sat->deep_arg->eosq *
                    (-24 * ($x2 * $x7 + $x1 * $x8) - 6 * ($x3 * $x6 + $x4 * $x5));
                $z13 = -6 * $a3 * $a6 + $sat->deep_arg->eosq * (-24 * $x2 * $x8 - 6 * $x4 * $x6);
                $z21 = 6 * $a2 * $a5 + $sat->deep_arg->eosq * (24 * $x1 * $x5 - 6 * $x3 * $x7);
                $z22 = 6 * ($a4 * $a5 + $a2 * $a6) + $sat->deep_arg->eosq *
                    (24 * ($x2 * $x5 + $x1 * $x6) - 6 * ($x4 * $x7 + $x3 * $x8));
                $z23 = 6 * $a4 * $a6 + $sat->deep_arg->eosq * (24 * $x2 * $x6 - 6 * $x4 * $x8);
                $z1 = $z1 + $z1 + $sat->deep_arg->betao2 * $z31;
                $z2 = $z2 + $z2 + $sat->deep_arg->betao2 * $z32;
                $z3 = $z3 + $z3 + $sat->deep_arg->betao2 * $z33;
                $s3 = $cc * $xnoi;
                $s2 = -0.5 * $s3 / $sat->deep_arg->betao;
                $s4 = $s3 * $sat->deep_arg->betao;
                $s1 = -15 * $eq * $s4;
                $s5 = $x1 * $x3 + $x2 * $x4;
                $s6 = $x2 * $x3 + $x1 * $x4;
                $s7 = $x2 * $x4 - $x1 * $x3;
                $se = $s1 * $zn * $s5;
                $si = $s2 * $zn * ($z11 + $z13);
                $sl = -$zn * $s3 * ($z1 + $z3 - 14 - 6 * $sat->deep_arg->eosq);
                $sgh = $s4 * $zn * ($z31 + $z33 - 6);
                $sh = -$zn * $s2 * ($z21 + $z23);
                if ($sat->dps->xqncl < 5.2359877E-2) {
                    $sh = 0;
                }
                $sat->dps->ee2 = 2 * $s1 * $s6;
                $sat->dps->e3 = 2 * $s1 * $s7;
                $sat->dps->xi2 = 2 * $s2 * $z12;
                $sat->dps->xi3 = 2 * $s2 * ($z13 - $z11);
                $sat->dps->xl2 = -2 * $s3 * $z2;
                $sat->dps->xl3 = -2 * $s3 * ($z3 - $z1);
                $sat->dps->xl4 = -2 * $s3 * (-21 - 9 * $sat->deep_arg->eosq) * $ze;
                $sat->dps->xgh2 = 2 * $s4 * $z32;
                $sat->dps->xgh3 = 2 * $s4 * ($z33 - $z31);
                $sat->dps->xgh4 = -18 * $s4 * $ze;
                $sat->dps->xh2 = -2 * $s2 * $z22;
                $sat->dps->xh3 = -2 * $s2 * ($z23 - $z21);

                if ($sat->flags & self::LUNAR_TERMS_DONE_FLAG) {
                    break;
                }

                /* Do lunar terms */
                $sat->dps->sse = $se;
                $sat->dps->ssi = $si;
                $sat->dps->ssl = $sl;
                $sat->dps->ssh = $sh / $sat->deep_arg->sinio;
                $sat->dps->ssg = $sgh - $sat->deep_arg->cosio * $sat->dps->ssh;
                $sat->dps->se2 = $sat->dps->ee2;
                $sat->dps->si2 = $sat->dps->xi2;
                $sat->dps->sl2 = $sat->dps->xl2;
                $sat->dps->sgh2 = $sat->dps->xgh2;
                $sat->dps->sh2 = $sat->dps->xh2;
                $sat->dps->se3 = $sat->dps->e3;
                $sat->dps->si3 = $sat->dps->xi3;
                $sat->dps->sl3 = $sat->dps->xl3;
                $sat->dps->sgh3 = $sat->dps->xgh3;
                $sat->dps->sh3 = $sat->dps->xh3;
                $sat->dps->sl4 = $sat->dps->xl4;
                $sat->dps->sgh4 = $sat->dps->xgh4;
                $zcosg = $sat->dps->zcosgl;
                $zsing = $sat->dps->zsingl;
                $zcosi = $sat->dps->zcosil;
                $zsini = $sat->dps->zsinil;
                $zcosh = $sat->dps->zcoshl * $cosq + $sat->dps->zsinhl * $sinq;
                $zsinh = $sinq * $sat->dps->zcoshl - $cosq * $sat->dps->zsinhl;
                $zn = Predict::znl;
                $cc = Predict::c1l;
                $ze = Predict::zel;
                $zmo = $sat->dps->zmol;
                $sat->flags |= self::LUNAR_TERMS_DONE_FLAG;
            } /* End of for(;;) */

            $sat->dps->sse = $sat->dps->sse + $se;
            $sat->dps->ssi = $sat->dps->ssi + $si;
            $sat->dps->ssl = $sat->dps->ssl + $sl;
            $sat->dps->ssg = $sat->dps->ssg + $sgh - $sat->deep_arg->cosio / $sat->deep_arg->sinio * $sh;
            $sat->dps->ssh = $sat->dps->ssh + $sh / $sat->deep_arg->sinio;

            /* Geopotential resonance initialization for 12 hour orbits */
            $sat->flags &= ~self::RESONANCE_FLAG;
            $sat->flags &= ~self::SYNCHRONOUS_FLAG;

            if (!(($sat->dps->xnq < 0.0052359877) && ($sat->dps->xnq > 0.0034906585))) {
                if( ($sat->dps->xnq < 0.00826) || ($sat->dps->xnq > 0.00924) ) {
                    return;
                }
                if ($eq < 0.5) {
                    return;
                }
                $sat->flags |= self::RESONANCE_FLAG;
                $eoc = $eq * $sat->deep_arg->eosq;
                $g201 = -0.306 - ($eq - 0.64) * 0.440;
                if ($eq <= 0.65) {
                    $g211 = 3.616 - 13.247 * $eq + 16.290 * $sat->deep_arg->eosq;
                    $g310 = -19.302 + 117.390 * $eq - 228.419 *
                        $sat->deep_arg->eosq + 156.591 * $eoc;
                    $g322 = -18.9068 + 109.7927 * $eq - 214.6334 *
                        $sat->deep_arg->eosq + 146.5816 * $eoc;
                    $g410 = -41.122 + 242.694 * $eq - 471.094 *
                        $sat->deep_arg->eosq + 313.953 * $eoc;
                    $g422 = -146.407 + 841.880 * $eq - 1629.014 *
                        $sat->deep_arg->eosq + 1083.435 * $eoc;
                    $g520 = -532.114 + 3017.977 * $eq - 5740 *
                        $sat->deep_arg->eosq + 3708.276 * $eoc;
                } else {
                    $g211 = -72.099 + 331.819 * $eq - 508.738 *
                        $sat->deep_arg->eosq + 266.724 * $eoc;
                    $g310 = -346.844 + 1582.851 * $eq - 2415.925 *
                        $sat->deep_arg->eosq + 1246.113 * $eoc;
                    $g322 = -342.585 + 1554.908 * $eq - 2366.899 *
                        $sat->deep_arg->eosq + 1215.972 * $eoc;
                    $g410 = -1052.797 + 4758.686 * $eq - 7193.992 *
                        $sat->deep_arg->eosq + 3651.957 * $eoc;
                    $g422 = -3581.69 + 16178.11 * $eq - 24462.77 *
                        $sat->deep_arg->eosq+ 12422.52 * $eoc;
                    if ($eq <= 0.715) {
                        $g520 = 1464.74 - 4664.75 * $eq + 3763.64 * $sat->deep_arg->eosq;
                    } else {
                        $g520 = -5149.66 + 29936.92 * $eq - 54087.36 *
                            $sat->deep_arg->eosq + 31324.56 * $eoc;
                    }
                } /* End if (eq <= 0.65) */

                if ($eq < 0.7) {
                    $g533 = -919.2277 + 4988.61 * $eq - 9064.77 *
                        $sat->deep_arg->eosq + 5542.21 * $eoc;
                    $g521 = -822.71072 + 4568.6173 * $eq - 8491.4146 *
                        $sat->deep_arg->eosq + 5337.524 * $eoc;
                    $g532 = -853.666 + 4690.25 * $eq - 8624.77 *
                        $sat->deep_arg->eosq + 5341.4 * $eoc;
                }
                else {
                    $g533 = -37995.78 + 161616.52 * $eq - 229838.2*
                        $sat->deep_arg->eosq + 109377.94 * $eoc;
                    $g521 = -51752.104 + 218913.95 * $eq - 309468.16*
                        $sat->deep_arg->eosq + 146349.42 * $eoc;
                    $g532 = -40023.88 + 170470.89 * $eq - 242699.48*
                        $sat->deep_arg->eosq + 115605.82 * $eoc;
                } /* End if (eq <= 0.7) */

                $sini2 = $sat->deep_arg->sinio * $sat->deep_arg->sinio;
                $f220 = 0.75 * (1 + 2 * $sat->deep_arg->cosio + $sat->deep_arg->theta2);
                $f221 = 1.5 * $sini2;
                $f321 = 1.875 * $sat->deep_arg->sinio * (1 - 2 *
                                  $sat->deep_arg->cosio - 3 * $sat->deep_arg->theta2);
                $f322 = -1.875 * $sat->deep_arg->sinio * (1 + 2*
                                   $sat->deep_arg->cosio - 3 * $sat->deep_arg->theta2);
                $f441 = 35 * $sini2 * $f220;
                $f442 = 39.3750 * $sini2 * $sini2;
                $f522 = 9.84375 * $sat->deep_arg->sinio * ($sini2 * (1 - 2 * $sat->deep_arg->cosio - 5 *
                                       $sat->deep_arg->theta2) + 0.33333333 * (-2 + 4 * $sat->deep_arg->cosio +
                                                     6 * $sat->deep_arg->theta2));
                $f523 = $sat->deep_arg->sinio * (4.92187512 * $sini2 * (-2 - 4 *
                                      $sat->deep_arg->cosio + 10 * $sat->deep_arg->theta2) + 6.56250012
                            * (1 + 2 * $sat->deep_arg->cosio - 3 * $sat->deep_arg->theta2));
                $f542 = 29.53125 * $sat->deep_arg->sinio * (2 - 8 *
                                 $sat->deep_arg->cosio + $sat->deep_arg->theta2 *
                                 (-12 + 8 * $sat->deep_arg->cosio + 10 * $sat->deep_arg->theta2));
                $f543 = 29.53125 * $sat->deep_arg->sinio * (-2 - 8 * $sat->deep_arg->cosio +
                                 $sat->deep_arg->theta2 * (12 + 8 * $sat->deep_arg->cosio - 10 *
                                           $sat->deep_arg->theta2));
                $xno2 = $sat->dps->xnq * $sat->dps->xnq;
                $ainv2 = $aqnv * $aqnv;
                $temp1 = 3 * $xno2 * $ainv2;
                $temp = $temp1 * Predict::root22;
                $sat->dps->d2201 = $temp * $f220 * $g201;
                $sat->dps->d2211 = $temp * $f221 * $g211;
                $temp1 = $temp1 * $aqnv;
                $temp = $temp1 * Predict::root32;
                $sat->dps->d3210 = $temp * $f321 * $g310;
                $sat->dps->d3222 = $temp * $f322 * $g322;
                $temp1 = $temp1 * $aqnv;
                $temp = 2 * $temp1 * Predict::root44;
                $sat->dps->d4410 = $temp * $f441 * $g410;
                $sat->dps->d4422 = $temp * $f442 * $g422;
                $temp1 = $temp1 * $aqnv;
                $temp = $temp1 * Predict::root52;
                $sat->dps->d5220 = $temp * $f522 * $g520;
                $sat->dps->d5232 = $temp * $f523 * $g532;
                $temp = 2 * $temp1 * Predict::root54;
                $sat->dps->d5421 = $temp * $f542 * $g521;
                $sat->dps->d5433 = $temp * $f543 * $g533;
                $sat->dps->xlamo = $xmao + $sat->tle->xnodeo + $sat->tle->xnodeo - $sat->dps->thgr - $sat->dps->thgr;
                $bfact = $sat->deep_arg->xmdot + $sat->deep_arg->xnodot +
                    $sat->deep_arg->xnodot - Predict::thdt - Predict::thdt;
                $bfact = $bfact + $sat->dps->ssl + $sat->dps->ssh + $sat->dps->ssh;
            } else {
                $sat->flags |= self::RESONANCE_FLAG;
                $sat->flags |= self::SYNCHRONOUS_FLAG;
                /* Synchronous resonance terms initialization */
                $g200 = 1 + $sat->deep_arg->eosq * (-2.5 + 0.8125 * $sat->deep_arg->eosq);
                $g310 = 1 + 2 * $sat->deep_arg->eosq;
                $g300 = 1 + $sat->deep_arg->eosq * (-6 + 6.60937 * $sat->deep_arg->eosq);
                $f220 = 0.75 * (1 + $sat->deep_arg->cosio) * (1 + $sat->deep_arg->cosio);
                $f311 = 0.9375 * $sat->deep_arg->sinio * $sat->deep_arg->sinio *
                    (1 + 3 * $sat->deep_arg->cosio) - 0.75 * (1 + $sat->deep_arg->cosio);
                $f330 = 1 + $sat->deep_arg->cosio;
                $f330 = 1.875 * $f330 * $f330 * $f330;
                $sat->dps->del1 = 3 * $sat->dps->xnq * $sat->dps->xnq * $aqnv * $aqnv;
                $sat->dps->del2 = 2 * $sat->dps->del1 * $f220 * $g200 * Predict::q22;
                $sat->dps->del3 = 3 * $sat->dps->del1 * $f330 * $g300 * Predict::q33 * $aqnv;
                $sat->dps->del1 = $sat->dps->del1 * $f311 * $g310 * Predict::q31 * $aqnv;
                $sat->dps->fasx2 = 0.13130908;
                $sat->dps->fasx4 = 2.8843198;
                $sat->dps->fasx6 = 0.37448087;
                $sat->dps->xlamo = $xmao + $sat->tle->xnodeo + $sat->tle->omegao - $sat->dps->thgr;
                $bfact = $sat->deep_arg->xmdot + $xpidot - Predict::thdt;
                $bfact = $bfact + $sat->dps->ssl + $sat->dps->ssg + $sat->dps->ssh;
            } /* End if( !(xnq < 0.0052359877) && (xnq > 0.0034906585) ) */

            $sat->dps->xfact = $bfact - $sat->dps->xnq;

            /* Initialize integrator */
            $sat->dps->xli = $sat->dps->xlamo;
            $sat->dps->xni = $sat->dps->xnq;
            $sat->dps->atime = 0;
            $sat->dps->stepp = 720;
            $sat->dps->stepn = -720;
            $sat->dps->step2 = 259200;
            /* End case self::dpinit: */
            return;

        case self::dpsec: /* Entrance for deep space secular effects */
            $sat->deep_arg->xll = $sat->deep_arg->xll + $sat->dps->ssl * $sat->deep_arg->t;
            $sat->deep_arg->omgadf = $sat->deep_arg->omgadf + $sat->dps->ssg * $sat->deep_arg->t;
            $sat->deep_arg->xnode = $sat->deep_arg->xnode + $sat->dps->ssh * $sat->deep_arg->t;
            $sat->deep_arg->em = $sat->tle->eo + $sat->dps->sse * $sat->deep_arg->t;
            $sat->deep_arg->xinc = $sat->tle->xincl + $sat->dps->ssi * $sat->deep_arg->t;
            if ($sat->deep_arg->xinc < 0) {
                $sat->deep_arg->xinc = -$sat->deep_arg->xinc;
                $sat->deep_arg->xnode = $sat->deep_arg->xnode + Predict::pi;
                $sat->deep_arg->omgadf = $sat->deep_arg->omgadf - Predict::pi;
            }
            if(~$sat->flags & self::RESONANCE_FLAG ) {
                return;
            }

            do {
                if ( ($sat->dps->atime == 0) ||
                    (($sat->deep_arg->t >= 0) && ($sat->dps->atime < 0)) ||
                    (($sat->deep_arg->t < 0) && ($sat->dps->atime >= 0)) ) {
                    /* Epoch restart */
                    if ($sat->deep_arg->t >= 0) {
                        $delt = $sat->dps->stepp;
                    } else {
                        $delt = $sat->dps->stepn;
                    }

                    $sat->dps->atime = 0;
                    $sat->dps->xni = $sat->dps->xnq;
                    $sat->dps->xli = $sat->dps->xlamo;
                } else {
                    if (abs($sat->deep_arg->t) >= abs($sat->dps->atime)) {
                        if ($sat->deep_arg->t > 0) {
                            $delt = $sat->dps->stepp;
                        } else {
                            $delt = $sat->dps->stepn;
                        }
                    }
                }

                do {
                    if (abs($sat->deep_arg->t - $sat->dps->atime) >= $sat->dps->stepp) {
                        $sat->flags |= self::DO_LOOP_FLAG;
                        $sat->flags &= ~self::EPOCH_RESTART_FLAG;
                    }
                    else {
                        $ft = $sat->deep_arg->t - $sat->dps->atime;
                        $sat->flags &= ~self::DO_LOOP_FLAG;
                    }

                    if (abs($sat->deep_arg->t) < abs($sat->dps->atime)) {
                        if ($sat->deep_arg->t >= 0) {
                            $delt = $sat->dps->stepn;
                        } else {
                            $delt = $sat->dps->stepp;
                        }
                        $sat->flags |= (self::DO_LOOP_FLAG | self::EPOCH_RESTART_FLAG);
                    }

                    /* Dot terms calculated */
                    if ($sat->flags & self::SYNCHRONOUS_FLAG) {
                        $xndot = $sat->dps->del1 * sin($sat->dps->xli - $sat->dps->fasx2) + $sat->dps->del2 * sin(2 * ($sat->dps->xli - $sat->dps->fasx4))
                            + $sat->dps->del3 * sin(3 * ($sat->dps->xli - $sat->dps->fasx6));
                        $xnddt = $sat->dps->del1 * cos($sat->dps->xli - $sat->dps->fasx2) + 2 * $sat->dps->del2 * cos(2 * ($sat->dps->xli - $sat->dps->fasx4))
                            + 3 * $sat->dps->del3 * cos(3 * ($sat->dps->xli - $sat->dps->fasx6));
                    } else {
                        $xomi = $sat->dps->omegaq + $sat->deep_arg->omgdot * $sat->dps->atime;
                        $x2omi = $xomi + $xomi;
                        $x2li = $sat->dps->xli + $sat->dps->xli;
                        $xndot = $sat->dps->d2201 * sin($x2omi + $sat->dps->xli - Predict::g22)
                            + $sat->dps->d2211 * sin($sat->dps->xli - Predict::g22)
                            + $sat->dps->d3210 * sin($xomi + $sat->dps->xli - Predict::g32)
                            + $sat->dps->d3222 * sin(-$xomi + $sat->dps->xli - Predict::g32)
                            + $sat->dps->d4410 * sin($x2omi + $x2li- Predict::g44)
                            + $sat->dps->d4422 * sin($x2li- Predict::g44)
                            + $sat->dps->d5220 * sin($xomi + $sat->dps->xli- Predict::g52)
                            + $sat->dps->d5232 * sin(-$xomi + $sat->dps->xli- Predict::g52)
                            + $sat->dps->d5421 * sin($xomi + $x2li - Predict::g54)
                            + $sat->dps->d5433 * sin(-$xomi + $x2li - Predict::g54);
                        $xnddt = $sat->dps->d2201 * cos($x2omi + $sat->dps->xli- Predict::g22)
                            + $sat->dps->d2211 * cos($sat->dps->xli - Predict::g22)
                            + $sat->dps->d3210 * cos($xomi + $sat->dps->xli - Predict::g32)
                            + $sat->dps->d3222 * cos(-$xomi + $sat->dps->xli - Predict::g32)
                            + $sat->dps->d5220 * cos($xomi + $sat->dps->xli - Predict::g52)
                            + $sat->dps->d5232 * cos(-$xomi + $sat->dps->xli - Predict::g52)
                            + 2 * ($sat->dps->d4410 * cos($x2omi + $x2li - Predict::g44)
                                + $sat->dps->d4422 * cos($x2li - Predict::g44)
                                + $sat->dps->d5421 * cos($xomi + $x2li - Predict::g54)
                                + $sat->dps->d5433 * cos(-$xomi + $x2li - Predict::g54));
                    } /* End of if (isFlagSet(SYNCHRONOUS_FLAG)) */

                    $xldot = $sat->dps->xni + $sat->dps->xfact;
                    $xnddt = $xnddt * $xldot;

                    if ($sat->flags & self::DO_LOOP_FLAG) {
                        $sat->dps->xli = $sat->dps->xli + $xldot * $delt + $xndot * $sat->dps->step2;
                        $sat->dps->xni = $sat->dps->xni + $xndot * $delt + $xnddt * $sat->dps->step2;
                        $sat->dps->atime = $sat->dps->atime + $delt;
                    }
                } while (($sat->flags & self::DO_LOOP_FLAG) &&
                        (~$sat->flags & self::EPOCH_RESTART_FLAG));
            }
            while (($sat->flags & self::DO_LOOP_FLAG) && ($sat->flags & self::EPOCH_RESTART_FLAG));

            $sat->deep_arg->xn = $sat->dps->xni + $xndot * $ft + $xnddt * $ft * $ft * 0.5;
            $xl = $sat->dps->xli + $xldot * $ft + $xndot * $ft * $ft * 0.5;
            $temp = -$sat->deep_arg->xnode + $sat->dps->thgr + $sat->deep_arg->t * Predict::thdt;

            if (~$sat->flags & self::SYNCHRONOUS_FLAG) {
                $sat->deep_arg->xll = $xl + $temp + $temp;
            } else {
                $sat->deep_arg->xll = $xl - $sat->deep_arg->omgadf + $temp;
            }

            return;
            /* End case dpsec: */

        case self::dpper: /* Entrance for lunar-solar periodics */
            $sinis = sin($sat->deep_arg->xinc);
            $cosis = cos($sat->deep_arg->xinc);
            if (abs($sat->dps->savtsn - $sat->deep_arg->t) >= 30) {
                $sat->dps->savtsn = $sat->deep_arg->t;
                $zm = $sat->dps->zmos + Predict::zns * $sat->deep_arg->t;
                $zf = $zm + 2 * Predict::zes * sin($zm);
                $sinzf = sin($zf);
                $f2 = 0.5 * $sinzf * $sinzf - 0.25;
                $f3 = -0.5 * $sinzf * cos($zf);
                $ses = $sat->dps->se2 * $f2 + $sat->dps->se3 * $f3;
                $sis = $sat->dps->si2 * $f2 + $sat->dps->si3 * $f3;
                $sls = $sat->dps->sl2 * $f2 + $sat->dps->sl3 * $f3 + $sat->dps->sl4 * $sinzf;
                $sat->dps->sghs = $sat->dps->sgh2 * $f2 + $sat->dps->sgh3 * $f3 + $sat->dps->sgh4 * $sinzf;
                $sat->dps->shs = $sat->dps->sh2 * $f2 + $sat->dps->sh3 * $f3;
                $zm = $sat->dps->zmol + Predict::znl * $sat->deep_arg->t;
                $zf = $zm + 2 * Predict::zel * sin($zm);
                $sinzf = sin($zf);
                $f2 = 0.5 * $sinzf * $sinzf - 0.25;
                $f3 = -0.5 * $sinzf * cos($zf);
                $sel = $sat->dps->ee2 * $f2 + $sat->dps->e3 * $f3;
                $sil = $sat->dps->xi2 * $f2 + $sat->dps->xi3 * $f3;
                $sll = $sat->dps->xl2 * $f2 + $sat->dps->xl3 * $f3 + $sat->dps->xl4 * $sinzf;
                $sat->dps->sghl = $sat->dps->xgh2 * $f2 + $sat->dps->xgh3 * $f3 + $sat->dps->xgh4 * $sinzf;
                $sat->dps->sh1 = $sat->dps->xh2 * $f2 + $sat->dps->xh3 * $f3;
                $sat->dps->pe = $ses + $sel;
                $sat->dps->pinc = $sis + $sil;
                $sat->dps->pl = $sls + $sll;
            }

            $pgh = $sat->dps->sghs + $sat->dps->sghl;
            $ph = $sat->dps->shs + $sat->dps->sh1;
            $sat->deep_arg->xinc = $sat->deep_arg->xinc + $sat->dps->pinc;
            $sat->deep_arg->em = $sat->deep_arg->em + $sat->dps->pe;

            if ($sat->dps->xqncl >= 0.2) {
                /* Apply periodics directly */
                $ph = $ph / $sat->deep_arg->sinio;
                $pgh = $pgh - $sat->deep_arg->cosio * $ph;
                $sat->deep_arg->omgadf = $sat->deep_arg->omgadf + $pgh;
                $sat->deep_arg->xnode = $sat->deep_arg->xnode + $ph;
                $sat->deep_arg->xll = $sat->deep_arg->xll + $sat->dps->pl;
            } else {
                /* Apply periodics with Lyddane modification */
                $sinok = sin($sat->deep_arg->xnode);
                $cosok = cos($sat->deep_arg->xnode);
                $alfdp = $sinis * $sinok;
                $betdp = $sinis * $cosok;
                $dalf = $ph * $cosok + $sat->dps->pinc * $cosis * $sinok;
                $dbet = -$ph * $sinok + $sat->dps->pinc * $cosis * $cosok;
                $alfdp = $alfdp + $dalf;
                $betdp = $betdp + $dbet;
                $sat->deep_arg->xnode = Predict_Math::FMod2p($sat->deep_arg->xnode);
                $xls = $sat->deep_arg->xll + $sat->deep_arg->omgadf + $cosis * $sat->deep_arg->xnode;
                $dls = $sat->dps->pl + $pgh - $sat->dps->pinc * $sat->deep_arg->xnode * $sinis;
                $xls = $xls + $dls;
                $xnoh = $sat->deep_arg->xnode;
                $sat->deep_arg->xnode = Predict_Math::AcTan($alfdp, $betdp);

                /* This is a patch to Lyddane modification */
                /* suggested by Rob Matson. */
                if(abs($xnoh - $sat->deep_arg->xnode) > Predict::pi) {
                    if ($sat->deep_arg->xnode < $xnoh) {
                        $sat->deep_arg->xnode += Predict::twopi;
                    } else {
                        $sat->deep_arg->xnode -= Predict::twopi;
                    }
                }

                $sat->deep_arg->xll = $sat->deep_arg->xll + $sat->dps->pl;
                $sat->deep_arg->omgadf = $xls - $sat->deep_arg->xll - cos($sat->deep_arg->xinc) *
                    $sat->deep_arg->xnode;
            } /* End case dpper: */
            return;

        } /* End switch(ientry) */

    } /* End of Deep() */

    /**
     * Singleton
     *
     * @param Predict_Sat $sat The current satellite data instance
     *
     * @return Predict_SGPSDP
     */
    public static function getInstance(Predict_Sat $sat)
    {
        static $instances = array();
        $catnr = $sat->tle->catnr;
        if (!isset($instances[$catnr])) {
            $instances[$catnr] = new self();
        }
        return $instances[$catnr];
    }
}
?>
