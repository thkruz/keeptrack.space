<?php
/**
 *  Port of deep_arg_t struct from sgp4sdp4.h
 */

/* Common arguments between deep-space functions */
class Predict_DeepArg
{
    /* Used by dpinit part of Deep() */
    public $eosq;
    public $sinio;
    public $cosio;
    public $betao;
    public $aodp;
    public $theta2;
    public $sing;
    public $cosg;
    public $betao2;
    public $xmdot;
    public $omgdot;
    public $xnodot;
    public $xnodp;

    /* Used by dpsec and dpper parts of Deep() */
    public $xll;
    public $omgadf;
    public $xnode;
    public $em;
    public $xinc;
    public $xn;
    public $t;

    /* Used by thetg and Deep() */
    public $ds50;
}
