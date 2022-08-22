![GitHub release (latest by date)](https://img.shields.io/github/v/release/thkruz/keeptrack.space?style=flat-square) ![Codecov](https://img.shields.io/codecov/c/github/thkruz/keeptrack.space?style=flat-square&token=RKIkZS3xDN) ![GitHub commit activity](https://img.shields.io/github/commit-activity/m/thkruz/keeptrack.space?style=flat-square) ![language](https://img.shields.io/github/languages/top/thkruz/keeptrack.space?style=flat-square) ![Languages](https://img.shields.io/github/languages/count/thkruz/keeptrack.space?style=flat-square) ![GitHub issues](https://img.shields.io/github/issues/thkruz/keeptrack.space?style=flat-square) [![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier) ![Vulnerabilities](https://img.shields.io/github/workflow/status/thkruz/keeptrack.space/Test%20site%20for%20publicly%20known%20js%20vulnerabilities?label=vulnerabilities&style=flat-square) ![License](https://img.shields.io/github/license/thkruz/keeptrack.space?style=flat-square)

<img src="./src/img/promoWLogoSm.png" width='100%' alt="KeepTrack.Space" align="center">

## Astrodynamics Software for Non-Engineers

KeepTrack aims to provide orbital analysis tools to the average user. By providing features that are usually only found in expensive toolkits, I try to make learning about orbital mechanics and satellite operations accessible to everyone. The software is good enough to provide a common tactical picture on a military operations floor, but simple enough a high schooler can learn about orbits on his tablet.

Artificial Intelligence is behind many of the features in KeepTrack. The code is designed by me, but after writing the start of a pattern the rest is written by an algorithm to speed up development. Many of the unit tests are created by [PoniCode](https://www.ponicode.com/) so that I can focus on the math while it takes care of ensuring buttons are working as expected. Recently more artwork has been incorporated into the loading screen - that too is powered by AI. [MidJourney](https://www.midjourney.com/home/) creates the inspiration and then I upscale and edit it to create the final product.

The code has been rewrote multiple times and now barely resembles the original, but none of this would have been possible without using @jeyoder's original stuffin.space as a starting point.

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

Starting with Version 3, a github page is automatically deployed with the most-current version of the main branch to https://thkruz.github.io/keeptrack.space/. Periodically the most stable version will be pushed to https://keeptrack.space from the CI/CD pipeline.

### Built With

[![Visual Studio Code](https://img.shields.io/badge/Visual%20Studio%20Code-0078d7.svg?style=for-the-badge&logo=visual-studio-code&logoColor=white)](https://code.visualstudio.com/)[![Git](https://img.shields.io/badge/git-%23F05033.svg?style=for-the-badge&logo=git&logoColor=white)](https://git-scm.com/)[![npm](https://img.shields.io/badge/npm-%23E5E5E5?style=for-the-badge&logo=npm&logoColor=058a5e)](https://www.npmjs.com/)[![WebGL](https://img.shields.io/badge/WebGL-990000?logo=webgl&logoColor=white&style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/WebGL)[![Babel](https://img.shields.io/badge/Babel-F9DC3e?style=for-the-badge&logo=babel&logoColor=black)](https://babeljs.io/)[![Webpack](https://img.shields.io/badge/webpack-%238DD6F9.svg?style=for-the-badge&logo=webpack&logoColor=black)](https://webpack.js.org/)[![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)](https://eslint.org/)[![Jest](https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white)](https://jestjs.io/)[![cypress](https://img.shields.io/badge/-cypress-%23E5E5E5?style=for-the-badge&logo=cypress&logoColor=058a5e)](https://www.cypress.io/)[![GitHub](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)](http://github.com)[![GitLab](https://img.shields.io/badge/gitlab-%23181717.svg?style=for-the-badge&logo=gitlab&logoColor=white)](https://gitlab.com)

### Prerequisites

As of version 3.0, KeepTrack.Space is built using ES6+ modules and assembled with Webpack. If you would like to install it you need to install [git](https://git-scm.com/) and [npm](https://www.npmjs.com/).

### Setting up a Local Copy

```bash
git clone https://github.com/thkruz/keeptrack.space       #Clone the github files.
cd ./keeptrack.space/                                     #Switch into the directory.
npm ci                                                    #Install the dependencies.
npm run build                                             #Build the project.
npm start                                                 #Start the server.
```

### Launching Offline Mode

KeepTrack was designed to run without the need for a server. On Windows, close all open copies of chrome and then launch the included KeepTrack.bat file.

NOTE: You MUST compile the code first. Opening the index.html file in the src folder will not work. If that feels overwhelming, take a look at https://github.com/thkruz/keeptrack.space/tree/gh-pages for a built version that can be downloaded and launched.

## Usage

The main index.html page loads a canvas element set to the size of the window that displays the earth, satellites, and stars. The UI is loaded in DOM elements on top of the canvas element. Two webworkers are loaded (positionCruncher.ts and orbitCruncher.ts) to handle constant calculation of satellite locations and updating orbit lines when an object is highlighted.

The main draw loop (drawManager.ts) has been optimized to reduce memory leaks and to keep FPS high. This is commonly done by having functions modify global variables vs returning a variable and using long functions rather than splitting them into pieces - this is definitely intentional.

Any modifications to a satellite require that information to be passed to the positionCruncher webworker to ensure the UI calculations match the dot on the screen. Most calculations utilize a brute-force method of guess and check (lookangle times, missile trajectories, etc). Optimizing the loop for those calculations is criitcal to keeping the project responsive. One trick to improve performance is that satSet creates a dictionary of index -> Norad ID number and index -> COSPAR number to allow rapid lookup of satellite data.

There are ts scripts for generating TLE.json that are not included, but http://keeptrack.space/tle/TLE2.json can be referenced for an up-to-date catalog.

## Versioning

We use [SemVer](http://semver.org/) for versioning.

## Contributing

If you are interested in helping with this project, please reference the [Contributing Guidelines](CONTRIBUTING.md).

## How the Code Works

### Main Files

- index.html - Controls the structure of the front-end and loads all the CSS and JS files.
- main.ts - Primary TS file that bootstraps all of the other files.
- camera.ts - cameraManager is used to create cameraManager that serves as the interface from the UI and the webgl camera.
- colorSchemeManager.ts - Handles the creation of color schemes for the dots.
  - colorManager/ruleSets - These files handle the ruleset for how to color dots when enabled.
- drawManager.ts - Controls the main draw loop.
  - sceneManager.ts - Manages the sun, earth, moon, lines and atmosphere drawing.
  - meshManager.ts - Controls the loading and drawing of .obj models of satellites.
  - post-processing.js - Loads and draws post processing shaders like gausian blur. Not used at the moment.
- groupsManager.ts - Manages creation and loading of satellite groups
  - sat-group.ts - Manages individual satellite group
- missileManager.ts - ICBM/SLBM simulator.
- objectManager.ts - Used for extracting details from TLE.json and loading additional objects from other files.
  - controlSiteManager.ts - Database of command and control locations.
  - launchSiteManager.ts - Database of launch locations.
- orbitManager.ts - Draws the orbit lines. Called from the main draw loop.
- photoManager.ts - Handles the loading and displaying of satellite photography from external sources.
- satSet.ts - Most of the manipulation of the local satellite catalogue occurs here.
- sensorManager.ts - Database of sensor locations.
- starManager.ts - Database of stars.
  - constellations.ts - Add-on database of star constellations.
- timeManager.ts - Tracks internal time and controls time manipulation.
- uiManager.ts - Controls user keyboard/mouse inputs to the application.
  - mapManager.ts - My modified version of [@juliuste](https://github.com/juliuste/projections)'s library for stereographic map projection.
  - searchBox.ts - Functions for searching the catalog and manipulating the search drop-down.
- orbitCruncher.ts - Web Worker that generates future orbits for satellites.
- positionCruncher.ts - Web Worker that provides x, y, z coordinates of the satellites and if it is in a sensor's FOV.
- TLE2.json - The main database on satellites. (Second edition)

### Libraries

- [ootk](https://github.com/thkruz/ootk) - My TypeScript library for working with SGP4, sensor field of view, and Astronomical calculations.
  - Credit to [@shashwata](https://github.com/shashwatak/)'s amazing library satellite.js and [@mourner](https://github.com/mourner/suncalc)'s library suncalc for laying the ground work.

## Tests

### Unit/Functional

Currently we are using Jest for unit and functional tests that should cover at least 80% of the functions. All of these tests can be run using:

```bash
npm run test
```

### End-To-End

For end-to-end (E2E) testing we will be using the cypress framework. This is on the to-do list.

### Fuzz

For fuzz testing the user interface we use [gremlins.js](https://github.com/marmelab/gremlins.js/). You can unleash the gremlins using db.gremlins() in your web browser's console. By default it runs for 1000 interactions or 10 errors. You will need to ensure the debug plugin is enabled (see settingsManager.js).

### Security

For security testing we are using CodeQL and SonarCloud automatically in the CI/CD pipeline.

## Style Guide

We use Prettier and ESLint to enforce consistent readable code. Please refer to our [contributing guide](https://github.com/thkruz/keeptrack.space/blob/master/CONTRIBUTING.md#code-style) for more info on styling.

## Contributors

- [@cwang-pivotal](https://github.com/cwang-pivotal/)
- [@hkruczek](https://github.com/hkruczek/)
- [@Le-Roi777](https://github.com/Le-Roi777/)

## License

Copyright (C) 2016-2022 Theodore Kruczek<br> Copyright (C) 2020-2022 Heather Kruczek

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see https://www.gnu.org/licenses/.

[Full License](https://github.com/thkruz/keeptrack.space/blob/master/LICENSE)
