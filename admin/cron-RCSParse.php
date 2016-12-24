<?php
//a new content type. make sure apache does not gzip this type, else it would get buffered
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache'); // recommended to prevent caching of event data.
$GLOBALS['TLE_Temp_File'] = '/home/kruczek/keeptrack.space/admin/TLE/TLE.json';
$GLOBALS['TLE_Main_File'] = '/home/kruczek/keeptrack.space/TLE.json';
$GLOBALS['RCS_Update_Files'] = '/home/kruczek/keeptrack.space/admin/TLE/rcs';
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

// Launch Site and Country Corelation Table

            if ($SITE == "AFETR"){
              $SITE = "Cape Canaveral AFS";
              $SITEC = "United States";
            }
            if ($SITE == "AFWTR"){
              $SITE = "Vandenberg AFB";
              $SITEC = "United States";
            }
            if ($SITE == "CAS"){
              $SITE = "Canary Islands";
              $SITEC = "United States";
            }
            if ($SITE == "FRGUI"){
              $SITE = "French Guiana";
              $SITEC = "United States";
            }
            if ($SITE == "HGSTR"){
              $SITE = "Hammaguira STR";
              $SITEC = "Algeria";
            }
            if ($SITE == "KSCUT"){
              $SITE = "Uchinoura Space Center";
              $SITEC = "Japan";
            }
            if ($SITE == "KYMTR"){
              $SITE = "Kapustin Yar MSC";
              $SITEC = "Russia";
            }
            if ($SITE == "PKMTR"){
              $SITE = "Plesetsk MSC";
              $SITEC = "Russia";
            }
            if ($SITE == "WSC"){
              $SITE = "Wenchang SLC";
              $SITEC = "China";
            }
            if ($SITE == "SNMLP"){
              $SITE = "San Marco LP";
              $SITEC = "Kenya";
            }
            if ($SITE == "SRI"){
              $SITE = "Satish Dhawan SC";
              $SITEC = "India";
            }
            if ($SITE == "TNSTA"){
              $SITE = "Tanegashima SC";
              $SITEC = "Japan";
            }
            if ($SITE == "TTMTR"){
              $SITE = "Baikonur Cosmodrome";
              $SITEC = "Kazakhstan";
            }
            if ($SITE == "WLPIS"){
              $SITE = "Wallops Island";
              $SITEC = "United States";
            }
            if ($SITE == "WOMRA"){
              $SITE = "Woomera";
              $SITEC = "Australia";
            }
            if ($SITE == "VOSTO"){
              $SITE = "Vostochny Cosmodrome";
              $SITEC = "Russia";
            }
            if ($SITE == "PMRF"){
              $SITE = "PMRF Barking Sands";
              $SITEC = "United States";
              }
            if ($SITE == "SEAL"){
              $SITE = "Sea Launch Odyssey";
              $SITEC = "Russia";
            }
            if ($SITE == "KWAJ"){
              $SITE = "Kwajalein";
              $SITEC = "United States";
            }
            if ($SITE == "ERAS"){
              $SITE = "Pegasus East";
              $SITEC = "United States";
            }
            if ($SITE == "JSC"){
              $SITE = "Jiuquan SLC";
              $SITEC = "China";
            }
            if ($SITE == "SVOB"){
              $SITE = "Svobodny";
              $SITEC = "Russia";
            }
            if ($SITE == "UNKN"){
              $SITE = "Unknown";
              $SITEC = "Unknown";
            }
            if ($SITE == "TSC"){
              $SITE = "Taiyaun SC";
              $SITEC = "China";
            }
            if ($SITE == "WRAS"){
              $SITE = "Pegasus West";
              $SITEC = "United States";
            }
            if ($SITE == "XSC"){
              $SITE = "Xichang SC";
              $SITEC = "China";
            }
            if ($SITE == "YAVNE"){
              $SITE = "Yavne";
              $SITEC = "Israel";
            }
            if ($SITE == "OREN"){
              $SITE = "Orenburg";
              $SITEC = "Russia";
            }
            if ($SITE == "SADOL"){
              $SITE = "Submarine Launch";
              $SITEC = "Russia";
            }
            if ($SITE == "KODAK"){
              $SITE = "Kodiak Island";
              $SITEC = "United States";
            }
            if ($SITE == "SEM"){
              $SITE = "Semnan";
              $SITEC = "Iran";
            }
            if ($SITE == "YUN"){
              $SITE = "Yunsong";
              $SITEC = "North Korea";
            }
            if ($SITE == "NSC"){
              $SITE = "Naro Space Center";
              $SITEC = "South Korea";
            }

