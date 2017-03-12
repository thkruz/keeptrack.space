<?php
//a new content type. make sure apache does not gzip this type, else it would get buffered
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache'); // recommended to prevent caching of event data.
$GLOBALS['TLE_Temp_File'] = '/var/www/html/admin/TLE/TLE.json';
$GLOBALS['TLE_Main_File'] = '/var/www/html/TLE.json';
$GLOBALS['LV_DATABASE'] = '/var/www/html/admin/LV.txt';
$serverTime = time();
//$progress = 0;
echo "Catalogue Update Initiated\n\n";

$result = array();
$fp = fopen($GLOBALS['LV_DATABASE'],'r');

while (($line = fgetcsv($fp, 0, "\t")) !== FALSE)  {
  $launch = array();
  $launch[] = substr($line[0], 0, 8);
  $launch[] = rtrim(substr($line[0], 47, 25));

  $result[] = $launch;
}

fclose($fp);
// print_r($result[0][1]);

$TLE_dict = open_catalogue(); // Open the TEMP TLE Catalogue


// Attempt to Open the Catalogue twice before ending the script.
// This is mainly for CRON jobs, but does prevent accidental corruption

if (!is_array($TLE_dict)) {
  echo "\nBad TLE File - " . date("h:i:s", time()) . " - Trying to Reopen.\n";
  $TLE_dict = open_catalogue();
}
if (!is_array($TLE_dict)) {
  echo "\nBad TLE File - " . date("h:i:s", time()) . " - Canceling Catalogue Parse.\n";
  return;
}

// Create a working copy of the catalogue
$TLE_dict_updated = $TLE_dict;

// Go Line by Line through the catalogue
foreach ($TLE_dict as $key => $id) {
  $COSPAR1 = substr($TLE_dict[$key]["TLE1"], 9, 2);
  $COSPAR2 = substr($TLE_dict[$key]["TLE1"], 11, 3);
  if ($COSPAR1 >= 50)
    $COSPAR = "19" . $COSPAR1 . "-" . $COSPAR2;
  if ($COSPAR1 < 50)
    $COSPAR = "20" . $COSPAR1 . "-" . $COSPAR2;
  if (!is_array($id)) {
      echo "Glitch in the Matrix\n\n";
  }
  else {
    // echo "Checking " . $key . "\n";
    if ($TLE_dict[$key]["LV"] == "U") {
      echo "COSPAR: " . $COSPAR . "\n";
      foreach ($result as $key1 => $id1) {
        // echo "CHECK AGAINST: " . $result[$key1][0] . "\n";
        if ($COSPAR == $result[$key1][0]) {            //Parse each object in File
          echo 'COSPAR#: ' . $COSPAR . ' - ' . date("h:i:s", time()) . " -  NEW LV - " . $result[$key1][1] . "\n";
          $TLE_dict_updated[$key]["LV"] = $result[$key1][1];
          write_catalogue($TLE_dict_updated);
        }
      }
    }
  }
  set_time_limit(60);
}

////////////////////////////////////////////////////////////////////////////////
// Copy the TEMP Catalogue over the Main Catalogue
////////////////////////////////////////////////////////////////////////////////

echo "\nAttempting to Copy Temp File...\n\n";

if (filesize($GLOBALS['TLE_Temp_File']) > 148576) { //if TEMP TLE > 0.1MB
  echo "New Catalogue Greater than 1MB\n";
  echo "Filesize: " . filesize($GLOBALS['TLE_Temp_File']) / 1000 / 1000 . "MB\n\n";
  if (!copy($GLOBALS['TLE_Temp_File'], $GLOBALS['TLE_Main_File'])) {
    echo "Catalogue Copy Failed\n\n";
  }
  else {
    echo "Catalogue Copy Success\n\n";
  }
}
else {
  echo "New Catalogue Appears Corrupted\n";
  echo "Filesize: " . filesize($GLOBALS['TLE_Temp_File']) / 1000 / 1000 . "MB\n\n";
  if (!copy($GLOBALS['TLE_Main_File'], $GLOBALS['TLE_Temp_File'])) {
    echo "Revert to Main Catalogue Failed\n\n";
  }
  else {
    echo "Revert to Main Catalogue Success\n\n";
  }
}


///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function delete_upate_list($filename){
  unlink($filename);
}

function open_catalogue(){
  if (isset($TLE_dict)){unset($TLE_dict);}
  if (isset($TLE_file)){unset($TLE_file);}
  echo "\nTLE Filesize: " . filesize($GLOBALS['TLE_Temp_File']) / 1000 / 1000 . "MB\n\n";
  $TLE_file = file_get_contents($GLOBALS['TLE_Temp_File']);
  $TLE_dict = json_decode($TLE_file, true);
  if (is_array($TLE_dict)) {
    return $TLE_dict;
  }
  else {
    sleep(30);
    if (isset($TLE_dict)){unset($TLE_dict);}
    if (isset($TLE_file)){unset($TLE_file);}
    $TLE_file = file_get_contents($GLOBALS['TLE_Temp_File']);
    $TLE_dict = json_decode($TLE_file, true);
    return $TLE_dict;
  }
}

function write_catalogue($TLE_dict)
{
    $filename = $GLOBALS['TLE_Temp_File'];
    $TLE_file = json_encode($TLE_dict);

    if (!file_exists($filename)) {
      echo "The file $filename does not exist.\n\n";
    }

    if (is_writable($filename)) {
      $fp = fopen($filename, 'w');
      fwrite($fp, $TLE_file);
      fclose($fp);
    }
    else{
      echo "not writeable...\n";
      if(!is_readable($filename)){
        echo "not readable...\n";
      }
    }
}
 ?>
