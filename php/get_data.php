<?php
  if ($_GET['type'] == "c") {
    echo json_encode(file_get_contents("https://celestrak.com/satcat/tle.php?CATNR=" . $_GET['sat']));
  }

  if ($_GET['type'] == "n") {
    echo file_get_contents("https://www.n2yo.com/satellite/?s=" . $_GET['sat']);
  }
?>
