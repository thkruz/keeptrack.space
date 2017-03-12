<?php
//a new content type. make sure apache does not gzip this type, else it would get buffered
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache'); // recommended to prevent caching of event data.
$GLOBALS['TLE_Temp_File'] = '/var/www/html/admin/TLE/TLE.json';
$GLOBALS['TLE_Main_File'] = '/var/www/html/TLE.json';
$GLOBALS['TLE_Update_Files'] = '/var/www/html/admin/TLE/update';
$serverTime = time();
//$progress = 0;
echo "Catalogue Update Initiated\n\n";

for ($i = 0; $i <= 20; $i++) {
  $update_file = $GLOBALS['TLE_Update_Files'] . $i . '.json';
  if (file_exists($update_file)) {
    $update_file_contents = file_get_contents($update_file);
    $update_dict = json_decode($update_file_contents, true);
    $file_length = count($update_dict);

    if (isset($TLE_dict)){unset($TLE_dict);}
    $TLE_dict = open_catalogue();
    if (is_array($update_dict) || is_object($update_dict)) {    //Verify File Had Information
      foreach ($update_dict as $key => $id) {                   //Search Each JSON File
          $serverTime = time();
          //send_message($serverTime, 'SCC#: ' . $id['NORAD_CAT_ID'] . ' - ' . date("h:i:s", time()) , $id['NORAD_CAT_ID']/43000);
          //$progress = $progress + 1;
          if (!is_array($id)) {
              echo "Glitch in the Matrix\n\n";
            }
          else{                                         //Parse each object in File
            $TLE1 = $id['TLE_LINE1'];
            $TLE2 = $id['TLE_LINE2'];
            $ObjName = $id['OBJECT_NAME'];
            $ObjType = $id['OBJECT_TYPE'];
            $SCC = substr($TLE1, 3-1, 7-3+1);
            $Year = substr($TLE1, 19-1, 20-19+1);
            $Day = substr($TLE1, 21-1, 32-21+1);
            //echo 'SCC #: ' . $SCC . '<br />';
            //echo 'Year : ' . $Year . '<br />';
            //echo 'Day  : ' . $Day . '<br />';
            $TLE_dict = ParseLocalCatalogue($serverTime, $TLE_dict, $SCC, $Year, $Day, $TLE1, $TLE2, $ObjName, $ObjType);
            set_time_limit(60);
          }
      }
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


///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function delete_upate_list($filename){
  unlink($filename);
}

function ParseLocalCatalogue($serverTime, $TLE_dict, $nSCC, $nYear, $nDay, $nTLE1, $nTLE2, $nObjName, $nObjType){
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
    $oSCC = substr($oTLE1, 3-1, 7-3+1);
    if (!is_array($id)) {
        echo "Glitch in the Matrix\n\n";
    }
    else if ($nSCC == $oSCC){            //Parse each object in File
      $oTLE1 = $id['TLE1'];
      $oYear = substr($oTLE1, 19-1, 20-19+1);
      $oDay = substr($oTLE1, 21-1, 32-21+1);
      //send_message($serverTime, $nYear . " --- " . $oYear);
      //send_message($serverTime, $nDay . " --- " . $oDay);
      if ($nYear > $oYear || $nYear == $oYear && $nDay > $oDay){ //New Epoch
        //send_message($serverTime, "SCC: $oSCC has been updated.");
        $TLE_dict_updated[$key]["TLE1"] = $nTLE1;
        $TLE_dict_updated[$key]["TLE2"] = $nTLE2;
        if ($TLE_dict_updated[$key]["ON"] == "TBA") {
          if ($nObjName == "TBA - TO BE ASSIGNED")
            $TLE_dict_updated[$key]["ON"] = "TBA";
          if ($nObjName != "TBA - TO BE ASSIGNED")
            $TLE_dict_updated[$key]["ON"] = $nObjName;
        }
        if ($TLE_dict_updated[$key]["OT"] == 0) {
          if ($nObjType == "PAYLOAD") { $TLE_dict_updated[$key]["OT"] = 1; }
          if ($nObjType == "ROCKET BODY") { $TLE_dict_updated[$key]["OT"] = 2; }
          if ($nObjType == "DEBRIS") { $TLE_dict_updated[$key]["OT"] = 3; }
        }
        write_catalogue($TLE_dict_updated);
        echo 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . " -  NEW ELSET\n";
        echo $nTLE1 . "\n";
        echo $nTLE2 . "\n";
        return $TLE_dict_updated;
      }
      else{
        echo 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . "\n\n";
        return $TLE_dict_updated;
      }
    }
  }

  if ($nObjType == "TBA") { $nObjType = 0; }
  if ($nObjType == "PAYLOAD") { $nObjType = 1; }
  if ($nObjType == "ROCKET BODY") { $nObjType = 2; }
  if ($nObjType == "DEBRIS") { $nObjType = 3; }

  array_push($TLE_dict_updated, array('C' => 'U', 'LS' => 'U', 'LV' => 'U', 'ON' => $nObjName,
                                  'OT' => $nObjType, 'TLE1' => $nTLE1, 'TLE2' => $nTLE2));
  echo 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . " -  NEW Object\n";
  echo $nTLE1 . "\n";
  echo $nTLE2 . "\n";
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
