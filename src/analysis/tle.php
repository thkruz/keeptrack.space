<?php
header('Content-Type: text/event-stream');
header('Content-Language: en');
header('google: notranslate');

$GLOBALS['TLE_Main_File'] = $_SERVER['DOCUMENT_ROOT'] . '/TLE.json';

$sat = isset($_GET["sat"]) ? $_GET["sat"] : 5;

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
  echo "sat: " . $sat . "\n";
  echo "############################################################################\n\n";
}


// Main Application

$TLE_dict = open_catalogue();
LookupInCatalogue($TLE_dict, $sat);

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function LookupInCatalogue($TLE_dict, $sat){
  if (!is_array($TLE_dict)) {
    echo "\nBad TLE File - " . date("h:i:s", time()) . " - Trying to Reopen.\n";
    $TLE_dict = open_catalogue();
  }
  if (!is_array($TLE_dict)) {
    echo "\nBad TLE File - " . date("h:i:s", time()) . " - Canceling Catalogue Parse.\n";
    return $TLE_dict;
  }

  $TLE_dict;
  $FoundTLE = false;
  foreach ($TLE_dict as $key => $id) {             //Search each JSON File
    if (!is_array($id)) {
        echo "Glitch in the Matrix\n\n";
    }
    else {
      // Parse TLEs
      $ON = $id['ON'];
      $SCC = sprintf('%05d',substr($id['TLE1'], 3-1, 7-3+1));

      // Filters
      if ($SCC != sprintf('%05d',$sat)){ continue; }

      // Results from Filter
      $FoundTLE = true;
      echo $ON . "\n";
      echo $id['TLE1'] . "\n";
      echo $id['TLE2'] . "\n";
    }
  }

  if ($FoundTLE == false) {
    echo "Sat Not Found!\n";
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
