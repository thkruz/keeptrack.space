<?php
getContent("http://celestrak.com/cgi-bin/searchSOCRATES.pl?IDENT=NAME&NAME_TEXT1=&NAME_TEXT2=&ORDER=MAXPROB&MAX=20",__DIR__ . '/../SOCRATES.htm');

$DELETE_FLAG = true;
$i = 1;

$data = file(__DIR__ . '/../SOCRATES.htm');
$out = array();

foreach($data as $line) {
  if($i == 30) {
    $DELETE_FLAG = false;
  }
  if($i == 496) {
    $DELETE_FLAG = true;
  }
  if (!$DELETE_FLAG) {
    $out[] = $line;
  }
  $i++;
}

$fp = fopen(__DIR__ . '/../SOCRATES.htm', "w+");
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
