<?php
//a new content type. make sure apache does not gzip this type, else it would get buffered
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache'); // recommended to prevent caching of event data.

//require_once 'lib/Predict.php';

class SatInputs {
  public $inc_min;
  public $inc_max;
  public $meanmo_min;
  public $meanmo_max;
  public $period_min;
  public $period_max;
  public $yr_min;
  public $yr_max;
  public $sat;
}

$GLOBALS['TLE_Main_File'] = '../TLE.json';

// Read Inputs
$sat_query = new SatInputs();
$sat_query->inc_min = isset($_GET["inc-min"]) ? $_GET["inc-min"] : 0;
$sat_query->inc_max = isset($_GET["inc-max"]) ? $_GET["inc-max"] : 180;
$sat_query->meanmo_min = isset($_GET["meanmo-min"]) ? $_GET["meanmo-min"] : 0;
$sat_query->meanmo_max = isset($_GET["meanmo-max"]) ? $_GET["meanmo-max"] : 20;
$sat_query->period_min = isset($_GET["period-min"]) ? $_GET["period-min"] : 0;
$sat_query->period_max = isset($_GET["period-max"]) ? $_GET["period-max"] : 100000;
$sat_query->yr_min = isset($_GET["yr-min"]) ? $_GET["yr-min"] : 0;
$sat_query->yr_max = isset($_GET["yr-max"]) ? $_GET["yr-max"] : 100;
$sat_query->sat = isset($_GET["sat"]) ? $_GET["sat"] : 0;

// Output Configuration
if (!isset($hideConfig))
  $hideConfig = isset($_GET["hide-config"]) ? true : false; // Minimum elevation

// Show Config Before Starting
if ($hideConfig == false) {
  echo "############################################################################\n";
  echo "#                                Configuration                             #\n";
  echo "############################################################################\n";
  echo "hide-config: false\n";
  echo "\n";
  if ($sat_query->sat == 0) {
    echo "sat: 0 (All Satellites)\n";
  } else {
    echo "sat: " . $sat_query->sat . "\n";
  }
  echo "inc-min: " . $sat_query->inc_min . "\n";
  echo "inc-max: " . $sat_query->inc_max . "\n";
  echo "meanmo-min: " . $sat_query->meanmo_min . "\n";
  echo "meanmo-max: " . $sat_query->meanmo_max . "\n";
  echo "period-min: " . $sat_query->period_min . "\n";
  echo "period-max: " . $sat_query->period_max . "\n";
  echo "yr-min: " . $sat_query->yr_min . "\n";
  echo "yr-max: " . $sat_query->yr_max . "\n";
  echo "############################################################################\n\n";
}

// Main Application

$TLE_dict = open_catalogue();
LookupInCatalogue($TLE_dict, $sat_query);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function LookupInCatalogue($TLE_dict, $sat_query){
  if (!is_array($TLE_dict)) {
    echo "\nBad TLE File - " . date("h:i:s", time()) . " - Trying to Reopen.\n";
    $TLE_dict = open_catalogue();
  }
  if (!is_array($TLE_dict)) {
    echo "\nBad TLE File - " . date("h:i:s", time()) . " - Canceling Catalogue Parse.\n";
    return $TLE_dict;
  }

  $TLE_dict;
  foreach ($TLE_dict as $key => $id) {             //Search each JSON File
    if (!is_array($id)) {
        echo "Glitch in the Matrix\n\n";
    }
    else {
      // Parse TLEs
      $SCC = sprintf('%05d',substr($id['TLE1'], 3-1, 7-3+1));

      $LV = $id['LV'];
      if ($LV == "U") { $LV = "Unknown"; }
      $ON = $id['ON'];
      $C = $id['C'];
      $LS = $id['LS'];

      $YR = substr($id['TLE1'], 10-1, 11-10+1);
      $LNCH_NUM = substr($id['TLE1'], 12-1, 14-12+1);
      $LNCH_DES = substr($id['TLE1'], 15-1, 17-15+1);
      $EPOCH_YR = substr($id['TLE1'], 19-1, 20-19+1);
      $EPOCH_DAY = substr($id['TLE1'], 21-1, 32-21+1);
      $MM1 = sprintf('%f', substr($id['TLE1'], 34-1, 43-34+1));
      $MM2 = sprintf('%f', substr($id['TLE1'], 45-1, 52-45+1));
      $BSTAR = sprintf('%f', substr($id['TLE1'], 54-1, 61-54+1));
      $ELSET = substr($id['TLE1'], 65-1, 68-65+1);

      $INC = sprintf('%f', substr($id['TLE2'], 9-1, 16-9+1));
      $RA = sprintf('%f', substr($id['TLE2'], 18-1, 25-18+1));
      $EC = sprintf('%f', substr($id['TLE2'], 27-1, 33-27+1));
      $AUGP = sprintf('%f', substr($id['TLE2'], 35-1, 42-35+1));
      $MEANA = sprintf('%f', substr($id['TLE2'], 44-1, 51-44+1));
      $MEANMO = sprintf('%f', substr($id['TLE2'], 53-1, 63-53+1));
      $PERIOD = (1440 / $MEANMO);
      $REVNUM = sprintf('%d', substr($id['TLE2'], 64-1, 68-64+1));

      // Filters
      if ($SCC != $sat_query->sat && $sat_query->sat != 0){ continue; }
      if (!($YR >= $sat_query->yr_min && $YR <= $sat_query->yr_max)){ continue; }
      if (!($INC >= $sat_query->inc_min && $INC <= $sat_query->inc_max)){ continue; }
      if (!($MEANMO >= $sat_query->meanmo_min && $MEANMO <= $sat_query->meanmo_max)){ continue; }
      if (!($PERIOD >= $sat_query->period_min && $PERIOD <= $sat_query->period_max)){ continue; }

      // Results from Filter
      echo $SCC . "\n";
      echo "\t Name: " . $ON . "\n";
      echo "\t Country: " . $C . "\n";
      echo "\t Launch Vehicle: " . $LV . "\n";
      echo "\t Launch Site: " . $LS . "\n";
      echo "\t year: " . $YR . "\n";
      echo "\t inc: " . $INC . "\n";
      echo "\t meanmo: " . $MEANMO . "\n";
      echo "\t period: " . $PERIOD . "\n";
    }
  }

  return;
}

function open_catalogue(){
  if (isset($TLE_dict)){unset($TLE_dict);}
  if (isset($TLE_file)){unset($TLE_file);}
  $TLE_file = file_get_contents($GLOBALS['TLE_Main_File']);
  $TLE_dict = json_decode($TLE_file, true);
  if (is_array($TLE_dict)) {
    return $TLE_dict;
  }
  else {
    sleep(30);
    if (isset($TLE_dict)){unset($TLE_dict);}
    if (isset($TLE_file)){unset($TLE_file);}
    $TLE_file = file_get_contents($GLOBALS['TLE_Main_File']);
    $TLE_dict = json_decode($TLE_file, true);
  }
}

 ?>
