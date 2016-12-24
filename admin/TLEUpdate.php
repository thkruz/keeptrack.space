<?php
  //a new content type. make sure apache does not gzip this type, else it would get buffered
  header('Content-Type: text/event-stream');
  header('Cache-Control: no-cache'); // recommended to prevent caching of event data.

  // Declare Global File Locations
  $GLOBALS['TLE_Update_Files'] = '/home/kruczek/keeptrack.space/admin/TLE/update';

  if ($_GET["type"]) {
    $updateType = $_GET["type"];
  }
  else {
    $updateType = "full";
  }

  $serverTime = time();
  send_message($serverTime, 'Catalogue Download Initiated', 0);

  getCookie();
  $chunk = 1250;
  switch ($updateType){
    case "recent":
      $maxFileNumber = getMostRecentRequest();
      $maxFileNumber = intval($maxFileNumber);
      for ($i = 0; $i <= 20; $i++) { //Request Newest ELSETs from last 2 weeks in 1250 size chunks.
        set_time_limit(120);
        $start = $chunk * $i;
        getContent("https://www.space-track.org/basicspacedata/query/class/tle_latest/ORDINAL/1/FILE/%3E" . $maxFileNumber . "/EMPTYRESULT/SHOW/limit/$chunk,$start/",$GLOBALS['TLE_Update_Files'].$i.'.json');
        echo "https://www.space-track.org/basicspacedata/query/class/tle_latest/ORDINAL/1/FILE/%3E" . $maxFileNumber . "/EMPTYRESULT/SHOW/limit/$chunk,$start/";
        if (filesize($GLOBALS['TLE_Update_Files'].$i.'.json') < 100*1024) { //If Less than 100kb
          break;
        }
      }
      for ($i = 0; $i <= 20; $i++) {
        $update_file = $GLOBALS['TLE_Update_Files'].$i.'.json';
        if (file_exists($update_file)) {
          $update_file_contents = file_get_contents($update_file);
          $update_dict = json_decode($update_file_contents, true);
          if (isset($TLE_dict)){unset($TLE_dict);}
          if (is_array($update_dict) || is_object($update_dict)) {    //Verify File Had Information
            foreach ($update_dict as $key => $id) {                   //Search Each JSON File
                if (is_array($id)) {                                         //Parse each object in File
                  $fileNumber = $id['FILE'];
                  if ($maxFileNumber < $fileNumber)
                    {$maxFileNumber = $fileNumber;}
                  set_time_limit(60);
                }
            }
          }
          unset($update_file_contents);
          unset($update_dict);
        }
      }
      writeMostRecentRequest($maxFileNumber);
      break;
    case "full":
    for ($i = 0; $i <= 20; $i++) { //Request Newest ELSETs from last 2 weeks in 1250 size chunks.
      set_time_limit(120);
      $start = $chunk * $i;
      send_message($serverTime, 'Catalogue Objects File #' . $i . ' Created', $i/20);
      getContent("https://www.space-track.org/basicspacedata/query/class/tle_latest/ORDINAL/1/EPOCH/%3Enow-30/orderby/NORAD_CAT_ID/format/json/limit/$chunk,$start/",$GLOBALS['TLE_Update_Files'].$i.'.json');
      if (filesize($GLOBALS['TLE_Update_Files'].$i.'.json') < 100*1024) { //If Less than 100kb
        break;
      }
    }
    break;
    case "decay":
    for ($i = 42; $i <= 50; $i++) { //Request decays in 1250 size chunks.
      set_time_limit(120);
      $start = $chunk * $i;
      getContent("https://www.space-track.org/basicspacedata/query/class/decay/limit/$chunk,$start/","/home/kruczek/keeptrack.space/admin/TLE/decay".$i.".json");
      if (filesize("/home/kruczek/keeptrack.space/admin/TLE/decay".$i.".json") < 100*1024) { //If Less than 100kb
        break;
      }
    }
    case "leo":
    for ($i = 0; $i <= 20; $i++) { //Request leo in 1250 size chunks.
      set_time_limit(120);
      $start = $chunk * $i;
      send_message($serverTime, 'Catalogue Objects File #' . $i . ' Created', $i/20);
      getContent("https://www.space-track.org/basicspacedata/query/class/tle_latest/ORDINAL/1/EPOCH/%3Enow-30/PERIGEE/%3E5000/orderby/NORAD_CAT_ID/format/json/limit/$chunk,$start/","TLE/leo".$i.".json");
      if (filesize("/home/kruczek/keeptrack.space/admin/TLE/leo".$i.".json") < 100*1024) { //If Less than 100kb
        break;
      }
    }
  }

  send_message($serverTime, 'Catalogue Download Complete', 1);

function getMostRecentRequest(){
  $maxFileNumber = 0;
  $filename = "mostrecentrequest.txt";
  if (file_exists($filename)) {
    $maxFileNumber = file_get_contents($filename);
    echo "<br /><br /><br />$maxFileNumber<br /><br /><br />";
  }
  return $maxFileNumber;
}

function writeMostRecentRequest($maxFileNumber){
  $filename = "mostrecentrequest.txt";
  if (is_writable($filename)) {
    $fp = fopen($filename, 'w');
    fwrite($fp, $maxFileNumber);
    fclose($fp);
  }
}

function getCookie() {
  $url="https://www.space-track.org/ajaxauth/login";
  $username="YOUR_USERNAME_GOES_HERE";
  $password="YOUR_PASSWORD_GOES_HERE";
  $postdata = "identity=".$username."&password=".$password;
  $ch = curl_init();
  curl_setopt ($ch, CURLOPT_URL, $url);
  curl_setopt($ch, CURLOPT_HEADER, 1);
  curl_setopt($ch, CURLOPT_COOKIEJAR, 'cookies.txt');
  curl_setopt ($ch, CURLOPT_POSTFIELDS, $postdata);
  curl_setopt ($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER  ,1);
  $result = curl_exec ($ch);
  curl_close($ch);
  echo $result;
}

function getContent($url, $filename) {
  $fp = fopen($filename, "w");
  $ch = curl_init();
  curl_setopt ($ch, CURLOPT_URL, $url);
  curl_setopt($ch, CURLOPT_HEADER, 0);
  curl_setopt($ch, CURLOPT_COOKIEFILE, 'cookies.txt');
  curl_setopt($ch, CURLOPT_RETURNTRANSFER  ,1);
  $result = curl_exec ($ch);
  curl_close($ch);
  fwrite($fp, $result);
  fclose($fp);
  echo $result;
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
