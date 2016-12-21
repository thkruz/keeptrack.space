<?php
header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="stylesheet" href="droidsans.css" type="text/css">
    <link rel="stylesheet" href="icomoon.css" type="text/css">
    <link rel="stylesheet" href="perfect-scrollbar.min.css" type="text/css">
    <link rel="stylesheet" href="style.css" type="text/css">
    <link rel="stylesheet" href="style.css" type="text/css">
    <link rel="stylesheet" href="jquery-ui.min.css" type="text/css">
    <link rel="stylesheet" href="jquery-ui-timepicker-addon.css" type="text/css">

  <!-- hack to pass home dir, tle file name, initial zoom to javascript -->
  <div id="tle-source" style="display: none;">
    <?php
      echo htmlspecialchars('/ TLE.json 0.5');
    ?>
  </div>

    <script src="jquery-2.2.2.min.js"></script>
    <script src="jquery-ui.min.js"></script>
    <script src="jquery-ui-timepicker-addon.js"></script>
    <script src="satellite.min.js"></script>
    <script src="script-loader.js"></script>

    <?php if($_SERVER['HTTP_HOST'] === 'keeptrack.space' || $_SERVER['HTTP_HOST'] === 'www.keeptrack.space') { ?>
      <script>
      (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
      (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
      m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
      })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

      ga('create', 'UA-85015093-1', 'auto');
      ga('send', 'pageview');

      </script>
   <?php } else { ?>
    <!-- analytics disabled for host "<?= $_SERVER['HTTP_HOST'] ?>" -->
   <?php } ?>

    <title>Catalog Objects in Space</title>

  </head>
  <body>
  <div id="findByLooks-menu">
    <div class="fbl-title"><span class="title-text">Find By Looks</span></div>
    <div id="findByLooks-content">
      <fieldset>
        <form id="findByLooks">
          <div class="center">
            <span class="vertcenter">Azimuth: </span>
            <input type="text" class="ghost-input" id="fbl-azimuth" value="XXX.X">
          </div>
          <div class="center">
            <span class="vertcenter">Elevation: </span>
            <input type="text" class="ghost-input" id="fbl-elevation" value="XX.X"></div>
          <div class="center">
            <span class="vertcenter">Range: </span>
            <input type="text" class="ghost-input" id="fbl-range" value="XXXX.X"></div>
          <div class="center">
            <input type="submit" id="findByLooks-submit" class="ghost-button" value="Search">
          </div>
        </form>
      </fieldset>
      <span id="findByLooks-results"></span>
    </div>
  </div>
  <div id="lookangles-menu">
    <div class="looks-title"><span class="title-text">Look Angles</span></div>
    <div id="lookangles-content">
      <table id="looks"  cellpadding="5"></table>
    </div>
  </div>
  <div id="twitter-menu">
    <a class="twitter-timeline" data-theme="dark" data-link-color="#2B7BB9" href="https://twitter.com/RedKosmonaut/lists/space-news">A Twitter List by RedKosmonaut</a> <script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>
  </div>
  <div id="launch-menu">
  </div>
  <div id="bottom-menu">Current Objects
    <!-- Place Holder For Bottom Information -->
  </div>

  <div id="no-webgl">
    Stuff in Space requires <a href="http://caniuse.com/#feat=webgl">WebGL</a> and <a href="http://caniuse.com/#feat=webworkers">Web Worker</a> support.
  </div>
  <div id="canvas-holder">
    <canvas id="canvas"></canvas>
    <div id="menu-left" class="menubar">
      <div id="search-holder" class="menu-item">
        <span class="icon-search"></span>
        <input type="text" id="search"></input>
      </div>
      <div id="menu-groups" class="menu-item">
        <div class="menu-title">Groups</div>
        <ul id="groups-display" class="dropdown submenu">
          <li data-group="<clear>" class="clear-option">Clear</li>
          <li data-group="WestfordNeedlesGroup">Westford Needles</li>
          <li data-group="Tag4">Test Custom List</li>
        </ul>
      </div>
      <div id="menu-countries" class="menu-item">
        <div class="menu-title">Countries</div>
        <ul id="groups-display" class="dropdown submenu">
          <li data-group="<clear>" class="clear-option">Clear</li>
          <li data-group="Canada">Canada</li>
          <li data-group="China">China</li>
          <li data-group="France">France</li>
          <li data-group="India">India</li>
          <li data-group="Israel">Israel</li>
          <li data-group="Japan">Japan</li>
          <li data-group="Russia">Russia / Soviet Union</li>
          <li data-group="UnitedKingdom">United Kingdom</li>
          <li data-group="UnitedStates">United States</li>
        </ul>
      </div>
        <div id="menu-radar" class="menu-item">
          <div class="menu-title">Radar Coverage</div>
            <ul id="radar-coverage" class="dropdown submenu">
              <li id="radar-capecod">Cape Cod</li>
              <li id="radar-clear">Clear</li>
              <li id="radar-millstone">Millstone</li>
            </ul>
        </div>
     <!-- <div id="menu-color-schemes" class="menu-item">
        <div class="menu-title">Color Schemes</div>
        <ul id="color-schemes-submenu" class="submenu">
          <li data-color="default">Type</li>
          <li data-color="velocity">Velocity</li>
          <li data-color="apogee">Apogee</li>
        </ul>
      </div>-->
    </div>
      <div id="menu-right" class="menubar">
        <div id="menu-help" class="menu-item">
          <div class="menu-title">Legend</div>
          <div id="legend-box" class="menubox submenu">
            <ul id="legend">
              <li>
                 <img class="dot" src="dot-red.png"></img>
                 Satellite
               </li>
              <li>
                <img class="dot" src="dot-blue.png"></img>
                Rocket body
              </li>
              <li>
                <img class="dot" src="dot-grey.png"></img>
                Debris
              <li>
                <img class="dot" src="dot-yellow.png"></img>
                In FOV
              </li>
            </ul>
          </div>
        </div>
        <div id="menu-help" class="menu-item">
          <div class="menu-title">Help</div>
          <div id="help-box" class="menubox submenu">
            <span class="box-header">Movement</span>
            <ul id="controls-info">
              <li>Left/Right click and drag to rotate camera</li>
              <li>Mousewheel to zoom</li>
              <li>Left click to select an object</li>
              <li>'<b>R</b>' key to start/stop rotation</li>
            </ul>
            <p></p>
            <span class="box-header">Alter Time</span>
            <ul id="controls-info">
              <li>'<b>&#60;&#47;&#62;</b>'keys for +/- 10 second change</li> <!-- '</>' keys... -->
              <li>'<b>!</b>' key to reset time to current time</li>
              <li>'<b>+/-</b>' keys for faster/slower time</li>
              <li>'<b>1</b>' key to reset time to 1x</li>
            </ul>

          </div>
        </div>
        <div id="menu-about" class="menu-item">
          <div class="menu-title">About</div>
          <div id="about-box" class="menubox submenu">
            <span class="box-header">Keep Track</span>
            <p>This tool is an unoffical means of analyzing objects in orbit and
               determing details such as rise/set times, rcs, and history. The main
               power of this tool is in compiling many open-source databases into one
               interface, not in any unique capability.</p>
            <p>The development build is located on my alternate server. It may
              become password protected at some point, but until then it can be
              accessed here: <a href="http://76.119.61.58">http://76.119.61.58</a></p>
            <span class="box-header">Original Author</span>
            <p>The original source code for this tool and much of the credit goes
               to <a href="http://stuffin.space">James Yoder</a>. He is an alumnus of
               <i>FIRST</i> Robotics Competition (FRC) Team 624 and an Electrical and Computer
               Engineering major at the University of Texas at Austin. Without his work this tool
               would not be possible.</p>
             <span class="box-header">MIT Lincoln Labs Support</span>
             <p>Special thanks to Tim Wallace, David Rysdam, Chirag Bhutt, and the
                team at MIT Lincoln Labs who updated and fixed the original code.
                They provided a great starting point for expanding the features of
                this tool to do more than just display orbits.</p>
          </div>
        </div>
      </div>
    </div>
      <div id="search-results"></div>
    <div id="sat-hoverbox">(none)</div>
    <div id="sat-infobox">
      <div id="sat-info-title">This is a title</div>
      <div id="all-objects-link" class="link">Find all objects from this launch...</div>
      <div class="sat-info-row">
        <div class="sat-info-key">Int'l Designator</div>
        <div class="sat-info-value" id="sat-intl-des">1998-067A</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key">Object number</div>
        <div class="sat-info-value" id="sat-objnum">99999</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key">Type</div>
        <div class="sat-info-value" id="sat-type">PAYLOAD</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key">Country</div>
        <div class="sat-info-value" id="sat-country">COUNTRY</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key">Launch Site</div>
        <div class="sat-info-value" id="sat-site">SITE</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key"></div>
        <div class="sat-info-value" id="sat-sitec">SITEC</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key">Launch Vehicle</div>
        <div class="sat-info-value" id="sat-vehicle">VEHICLE</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key">Apogee</div>
        <div class="sat-info-value" id="sat-apogee">100 km</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key">Perigee</div>
        <div class="sat-info-value" id="sat-perigee">100 km</div>
      </div>
       <div class="sat-info-row">
        <div class="sat-info-key">Inclination</div>
        <div class="sat-info-value" id="sat-inclination">123.45°</div>
      </div>
       <div class="sat-info-row">
        <div class="sat-info-key">Eccentricity</div>
        <div class="sat-info-value" id="sat-eccentricity">0.15</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key">Longitude</div>
        <div class="sat-info-value" id="sat-longitude">0</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key">Latitude</div>
        <div class="sat-info-value" id="sat-latitude">0</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key">Altitude</div>
        <div class="sat-info-value" id="sat-altitude">100 km</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key">Velocity</div>
        <div class="sat-info-value" id="sat-velocity">100 km/s</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key">Azimuth</div>
        <div class="sat-info-value" id="sat-azimuth">30 deg</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key">Elevation</div>
        <div class="sat-info-value" id="sat-elevation">60 deg</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key">Range</div>
        <div class="sat-info-value" id="sat-range">1000 km</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key">Period</div>
        <div class="sat-info-value" id="sat-period">100 min</div>
      </div>
      <div class="sat-info-row">
        <div class="sat-info-key">Age of ELSET</div>
        <div class="sat-info-value" title="" id="sat-elset-age">365.1264</div>
      </div>
    </div>
    <div id="datetime">
      <div id="datetime-text"></div>
      <div id="datetime-input">
        <form id="datetime-input-form">
          <input type="text" id="datetime-input-tb">
        </form>
      </div>
   </div>
    <div id="zoom-controls">
      <div id="zoom-in" class="zoom-button">+</div>
      <div id="zoom-out" class="zoom-button">-</div>
    </div>
    <div id="load-cover">
      <div id="loader">
        <div id="spinner"></div>
        <div id="loader-text">
          Downloading resources...
        </div>
      </div>
    </div>
  </div>
  </body>
</html>
