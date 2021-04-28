<?php

/** Brief satellite pass info. */
class Predict_Pass
{
    public $satname;  /*!< satellite name */
    public $aos;      /*!< AOS time in "jul_utc" */
    public $tca;      /*!< TCA time in "jul_utc" */
    public $los;      /*!< LOS time in "jul_utc" */
    public $max_el;   /*!< Maximum elevation during pass */
    public $aos_az;   /*!< Azimuth at AOS */
    public $los_az;   /*!< Azimuth at LOS */
    public $orbit;    /*!< Orbit number */
    public $maxel_az; /*!< Azimuth at maximum elevation */
    public $vis;      /*!< Visibility string, e.g. VSE, -S-, V-- */
    public $details = array();  /*!< List of pass_detail_t entries */
    public $max_apparent_magnitude = null; /* maximum apparent magnitude, experimental */
}
