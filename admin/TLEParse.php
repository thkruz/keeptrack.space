<?php
//a new content type. make sure apache does not gzip this type, else it would get buffered
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache'); // recommended to prevent caching of event data.
$GLOBALS['TLE_Temp_File'] = '/home/kruczek/keeptrack.space/admin/TLE/TLE.json';
$GLOBALS['TLE_Main_File'] = '/home/kruczek/keeptrack.space/TLE.json';
$GLOBALS['TLE_Update_Files'] = '/home/kruczek/keeptrack.space/admin/TLE/update';
$serverTime = time();
//$progress = 0;
send_message($serverTime, 'Catalogue Update Initiated', 0);

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
              send_message($serverTime,"Glitch in the Matrix");
            }
          else{                                         //Parse each object in File
            $TLE1 = $id['TLE_LINE1'];
            $TLE2 = $id['TLE_LINE2'];
            $ObjName = $id['OBJECT_NAME'];
            $ObjType = $id['OBJECT_TYPE'];
            $intldes = $id['INTLDES'];
            $SCC = substr($TLE1, 3-1, 7-3+1);
            $Year = substr($TLE1, 19-1, 20-19+1);
            $Day = substr($TLE1, 21-1, 32-21+1);
            //echo 'SCC #: ' . $SCC . '<br />';
            //echo 'Year : ' . $Year . '<br />';
            //echo 'Day  : ' . $Day . '<br />';
            $TLE_dict = ParseLocalCatalogue($serverTime, $TLE_dict, $SCC, $Year, $Day, $TLE1, $TLE2, $ObjName, $ObjType, $intldes);
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

for ($i = 0; $i <= 20; $i++) {
  $update_file = "/home/kruczek/keeptrack.space/admin/TLE/leo".$i.".json";
  if (file_exists($update_file)) {
    $update_file_contents = file_get_contents($update_file);
    $update_dict = json_decode($update_file_contents, true);
    $file_length = count($update_dict);

    if (isset($TLE_dict)){unset($TLE_dict);}
    $TLE_dict = open_catalogueLEO();
    if (is_array($update_dict) || is_object($update_dict)) {    //Verify File Had Information
      foreach ($update_dict as $key => $id) {                   //Search Each JSON File
          $serverTime = time();
          //send_message($serverTime, 'SCC#: ' . $id['NORAD_CAT_ID'] . ' - ' . date("h:i:s", time()) , $id['NORAD_CAT_ID']/43000);
          //$progress = $progress + 1;
          if (!is_array($id)) {
              send_message($serverTime,"Glitch in the Matrix");
            }
          else{                                         //Parse each object in File
            $TLE1 = $id['TLE_LINE1'];
            $TLE2 = $id['TLE_LINE2'];
            $ObjName = $id['OBJECT_NAME'];
            $ObjType = $id['OBJECT_TYPE'];
            $intldes = $id['INTLDES'];
            $perigee = $id['PERIGEE'];
            $SCC = substr($TLE1, 3-1, 7-3+1);
            $Year = substr($TLE1, 19-1, 20-19+1);
            $Day = substr($TLE1, 21-1, 32-21+1);
            //echo 'SCC #: ' . $SCC . '<br />';
            //echo 'Year : ' . $Year . '<br />';
            //echo 'Day  : ' . $Day . '<br />';
            $TLE_dict = ParseLocalCatalogueLEO($serverTime, $TLE_dict, $SCC, $Year, $Day, $TLE1, $TLE2, $ObjName, $ObjType, $intldes, $perigee);
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

for ($i = 0; $i <= 50; $i++) {
  $update_file = "/home/kruczek/keeptrack.space/admin/TLE/decay".$i.".json";
  if (file_exists($update_file)) {
    $update_file_contents = file_get_contents($update_file);
    $update_dict = json_decode($update_file_contents, true);
    $file_length = count($update_dict);

    if (isset($TLE_dict)){unset($TLE_dict);}
    $TLE_dict = open_catalogue();
    if (is_array($update_dict) || is_object($update_dict)) {    //Verify File Had Information
      foreach ($update_dict as $key => $id) {                   //Search Each JSON File
          $serverTime = time();
          if (!is_array($id)) {
              send_message($serverTime,"Glitch in the Matrix");
            }
          else{                                         //Parse each object in File
            $Precedence = $id['PRECEDENCE'];
            $SCC = $id['NORAD_CAT_ID'];
            $TLE_dict = ParseLocalCatalogueDecay($serverTime, $TLE_dict, $SCC, $Precedence);
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

send_message($serverTime, 'Temp Catalogue Copying...', 1);

if (!copy($GLOBALS['TLE_Temp_File'], $GLOBALS['TLE_Main_File'])) {
    send_message($serverTime, 'Catalogue Copy Failed', 1);
}

send_message($serverTime, 'Catalogue Update Complete', 1);


///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function delete_upate_list($filename){
  unlink($filename);
}

function ParseLocalCatalogueDecay($serverTime, $TLE_dict, $nSCC, $nPrecedence){
  $TLE_dict_updated = $TLE_dict;
  foreach ($TLE_dict as $key => $id) {             //Search each JSON File
    if (!is_array($id)) {
        send_message($serverTime,"Glitch in the Matrix");
    }
    else if (sprintf('%05d', $nSCC) == $id['SCC_NUM']){            //Parse each object in File
      var_dump($nPrecedence);
      send_message($serverTime, 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . ' -  Checked' , $nSCC/43000);
      if ($nPrecedence == "1" || $nPrecedence == "2"){ //Decayed Object
        echo "\n\n\n\n\It Worked\n\n\n\n\n";
        send_message($serverTime, 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . ' -  DECAYED' , $nSCC/43000);
        unset($TLE_dict_updated[$key]);
        write_catalogue($TLE_dict_updated);
        return $TLE_dict_updated;
      }
      else{
        return $TLE_dict_updated;
      }
    }
    //Gets Here
  }
}

function ParseLocalCatalogue($serverTime, $TLE_dict, $nSCC, $nYear, $nDay, $nTLE1, $nTLE2, $nObjName, $nObjType, $nintldes){
  $TLE_dict_updated = $TLE_dict;
  foreach ($TLE_dict as $key => $id) {             //Search each JSON File
    if (!is_array($id)) {
        send_message($serverTime,"Glitch in the Matrix");
    }
    else if ($nSCC == $id['SCC_NUM']){            //Parse each object in File
      $oTLE1 = $id['TLE_LINE1'];
      $oSCC = substr($oTLE1, 3-1, 7-3+1);
      $oYear = substr($oTLE1, 19-1, 20-19+1);
      $oDay = substr($oTLE1, 21-1, 32-21+1);
      //send_message($serverTime, $nYear . " --- " . $oYear);
      //send_message($serverTime, $nDay . " --- " . $oDay);
      if ($nYear >= $oYear && $nDay > $oDay){ //New Epoch
        //send_message($serverTime, "SCC: $oSCC has been updated.");
        $TLE_dict_updated[$key]["TLE_LINE1"] = $nTLE1;
        $TLE_dict_updated[$key]["TLE_LINE2"] = $nTLE2;
        if ($TLE_dict_updated[$key]["OBJECT_NAME"] == "TBA - TO BE ASSIGNED")
          $TLE_dict_updated[$key]["OBJECT_NAME"] = $nObjName;
        if ($TLE_dict_updated[$key]["OBJECT_TYPE"] == "TBA")
          $TLE_dict_updated[$key]["OBJECT_TYPE"] = $nObjType;
        write_catalogue($TLE_dict_updated);
        send_message($serverTime, 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . ' -  NEW ELSET' , $nSCC/43000);
        return $TLE_dict_updated;
      }
      else{
        send_message($serverTime, 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) , $nSCC/43000);
        return $TLE_dict_updated;
      }
    }
  }
  array_push($TLE_dict_updated, array('COUNTRY' => 'Unknown', 'INTLDES' => $nintldes, 'LAUNCH_SITE' => 'Unknown', 'LAUNCH_SITEC' => 'Unknown', 'LAUNCH_VEHICLE' => 'Unknown', 'OBJECT_NAME' => $nObjName,
                                  'OBJECT_TYPE' => $nObjType, 'SCC_NUM' => sprintf('%05d', $nSCC), 'TLE_LINE1' => $nTLE1, 'TLE_LINE2' => $nTLE2));
  send_message($serverTime, 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . ' -  NEW OBJECT' , $nSCC/43000);
  write_catalogue($TLE_dict_updated);
  return $TLE_dict_updated;
}

function ParseLocalCatalogueLEO($serverTime, $TLE_dict, $nSCC, $nYear, $nDay, $nTLE1, $nTLE2, $nObjName, $nObjType, $nintldes, $nperigee){
  $TLE_dict_updated = $TLE_dict;
  if ($nperigee > 5000){
    return $TLE_dict_updated;
  }
  foreach ($TLE_dict as $key => $id) {             //Search each JSON File
    if (!is_array($id)) {
        send_message($serverTime,"Glitch in the Matrix");
    }
    else if ($nSCC == $id['SCC_NUM']){            //Parse each object in File
      $oTLE1 = $id['TLE_LINE1'];
      $oSCC = substr($oTLE1, 3-1, 7-3+1);
      $oYear = substr($oTLE1, 19-1, 20-19+1);
      $oDay = substr($oTLE1, 21-1, 32-21+1);
      if ($nYear >= $oYear && $nDay > $oDay){ //New Epoch
        $TLE_dict_updated[$key]["TLE_LINE1"] = $nTLE1;
        $TLE_dict_updated[$key]["TLE_LINE2"] = $nTLE2;
        if ($TLE_dict_updated[$key]["OBJECT_NAME"] == "TBA - TO BE ASSIGNED")
          $TLE_dict_updated[$key]["OBJECT_NAME"] = $nObjName;
        if ($TLE_dict_updated[$key]["OBJECT_TYPE"] == "TBA")
          $TLE_dict_updated[$key]["OBJECT_TYPE"] = $nObjType;
        write_catalogueLEO($TLE_dict_updated);
        send_message($serverTime, 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . ' -  NEW ELSET' , $nSCC/43000);
        return $TLE_dict_updated;
      }
      else{
        send_message($serverTime, 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) , $nSCC/43000);
        return $TLE_dict_updated;
      }
    }
  }
  array_push($TLE_dict_updated, array('COUNTRY' => 'Unknown', 'INTLDES' => $nintldes, 'LAUNCH_SITE' => 'Unknown', 'LAUNCH_SITEC' => 'Unknown', 'LAUNCH_VEHICLE' => 'Unknown', 'OBJECT_NAME' => $nObjName,
                                  'OBJECT_TYPE' => $nObjType, 'SCC_NUM' => sprintf('%05d', $nSCC), 'TLE_LINE1' => $nTLE1, 'TLE_LINE2' => $nTLE2));
  send_message($serverTime, 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . ' -  NEW OBJECT' , $nSCC/43000);
  write_catalogueLEO($TLE_dict_updated);
  return $TLE_dict_updated;
}

function open_catalogue(){
  if (isset($TLE_dict)){unset($TLE_dict);}
  if (isset($TLE_file)){unset($TLE_file);}
  $TLE_file = file_get_contents($GLOBALS['TLE_Temp_File']);
  $TLE_dict = json_decode($TLE_file, true);
  return $TLE_dict;
}

function open_catalogueLEO(){
  if (isset($TLE_dict)){unset($TLE_dict);}
  if (isset($TLE_file)){unset($TLE_file);}
  $TLE_file = file_get_contents('/home/kruczek/keeptrack.space/LEO.json');
  $TLE_dict = json_decode($TLE_file, true);
  return $TLE_dict;
}

function write_catalogue($TLE_dict)
{
    $filename = $GLOBALS['TLE_Temp_File'];
    $TLE_file = json_encode($TLE_dict, JSON_PRETTY_PRINT);

    if (!file_exists($filename)) {
      send_message($serverTime, "The file $filename does not exist", 1);
    }

    if (is_writable($filename)) {
      $fp = fopen($filename, 'w');
      fwrite($fp, $TLE_file);
      fclose($fp);
    }
    else{
      send_message($serverTime, 'not writable..', 1);
      if(!is_readable($filename)){
      send_message($serverTime, 'not readable..', 1);
      }
    }
}

function write_catalogueLEO($TLE_dict)
{
    $filename = '/home/kruczek/keeptrack.space/LEO.json';
    $TLE_file = json_encode($TLE_dict, JSON_PRETTY_PRINT);

    if (!file_exists($filename)) {
      send_message($serverTime, "The file $filename does not exist", 1);
    }

    if (is_writable($filename)) {
      $fp = fopen($filename, 'w');
      fwrite($fp, $TLE_file);
      fclose($fp);
    }
    else{
      send_message($serverTime, 'not writable..', 1);
      if(!is_readable($filename)){
      send_message($serverTime, 'not readable..', 1);
      }
    }
}

function send_message($id, $message, $progress)
{
    $d = array('message' => $message , 'progress' => $progress * 100);

    echo "id: $id" . PHP_EOL;
    echo "data: " . json_encode($d) . PHP_EOL;
    echo PHP_EOL;

    //PUSH THE data out by all FORCE POSSIBLE
    ob_flush();
    flush();
}
 ?>
