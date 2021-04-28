<?php
header('Content-Type: text/event-stream');
header('Content-Language: en');
header('google: notranslate');

date_default_timezone_set('UTC');

require_once 'Predict.php';
require_once 'Predict/Sat.php';
require_once 'Predict/QTH.php';
require_once 'Predict/Time.php';
require_once 'Predict/TLE.php';

// Track execution time of this script
$start = microtime(true);

// Create New Predict Object
$predict  = new Predict();
// Update preferences
$predict->minEle = isset($_GET["min-el"]) ? $_GET["min-el"] : 3; // Minimum elevation
$predict->maxEle = isset($_GET["max-el"]) ? $_GET["max-el"] : 85; // Maximum elevation
$predict->minAz  = isset($_GET["min-az"]) ? $_GET["min-az"] : 347; // Minimum azimuth
$predict->maxAz  = isset($_GET["max-az"]) ? $_GET["max-az"] : 227; // Maximum azimuth
$predict->minRg  = isset($_GET["min-rg"]) ? $_GET["min-rg"] : 150; // Minimum range
$predict->maxRg  = isset($_GET["max-rg"]) ? $_GET["max-rg"] : 5556; // Maximum range
$predict->minTIC  = isset($_GET["min-tic"]) ? $_GET["min-tic"] : 0; // Minimum time in coverage
$predict->timeRes  = isset($_GET["time-res"]) ? $_GET["time-res"] : 10; // Pass details: time resolution
$predict->timeDays  = isset($_GET["time-days"]) ? $_GET["time-days"] : 2; // Pass details: days of lookangles

$predict->numEntries = 200; // Pass details: number of entries
$predict->threshold  = 10000; // Twilight threshold

// The observer or groundstation is called QTH in ham radio terms
$qth      = new Predict_QTH();

// Set Location and Altitude
$qth->lat = isset($_GET["lat"]) ? $_GET["lat"] : 41.754785;   // Latitude North
$qth->lon = isset($_GET["lon"]) ? $_GET["lon"] : -70.539151; // Longitude East
$qth->alt = isset($_GET["alt"]) ? $_GET["alt"] : 0; // Altitude in meters

// Get Satellite - DEFAULT: 00005
$sat = isset($_GET["sat"]) ? $_GET["sat"] : 5;

ob_start();
$hideConfig = true;
require('tle.php');

// Output Configuration - Needs to be true for tle.php
$hideConfig = isset($_GET["hide-config"]) ? true : false; // Minimum elevation

$tleFile = explode("\n", ob_get_contents());
ob_end_clean();

if ($tleFile[0] == 'Sat Not Found!') {
  echo "Could Not Find Satellite Number!";
  return;
}

// Show Config Before Starting
if ($hideConfig == false) {
  echo "############################################################################\n";
  echo "#                                Configuration                             #\n";
  echo "############################################################################\n";
  echo "hide-config: false\n";
  echo "\n";
  echo "min-el: " . $predict->minEle . "\n";
  echo "max-el: " . $predict->maxEle . "\n";
  echo "min-az: " . $predict->minAz . "\n";
  echo "max-az: " . $predict->maxAz . "\n";
  echo "min-rg: " . $predict->minRg . "\n";
  echo "max-rg: " . $predict->maxRg . "\n";
  echo "min-tic: " . $predict->minTIC . "\n";
  echo "time-res: " . $predict->timeRes . "\n";
  echo "time-days: " . $predict->timeDays . "\n";
  echo "\n";
  echo "lat: " . $qth->lat . "\n";
  echo "lon: " . $qth->lon . "\n";
  echo "alt: " . $qth->alt . "\n";
  echo "\n";
  echo "sat: " . $sat . "\n";
  echo "TLE 0: " . $tleFile[0] . "\n";
  echo "TLE 1: " . $tleFile[1] . "\n";
  echo "TLE 2: " . $tleFile[2] . "\n";
  echo "############################################################################\n\n";
}

$tle     = new Predict_TLE($tleFile[0], $tleFile[1], $tleFile[2]); // Instantiate it
$sat     = new Predict_Sat($tle); // Load up the satellite data
$now     = Predict_Time::get_current_daynum(); // get the current time as Julian Date (daynum)

// You can modify some preferences in Predict(), the defaults are below
//
// $predict->minEle     = 10; // Minimum elevation for a pass
// $predict->timeRes    = 10; // Pass details: time resolution in seconds
// $predict->numEntries = 20; // Pass details: number of entries per pass
// $predict->threshold  = -6; // Twilight threshold (sun must be at this lat or lower)

// Get the passes and filter visible only, takes about 4 seconds for 10 days
$results  = $predict->get_passes($sat, $qth, $now, $predict->timeDays, 1000); // Last part is number of days
$filtered = $predict->filterVisiblePasses($results);

$zone   = 'UTC'; // Pacific time zone
$format = 'm-d-Y H:i:s';         // Time format from PHP's date() function
$passnum = 0;

// Format the output similar to the heavens-above.com website
foreach ($filtered as $pass) {
    $passnum++;
    echo "Pass Number " . $passnum . "\n\n";
    // echo "AOS Daynum: " . $pass->visible_aos . "\n";
    echo "AOS Time: " . Predict_Time::daynum2readable($pass->visible_aos, $zone, $format) . "\n";
    // echo "AOS Az: " . $predict->azDegreesToDirection($pass->visible_aos_az) . "\n";
    echo "AOS Az: " . $pass->visible_aos_az . "\n";
    echo "AOS El: " . round($pass->visible_aos_el) . "\n";
    echo "AOS Rg: " . $pass->visible_aos_rg . "\n";
    echo "\n";

    echo "Max El Time: " . Predict_Time::daynum2readable($pass->visible_tca, $zone, $format) . "\n";
    // echo "Max El Az: " . $predict->azDegreesToDirection($pass->visible_max_el_az) . "\n";
    echo "Max El Az: " . $pass->visible_max_el_az . "\n";
    echo "Max El: " . round($pass->visible_max_el) . "\n";
    echo "Max El Rg: " . $pass->visible_max_el_rg . "\n";
    echo "\n";

    echo "LOS Time: " . Predict_Time::daynum2readable($pass->visible_los, $zone, $format) . "\n";
    // echo "LOS Az: " . $predict->azDegreesToDirection($pass->visible_los_az) . "\n";
    echo "LOS Az: " . $pass->visible_los_az . "\n";
    echo "LOS El: " . round($pass->visible_los_el) . "\n";
    echo "LOS Rg: " . $pass->visible_los_rg . "\n";
    echo "\n";

    // echo "Magnitude: " . number_format($pass->max_apparent_magnitude, 1) . "\n";
    echo "TIC: " . round($pass->time_in_cov) . "\n\n";
    echo "############################################################################\n";
    echo "\n";
}

// How long did this take?
// echo "Execution time:  " . number_format((microtime(true) - $start) * 1000, 2) . "ms\n"; exit;
