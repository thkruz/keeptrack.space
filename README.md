# 
keeptrack.space
=======================
In 2015 [@jeyoder](https://github.com/jeyoder) released stuffin.space to visualize satellites around the earth. Since then a few members of MIT Lincoln Labs altered the code to combine files together, provide ability to adjust rate of time, and fix minor errors.

In 2016 [@thkruz](https://github.com/thkruz) forked the MIT Lincoln Labs version and began adding details about the satellites relevant to the tracking stations around the world. Additionally a few features have been added including: changing current date/time, viewing sensor details, viewing current weather at a sensor, and searching by launch vehicle.

This project is both for practical purposes as a member of Air Force Space Command and as a practical exercise in learning how to manage a large software project.

How the Code Works
----------------------
* index.htm - Controls the structure of the front-end and loads all the CSS and JS files.
* main.js - Primary JS files that runs the website.
* satCruncher.js - Web Worker that provides x, y, z coordinates of the satellites and if it is in a sensor's FOV.
* orbit-calculation-worker.js - Web Worker that generates future orbits for satellites.
* TLE.json - The main database on satellites and orbits.
* All Other .js Files - Dependencies that can be found elsewhere. Provide functions like the calender and spinner.
* Everything Else - Basic website CSS/images/icons.

Install
----------------------
1. Setup a basic webserver with php.
2. Download the files to the websserver.
3. Visit your webserver.

Xampp is a very practical way to test on Windows.

Contributing
----------------------
Contributions are welcome! Currently the project is private, but will likely become public at some point. If you know someone that you would like to invite to the project before it is private message [@thkruz](https://github.com/thkruz).
