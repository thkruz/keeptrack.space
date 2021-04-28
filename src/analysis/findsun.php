<?php
header('Content-Type: text/event-stream');
header('Content-Language: en');
header('google: notranslate');

require_once 'Predict/Solar.php';
require_once 'Predict/QTH.php';

// Set Location and Altitude
$qth = new Predict_QTH();
$qth->lat = isset($_GET["lat"]) ? $_GET["lat"] : 41.754785;   // Latitude North
$qth->lon = isset($_GET["lon"]) ? $_GET["lon"] : -70.539151; // Longitude East
$qth->alt = isset($_GET["alt"]) ? $_GET["alt"] : 0; // Altitude in meters

$min_el = isset($_GET["min-el"]) ? $_GET["min-el"] : 1; // Minimum Elevation
$max_el = isset($_GET["max-el"]) ? $_GET["max-el"] : 5; // Minimum Elevation

$zone   = 'UTC'; // Pacific time zone
$format = 'm-d-Y H:i:s';         // Time format from PHP's date() function

// Output Configuration
$hideConfig = isset($_GET["hide-config"]) ? true : false; // Minimum elevation
$nowOnly = isset($_GET["now-only"]) ? true : false;
$nowOnlyStr = $nowOnly ? "true" : "false";

// Show Config Before Starting
if ($hideConfig == false) {
  echo "############################################################################\n";
  echo "#                                Configuration                             #\n";
  echo "############################################################################\n";
  echo "hide-config: false\n";
  echo "now-only: ". $nowOnlyStr . "\n";
  echo "\n";
  echo "lat: " . $qth->lat . "\n";
  echo "lon: " . $qth->lon . "\n";
  echo "alt: " . $qth->alt . "\n";
  echo "\n";
  echo "min-el: " . $min_el . "\n";
  echo "max-el: " . $max_el . "\n";
  echo "############################################################################\n\n";
}


$i = 0;
$fovLast = false; // Was the sun in FOV
while ($i <= (60 * 24 * 2 )) { // 30 second increments
  $now     = Predict_Time::get_current_daynum() + ($i * (1 / 24 / 60 / 2)); // get the current time as Julian Date (daynum)
  $sunInfo = Predict_Solar::FindSun($qth, $now);

  if ($sunInfo->el >= $min_el && $sunInfo->el <= $max_el || $nowOnly) {
    echo "Time: " . Predict_Time::daynum2readable($now, $zone, $format) . "\n";
    echo "Elevation: " . $sunInfo->el . "\n";
    echo "Azimuth: " . $sunInfo->az . "\n\n";
  }
  if ($nowOnly) return; // Exit if now-only flag
  $i++;
}

/*
Example of JSON Encoding

$output = array(
    'elevation' => $sunInfo->el,
    'azimuth'   => $sunInfo->az,
    'timestamp' => $time
);

// output results
echo json_encode($output);
*/