// Country Correlation Table

            $COUNTRY = $id['COUNTRY'];
            if ($COUNTRY == "AB") // Headquartered in Riyadh, Saudi Arabia
              $COUNTRY = "Saudi Arabia";
            if ($COUNTRY == "AC")
              $COUNTRY = "AsiaSat Corp";
            if ($COUNTRY == "ALG")
              $COUNTRY = "Algeria";
            if ($COUNTRY == "ALL")
              $COUNTRY = "All";
            if ($COUNTRY == "ARGN")
              $COUNTRY = "Argentina";
            if ($COUNTRY == "ASRA")
              $COUNTRY = "Austria";
            if ($COUNTRY == "AUS")
              $COUNTRY = "Australia";
            if ($COUNTRY == "AZER")
              $COUNTRY = "Azerbaijan";
            if ($COUNTRY == "BEL")
              $COUNTRY = "Belgium";
            if ($COUNTRY == "BELA")
              $COUNTRY = "Belarus";
            if ($COUNTRY == "BERM")
              $COUNTRY = "Bermuda";
            if ($COUNTRY == "BOL")
              $COUNTRY = "Bolivia";
            if ($COUNTRY == "BRAZ")
              $COUNTRY = "Brazil";
            if ($COUNTRY == "CA")
              $COUNTRY = "Canada";
            if ($COUNTRY == "CHBZ")
              $COUNTRY = "China/Brazil";
            if ($COUNTRY == "CHLE")
              $COUNTRY = "Chile";
            if ($COUNTRY == "CIS")
              $COUNTRY = "Commonwealth of Ind States";
            if ($COUNTRY == "COL")
              $COUNTRY = "Colombia";
            if ($COUNTRY == "CZCH")
              $COUNTRY = "Czechoslovakia";
            if ($COUNTRY == "DEN")
              $COUNTRY = "Denmark";
            if ($COUNTRY == "ECU")
              $COUNTRY = "Ecuador";
            if ($COUNTRY == "EGYP")
              $COUNTRY = "Egypt";
            if ($COUNTRY == "ESA")
              $COUNTRY = "European Space Agency";
            if ($COUNTRY == "ESA")
              $COUNTRY = "European Space Research Org";
            if ($COUNTRY == "EST")
              $COUNTRY = "Estonia";
            if ($COUNTRY == "EUME")
              $COUNTRY = "EUMETSAT";
            if ($COUNTRY == "EUTE")
              $COUNTRY = "EUTELSAT";
            if ($COUNTRY == "FGER")
              $COUNTRY = "France/Germany";
            if ($COUNTRY == "FR")
              $COUNTRY = "France";
            if ($COUNTRY == "FRIT")
              $COUNTRY = "France/Italy";
            if ($COUNTRY == "GER")
              $COUNTRY = "Germany";
            if ($COUNTRY == "GLOB") // Headquartered in Louisiana, USA
              $COUNTRY = "United States";
            if ($COUNTRY == "GREC")
              $COUNTRY = "Greece";
            if ($COUNTRY == "HUN")
              $COUNTRY = "Hungary";
            if ($COUNTRY == "IM") // Headquartered in London, UK
              $COUNTRY = "United Kingdom";
            if ($COUNTRY == "IND")
              $COUNTRY = "India";
            if ($COUNTRY == "INDO")
              $COUNTRY = "Indonesia";
            if ($COUNTRY == "IRAN")
              $COUNTRY = "Iran";
            if ($COUNTRY == "IRAQ")
              $COUNTRY = "Iraq";
            if ($COUNTRY == "ISRA")
              $COUNTRY = "Israel";
            if ($COUNTRY == "ISS")
              $COUNTRY = "International";
            if ($COUNTRY == "IT")
              $COUNTRY = "Italy";
            if ($COUNTRY == "ITSO") // Headquartered in Luxembourg District, Luxembourg
              $COUNTRY = "Luxembourg";
            if ($COUNTRY == "JPN")
              $COUNTRY = "Japan";
            if ($COUNTRY == "KAZ")
              $COUNTRY = "Kazakhstan";
            if ($COUNTRY == "LAOS")
              $COUNTRY = "Laos";
            if ($COUNTRY == "LTU")
              $COUNTRY = "Lithuania";
            if ($COUNTRY == "LUXE")
              $COUNTRY = "Luxembourg";
            if ($COUNTRY == "MALA")
              $COUNTRY = "Malaysia";
            if ($COUNTRY == "MEX")
              $COUNTRY = "Mexico";
            if ($COUNTRY == "NATO")
              $COUNTRY = "North Atlantic Treaty Org";
            if ($COUNTRY == "NETH")
              $COUNTRY = "Netherlands";
            if ($COUNTRY == "NICO") // Headquartered in Washington, USA
              $COUNTRY = "United States";
            if ($COUNTRY == "NIG")
              $COUNTRY = "Nigeria";
            if ($COUNTRY == "NKOR")
              $COUNTRY = "North Korea";
            if ($COUNTRY == "NOR")
              $COUNTRY = "Norway";
            if ($COUNTRY == "O3B") // Majority Shareholder Based in Luxembourg
              $COUNTRY = "Luxembourg";
            if ($COUNTRY == "ORB") // Headquartered in Louisiana, USA
              $COUNTRY = "United States";
            if ($COUNTRY == "PAKI")
              $COUNTRY = "Pakistan";
            if ($COUNTRY == "PERU")
              $COUNTRY = "Peru";
            if ($COUNTRY == "POL")
              $COUNTRY = "Poland";
            if ($COUNTRY == "POR")
              $COUNTRY = "Portugal";
            if ($COUNTRY == "PRC")
              $COUNTRY = "China";
            if ($COUNTRY == "PRC")
              $COUNTRY = "China";
            if ($COUNTRY == "RASC") // Headquartered in Mauritius
              $COUNTRY = "Mauritius";
            if ($COUNTRY == "ROC")
              $COUNTRY = "Taiwan";
            if ($COUNTRY == "ROM")
              $COUNTRY = "Romania";
            if ($COUNTRY == "RP")
              $COUNTRY = "Philippines";
            if ($COUNTRY == "SAFR")
              $COUNTRY = "South Africa";
            if ($COUNTRY == "SAUD")
              $COUNTRY = "Saudi Arabia";
            if ($COUNTRY == "SEAL") // Primary Shareholder Russian
              $COUNTRY = "Russia";
            if ($COUNTRY == "RP")
              $COUNTRY = "Philippines";
            if ($COUNTRY == "SES")
              $COUNTRY = "Luxembourg";
            if ($COUNTRY == "SING")
              $COUNTRY = "Singapore";
            if ($COUNTRY == "SKOR")
              $COUNTRY = "South Korea";
            if ($COUNTRY == "SPN")
              $COUNTRY = "Spain";
            if ($COUNTRY == "STCT")
              $COUNTRY = "Singapore/Taiwan";
            if ($COUNTRY == "SWED")
              $COUNTRY = "Sweden";
            if ($COUNTRY == "SWTZ")
              $COUNTRY = "Switzerland";
            if ($COUNTRY == "THAI")
              $COUNTRY = "Thailand";
            if ($COUNTRY == "TMMC")
              $COUNTRY = "Turkmenistan/Monaco";
            if ($COUNTRY == "TURK")
              $COUNTRY = "Turkey";
            if ($COUNTRY == "UAE")
              $COUNTRY = "United Arab Emirates";
            if ($COUNTRY == "UK")
              $COUNTRY = "United Kingdom";
            if ($COUNTRY == "UKR")
              $COUNTRY = "Ukraine";
            if ($COUNTRY == "URY")
              $COUNTRY = "Uruguay";
            if ($COUNTRY == "US")
              $COUNTRY = "United States";
            if ($COUNTRY == "USBZ")
              $COUNTRY = "United States/Brazil";
            if ($COUNTRY == "VENZ")
              $COUNTRY = "Venezuela";
            if ($COUNTRY == "VTNM")
              $COUNTRY = "Vietnam";

            $RCS_SIZE = $id['RCS_SIZE'];
            $SCC = $id['NORAD_CAT_ID'];
            $TLE_dict = ParseLocalCatalogue($serverTime, $TLE_dict, $SCC, $LAUNCH, $SITE, $SITEC, $RCS_SIZE, $COUNTRY);
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

