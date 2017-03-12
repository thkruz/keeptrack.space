<?php
//a new content type. make sure apache does not gzip this type, else it would get buffered
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache'); // recommended to prevent caching of event data.
$GLOBALS['TLE_Temp_File'] = '/var/www/html/admin/TLE/TLE.json';
$GLOBALS['TLE_Full_File'] = '/var/www/html/admin/TLE/TLE.full.json';
$serverTime = time();
//$progress = 0;
echo "Catalogue Update Initiated\n\n";

$TLE_dict = open_catalogue(); // Open the TEMP TLE Catalogue
write_catalogue($TLE_dict);

////////////////////////////////////////////////////////////////////////////////
// Copy the TEMP Catalogue over the Main Catalogue
////////////////////////////////////////////////////////////////////////////////

echo "\nAttempting to Copy Temp File...\n\n";

if (filesize($GLOBALS['TLE_Temp_File']) > 148576) { //if TEMP TLE > 0.1MB
  echo "New Catalogue Greater than 1MB\n";
  echo "Filesize: " . filesize($GLOBALS['TLE_Temp_File']) / 1000 / 1000 . "MB\n\n";
  if (!copy($GLOBALS['TLE_Temp_File'], $GLOBALS['TLE_Full_File'])) {
    echo "Catalogue Copy Failed\n\n";
  }
  else {
    echo "Catalogue Copy Success\n\n";
  }
}
else {
  echo "New Catalogue Appears Corrupted\n";
  echo "Filesize: " . filesize($GLOBALS['TLE_Temp_File']) / 1000 / 1000 . "MB\n\n";
  if (!copy($GLOBALS['TLE_Full_File'], $GLOBALS['TLE_Temp_File'])) {
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
    $TLE_file = json_encode($TLE_dict, JSON_PRETTY_PRINT);

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
