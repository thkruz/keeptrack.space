<?php
getContent("http://space.skyrocket.de/doc_chr/lau2016.htm",__DIR__ . '/../launch-schedule.htm');

function getContent($url, $filename) {
  $fp = fopen($filename, "w");
  $ch = curl_init();
  curl_setopt ($ch, CURLOPT_URL, $url);
  curl_setopt($ch, CURLOPT_HEADER, 0);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER  ,1);
  $result = curl_exec ($ch);
  curl_close($ch);
  fwrite($fp, $result);
  fclose($fp);
  echo $result;
}

echo '<META HTTP-EQUIV="Refresh" Content="0; URL=http://10.0.0.163/admin/TLEParse.html">';
?>
