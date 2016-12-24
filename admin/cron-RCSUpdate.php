<?php
  //a new content type. make sure apache does not gzip this type, else it would get buffered
  header('Content-Type: text/event-stream');
  header('Cache-Control: no-cache'); // recommended to prevent caching of event data.

  $GLOBALS['RCS_Update_Files'] = '/home/kruczek/keeptrack.space/admin/TLE/rcs'; // Declare Global File Locations
  $serverTime = time();

  getCookie();
  $chunk = 1250;
  for ($i = 0; $i <= 20; $i++) { //Request Newest ELSETs from last 2 weeks in 1250 size chunks.
    set_time_limit(120);
    $start = $chunk * $i;
    echo 'Catalogue Objects File #' . $i . " Created\n\n";
    getContent("https://www.space-track.org/basicspacedata/query/class/satcat/DECAY/null-val/PERIOD/%3C%3Enull-val/CURRENT/Y/orderby/NORAD_CAT_ID/format/json/limit/$chunk,$start/",$GLOBALS['RCS_Update_Files'].$i.'.json');
    if (filesize($GLOBALS['RCS_Update_Files'].$i.'.json') < 100*1024) { //If Less than 100kb
      echo 'File Size too Small';
      break;
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
  // echo $result;
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
  echo $result . "\n\n";
}
?>
