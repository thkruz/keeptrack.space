<?php

require_once 'Predict/Vector.php';

/** Pass detail entry.
 *
 * In order to ensure maximum flexibility at a minimal effort, only the
 * raw position and velocity is calculated. Calculations of the
 * "human readable" parameters are the responsibility of the consumer.
 * This way we can use the same prediction engine for various consumers
 * without having too much overhead and complexity in the low level code.
 */
class Predict_PassDetail
{
    public $time;   /*!< time in "jul_utc" */
    public $pos;    /*!< Raw unprocessed position at time */
    public $vel;    /*!< Raw unprocessed velocity at time */
    public $velo;
    public $az;
    public $el;
    public $range;
    public $range_rate;
    public $lat;
    public $lon;
    public $alt;
    public $ma;
    public $phase;
    public $footprint;
    public $vis;
    public $orbit;

    public function __construct()
    {
        $this->pos = new Predict_Vector();
        $this->vel = new Predict_Vector();
    }
}
