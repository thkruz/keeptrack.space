![GitHub release (latest by date)](https://img.shields.io/github/v/release/thkruz/keeptrack.space?style=flat-square) ![Codecov](https://img.shields.io/codecov/c/github/thkruz/keeptrack.space?style=flat-square&token=RKIkZS3xDN) ![GitHub commit activity](https://img.shields.io/github/commit-activity/m/thkruz/keeptrack.space?style=flat-square) ![language](https://img.shields.io/github/languages/top/thkruz/keeptrack.space?style=flat-square) ![Languages](https://img.shields.io/github/languages/count/thkruz/keeptrack.space?style=flat-square) ![GitHub issues](https://img.shields.io/github/issues/thkruz/keeptrack.space?style=flat-square) ![Vulnerabilities](https://img.shields.io/github/workflow/status/thkruz/keeptrack.space/Test%20site%20for%20publicly%20known%20js%20vulnerabilities?label=vulnerabilities&style=flat-square) ![License](https://img.shields.io/github/license/thkruz/keeptrack.space?style=flat-square)

<img src="./src/img/logo192.png" width=128 height=128 alt="KeepTrack.Space" align="right">

# KeepTrack.Space
> Astrodynamics Software for Non-Engineers

KeepTrack aims to provide orbital analysis tools to the average user. By providing features that are usually only found in expensive toolkits, we make learning about orbital mechanics and satellite operations accessible to everyone.

The code has been rewrote multiple times and now barely resembles the original, but none of this would have been possible without @jeyoder's original stuffin.space.

## Table of Contents
- [Installation](#Installation)
- [Built With](#Built-With)
- [Prerequisites](#Prerequisites)
- [Setting up a Local Copy](#Setting-up-a-Local-Copy)
- [Usage](#Usage)
- [Versioning](#Versioning)
- [How the Code Works](#How-the-Code-Works)
- [Tests](#Tests)
- [Style Guide](#Style-Guide)
- [Contributors](#Contributors)
- [License](#License)

## Installation

Starting with Version 3, a github page is automatically deployed with the most-current version of the main branch to https://thkruz.github.io/keeptrack.space/. Periodically the most stable version will be pushed to https://keeptrack.space.

### Built With
* [babel](https://babeljs.io/)
* [cypress](https://www.cypress.io/)
* [eslint 7](https://eslint.org/)
* [jest 26](https://jestjs.io/)
* [jsdom](https://github.com/jsdom/jsdom)
* [webpack 5](https://webpack.js.org/)

### Prerequisites
As of version 3.0, KeepTrack.Space is built using ES6+ modules and assembled with Webpack. If you would like to install it you need to install [git](https://git-scm.com/) and [npm](https://www.npmjs.com/).

### Setting up a Local Copy

Clone the github files. 

```bash
git clone https://github.com/thkruz/keeptrack.space
```

Switch into the directory.

```bash
cd ./keeptrack.space/
```

Have npm install all the dependencies (including the development ones). 

```bash
npm i --save-dev
```

Copy static files and then have webpack package the source, but not compress it for easier reading.

```bash
npm run build:dev
```

Launch a local webserver and then open index.htm in your preferred browser.

```bash
npm start
```

## Usage
The main index.htm page loads a canvas element set to the size of the window that displays the earth, satellites, and stars. The UI is loaded in DOM elements on top of the canvas element. Two webworkers are loaded (positionCruncher.js and orbitCruncher.js) to handle constant calculation of satellite locations and updating orbit lines when an object is highlighted.

The main draw loop (drawManager.js) has been optimized to reduce memory leaks and to keep FPS high. This is commonly done by having routines modify global variables vs returning a variable - this is definitely intentional.

Any modifications to a satellite require that information to be passed to the satCruncher webworker to ensure the UI calculations match the dot on the screen. Most calculations utilize a brute-force method of guess and check (lookangle times, missile trajectories, etc). Optimizing the loop for those calculations is criitcal to keeping the project responsive.

The project is meant to be run from a webserver but the index.htm file should work if launched directly form the local drive (some minor issues with external website requests and CORS errors). There are php scripts for generating TLE.json that are not included, but http://keeptrack.space/TLE.json can be referenced for an up-to-date catalog using:

```bash
npm run updateTle
```

## Versioning

We use [SemVer](http://semver.org/) for versioning.

## How the Code Works
### Main Files
* index.htm - Controls the structure of the front-end and loads all the CSS and JS files.
* main.js - Primary JS files that bootstraps all of the other files.
* camera.js - Camera class is used to create cameraManager that serves as the interface from the UI and the webgl camera.
* color-scheme-factory.js - Handles the creation of color schemes for the dots.
  * color-scheme.js - Handles the ruleset for how to color dots when enabled.
* drawManager.js - Controls the main draw loop.
  * sceneManager.js - Manages the sun, earth, moon, lines and atmosphere drawing.
  * meshManager.js - Controls the loading and drawing of .obj models of satellites.
  * post-processing.js - Loads and draws post processing shaders like gausian blur.
* group-factory.js - Manages creation and loading of satellite groups
  * sat-group.js - Manages individual satellite group
* missileManager.js - ICBM/SLBM simulator.
* objectManager.js - Used for extracting details from TLE.json and loading additional objects from other files.
  * controlSiteManager.js - Database of command and control locations.
  * launchSiteManager.js - Database of launch locations.
* orbitManager.js - Draws the orbit lines. Called from the main draw loop.
* photoManager.js - Handles the loading and displaying of satellite photography from external sources.
* satSet.js - Most of the manipulation of the local satellite catalogue occurs here.
* sensorManager.js - Database of sensor locations.
* starManager.js - Database of stars.
  * constellations.js - Add-on database of star constellations.
* timeManager.js - Tracks internal time and controls time manipulation.
* uiManager.js - Controls user keyboard/mouse inputs to the application.
  * mapManager.js - My modified version of [@juliuste](https://github.com/juliuste/projections)'s library for stereographic map projection.
  * search-box.js - Functions for searching the catalog and manipulating the search drop-down.
* orbitCruncher.js - Web Worker that generates future orbits for satellites.
* positionCruncher.js - Web Worker that provides x, y, z coordinates of the satellites and if it is in a sensor's FOV.
* TLE.json - The main database on satellites.
### Libraries
* lookangles.js - My personal modifications to [@shashwata](https://github.com/shashwatak/)'s amazing library [satellite.js](https://github.com/shashwatak/satellite-js).
* sun-calc.js - [@mourner](https://github.com/mourner/suncalc)'s library used for star position calculations.

## Tests
### Unit/Functional
Currently we are using Jest for unit and functional tests that should cover at least 80% of the functions. All of these tests can be run using:

```bash
npm run test
```
### End-To-End
For end-to-end (E2E) testing we use the cypress framework. When run, this will launch your browser of choice and then run a series of commands with the fully loaded website to make sure it works.
```bash
npm run cypress
```
### Fuzz
For fuzz testing the user interface we use [gremlins.js](https://github.com/marmelab/gremlins.js/). You can unleash the gremlins using db.gremlins() in your web browser's console. By default it runs for 1000 interactions or 10 errors.

## Style Guide

We use Prettier and ESLint to enforce consistent readable code. Please refer to our [contributing guide](https://github.com/thkruz/keeptrack.space/blob/master/CONTRIBUTING.md#code-style) for more info on styling.

## Contributors
* [@cwang-pivotal](https://github.com/cwang-pivotal/)
* [@hkruczek](https://github.com/hkruczek/)
* [@Le-Roi777](https://github.com/Le-Roi777/)

## License

Copyright (C) 2016-2021 Theodore Kruczek<br>
Copyright (C) 2020-2021 Heather Kruczek

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

[Full License](https://github.com/thkruz/keeptrack.space/blob/master/LICENSE)
