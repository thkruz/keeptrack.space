![Latest Version](https://img.shields.io/badge/version-10.5.2-darkgreen?style=flat-square) ![GitHub commit activity](https://img.shields.io/github/commit-activity/m/thkruz/keeptrack.space?style=flat-square) ![language](https://img.shields.io/github/languages/top/thkruz/keeptrack.space?style=flat-square) ![Languages](https://img.shields.io/github/languages/count/thkruz/keeptrack.space?style=flat-square) ![GitHub issues](https://img.shields.io/github/issues/thkruz/keeptrack.space?style=flat-square) ![License](https://img.shields.io/github/license/thkruz/keeptrack.space?style=flat-square) <img src="./public/img/textLogoLg.png" width='100%' alt="KeepTrack.Space" align="center">

# Table of Contents

- [Project Overview](#project-overview)
- [Who Is KeepTrack For?](#who-is-keeptrack-for)
- [Features](#features)
- [Screenshots](#screenshots)
- [Installation](#installation)
- [Usage](#usage)
- [Release Notes](#release-notes)
- [Contributors](#contributors)
- [License](#license)

# Project Overview

Welcome to KeepTrack, an ambitious project aiming to make orbital analysis tools accessible to all. Keep Track is the only astrodynamics tool designed for non-engineers. It provides a simplified and streamlined experience for learning and interacting with satellites and space debris. Keep Track is built from the ground up with custom WebGL shaders and a high-performance render loop. It can simulate 2.5 million pieces of debris at 60fps. The core app is only 7 Mb and loads in 2 seconds. It's free, open source, and works on any modern browser.

## Who is KeepTrack For?

Keep Track is used in operations centers, classrooms, and outreach programs. Here are some examples of how different groups use Keep Track:

### Operations Centers

- Get popup alerts when a satellite will pass through a sensor
- Find when sensors can see a priority satellite in seconds
- Easily simulate new launches for mission planning

### Education

- Learn through hands-on interaction, making learning engaging
- Use Xbox controllers for classroom demonstrations
- Experience AAA video game quality graphics

### Outreach

- Embed Keep Track on your website for free
- Show your satellite design in orbit before launch
- Explain space sustainability and the problem of debris

## Features

The feature set rivals those of expensive toolkits, such as AGI's STK, and includes the ability to:

- View comprehensive satellite data
- Perform advanced field of view calculations
- Create notional maneuvers
- Model satellite breakups
- Simulate new satellite launches
- And much more

# Screenshots

<!-- white border -->
<div style="border: 1px solid white;">
    <img src="./docs/5.jpg" align="center" style="width: 100%; height: 400px;">
</div>
<div style="border: 1px solid white;">
    <img src="./docs/1.jpg" align="center" style="width: 100%; height: 400px;">
</div>
<div style="border: 1px solid white;">
    <img src="./docs/2.jpg" align="center" style="width: 100%; height: 400px;">
</div>
<div style="border: 1px solid white;">
    <img src="./docs/6.jpg" align="center" style="width: 100%; height: 400px;">
</div>
<div style="border: 1px solid white;">
    <img src="./docs/3.jpg" align="center" style="width: 100%; height: 400px;">
</div>
<div style="border: 1px solid white;">
    <img src="./docs/4.jpg" align="center" style="width: 100%; height: 400px;">
</div>
<div style="border: 1px solid white;">
    <img src="./docs/7.jpg" align="center" style="width: 100%; height: 400px;">
</div>

# Installation

KeepTrack is automatically deployed with the most-current version of the main branch to https://keeptrack.space via Cloudflare.

## Prerequisites

KeepTrack.Space is built using ES6+ modules and assembled with Webpack. If you would like to build it locally, you need to install [git](https://git-scm.com/) and [npm](https://www.npmjs.com/).

## Setting up a Local Copy

```bash
git clone https://github.com/thkruz/keeptrack.space       #Clone the github files.
cd ./keeptrack.space/                                     #Switch into the directory.
npm i                                                     #Install the dependencies.
npm run build                                             #Build the project.
npm start                                                 #Start the server.
```

A more detailed tutorial can be found [here](https://keeptrack.space/resources/getting-keeptrack-running-locally/).

# Usage

The main index.html page loads a canvas element set to the size of the window that displays the earth, satellites, and stars. The UI is loaded in DOM elements on top of the canvas element. Two webworkers are loaded (positionCruncher.ts and orbitCruncher.ts) to handle constant calculation of satellite locations and updating orbit lines when an object is highlighted.

The main draw loop (drawManager.ts) has been optimized to reduce memory leaks and to keep FPS high. This is commonly done by having functions modify global variables vs returning a variable and using long functions rather than splitting them into pieces - this is definitely intentional.

Any modifications to a satellite require that information to be passed to the positionCruncher webworker to ensure the UI calculations match the dot on the screen. Most calculations utilize a brute-force method of guess and check (lookangle times, missile trajectories, etc). Optimizing the loop for those calculations is critcal to keeping the project responsive. One trick to improve performance is that satSet creates a dictionary of index -> Norad ID number and index -> COSPAR number to allow rapid lookup of satellite data.

There are Typescript files for generating TLE.json that are not included, but https://api.keeptrack.space/v2/sats can be referenced for an up-to-date catalog.

# Release Notes

- Version 10.0 - [Euclid](./docs/v10.md)
- Version 9.1 - [Kepler](./docs/v9.1.md)
- Version 9.0 - [Kepler](./docs/v9.md)
- Version 8.2 - [Phoenix](./docs/v8.2.md)
- Version 8.1 - [Phoenix](./docs/v8.1.md)
- Version 8.0 - [Phoenix](./docs/v8.md)
- Version 7.2 - [Nebula Navigator](./docs/v7.2.md)
- Version 7.0 - [Vega Viewpoint](./docs/v7.md)
- Version 6.0 - [Celestial Symphony](./docs/v6.md)
- Version 5.4 - [Orion Overhaul](./docs/v5.4.md)
- Version 5.0 - [Apollo Augments](./docs/v5.md)

# Contributors

- [@Le-Roi777](https://github.com/Le-Roi777/)
- [@hkruczek](https://github.com/hkruczek/)
- [@cwang-pivotal](https://github.com/cwang-pivotal/)

# License

Copyright (C) 2025 Kruczek Labs LLC

KeepTrack.Space is licensed under the GNU Affero General Public License. This means you can freely use, modify, and distribute it, provided you adhere to the terms of the license. For more details, see the [Full License](https://github.com/thkruz/keeptrack.space/blob/master/LICENSE).
