# keeptrack.space
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/thkruz/keeptrack.space?style=for-the-badge)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/thkruz/keeptrack.space?style=for-the-badge)
![language](https://img.shields.io/github/languages/top/thkruz/keeptrack.space?style=for-the-badge)
![GitHub issues](https://img.shields.io/github/issues/thkruz/keeptrack.space?style=for-the-badge)
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/thkruz/keeptrack.space/Test%20site%20for%20publicly%20known%20js%20vulnerabilities?label=vulnerabilities&style=for-the-badge)
![License](https://img.shields.io/github/license/thkruz/keeptrack.space?style=for-the-badge)
## Description
KeepTrack originally was meant to provide simple orbital analysis tools. Since then those simple tools have evolved into complex tools that bring functionality usually only found in expensive toolkits to the average user. The ultimate goal of the project is to make learning about orbital mechanics and satellite operations accessible to everyone without a paywall.

The code has been rewrote multiple times and now barely resembles the original, but none of this would have been possible without [@jeyoder](https://github.com/jeyoder)'s original stuffin.space.

## Live Demo
The most recent commit is available here: https://thkruz.github.io/keeptrack.space/

## Table of Contents
- [Description](#Description)
- [Installation](#Installation)
- [Usage](#Usage)
- [How the Code Works](#How-the-Code-Works)
- [Contributors](#Contributors)
- [License File](#License-File)

## Installation
The project is meant to be run from a webserver and is tested on an apache2 server. There are php scripts for generating TLE.json that are not included, but http://keeptrack.space/TLE.json can be referenced for an up-to-date catalog.

To run this, simply drop the files into a webserver and then load index.htm in a browser. Development is done on the most up-to-date version of Chrome on Windows. Compatibility for Edge is periodically checked. Please report your browser/OS if you have problems to ensure it isn't a compatibility problem.

## Usage
The main index.htm page loads a canvas element set to the size of the window that displays the earth, satellites, and stars. The UI is loaded in DOM elements on top of the canvas element. Two webworkers are loaded (satCruncher.js and orbit-calculation-worker.js) to handle constant calculation of satellite locations and updating orbit lines when an object is highlighted.

The main draw loop (main.js) has been optimized to reduce memory leaks and to keep FPS high. This is commonly done by having routines modify global variables vs returning a variable - this is definitely intentional.

Any modifications to a satellite require that information to be passed to the satCruncher webworker to ensure the UI calculations match the dot on the screen. Most calculations utilize a brute-force method of guess and check (lookangle times, missile trajectories, etc). Optimizing the loop for those calculations is criitcal to keeping the project responsive.

### How the Code Works
* index.htm - Controls the structure of the front-end and loads all the CSS and JS files.
* main.js - Primary JS files that controls the draw loop.
* objectManager.js - Used for extracting details from TLE.json and loading additional objects from other files.
* mapManager.js - My modified version of [@juliuste](https://github.com/juliuste/projections)'s library for stereographic map projection.
* orbitManager.js - Draws the orbit lines. Called from the main draw loop.
* satSet.js - Most of the manipulation of the local satellite catalogue occurs here.
* color-scheme.js - Handles the calculation of rgba colors for objects.
* earth.js - Draws the earth and the atmosphere. Currently (bad!) responsible for updating time string timeManager references. Called from main.js
* lookangles.js - My personal modifications to [@shashwata](https://github.com/shashwatak/)'s amazing library [satellite.js](https://github.com/shashwatak/satellite-js).
* timeManager.js - Tracks internal time and controls time manipulation.
* search-box.js - Functions for searching the catalog and manipulating the search drop-down.
* sun-calc.js - [@mourner](https://github.com/mourner/suncalc)'s library used for star position calculations.
* satCruncher.js - Web Worker that provides x, y, z coordinates of the satellites and if it is in a sensor's FOV.
* orbit-calculation-worker.js - Web Worker that generates future orbits for satellites.
* TLE.json - The main database on satellites.
* controlSiteManager.js - Database of command and control locations.
* launchSiteManager.js - Database of launch locations.
* missileManager.js - ICBM/SLBM simulator.
* sensorManager.js - Database of sensor locations.
* starManager.js - Database of stars.
* starManager-constellations.js - Add-on database of star constellations.

## Contributors
* [@cwang-pivotal](https://github.com/cwang-pivotal/)
* [@hkruczek](https://github.com/hkruczek/)
* [@Le-Roi777](https://github.com/Le-Roi777/)

## License
Copyright (C) 2016-2020 Theodore Kruczek

Copyright (C) 2020 Heather Kruczek

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
