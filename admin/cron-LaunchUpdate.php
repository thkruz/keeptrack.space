<?php
getContent("http://space.skyrocket.de/doc_chr/lau2017.htm",__DIR__ . '/../launch-schedule.htm');

$DELETE_FLAG = true;
$i = 1;

$data = file(__DIR__ . '/../launch-schedule.htm');
$out = array();

foreach($data as $line) {
  if($i == 84) {
    $DELETE_FLAG = false;
  }
  if(strpos($line, "<h2>Launch sites:</h2>") !== false) {
    $DELETE_FLAG = true;
  }
  if (!$DELETE_FLAG) {
    $line = str_replace('a href="..', 'a class="iframe cboxElement" href="http://space.skyrocket.de', $line);
    $out[] = $line;
  }
  $i++;
}

$fp = fopen(__DIR__ . '/../launch-schedule.htm', "w+");
flock($fp, LOCK_EX);
foreach($out as $line) {
    fwrite($fp, $line);
}
flock($fp, LOCK_UN);
fclose($fp);

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
?>
