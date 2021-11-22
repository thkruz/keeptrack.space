<?php
  if ($_GET['type'] == "c") {
    $SAT_ID = filter_var($_GET['sat'], FILTER_SANITIZE_NUMBER_INT);
    echo json_encode(file_get_contents("https://celestrak.com/satcat/tle.php?CATNR=" . $SAT_ID));
  }

  if ($_GET['type'] == "n") {
    $SAT_ID = filter_var($_GET['sat'], FILTER_SANITIZE_NUMBER_INT);
    echo htmlspecialchars(file_get_contents("https://www.n2yo.com/satellite/?s=" . $SAT_ID));
  }
?>