if (filesize($GLOBALS['TLE_Temp_File']) > 1048576) { //if TEMP TLE > 1MB
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
    else if ($nSCC == $id['SCC_NUM']){            //Parse each object in File
      if ($TLE_dict_updated[$key]["LAUNCH_SITE"] == "Unknown"){
        $TLE_dict_updated[$key]["LAUNCH_SITE"] = $nSITE;
        echo 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . " -  NEW LAUNCH SITE\n";
      }
      if ($TLE_dict_updated[$key]["LAUNCH_SITEC"] == "Unknown"){
        $TLE_dict_updated[$key]["LAUNCH_SITEC"] = $nSITEC;
        echo 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . " -  NEW LAUNCH COUNTRY\n";
      }
      if ($TLE_dict_updated[$key]["LAUNCH_DATE"] == "Unknown" || $TLE_dict_updated[$key]["LAUNCH_DATE"] == null){
        $TLE_dict_updated[$key]["LAUNCH_DATE"] = $nLAUNCH;
        echo 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . " -  NEW LAUNCH DATE\n";
      }
      if ($TLE_dict_updated[$key]["RCS_SIZE"] == "Unknown" || $TLE_dict_updated[$key]["RCS_SIZE"] == null){
        $TLE_dict_updated[$key]["RCS_SIZE"] = $nRCS_SIZE;
        echo 'SCC#: ' . sprintf('%05d', $nSCC) . ' - ' . date("h:i:s", time()) . " -  NEW RCS SIZE\n";
      }
      if ($TLE_dict_updated[$key]["COUNTRY"] == "Unknown"){
        $TLE_dict_updated[$key]["COUNTRY"] = $nCOUNTRY;
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
