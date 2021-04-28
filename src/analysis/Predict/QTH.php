<?php

/**
 * Predict_QTH
 *
 * Holds information about the observer's location (aka ground station)
 */
class Predict_QTH
{
     public $name;   /*!< Name, eg. callsign. */
     public $loc;    /*!< Location, eg City, Country. */
     public $desc;   /*!< Short description. */
     public $lat;    /*!< Latitude in dec. deg. North. */
     public $lon;    /*!< Longitude in dec. deg. East. */
     public $alt;    /*!< Altitude above sea level in meters. */
     public $qra;    /*!< QRA locator */
     public $wx;     /*!< Weather station code (4 chars). */

     public $data;   /*!< Raw data from cfg file. */
}
