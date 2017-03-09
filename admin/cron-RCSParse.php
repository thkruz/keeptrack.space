<?php
//a new content type. make sure apache does not gzip this type, else it would get buffered
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache'); // recommended to prevent caching of event data.
$GLOBALS['TLE_Temp_File'] = '/var/www/html/admin/TLE/TLE.json';
$GLOBALS['TLE_Main_File'] = '/var/www/html/TLE.json';
$GLOBALS['RCS_Update_Files'] = '/var/www/html/admin/TLE/rcs';
$serverTime = time();

echo "Catalogue Update Initiated\n";

for ($i = 0; $i <= 20; $i++) {
  $update_file = $GLOBALS['RCS_Update_Files'] . $i . '.json';
  if (file_exists($update_file)) {
    $update_file_contents = file_get_contents($update_file);
    $update_dict = json_decode($update_file_contents, true);
    $file_length = count($update_dict);

    if (isset($TLE_dict)){unset($TLE_dict);}
    $TLE_dict = open_catalogue();
    echo "File Number: " . $i . " - " . date("h:i:s", time()) . " - Parse Start\n\n";
    if (is_array($update_dict) || is_object($update_dict)) {    //Verify File Had Information
      foreach ($update_dict as $key => $id) {                   //Search Each JSON File
          $serverTime = time();
          if (!is_array($id)) {
              echo "Glitch in the Matrix\n\n";
            }
          else{                                         //Parse each object in File
            $LAUNCH = $id['LAUNCH'];
            $SITE = $id['SITE'];
            $COUNTRY = $id['COUNTRY'];
            $RCS = $id['RCS_SIZE'];
            if ($RCS == 'Unknown') { $RCS = "U"; }
            if ($RCS == 'SMALL') { $RCS = 0; }
            if ($RCS == 'MEDIUM') { $RCS = 1; }
            if ($RCS == 'LARGE') { $RCS = 2; }
            $SCC = $id['NORAD_CAT_ID'];
            $TLE_dict = ParseLocalCatalogue($serverTime, $TLE_dict, $SCC, $LAUNCH, $SITE, $SITEC, $RCS, $COUNTRY);
            set_time_limit(60);
          }
      }
      echo "\nFile Number: " . $i . " - " . date("h:i:s", time()) . " - Parse End\n";
    }
    delete_upate_list($update_file);
    unset($update_file_contents);
    unset($update_dict);
    unset($file_length);
  }
}

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

echo "Catalogue Update Complete\n\n";


///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function delete_upate_list($filename){
  unlink($filename);
}

function ParseLocalCatalogue($serverTime, $TLE_dict, $nSCC, $nLAUNCH, $nSITE, $nSITEC, $nRCS_SIZE, $nCOUNTRY){
  if (!is_array($TLE_dict)) {
    echo "\nBad TLE File - " . date("h:i:s", time()) . " - Trying to Reopen.\n";
    $TLE_dict = open_catalogue();
  }
  if (!is_array($TLE_dict)) {
    echo "\nBad TLE File - " . date("h:i:s", time()) . " - Canceling Catalogue Parse.\n";
    return $TLE_dict;
  }
  $TLE_dict_updated = $TLE_dict;
  foreach ($TLE_dict as $key => $id) {             //Search each JSON File
    if (!is_array($id)) {
        echo "Glitch in the Matrix\n\n";
    }
    else if ($nSCC == substr($id['TLE1'], 3-1, 7-3+1)){            //Parse each object in File
      if ($TLE_dict_updated[$key]["LS"] == "U" || $TLE_dict_updated[$key]["LS"] == null){
        if ($nSITE == "Unknown")
          $TLE_dict_updated[$key]["LS"] = "U";
        if ($nSITE != "Unknown")
          $TLE_dict_updated[$key]["LS"] = $nSITE;
        echo 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . " -  NEW LAUNCH SITE\n";
      }
      // if ($TLE_dict_updated[$key]["LSC"] == "U" || $TLE_dict_updated[$key]["LSC"] == null){
      //   if ($nSITEC == "Unknown")
      //     $TLE_dict_updated[$key]["LSC"] = "U";
      //   if ($nSITEC != "Unknown")
      //     $TLE_dict_updated[$key]["LSC"] = $nSITEC;
      //   echo 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . " -  NEW LAUNCH COUNTRY\n";
      // }
      if ($TLE_dict_updated[$key]["LD"] == "U" || $TLE_dict_updated[$key]["LD"] == null){
        if ($nLAUNCH == "Unknown")
          $TLE_dict_updated[$key]["LD"] = "Unknown";
        if ($nLAUNCH != "Unknown")
          $TLE_dict_updated[$key]["LD"] = $nLAUNCH;
        echo 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . " -  NEW LAUNCH DATE\n";
      }
      if ($TLE_dict_updated[$key]["R"] == "U" || $TLE_dict_updated[$key]["R"] == null){
        $TLE_dict_updated[$key]["R"] = $nRCS_SIZE;
        echo 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . " -  NEW RCS SIZE\n";
      }
      if ($TLE_dict_updated[$key]["C"] == "U" || $TLE_dict_updated[$key]["C"] == null){
        if ($nCOUNTRY == "Unkown")
          $TLE_dict_updated[$key]["C"] = "U";
        if ($nCOUNTRY != "Unkown")
          $TLE_dict_updated[$key]["C"] = $nCOUNTRY;
        echo 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . " -  NEW COUNTRY\n";
      }
      write_catalogue($TLE_dict_updated);
      // echo 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . " -  NEW INFORMATION\n";
      return $TLE_dict_updated;
    }
  }
  echo 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . " -  ELSET MISSING\n";
  write_catalogue($TLE_dict_updated);
  return $TLE_dict_updated;
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
