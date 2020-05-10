# keeptrack.space
=======================
## Description
----------------------
In 2015 [@jeyoder](https://github.com/jeyoder) released stuffin.space to visualize satellites around the earth. 
In 2016 [@thkruz](https://github.com/thkruz) released keeptrack.space to provide simple orbital analysis tools.

Since then the code has been rewrote multiple times and now barely resembles the original behind the scenes.

## Table of Contents
----------------------
- [Installation](#Installation)
- [How the Code Works](#How-the-Code-Works)

## Installation
----------------------

## How the Code Works
----------------------
* index.htm - Controls the structure of the front-end and loads all the CSS and JS files.
* main.js - Primary JS files that controls the draw loop.
* satSet.js - Most of the manipulation of the local satellite catalogue occurs here.
* lookangles.js - My personal modifications to [@shashwata](https://github.com/shashwatak/)'s amazing library [satellite.js](https://github.com/shashwatak/satellite-js).
* satCruncher.js - Web Worker that provides x, y, z coordinates of the satellites and if it is in a sensor's FOV.
* orbit-calculation-worker.js - Web Worker that generates future orbits for satellites.
* TLE.json - The main database on satellites.

## Usage
----------------------

## License File
----------------------
At this time the code is NOT in the public domain and I reserve all rights on my modifications.

## Why Post the Code Then
----------------------
I wouldn't have gotten this far if I hadn't been able to reference other projects and figure out how they work. I encourage you to use my ideas and methods, especially if you are currently forking from stuffin.space, but I am unwilling to give away use of the code to commercial projects at this time.
