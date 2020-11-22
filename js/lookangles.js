/* /////////////////////////////////////////////////////////////////////////////

lookangles.js is an expansion library for satellite.js providing tailored
functions for calculating orbital data.
http://keeptrack.space

Copyright (C) 2016-2020 Theodore Kruczek
Copyright (C) 2020 Heather Kruczek

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

///////////////////////////////////////////////////////////////////////////// */

(function () {
  'use strict';
    // Constants
    const TAU = 2 * Math.PI;
    const DEG2RAD = TAU / 360;
    const RAD2DEG = 360 / TAU;
    const MINUTES_PER_DAY = 1440;
    const MILLISECONDS_PER_DAY = 1.15741e-8;

    // Settings
    satellite.lookanglesInterval = 5;
    satellite.lookanglesLength = 2;
    satellite.isRiseSetLookangles = false;

    satellite.currentEpoch = (currentDate) => {
        currentDate = new Date(currentDate);
        let epochYear = currentDate.getUTCFullYear();
        epochYear = parseInt(epochYear.toString().substr(2, 2));
        let epochDay = pad(timeManager.getDayOfYear(currentDate), 3);
        let timeOfDay =
            (currentDate.getUTCHours() * 60 + currentDate.getUTCMinutes()) /
            1440;
        epochDay = (epochDay + timeOfDay).toFixed(8);
        epochDay = pad(epochDay, 12);

        function pad(str, max) {
            return str.length < max ? pad('0' + str, max) : str;
        }

        return [epochYear, epochDay];
    };

    satellite.distance = (hoverSat, selectedSat) => {
        if (selectedSat == null || hoverSat == null) {
            return '';
        }
        if (selectedSat.type === 'Star' || hoverSat.type === 'Star') {
            return '';
        }
        let distanceApartX = Math.pow(
            hoverSat.position.x - selectedSat.position.x,
            2
        );
        let distanceApartY = Math.pow(
            hoverSat.position.y - selectedSat.position.y,
            2
        );
        let distanceApartZ = Math.pow(
            hoverSat.position.z - selectedSat.position.z,
            2
        );
        let distanceApart = Math.sqrt(
            distanceApartX + distanceApartY + distanceApartZ
        ).toFixed(0);
        return '<br />Range: ' + distanceApart + ' km';
    };

    // TODO: UI element changes/references should be moved to ui.js
    // There are a series of referecnes, especially in satellite.obs, to ui elements.
    // These should be moved to ui.js and then called before/after calling satellite.setobs
    satellite.setobs = (sensor) => {
        if (typeof sensor == 'undefined') {
            sensorManager.currentSensor = sensorManager.defaultSensor;
            $('.sensor-reset-menu').hide();
            return;
        } else {
            $('#menu-sensor-info').removeClass('bmenu-item-disabled');
            $('#menu-fov-bubble').removeClass('bmenu-item-disabled');
            $('#menu-surveillance').removeClass('bmenu-item-disabled');
            $('#menu-planetarium').removeClass('bmenu-item-disabled');
            $('#menu-astronomy').removeClass('bmenu-item-disabled');
            $('.sensor-reset-menu').show();
        }
        sensorManager.currentSensor = sensor;
        sensorManager.currentSensor.observerGd = {
            // Array to calculate look angles in propagate()
            latitude: sensor.lat * DEG2RAD,
            longitude: sensor.long * DEG2RAD,
            height: parseFloat(sensor.obshei), // Converts from string to number
        };
    };

    satellite.altitudeCheck = (tle1, tle2, propOffset) => {
        let satrec = satellite.twoline2satrec(tle1, tle2); // perform and store sat init calcs

        let propTime = timeManager.propTimeCheck(
            propOffset,
            timeManager.propRealTime
        );
        let j = timeManager.jday(
            propTime.getUTCFullYear(),
            propTime.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
            propTime.getUTCDate(),
            propTime.getUTCHours(),
            propTime.getUTCMinutes(),
            propTime.getUTCSeconds()
        ); // Converts time to jday (TLEs use epoch year/day)
        j += propTime.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
        let gmst = satellite.gstime(j);

        let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
        let positionEci = satellite.sgp4(satrec, m);
        let gpos;

        try {
            gpos = satellite.eciToGeodetic(positionEci.position, gmst);
        } catch (e) {
            return 0; // Auto fail the altitude check
        }
        return gpos.height;
    };
    satellite.getTEARR = (sat, sensor, propTime) => {
        if (!objectManager.isSensorManagerLoaded)
            throw 'satellite.getTEARR requires sensorManager';
        let currentTEARR = {}; // Most current TEARR data that is set in satellite object and returned.

        // If no sensor passed to function then try to use the 'currentSensor'
        if (typeof sensor == 'undefined') {
            if (typeof sensorManager.currentSensor != 'undefined') {
                sensor = sensorManager.currentSensor;
            } else {
                throw 'getTEARR requires a sensor or for a sensor to be currently selected.';
            }
        }
        // If sensor's observerGd is not set try to set it using it parameters
        if (typeof sensor.observerGd == 'undefined') {
            try {
                sensor.observerGd = {
                    height: sensor.obshei,
                    latitude: sensor.lat,
                    longitude: sensor.long,
                };
            } catch (e) {
                throw 'observerGd is not set and could not be guessed.';
            }
            // If it didn't work, try again
            if (typeof sensor.observerGd.longitude == 'undefined') {
                try {
                    sensor.observerGd = {
                        height: sensor.alt,
                        latitude: sensor.lat * DEG2RAD,
                        longitude: sensor.lon * DEG2RAD,
                    };
                } catch (e) {
                    throw 'observerGd is not set and could not be guessed.';
                }
            }
        }

        // Set default timing settings. These will be changed to find look angles at different times in future.
        let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
        let now;
        if (typeof propTime != 'undefined') {
            now = propTime;
        } else {
            now = timeManager.propTime();
        }
        let j = timeManager.jday(
            now.getUTCFullYear(),
            now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
            now.getUTCDate(),
            now.getUTCHours(),
            now.getUTCMinutes(),
            now.getUTCSeconds()
        ); // Converts time to jday (TLEs use epoch year/day)
        j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
        let gmst = satellite.gstime(j);

        let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
        let positionEci = satellite.sgp4(satrec, m);

        try {
            let gpos = satellite.eciToGeodetic(positionEci.position, gmst);
            currentTEARR.alt = gpos.height;
            currentTEARR.lon = gpos.longitude;
            currentTEARR.lat = gpos.latitude;
            let positionEcf = satellite.eciToEcf(positionEci.position, gmst);
            let lookAngles = satellite.ecfToLookAngles(
                sensor.observerGd,
                positionEcf
            );
            currentTEARR.azimuth = lookAngles.azimuth * RAD2DEG;
            currentTEARR.elevation = lookAngles.elevation * RAD2DEG;
            currentTEARR.range = lookAngles.rangeSat;
        } catch (e) {
            currentTEARR.alt = 0;
            currentTEARR.lon = 0;
            currentTEARR.lat = 0;
            currentTEARR.azimuth = 0;
            currentTEARR.elevation = 0;
            currentTEARR.range = 0;
        }

        currentTEARR.inview = satellite.checkIsInFOV(sensor, {
            az: currentTEARR.azimuth,
            el: currentTEARR.elevation,
            range: currentTEARR.range,
        });
        uiManager.currentTEARR = currentTEARR;
        return currentTEARR;
    };

    satellite.nextpassList = (satArray) => {
        let nextPassArray = [];
        for (let s = 0; s < satArray.length; s++) {
            let time = satellite.nextNpasses(
                satArray[s],
                undefined,
                1000 * 60 * 60 * 24,
                satellite.lookanglesInterval,
                settingsManager.nextNPassesCount
            ); // Only do 1 day looks
            for (let i = 0; i < time.length; i++) {
                nextPassArray.push({
                    SCC_NUM: satArray[s].SCC_NUM,
                    time: time[i],
                });
            }
        }
        return nextPassArray;
    };
    satellite.nextpass = (sat, sensor, searchLength, interval) => {
        // If no sensor passed to function then try to use the 'currentSensor'
        if (typeof sensor == 'undefined') {
            if (typeof sensorManager.currentSensor == 'undefined') {
                throw 'getTEARR requires a sensor or for a sensor to be currently selected.';
            } else {
                sensor = sensorManager.currentSensor;
            }
        }
        // If sensor's observerGd is not set try to set it using it parameters
        if (typeof sensor.observerGd == 'undefined') {
            try {
                sensor.observerGd = {
                    height: sensor.obshei,
                    latitude: sensor.lat,
                    longitude: sensor.long,
                };
            } catch (e) {
                throw 'observerGd is not set and could not be guessed.';
            }
        }
        // If length and interval not set try to use defaults
        if (typeof searchLength == 'undefined')
            searchLength = satellite.lookanglesLength;
        if (typeof interval == 'undefined')
            interval = satellite.lookanglesInterval;

        let propOffset = timeManager.getPropOffset();
        let propTempOffset = 0;
        let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
        for (let i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
            // 5second Looks
            propTempOffset = i * 1000 + propOffset; // Offset in seconds (msec * 1000)
            let now = timeManager.propTimeCheck(
                propTempOffset,
                timeManager.propRealTime
            );
            let aer = satellite.getRae(now, satrec, sensor);

            let isInFOV = satellite.checkIsInFOV(sensor, aer);
            if (isInFOV) {
                return timeManager.dateFormat(now, 'isoDateTime', true);
            }
        }
        return 'No Passes in ' + satellite.lookanglesLength + ' Days';
    };
    satellite.nextNpasses = (
        sat,
        sensor,
        searchLength,
        interval,
        numPasses
    ) => {
        // If no sensor passed to function then try to use the 'currentSensor'
        if (typeof sensor == 'undefined') {
            if (typeof sensorManager.currentSensor == 'undefined') {
                throw 'getTEARR requires a sensor or for a sensor to be currently selected.';
            } else {
                sensor = sensorManager.currentSensor;
            }
        }
        // If sensor's observerGd is not set try to set it using it parameters
        if (typeof sensor.observerGd == 'undefined') {
            try {
                sensor.observerGd = {
                    height: sensor.obshei,
                    latitude: sensor.lat,
                    longitude: sensor.long,
                };
            } catch (e) {
                throw 'observerGd is not set and could not be guessed.';
            }
        }
        // If length and interval not set try to use defaults
        if (typeof searchLength == 'undefined')
            searchLength = satellite.lookanglesLength;
        if (typeof interval == 'undefined')
            interval = satellite.lookanglesInterval;

        let passTimesArray = [];
        let propOffset = timeManager.getPropOffset();
        let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
        const orbitalPeriod =
            MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion
        for (let i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
            // 5second Looks
            // Only pass a maximum of N passes
            if (passTimesArray.length >= numPasses) {
                return passTimesArray;
            }

            let propTempOffset = i + propOffset; // Offset in seconds (msec * 1000)
            let now = timeManager.propTimeCheck(
                propTempOffset * 1000,
                timeManager.propRealTime
            );
            let aer = satellite.getRae(now, satrec, sensor);

            let isInFOV = satellite.checkIsInFOV(sensor, aer);
            if (isInFOV) {
                passTimesArray.push(now);
                i = i + orbitalPeriod * 60 * 0.75; // Jump 3/4th to the next orbit
            }
        }
        return passTimesArray;
    };

    satellite.lastlooksArray = [];
    satellite.getlookangles = (sat) => {
        // Error Checking
        if (!sensorManager.checkSensorSelected()) {
            console.warn(
                'satellite.getlookangles requires a sensor to be set!'
            );
            return;
        }

        // Set default timing settings. These will be changed to find look angles at different times in future.
        let propOffset = timeManager.getPropOffset();

        let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
        const orbitalPeriod =
            MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion

        // Use custom interval unless doing rise/set lookangles - then use 1 second
        let lookanglesInterval = satellite.isRiseSetLookangles
            ? 1
            : satellite.lookanglesInterval;

        let looksArray = [];
        for (
            let i = 0;
            i < satellite.lookanglesLength * 24 * 60 * 60;
            i += lookanglesInterval
        ) {
            let propTempOffset = i * 1000 + propOffset; // Offset in seconds
            let looksPass = _propagate(propTempOffset, satrec);
            if (typeof looksPass != 'undefined') {
                looksArray.push(looksPass); // Update the table with looks for this 5 second chunk and then increase table counter by 1
                // i = i + (orbitalPeriod * 60 * 0.75); // Jump 3/4th to the next orbit
            }
            if (looksArray.length >= 1500) {
                // Maximum of 1500 lines in the look angles table
                break; // No more updates to the table (Prevent GEO object slowdown)
            }
        }

        looksArray.sort(function (a, b) {
            return new Date(a.time) - new Date(b.time);
        });
        satellite.lastlooksArray = looksArray;

        // Populate the Side Menu
        (function _populateSideMenu() {
            var tbl = document.getElementById('looks'); // Identify the table to update
            tbl.innerHTML = ''; // Clear the table from old object data
            var tr = tbl.insertRow();
            var tdT = tr.insertCell();
            tdT.appendChild(document.createTextNode('Time'));
            tdT.setAttribute('style', 'text-decoration: underline');
            var tdE = tr.insertCell();
            tdE.appendChild(document.createTextNode('El'));
            tdE.setAttribute('style', 'text-decoration: underline');
            var tdA = tr.insertCell();
            tdA.appendChild(document.createTextNode('Az'));
            tdA.setAttribute('style', 'text-decoration: underline');
            var tdR = tr.insertCell();
            tdR.appendChild(document.createTextNode('Rng'));
            tdR.setAttribute('style', 'text-decoration: underline');

            for (let i = 0; i < looksArray.length; i++) {
                let tr;
                if (tbl.rows.length > 0) {
                    // console.log(tbl.rows[0].cells[0].textContent);
                    for (let r = 0; r < tbl.rows.length; r++) {
                        var dateString = tbl.rows[r].cells[0].textContent;

                        var sYear = parseInt(dateString.substr(0, 4)); // UTC Year
                        var sMon = parseInt(dateString.substr(5, 2)) - 1; // UTC Month in MMM prior to converting
                        var sDay = parseInt(dateString.substr(8, 2)); // UTC Day
                        var sHour = parseInt(dateString.substr(11, 2)); // UTC Hour
                        var sMin = parseInt(dateString.substr(14, 2)); // UTC Min
                        var sSec = parseInt(dateString.substr(17, 2)); // UTC Sec

                        var topTime = new Date(
                            sYear,
                            sMon,
                            sDay,
                            sHour,
                            sMin,
                            sSec
                        ); // New Date object of the future collision
                        // Date object defaults to local time.
                        topTime.setUTCDate(sDay); // Move to UTC day.
                        topTime.setUTCHours(sHour); // Move to UTC Hour

                        if (looksArray[i].time < topTime) {
                            tr = tbl.insertRow(i);
                            break;
                        }
                    }
                }

                if (tr == null) {
                    tr = tbl.insertRow();
                }

                let tdT = tr.insertCell();
                tdT.appendChild(
                    document.createTextNode(
                        timeManager.dateFormat(
                            looksArray[i].time,
                            'isoDateTime',
                            false
                        )
                    )
                );
                // tdT.style.border = '1px solid black';
                let tdE = tr.insertCell();
                tdE.appendChild(
                    document.createTextNode(looksArray[i].el.toFixed(1))
                );
                let tdA = tr.insertCell();
                tdA.appendChild(
                    document.createTextNode(looksArray[i].az.toFixed(0))
                );
                let tdR = tr.insertCell();
                tdR.appendChild(
                    document.createTextNode(looksArray[i].rng.toFixed(0))
                );
            }
        })();
        function _propagate(offset, satrec) {
            let sensor = sensorManager.currentSensor;
            // Setup Realtime and Offset Time
            var propRealTimeTemp = Date.now();
            var now = timeManager.propTimeCheck(offset, propRealTimeTemp);
            let aer = satellite.getRae(now, satrec, sensor);

            let isInFOV = satellite.checkIsInFOV(sensor, aer);
            if (isInFOV) {
                if (satellite.isRiseSetLookangles) {
                    // Previous Pass to Calculate first line of coverage
                    let now1 = new Date();
                    now1.setTime(Number(now) - lookanglesInterval * 1000);
                    aer1 = satellite.getRae(now1, satrec, sensor);

                    let isInFOV1 = satellite.checkIsInFOV(sensor, aer1);
                    if (!isInFOV1) {
                        // First Pass
                        return {
                            time: timeManager.dateFormat(
                                now,
                                'isoDateTime',
                                true
                            ),
                            rng: range,
                            az: azimuth,
                            el: elevation,
                        };
                    } else {
                        // Next Pass to Calculate Last line of coverage
                        now1.setTime(Number(now) + lookanglesInterval * 1000);
                        aer1 = satellite.getRae(now1, satrec, sensor);

                        let isInFOV1 = satellite.checkIsInFOV(sensor, aer1);
                        if (!isInFOV1) {
                            // Last Pass
                            return {
                                time: timeManager.dateFormat(
                                    now,
                                    'isoDateTime',
                                    true
                                ),
                                rng: range,
                                az: azimuth,
                                el: elevation,
                            };
                        }
                    }
                    return;
                } else {
                    return {
                        time: timeManager.dateFormat(now, 'isoDateTime', true),
                        rng: range,
                        az: azimuth,
                        el: elevation,
                    };
                }
            }
            return;
        }
    };
    satellite.lastMultiSiteArray = [];
    satellite.getlookanglesMultiSite = (sat) => {
        let isResetToDefault = false;
        if (!sensorManager.checkSensorSelected()) {
            isResetToDefault = true;
        }

        // Save Current Sensor
        sensorManager.tempSensor = sensorManager.currentSensor;

        // Determine time offset from real time
        let propOffset = timeManager.getPropOffset();

        // Get Satellite Info
        let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
        const orbitalPeriod =
            MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion

        // Calculate Look Angles
        let multiSiteArray = [];
        for (
            let sensorIndex = 0;
            sensorIndex < sensorManager.sensorListUS.length;
            sensorIndex++
        ) {
            satellite.setobs(sensorManager.sensorListUS[sensorIndex]);
            for (
                let i = 0;
                i < satellite.lookanglesLength * 24 * 60 * 60;
                i += satellite.lookanglesInterval
            ) {
                // 5second Looks
                let propTempOffset = i * 1000 + propOffset; // Offset in seconds
                let multiSitePass = _propagateMultiSite(
                    propTempOffset,
                    satrec,
                    sensorManager.sensorListUS[sensorIndex]
                );
                if (typeof multiSitePass != 'undefined') {
                    multiSiteArray.push(multiSitePass); // Update the table with looks for this 5 second chunk and then increase table counter by 1
                    i = i + orbitalPeriod * 60 * 0.75; // Jump 3/4th to the next orbit
                }
            }
        }
        multiSiteArray.sort(function (a, b) {
            return new Date(a.time) - new Date(b.time);
        });
        satellite.lastMultiSiteArray = multiSiteArray;

        // Populate the Side Menu
        (function _populateSideMenu() {
            var tbl = document.getElementById('looksmultisite'); // Identify the table to update
            tbl.innerHTML = ''; // Clear the table from old object data
            var tr = tbl.insertRow();
            var tdT = tr.insertCell();
            tdT.appendChild(document.createTextNode('Time'));
            tdT.setAttribute('style', 'text-decoration: underline');
            var tdE = tr.insertCell();
            tdE.appendChild(document.createTextNode('El'));
            tdE.setAttribute('style', 'text-decoration: underline');
            var tdA = tr.insertCell();
            tdA.appendChild(document.createTextNode('Az'));
            tdA.setAttribute('style', 'text-decoration: underline');
            var tdR = tr.insertCell();
            tdR.appendChild(document.createTextNode('Rng'));
            tdR.setAttribute('style', 'text-decoration: underline');
            var tdS = tr.insertCell();
            tdS.appendChild(document.createTextNode('Sensor'));
            tdS.setAttribute('style', 'text-decoration: underline');

            for (let i = 0; i < multiSiteArray.length; i++) {
                let tr;
                if (tbl.rows.length > 0) {
                    // console.log(tbl.rows[0].cells[0].textContent);
                    for (let r = 0; r < tbl.rows.length; r++) {
                        var dateString = tbl.rows[r].cells[0].textContent;

                        var sYear = parseInt(dateString.substr(0, 4)); // UTC Year
                        var sMon = parseInt(dateString.substr(5, 2)) - 1; // UTC Month in MMM prior to converting
                        var sDay = parseInt(dateString.substr(8, 2)); // UTC Day
                        var sHour = parseInt(dateString.substr(11, 2)); // UTC Hour
                        var sMin = parseInt(dateString.substr(14, 2)); // UTC Min
                        var sSec = parseInt(dateString.substr(17, 2)); // UTC Sec

                        var topTime = new Date(
                            sYear,
                            sMon,
                            sDay,
                            sHour,
                            sMin,
                            sSec
                        ); // New Date object of the future collision
                        // Date object defaults to local time.
                        topTime.setUTCDate(sDay); // Move to UTC day.
                        topTime.setUTCHours(sHour); // Move to UTC Hour

                        if (multiSiteArray[i].time < topTime) {
                            tr = tbl.insertRow(i);
                            break;
                        }
                    }
                }

                if (tr == null) {
                    tr = tbl.insertRow();
                }

                let tdT = tr.insertCell();
                tdT.appendChild(
                    document.createTextNode(
                        timeManager.dateFormat(
                            multiSiteArray[i].time,
                            'isoDateTime',
                            true
                        )
                    )
                );
                // tdT.style.border = '1px solid black';
                let tdE = tr.insertCell();
                tdE.appendChild(
                    document.createTextNode(multiSiteArray[i].el.toFixed(1))
                );
                let tdA = tr.insertCell();
                tdA.appendChild(
                    document.createTextNode(multiSiteArray[i].az.toFixed(0))
                );
                let tdR = tr.insertCell();
                tdR.appendChild(
                    document.createTextNode(multiSiteArray[i].rng.toFixed(0))
                );
                let tdS = tr.insertCell();
                tdS.appendChild(
                    document.createTextNode(multiSiteArray[i].name)
                );
            }
        })();

        if (isResetToDefault) {
            sensorManager.currentSensor = sensorManager.defaultSensor;
        } else {
            sensorManager.currentSensor = sensorManager.tempSensor;
        }

        function _propagateMultiSite(offset, satrec, sensor) {
            // Setup Realtime and Offset Time
            var propRealTimeTemp = Date.now();
            var now = timeManager.propTimeCheck(offset, propRealTimeTemp);
            let aer = satellite.getRae(now, satrec, sensor);

            let isInFOV = satellite.checkIsInFOV(sensor, aer);
            if (isInFOV) {
                return {
                    time: now.toISOString(),
                    el: elevation,
                    az: azimuth,
                    rng: range,
                    name: sensor.shortName,
                };
            }
            return;
        }
    };

    satellite.satSensorFOV = (sat1, sat2) => {
        // Set default timing settings. These will be changed to find look angles at different times in future.
        let propOffset = timeManager.getPropOffset();
        let propRealTimeTemp = Date.now();
        let now = timeManager.propTimeCheck(propOffset, propRealTimeTemp);

        let satrec1 = satellite.twoline2satrec(sat1.TLE1, sat1.TLE2); // perform and store sat init calcs
        let sat1Ecf = _getEcf(now, satrec1);
        let satrec2 = satellite.twoline2satrec(sat2.TLE1, sat2.TLE2); // perform and store sat init calcs
        let sat2Ecf = _getEcf(now, satrec2);

        console.log(sat1Ecf);
        console.log(sat2Ecf);
        return;

        // Find the ECI position of the Selected Satellite
        satSelPosX = satPos[satelliteSelected[snum] * 3];
        satSelPosY = satPos[satelliteSelected[snum] * 3 + 1];
        satSelPosZ = satPos[satelliteSelected[snum] * 3 + 2];
        satSelPosEcf = { x: satSelPosX, y: satSelPosY, z: satSelPosZ };
        satSelPos = satellite.ecfToEci(satSelPosEcf, gmst);

        // Find the Lat/Long of the Selected Satellite
        satSelGeodetic = satellite.eciToGeodetic(satSelPos, gmst); // pv.position is called positionEci originally
        satHeight = satSelGeodetic.height;
        satSelPosEarth = {
            longitude: satSelGeodetic.longitude,
            latitude: satSelGeodetic.latitude,
            height: 1,
        };

        deltaLatInt = 1;
        if (satHeight < 2500 && objectManager.selectedSatFOV <= 60)
            deltaLatInt = 0.5;
        if (satHeight > 7000 || objectManager.selectedSatFOV >= 90)
            deltaLatInt = 2;
        if (satelliteSelected.length > 1) deltaLatInt = 2;
        for (deltaLat = -60; deltaLat < 60; deltaLat += deltaLatInt) {
            lat =
                Math.max(
                    Math.min(
                        Math.round(satSelGeodetic.latitude * RAD2DEG) +
                            deltaLat,
                        90
                    ),
                    -90
                ) * DEG2RAD;
            if (lat > 90) continue;
            deltaLonInt = 1; // Math.max((Math.abs(lat)*RAD2DEG/15),1);
            if (satHeight < 2500 && objectManager.selectedSatFOV <= 60)
                deltaLonInt = 0.5;
            if (satHeight > 7000 || objectManager.selectedSatFOV >= 90)
                deltaLonInt = 2;
            if (satelliteSelected.length > 1) deltaLonInt = 2;
            for (deltaLon = 0; deltaLon < 181; deltaLon += deltaLonInt) {
                // //////////
                // Add Long
                // //////////
                long = satSelGeodetic.longitude + deltaLon * DEG2RAD;
                satSelPosEarth = { longitude: long, latitude: lat, height: 15 };
                // Find the Az/El of the position on the earth
                lookangles = satellite.ecfToLookAngles(
                    satSelPosEarth,
                    satSelPosEcf
                );
                // azimuth = lookangles.azimuth;
                elevation = lookangles.elevation;
                // rangeSat = lookangles.rangeSat;

                if (
                    elevation * RAD2DEG > 0 &&
                    90 - elevation * RAD2DEG < objectManager.selectedSatFOV
                ) {
                    satSelPosEarth = satellite.geodeticToEcf(satSelPosEarth);

                    if (i === len) {
                        console.error('Ran out of Markers');
                        continue; // Only get so many markers.
                    }
                    satCache[i].active = true;

                    satPos[i * 3] = satSelPosEarth.x;
                    satPos[i * 3 + 1] = satSelPosEarth.y;
                    satPos[i * 3 + 2] = satSelPosEarth.z;

                    satVel[i * 3] = 0;
                    satVel[i * 3 + 1] = 0;
                    satVel[i * 3 + 2] = 0;
                    i++;
                }
                // //////////
                // Minus Long
                // //////////
                if (deltaLon === 0 || deltaLon === 180) continue; // Don't Draw Two Dots On the Center Line
                long = satSelGeodetic.longitude - deltaLon * DEG2RAD;
                satSelPosEarth = { longitude: long, latitude: lat, height: 15 };
                // Find the Az/El of the position on the earth
                lookangles = satellite.ecfToLookAngles(
                    satSelPosEarth,
                    satSelPosEcf
                );
                // azimuth = lookangles.azimuth;
                elevation = lookangles.elevation;
                // rangeSat = lookangles.rangeSat;

                if (
                    elevation * RAD2DEG > 0 &&
                    90 - elevation * RAD2DEG < objectManager.selectedSatFOV
                ) {
                    satSelPosEarth = satellite.geodeticToEcf(satSelPosEarth);

                    if (i === len) {
                        console.error('Ran out of Markers');
                        continue; // Only get so many markers.
                    }
                    satCache[i].active = true;

                    satPos[i * 3] = satSelPosEarth.x;
                    satPos[i * 3 + 1] = satSelPosEarth.y;
                    satPos[i * 3 + 2] = satSelPosEarth.z;

                    satVel[i * 3] = 0;
                    satVel[i * 3 + 1] = 0;
                    satVel[i * 3 + 2] = 0;
                    i++;
                }

                if (lat === 90 || lat === -90) break; // One Dot for the Poles
            }
        }

        function _getEcf(now, satrec) {
            let j = _jday(
                now.getUTCFullYear(),
                now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                now.getUTCDate(),
                now.getUTCHours(),
                now.getUTCMinutes(),
                now.getUTCSeconds()
            ); // Converts time to jday (TLEs use epoch year/day)
            j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
            let gmst = satellite.gstime(j);

            let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
            let positionEci = satellite.sgp4(satrec, m);

            return satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
        }
    };

    satellite.findCloseObjects = () => {
        let csoList = [];
        let satList = [];
        for (let i = 0; i < satSet.numSats; i++) {
            let sat = satSet.getSat(i);
            if (typeof sat.TLE1 == 'undefined') continue;
            if (sat.apogee > 5556) continue;
            sat.satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);
            let pos = _propagate(0, sat.satrec);
            sat.position = pos.position;
            if (typeof sat.position == 'undefined') continue;
            satList.push(sat);
        }

        for (let i = 0; i < satList.length; i++) {
            let sat1 = satList[i];
            let pos1 = sat1.position;
            let posXmin = pos1.x - 20;
            let posXmax = pos1.x + 20;
            let posYmin = pos1.y - 20;
            let posYmax = pos1.y + 20;
            let posZmin = pos1.z - 20;
            let posZmax = pos1.z + 20;
            for (let j = 0; j < satList.length; j++) {
                let sat2 = satList[j];
                if (sat1 == sat2) continue;
                let pos2 = sat2.position;
                if (
                    pos2.x < posXmax &&
                    pos2.x > posXmin &&
                    pos2.y < posYmax &&
                    pos2.y > posYmin &&
                    pos2.z < posZmax &&
                    pos2.z > posZmin
                ) {
                    csoList.push({ sat1: sat1, sat2: sat2 });
                }
            }
        }

        let csoListUnique = Array.from(new Set(csoList));
        csoList = []; // Clear CSO List
        satList = []; // Clear CSO List

        for (let i = 0; i < csoListUnique.length; i++) {
            let sat = csoListUnique[i].sat1;
            let pos = _propagate(1000 * 60 * 30, sat.satrec);
            csoListUnique[i].sat1.position = pos.position;

            sat = csoListUnique[i].sat2;
            pos = _propagate(1000 * 60 * 30, sat.satrec);
            sat.position = pos.position;
            csoListUnique[i].sat2.position = pos.position;
        }

        satList = Array.from(new Set(satList)); // Remove duplicates

        for (let i = 0; i < csoListUnique.length; i++) {
            let sat1 = csoListUnique[i].sat1;
            let pos1 = sat1.position;
            if (typeof pos1 == 'undefined') continue;
            let posXmin = pos1.x - 20;
            let posXmax = pos1.x + 20;
            let posYmin = pos1.y - 20;
            let posYmax = pos1.y + 20;
            let posZmin = pos1.z - 20;
            let posZmax = pos1.z + 20;
            let sat2 = csoListUnique[i].sat2;
            let pos2 = sat2.position;
            if (typeof pos2 == 'undefined') continue;
            if (
                pos2.x < posXmax &&
                pos2.x > posXmin &&
                pos2.y < posYmax &&
                pos2.y > posYmin &&
                pos2.z < posZmax &&
                pos2.z > posZmin
            ) {
                csoList.push(sat1.SCC_NUM);
                csoList.push(sat2.SCC_NUM);
            }
        }

        csoListUnique = Array.from(new Set(csoList));
        let searchStr = '';
        for (let i = 0; i < csoListUnique.length; i++) {
            if (i == csoListUnique.length - 1) {
                searchStr += csoListUnique[i];
            } else {
                searchStr += csoListUnique[i] + ',';
            }
        }

        searchBox.doSearch(searchStr);
        return; // csoListUnique;

        function _propagate(propTempOffset, satrec) {
            let now = new Date(); // Make a time variable
            now.setTime(Number(Date.now()) + propTempOffset); // Set the time variable to the time in the future
            let j = _jday(
                now.getUTCFullYear(),
                now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                now.getUTCDate(),
                now.getUTCHours(),
                now.getUTCMinutes(),
                now.getUTCSeconds()
            ); // Converts time to jday (TLEs use epoch year/day)
            j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
            let gmst = satellite.gstime(j);

            let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
            return satellite.sgp4(satrec, m);
        }
    };

    // TODO: satellite.getOrbitByLatLon needs cleaned up badly
    satellite.getOrbitByLatLon = (
        sat,
        goalLat,
        goalLon,
        upOrDown,
        propOffset,
        goalAlt,
        rascOffset
    ) => {
        /**
         * Function to brute force find an orbit over a sites lattiude and longitude
         * @param  object       sat             satellite object with satrec
         * @param  long         goalLat         Goal Latitude
         * @param  long         goalLon         Goal Longitude
         * @param  long         goalAlt         Goal Altitude
         * @param  string       upOrDown        'Up' or 'Down'
         * @param  integer      propOffset   milliseconds between now and 0000z
         * @return Array                        [0] is TLE1 and [1] is TLE2
         * @method pad                          pads front of string with 0's for TLEs
         * @method meanaCalc                    returns 1 when latitude found 2 if error
         * @method rascCalc                     returns 1 when longitude found 2 if error and 5 if it is not close
         * @method propagate                    calculates a modified TLEs latitude and longitude
         */
        var mainTLE1;
        var mainTLE2;
        var mainMeana;
        var mainRasc;
        var mainArgPer;
        var argPerCalcResults;
        var meanACalcResults;
        var meanAiValue;
        var lastLat;
        var isUpOrDown;
        var i;

        if (typeof rascOffset == 'undefined') rascOffset = 0;

        // ===== Mean Anomaly Loop =====
        for (i = 0; i < 520 * 10; i += 1) {
            /** Rotate Mean Anomaly 0.1 Degree at a Time for Up To 400 Degrees */
            meanACalcResults = meanaCalc(i);
            if (meanACalcResults === 1) {
                if (isUpOrDown !== upOrDown) {
                    // If Object is moving opposite of the goal direction (upOrDown)
                    i = i + 20; // Move 2 Degrees ahead in the orbit to prevent being close on the next lattiude check
                } else {
                    meanAiValue = i;
                    break; // Stop changing the Mean Anomaly
                }
            }
            if (meanACalcResults === 5) {
                i += 10 * 10; // Change meanA faster
            }
        }
        if (meanACalcResults === 2) {
            console.warn(
                `meanACalcResults failed after trying all combinations!`
            );
            return ['Error', ''];
        }

        // Don't Bother Unless Specifically Requested
        // Applies to eccentric orbits
        // ===== Argument of Perigee Loop =====
        if (typeof goalAlt != 'undefined' && goalAlt !== 0) {
            meanACalcResults = 0; // Reset meanACalcResults
            for (i = 0; i < 360 * 10; i += 1) {
                /** Rotate ArgPer 0.1 Degree at a Time for Up To 400 Degrees */
                argPerCalcResults = argPerCalc(i);
                if (argPerCalcResults === 1) {
                    // console.log('Found Correct Alt');
                    if (meanACalcResults === 1) {
                        // console.log('Found Correct Lat');
                        // console.log('Up Or Down: ' + upOrDown);
                        if (isUpOrDown === upOrDown) {
                            // If Object is moving in the goal direction (upOrDown)
                            break; // Stop changing ArgPer
                        }
                    } else {
                        // console.log('Found Wrong Lat');
                    }
                } else {
                    // console.log('Failed Arg of Per Calc');
                }
                if (argPerCalcResults === 5) {
                    i += 5 * 10; // Change ArgPer faster
                }
                if (argPerCalcResults === 2) {
                    return ['Error', ''];
                }

                // ===== Mean Anomaly Loop =====
                for (var j = 0; j < 520 * 10; j += 1) {
                    /** Rotate Mean Anomaly 0.1 Degree at a Time for Up To 400 Degrees */
                    meanACalcResults = meanaCalc(j);
                    if (meanACalcResults === 1) {
                        if (isUpOrDown !== upOrDown) {
                            // If Object is moving opposite of the goal direction (upOrDown)
                            j = j + 20; // Move 2 Degrees ahead in the orbit to prevent being close on the next lattiude check
                        } else {
                            break; // Stop changing the Mean Anomaly
                        }
                    }
                    if (meanACalcResults === 5) {
                        j += 10 * 10; // Change meanA faster
                    }
                    if (meanACalcResults === 2) {
                        return ['Error', ''];
                    }
                }
            }
        }

        // ===== Right Ascension Loop =====
        for (i = 0; i < 5200 * 100; i += 1) {
            // 520 degress in 0.01 increments TODO More precise?
            var rascCalcResults = rascCalc(i, rascOffset);
            if (rascCalcResults === 1) {
                break;
            }
            if (rascCalcResults === 5) {
                i += 10 * 100;
            }
        }

        return [mainTLE1, mainTLE2];

        function pad(str, max) {
            return str.length < max ? pad('0' + str, max) : str;
        }

        function argPerCalc(argPe) {
            var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs

            var meana;
            if (typeof mainMeana == 'undefined') {
                meana = (satrec.mo * RAD2DEG).toPrecision(10);
            } else {
                meana = mainMeana;
            }
            meana = meana.split('.');
            meana[0] = meana[0].substr(-3, 3);
            meana[1] = meana[1].substr(0, 4);
            meana = (meana[0] + '.' + meana[1]).toString();
            meana = pad(meana, 8);

            var rasc;
            if (typeof mainRasc == 'undefined') {
                rasc = (sat.raan * RAD2DEG).toPrecision(7);
            } else {
                rasc = mainRasc;
            }
            rasc = rasc.split('.');
            rasc[0] = rasc[0].substr(-3, 3);
            rasc[1] = rasc[1].substr(0, 4);
            rasc = (rasc[0] + '.' + rasc[1]).toString();
            rasc = pad(rasc, 8);
            mainRasc = rasc;

            var scc = sat.SCC_NUM;

            var intl = sat.TLE1.substr(9, 8);
            var inc = (sat.inclination * RAD2DEG).toPrecision(7);
            inc = inc.split('.');
            inc[0] = inc[0].substr(-3, 3);
            inc[1] = inc[1].substr(0, 4);
            inc = (inc[0] + '.' + inc[1]).toString();

            inc = pad(inc, 8);
            var epochyr = sat.TLE1.substr(18, 2);
            var epochday = sat.TLE1.substr(20, 12);

            var meanmo = sat.TLE2.substr(52, 11);

            var ecen = sat.eccentricity.toPrecision(7).substr(2, 7);

            argPe = argPe / 10;
            argPe = parseFloat(argPe).toPrecision(7);
            argPe = pad(argPe, 8);

            var TLE1Ending = sat.TLE1.substr(32, 39);

            mainTLE1 =
                '1 ' +
                scc +
                'U ' +
                intl +
                ' ' +
                epochyr +
                epochday +
                TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
            mainTLE2 =
                '2 ' +
                scc +
                ' ' +
                inc +
                ' ' +
                rasc +
                ' ' +
                ecen +
                ' ' +
                argPe +
                ' ' +
                meana +
                ' ' +
                meanmo +
                '    10';

            satrec = satellite.twoline2satrec(mainTLE1, mainTLE2);

            var propNewArgPe = getOrbitByLatLonPropagate(propOffset, satrec, 3);
            // if (propNewArgPe === 1) {
            sat.TLE1 = mainTLE1;
            sat.TLE2 = mainTLE2;
            mainArgPer = argPe;
            // }
            // 1 === If RASC within 0.15 degrees then good enough
            // 5 === If RASC outside 15 degrees then rotate RASC faster
            return propNewArgPe;
        }

        function meanaCalc(meana) {
            var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs

            meana = meana / 10;
            meana = parseFloat(meana).toPrecision(7);
            meana = pad(meana, 8);

            var rasc = (sat.raan * RAD2DEG).toPrecision(7);
            mainRasc = rasc;
            rasc = rasc.toString().split('.');
            rasc[0] = rasc[0].substr(-3, 3);
            rasc[1] = rasc[1].substr(0, 4);
            rasc = (rasc[0] + '.' + rasc[1]).toString();
            rasc = pad(rasc, 8);

            var scc = sat.SCC_NUM;

            var intl = sat.TLE1.substr(9, 8);
            var inc = (sat.inclination * RAD2DEG).toPrecision(7);
            inc = inc.split('.');
            inc[0] = inc[0].substr(-3, 3);
            inc[1] = inc[1].substr(0, 4);
            inc = (inc[0] + '.' + inc[1]).toString();

            inc = pad(inc, 8);
            var epochyr = sat.TLE1.substr(18, 2);
            var epochday = sat.TLE1.substr(20, 12);

            var meanmo = sat.TLE2.substr(52, 11);

            var ecen = sat.eccentricity.toPrecision(7).substr(2, 7);

            var argPe;
            if (typeof mainArgPer == 'undefined') {
                argPe = (sat.argPe * RAD2DEG).toPrecision(7);
            } else {
                argPe = mainArgPer;
            }
            argPe = argPe.split('.');
            argPe[0] = argPe[0].substr(-3, 3);
            argPe[1] = argPe[1].substr(0, 4);
            argPe = (argPe[0] + '.' + argPe[1]).toString();
            argPe = pad(argPe, 8);

            var TLE1Ending = sat.TLE1.substr(32, 39);

            var TLE1 =
                '1 ' +
                scc +
                'U ' +
                intl +
                ' ' +
                epochyr +
                epochday +
                TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
            var TLE2 =
                '2 ' +
                scc +
                ' ' +
                inc +
                ' ' +
                rasc +
                ' ' +
                ecen +
                ' ' +
                argPe +
                ' ' +
                meana +
                ' ' +
                meanmo +
                '    10';

            satrec = satellite.twoline2satrec(TLE1, TLE2);
            var propagateResults = getOrbitByLatLonPropagate(
                propOffset,
                satrec,
                1
            );
            if (propagateResults === 1) {
                mainTLE1 = TLE1;
                mainTLE2 = TLE2;
                sat.TLE1 = TLE1;
                sat.TLE2 = TLE2;
                mainMeana = meana;
            }
            return propagateResults;
        }

        function rascCalc(rasc, rascOffset) {
            var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
            var meana = mainMeana;

            rascNum = rasc;
            rasc = rasc / 100;
            if (rasc > 360) {
                rasc = rasc - 360; // angle can't be bigger than 360
            }
            rasc = rasc.toPrecision(7);
            rasc = rasc.split('.');
            rasc[0] = rasc[0].substr(-3, 3);
            rasc[1] = rasc[1].substr(0, 4);
            rasc = (rasc[0] + '.' + rasc[1]).toString();
            rasc = pad(rasc, 8);
            mainRasc = rasc;

            var scc = sat.SCC_NUM;

            var intl = sat.TLE1.substr(9, 8);
            var inc = (sat.inclination * RAD2DEG).toPrecision(7);
            inc = inc.split('.');
            inc[0] = inc[0].substr(-3, 3);
            inc[1] = inc[1].substr(0, 4);
            inc = (inc[0] + '.' + inc[1]).toString();

            inc = pad(inc, 8);
            var epochyr = sat.TLE1.substr(18, 2);
            var epochday = sat.TLE1.substr(20, 12);

            var meanmo = sat.TLE2.substr(52, 11);

            var ecen = sat.eccentricity.toPrecision(7).substr(2, 7);

            var argPe;
            if (typeof mainArgPer == 'undefined') {
                argPe = (sat.argPe * RAD2DEG).toPrecision(7);
            } else {
                argPe = mainArgPer;
            }
            argPe = argPe.split('.');
            argPe[0] = argPe[0].substr(-3, 3);
            argPe[1] = argPe[1].substr(0, 4);
            argPe = (argPe[0] + '.' + argPe[1]).toString();
            argPe = pad(argPe, 8);

            var TLE1Ending = sat.TLE1.substr(32, 39);

            mainTLE1 =
                '1 ' +
                scc +
                'U ' +
                intl +
                ' ' +
                epochyr +
                epochday +
                TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
            mainTLE2 =
                '2 ' +
                scc +
                ' ' +
                inc +
                ' ' +
                rasc +
                ' ' +
                ecen +
                ' ' +
                argPe +
                ' ' +
                meana +
                ' ' +
                meanmo +
                '    10';

            satrec = satellite.twoline2satrec(mainTLE1, mainTLE2);

            var propNewRasc = getOrbitByLatLonPropagate(propOffset, satrec, 2);

            if (propNewRasc === 1) {
                sat.TLE1 = mainTLE1;

                rasc = rascNum / 100 + rascOffset;
                if (rasc > 360) {
                    rasc = rasc - 360; // angle can't be bigger than 360 with offset
                }
                if (rasc < 0) {
                    rasc = rasc + 360; // angle can't be less than 360 with offset
                }
                rasc = rasc.toPrecision(7);
                rasc = rasc.split('.');
                rasc[0] = rasc[0].substr(-3, 3);
                rasc[1] = rasc[1].substr(0, 4);
                rasc = (rasc[0] + '.' + rasc[1]).toString();
                rasc = pad(rasc, 8);
                mainRasc = rasc;

                mainTLE2 =
                    '2 ' +
                    scc +
                    ' ' +
                    inc +
                    ' ' +
                    rasc +
                    ' ' +
                    ecen +
                    ' ' +
                    argPe +
                    ' ' +
                    meana +
                    ' ' +
                    meanmo +
                    '    10';

                sat.TLE2 = mainTLE2;
            }

            // 1 === If RASC within 0.15 degrees then good enough
            // 5 === If RASC outside 15 degrees then rotate RASC faster
            return propNewRasc;
        }

        function getOrbitByLatLonPropagate(propOffset, satrec, type) {
            timeManager.propRealTime = Date.now();
            var now = timeManager.propTimeCheck(
                propOffset,
                timeManager.propRealTime
            );
            var j = timeManager.jday(
                now.getUTCFullYear(),
                now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                now.getUTCDate(),
                now.getUTCHours(),
                now.getUTCMinutes(),
                now.getUTCSeconds()
            ); // Converts time to jday (TLEs use epoch year/day)
            j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
            var gmst = satellite.gstime(j);

            var m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
            var positionEci = satellite.sgp4(satrec, m);
            if (typeof positionEci == 'undefined') {
                console.log(satrec);
            }

            var gpos, lat, lon, alt;

            try {
                gpos = satellite.eciToGeodetic(positionEci.position, gmst);
            } catch (err) {
                console.warn(err);
                return 2;
            }

            lat = satellite.degreesLat(gpos.latitude) * 1;
            lon = satellite.degreesLong(gpos.longitude) * 1;
            alt = gpos.height;

            if (lastLat == null) {
                // Set it the first time
                lastLat = lat;
            }

            if (type === 1) {
                if (lat === lastLat) {
                    return 0; // Not enough movement, skip this
                }

                if (lat > lastLat) {
                    isUpOrDown = 'N';
                }
                if (lat < lastLat) {
                    isUpOrDown = 'S';
                }

                lastLat = lat;
            }

            if (lat > goalLat - 0.15 && lat < goalLat + 0.15 && type === 1) {
                // console.log('Lat: ' + lat);
                return 1;
            }

            if (lon > goalLon - 0.15 && lon < goalLon + 0.15 && type === 2) {
                // console.log('Lon: ' + lon);
                return 1;
            }

            if (alt > goalAlt - 30 && alt < goalAlt + 30 && type === 3) {
                return 1;
            }

            // If current latitude greater than 11 degrees off rotate meanA faster
            if (!(lat > goalLat - 11 && lat < goalLat + 11) && type === 1) {
                // console.log('Lat: ' + lat);
                return 5;
            }

            // If current longitude greater than 11 degrees off rotate RASC faster
            if (!(lon > goalLon - 11 && lon < goalLon + 11) && type === 2) {
                return 5;
            }

            // If current altitude greater than 100 km off rotate augPerigee faster
            if ((alt < goalAlt - 100 || alt > goalAlt + 100) && type === 3) {
                // console.log('Lat: ' + lat);
                // console.log('Alt: ' + alt + ' --- MeanMo: ' + satrec.mo * RAD2DEG + ' --- ArgPer: ' + satrec.argpo * RAD2DEG);
                return 5;
            }

            return 0;
        }
    };
    satellite.calculateLookAngles = (sat, sensor, propOffset) => {
        (function _inputValidation() {
            // Check if there is a sensor
            if (typeof sensor == 'undefined') {
                // Try using the current sensor if there is one
                if (sensorManager.checkSensorSelected()) {
                    sensor = sensorManager.currentSensor;
                } else {
                    console.error('getlookangles2 requires a sensor!');
                    return;
                }
                // Simple Error Checking
            } else {
                if (typeof sensor.obsminaz == 'undefined') {
                    console.error('sensor format incorrect');
                    return;
                }
                sensor.observerGd = {
                    // Array to calculate look angles in propagate()
                    latitude: sensor.lat * DEG2RAD,
                    longitude: sensor.long * DEG2RAD,
                    height: parseFloat(sensor.obshei),
                };
            }

            if (typeof sat == 'undefined') {
                console.error('sat parameter required!');
            } else {
                if (
                    typeof sat.TLE1 == 'undefined' ||
                    typeof sat.TLE2 == 'undefined'
                ) {
                    console.error('sat parameter invalid format!');
                }
            }

            if (typeof propOffset == 'undefined') {
                propOffset = 0;
            }

            if (typeof satellite.isRiseSetLookangles == 'undefined') {
                satellite.isRiseSetLookangles = false;
            }
        })();

        // Set default timing settings. These will be changed to find look angles at different times in future.
        if (typeof propOffset == 'undefined') propOffset = 0; // Could be used for changing the time start
        var propTempOffset = 0; // offset letting us propagate in the future (or past)

        var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
        var lookanglesTable = []; // Iniially no rows to the table
        var tempLookanglesInterval;

        if (satellite.isRiseSetLookangles) {
            tempLookanglesInterval = satellite.lookanglesInterval;
            satellite.lookanglesInterval = 1;
        }

        for (
            var i = 0;
            i < satellite.lookanglesLength * 24 * 60 * 60;
            i += satellite.lookanglesInterval
        ) {
            // satellite.lookanglesInterval in seconds
            propTempOffset = i * 1000 + propOffset; // Offset in seconds (msec * 1000)
            if (lookanglesTable.length <= 5000) {
                // Maximum of 1500 lines in the look angles table
                lookanglesRow = _propagate(propTempOffset, satrec);
                if (typeof lookanglesRow != 'undefined') {
                    lookanglesTable.push(lookanglesRow); // Update the table with looks for this 5 second chunk and then increase table counter by 1
                }
            }
        }

        if (satellite.isRiseSetLookangles) {
            satellite.lookanglesInterval = tempLookanglesInterval;
        }
        function _propagate(propTempOffset, satrec) {
            var lookAngleRecord = {};
            let now = new Date(); // Make a time variable
            now.setTime(Number(Date.now()) + propTempOffset); // Set the time variable to the time in the future
            let aer = satellite.getRae(now, satrec, sensor);
            let isInFOV = satellite.checkIsInFOV(sensor, aer);

            if (isInFOV) {
                if (satellite.isRiseSetLookangles) {
                    // Previous Pass to Calculate first line of coverage
                    var now1 = new Date();
                    now1.setTime(
                        Number(Date.now()) +
                            propTempOffset -
                            satellite.lookanglesInterval * 1000
                    );
                    aer1 = satellite.getRae(now1, satrec, sensor);
                    isInFOV1 = satellite.checkIsInFOV(sensor, aer1);

                    if (!isInFOV1) {
                        return {
                            time: timeManager.dateFormat(
                                now,
                                'isoDateTime',
                                true
                            ),
                            rng: range,
                            az: azimuth,
                            el: elevation,
                        };
                    } else {
                        // Next Pass to Calculate Last line of coverage
                        now1.setTime(
                            Number(Date.now()) +
                                propTempOffset -
                                satellite.lookanglesInterval * 1000
                        );
                        aer1 = satellite.getRae(now1, satrec, sensor);
                        isInFOV1 = satellite.checkIsInFOV(sensor, aer1);

                        if (!isInFOV1) {
                            return {
                                time: timeManager.dateFormat(
                                    now,
                                    'isoDateTime',
                                    true
                                ),
                                rng: range,
                                az: azimuth,
                                el: elevation,
                            };
                        }
                    }
                    return;
                }
                return {
                    time: timeManager.dateFormat(now, 'isoDateTime', true),
                    rng: range,
                    az: azimuth,
                    el: elevation,
                };
            }
            return;
        }
        return lookanglesTable;
    };
    satellite.findBestPasses = (sats, sensor) => {
        var satArray = sats.split(',');
        var tableSatTimes = [];
        for (var i = 0; i < satArray.length; i++) {
            try {
                var sat = satSet.getSat(satSet.getIdFromObjNum(satArray[i]));
                var satPasses = satellite.findBestPass(sat, sensor, 0);
                for (var s = 0; s < satPasses.length; s++) {
                    tableSatTimes.push(satPasses[s]);
                    // }
                }
            } catch (e) {
                console.warn(e);
            }
        }
        let sortedTableSatTimes = tableSatTimes.sort(
            (a, b) => b.sortTime - a.sortTime
        );
        sortedTableSatTimes.reverse();

        sortedTableSatTimes.forEach(function (v) {
            delete v.sortTime;
        });

        for (let i = 0; i < sortedTableSatTimes.length; i++) {
            sortedTableSatTimes[i].startDate = sortedTableSatTimes[i].startDate
                .toISOString()
                .split('T')[0];
            sortedTableSatTimes[i].startTime = sortedTableSatTimes[i].startTime
                .toISOString()
                .split('T')[1]
                .split('.')[0];
            sortedTableSatTimes[i].stopDate = sortedTableSatTimes[i].stopDate
                .toISOString()
                .split('T')[0];
            sortedTableSatTimes[i].stopTime = sortedTableSatTimes[i].stopTime
                .toISOString()
                .split('T')[1]
                .split('.')[0];
        }

        saveCsv(sortedTableSatTimes, 'bestSatTimes');
    };
    satellite.findBestPass = (sat, sensor, propOffset) => {
        (function _inputValidation() {
            // Check if there is a sensor
            if (typeof sensor == 'undefined') {
                // Try using the current sensor if there is one
                if (sensorManager.checkSensorSelected()) {
                    sensor = sensorManager.currentSensor;
                } else {
                    console.error('getlookangles2 requires a sensor!');
                    return;
                }
                // Simple Error Checking
            } else {
                if (typeof sensor.obsminaz == 'undefined') {
                    console.error('sensor format incorrect');
                    return;
                }
                sensor.observerGd = {
                    // Array to calculate look angles in propagate()
                    latitude: sensor.lat * DEG2RAD,
                    longitude: sensor.long * DEG2RAD,
                    height: parseFloat(sensor.obshei),
                };
            }

            if (typeof sat == 'undefined') {
                console.error('sat parameter required!');
            } else {
                if (
                    typeof sat.TLE1 == 'undefined' ||
                    typeof sat.TLE2 == 'undefined'
                ) {
                    console.error('sat parameter invalid format!');
                }
            }
        })();

        // Set default timing settings. These will be changed to find look angles at different times in future.
        if (typeof propOffset == 'undefined') propOffset = 0; // Could be used for changing the time start
        var propTempOffset = 0; // offset letting us propagate in the future (or past)

        var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
        var lookanglesTable = []; // Iniially no rows to the table

        looksInterval = 5;
        looksLength = 7;

        // Setup flags for passes
        var score = 0;
        var sAz = null;
        var sEl = null;
        var sRange = null;
        var sTime = null;
        var passMinRange = sensor.obsmaxrange; // This is set each look to find minimum range (start at max range)
        var passMaxEl = 0;
        var start3 = false;
        var stop3 = false;

        var orbitalPeriod =
            MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion

        for (var i = 0; i < looksLength * 24 * 60 * 60; i += looksInterval) {
            // satellite.lookanglesInterval in seconds
            propTempOffset = i * 1000 + propOffset; // Offset in seconds (msec * 1000)
            if (lookanglesTable.length <= 5000) {
                // Maximum of 1500 lines in the look angles table
                lookanglesRow = _propagate(propTempOffset, satrec);
                // If data came back...
                if (typeof lookanglesRow != 'undefined') {
                    lookanglesTable.push(lookanglesRow); // Update the table with looks for this 5 second chunk and then increase table counter by 1
                    // Reset flags for next pass
                    score = 0;
                    sAz = null;
                    sEl = null;
                    sRange = null;
                    sTime = null;
                    passMinRange = sensor.obsmaxrange; // This is set each look to find minimum range
                    passMaxEl = 0;
                    start3 = false;
                    stop3 = false;
                    i = i + orbitalPeriod * 60 * 0.75; // Jump 3/4th to the next orbit
                }
            }
        }

        return lookanglesTable;
        function _propagate(propTempOffset, satrec) {
            let now = new Date(); // Make a time variable
            now.setTime(Number(Date.now()) + propTempOffset); // Set the time variable to the time in the future
            let aer = satellite.getRae(now, satrec, sensor);
            let isInFOV = satellite.checkIsInFOV(sensor, aer);

            if (isInFOV) {
                // Previous Pass to Calculate first line of coverage
                let now1 = new Date();
                now1.setTime(
                    Number(Date.now()) + propTempOffset - looksInterval * 1000
                );
                aer1 = satellite.getRae(now1, satrec, sensor);

                let isInFOV1 = satellite.checkIsInFOV(sensor, aer1);
                if (!isInFOV1) {
                    // if it starts around 3
                    if (elevation <= 3.5) {
                        start3 = true;
                    }

                    // First Line of Coverage
                    sTime = now;
                    sAz = azimuth.toFixed(0);
                    sEl = elevation.toFixed(1);
                    sRange = range.toFixed(0);
                } else {
                    // Next Pass to Calculate Last line of coverage
                    now1.setTime(
                        Number(Date.now()) +
                            propTempOffset +
                            looksInterval * 1000
                    );
                    aer1 = satellite.getRae(now1, satrec, sensor);

                    isInFOV1 = satellite.checkIsInFOV(sensor, aer1);
                    if (!isInFOV1) {
                        // if it stops around 3
                        stop3 = elevation <= 3.5 ? true : false;

                        score = Math.min(
                            (((now - sTime) / 1000 / 60) * 10) / 8,
                            10
                        ); // 8 minute pass is max score
                        let elScore = Math.min((passMaxEl / 40) * 10, 10); // 40 el or above is max score
                        elScore -= Math.max((passMaxEl - 50) / 5, 0); // subtract points for being over 50 el
                        elScore *= start3 && stop3 ? 2 : 1; // Double points for start and stop at 3
                        score += elScore;
                        score += Math.min((10 * 900) / passMinRange, 10); // 750 or less is max score
                        score -= Math.max((900 - passMinRange) / 10, 0); // subtract points for being closer than 750

                        let tic = 0;
                        try {
                            tic = (now - sTime) / 1000;
                        } catch (e) {
                            tic = 0;
                        }

                        // Last Line of Coverage
                        return {
                            sortTime: sTime,
                            scc: satrec.satnum,
                            score: score,
                            startDate: sTime,
                            startTime: sTime,
                            startAz: sAz,
                            startEl: sEl,
                            startRange: sRange,
                            stopDate: now,
                            stopTime: now,
                            stopAz: azimuth.toFixed(0),
                            stopEl: elevation.toFixed(1),
                            stopRange: range.toFixed(0),
                            tic: tic,
                            minRange: passMinRange.toFixed(0),
                            passMaxEl: passMaxEl.toFixed(1),
                        };
                    }
                }
                // Do this for any pass in coverage
                if (passMaxEl < elevation) passMaxEl = elevation;
                if (passMinRange > range) passMinRange = range;
            }
            return;
        }
    };

    // IDEA: standardize use of azimuth, elevation, and rangeSat (whatever satellite.js uses)
    satellite.getRae = (now, satrec, sensor) => {
        let j = _jday(
            now.getUTCFullYear(),
            now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
            now.getUTCDate(),
            now.getUTCHours(),
            now.getUTCMinutes(),
            now.getUTCSeconds()
        ); // Converts time to jday (TLEs use epoch year/day)
        j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
        let gmst = satellite.gstime(j);

        let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
        let positionEci = satellite.sgp4(satrec, m);

        let positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
        let lookAngles = satellite.ecfToLookAngles(
            sensor.observerGd,
            positionEcf
        );
        azimuth = lookAngles.azimuth * RAD2DEG;
        elevation = lookAngles.elevation * RAD2DEG;
        range = lookAngles.rangeSat;
        return { az: azimuth, el: elevation, range: range };
    };

    satellite.eci2Rae = (now, eci, sensor) => {
        now = new Date(now);
        let j = _jday(
            now.getUTCFullYear(),
            now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
            now.getUTCDate(),
            now.getUTCHours(),
            now.getUTCMinutes(),
            now.getUTCSeconds()
        ); // Converts time to jday (TLEs use epoch year/day)
        j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
        let gmst = satellite.gstime(j);

        let positionEcf = satellite.eciToEcf(eci.position, gmst); // positionEci.position is called positionEci originally
        let lookAngles = satellite.ecfToLookAngles(
            sensor.observerGd,
            positionEcf
        );
        azimuth = lookAngles.azimuth * RAD2DEG;
        elevation = lookAngles.elevation * RAD2DEG;
        range = lookAngles.rangeSat;
        return { az: azimuth, el: elevation, range: range };
    };

    satellite.getEci = (sat, propTime) => {
        let j = _jday(
            propTime.getUTCFullYear(),
            propTime.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
            propTime.getUTCDate(),
            propTime.getUTCHours(),
            propTime.getUTCMinutes(),
            propTime.getUTCSeconds()
        ); // Converts time to jday (TLEs use epoch year/day)
        j += propTime.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
        // let gmst = satellite.gstime(j);

        let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs

        let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
        return satellite.sgp4(satrec, m);
    };

    satellite.findNearbyObjectsByOrbit = (sat) => {
      let catalog = satSet.getSatData();
      let possibleMatches = [];
      let maxPeriod = sat.period * 1.05;
      let minPeriod = sat.period * 0.95;
      let maxInclination = sat.inclination * 1.025;
      let minInclination = sat.inclination * 0.975;
      let maxRaan = sat.raan * 1.025;
      let minRaan = sat.raan * 0.975;
      for (ss = 0; ss < catalog.length; ss++) {
        let sat2 = catalog[ss];
        if (sat2.static) break;
        if (sat2.period > maxPeriod || sat2.period < minPeriod) continue;
        if (sat2.inclination > maxInclination || sat2.inclination < minInclination) continue;
        if (sat2.raan > maxRaan || sat2.raan < minRaan) continue;
        possibleMatches.push(sat2.id);
      }

      return possibleMatches;
    };

    satellite.findClosestApproachTime = (sat1, sat2, propOffset, propLength) => {
      distArray = {};
      if (typeof propLength == 'undefined') propLength = 1440 * 60; // 1 Day
      let minDistance = 1000000;
      for (let t = 0; t < propLength; t++) {
        let propTempOffset = propOffset + (t * 1000);
        let now = timeManager.propTimeCheck(
          propTempOffset,
          timeManager.propRealTime
        );
        let sat1Pos = satellite.getEci(sat1, now);
        let sat2Pos = satellite.getEci(sat2, now);
        let distance = Math.sqrt(
          (sat1Pos.position.x - sat2Pos.position.x)**2 +
          (sat1Pos.position.y - sat2Pos.position.y)**2 +
          (sat1Pos.position.z - sat2Pos.position.z)**2);
        if (distance < minDistance) {
          minDistance = distance;
          distArray = {
            time: now,
            propOffset: propOffset + (t * 1000),
            dist: distance,
            velX: (sat1Pos.velocity.x - sat2Pos.velocity.x),
            velY: (sat1Pos.velocity.y - sat2Pos.velocity.y),
            velZ: (sat1Pos.velocity.z - sat2Pos.velocity.z),
          };
        }
      }

      // Go to closest approach time
      // timeManager.propOffset = distArray.propOffset;
      // satCruncher.postMessage({
      //     // Tell satCruncher we have changed times for orbit calculations
      //     typ: 'offset',
      //     dat:
      //         timeManager.propOffset.toString() +
      //         ' ' +
      //         (1.0).toString(),
      // });
      // timeManager.propRealTime = Date.now(); // Reset realtime...this might not be necessary...
      // timeManager.propTime();

      return distArray;
    };

    satellite.createManeuverAnalyst = (satId, incVariation, meanmoVariation, rascVariation) => {

      // TODO This needs rewrote from scratch to bypass the satcruncher

      var mainsat = satSet.getSat(satId);
      var origsat = mainsat;

      // Launch Points are the Satellites Current Location
      var TEARR = mainsat.getTEARR();
      var launchLat, launchLon, alt;
      launchLat = satellite.degreesLat(TEARR.lat);
      launchLon = satellite.degreesLong(TEARR.lon);
      alt = TEARR.alt;

      var upOrDown = mainsat.getDirection();

      var currentEpoch = satellite.currentEpoch(
          timeManager.propTime()
      );
      mainsat.TLE1 =
          mainsat.TLE1.substr(0, 18) +
          currentEpoch[0] +
          currentEpoch[1] +
          mainsat.TLE1.substr(32);

      camSnapMode = false;

      var TLEs;
      // Ignore argument of perigee for round orbits OPTIMIZE
      if (mainsat.apogee - mainsat.perigee < 300) {
          TLEs = satellite.getOrbitByLatLon(
              mainsat,
              launchLat,
              launchLon,
              upOrDown,
              timeManager.propOffset
          );
      } else {
          TLEs = satellite.getOrbitByLatLon(
              mainsat,
              launchLat,
              launchLon,
              upOrDown,
              timeManager.propOffset,
              alt
          );
      }
      var TLE1 = TLEs[0];
      var TLE2 = TLEs[1];

      var breakupSearchString = '';

      satId = satSet.getIdFromObjNum(80000);
      var sat = satSet.getSat(satId);
      sat = origsat;
      var iTLE1 =
          '1 ' + (80000) + TLE1.substr(7);

      var iTLEs;
      // Ignore argument of perigee for round orbits OPTIMIZE
      if (sat.apogee - sat.perigee < 300) {
          iTLEs = satellite.getOrbitByLatLon(
              sat,
              launchLat,
              launchLon,
              upOrDown,
              timeManager.propOffset,
              0,
              rascVariation
          );
      } else {
          iTLEs = satellite.getOrbitByLatLon(
              sat,
              launchLat,
              launchLon,
              upOrDown,
              timeManager.propOffset,
              alt,
              rascVariation
          );
      }
      iTLE1 = iTLEs[0];
      iTLE2 = iTLEs[1];

      // For the first 30
      var inc = TLE2.substr(8, 8);
      inc = (parseFloat(inc) + incVariation).toPrecision(7);
      inc = inc.split('.');
      inc[0] = inc[0].substr(-3, 3);
      if (inc[1]) {
          inc[1] = inc[1].substr(0, 4);
      } else {
          inc[1] = '0000';
      }
      inc = (inc[0] + '.' + inc[1]).toString();
      inc = _padEmpty(inc, 8);

      // For the second 30
      var meanmo = iTLE2.substr(52, 10);
      meanmo = parseFloat(meanmo * meanmoVariation).toPrecision(10);
      // meanmo = parseFloat(meanmo - (0.005 / 10) + (0.01 * ((meanmoIterat + 1) / 10))).toPrecision(10);
      meanmo = meanmo.split('.');
      meanmo[0] = meanmo[0].substr(-2, 2);
      if (meanmo[1]) {
          meanmo[1] = meanmo[1].substr(0, 8);
      } else {
          meanmo[1] = '00000000';
      }
      meanmo = (
          meanmo[0] +
          '.' +
          meanmo[1]
      ).toString();

      var iTLE2 =
          '2 ' +
          (80000) +
          ' ' +
          inc +
          ' ' +
          iTLE2.substr(17, 35) +
          meanmo +
          iTLE2.substr(63);
      sat = satSet.getSat(satId);
      sat.TLE1 = iTLE1;
      sat.TLE2 = iTLE2;
      sat.active = true;
      if (
          satellite.altitudeCheck(
              iTLE1,
              iTLE2,
              timeManager.propOffset
          ) > 1
      ) {
          satCruncher.postMessage({
              typ: 'satEdit',
              id: satId,
              TLE1: iTLE1,
              TLE2: iTLE2,
          });
          orbitManager.updateOrbitBuffer(
              satId,
              true,
              iTLE1,
              iTLE2
          );
      } else {
          console.warn(
              'Breakup Generator Failed'
          );
          return false;
      }

      // breakupSearchString += mainsat.SCC_NUM + ',Analyst Sat';
      // searchBox.doSearch(breakupSearchString);
      return true;
    }

    satellite.findChangeOrbitToDock = (sat, sat2, propOffset, propLength) => {
      let closestInc = 0;
      let closestRaan = 0;
      let closestMeanMo = 1;

      let minDistArray = {
        dist: 1000000
      };

      for (let incTemp = -1; incTemp <= 1; incTemp++) {
        for (let raanTemp = -1; raanTemp <= 1; raanTemp++) {
          for (let meanMoTemp = 0.95; meanMoTemp <= 1.05; meanMoTemp += 0.05) {
            if (satellite.createManeuverAnalyst(sat.id, incTemp, meanMoTemp, raanTemp)) {
              let minDistArrayTemp = satellite.findClosestApproachTime(satSet.getSatFromObjNum(80000), sat2, propOffset, propLength);
              if (minDistArrayTemp.dist < minDistArray.dist) {
                minDistArray = minDistArrayTemp;
                let closestInc = incTemp;
                let closestRaan = raanTemp;
                let closestMeanMo = meanMoTemp;
                console.log(`Distance: ${minDistArray.dist}`);
                console.log(`Time: ${minDistArray.time}`);
                console.log(satSet.getSatFromObjNum(80000));
              }
            }
          }
        }
      }

      console.log(`${sat.inclination + closestInc}`);
      console.log(`${sat.raan + closestRaan}`);
      console.log(`${sat.meanMotion * closestMeanMo}`);
      satellite.createManeuverAnalyst(sat.id, closestInc, closestMeanMo, closestRaan);
    };

    // NOTE: Better code is available for this
    satellite.checkIsInFOV = (sensor, rae) => {
        let azimuth = rae.az;
        let elevation = rae.el;
        let range = rae.range;

        if (sensor.obsminaz > sensor.obsmaxaz) {
            if (
                ((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) &&
                    elevation >= sensor.obsminel &&
                    elevation <= sensor.obsmaxel &&
                    range <= sensor.obsmaxrange &&
                    range >= sensor.obsminrange) ||
                ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) &&
                    elevation >= sensor.obsminel2 &&
                    elevation <= sensor.obsmaxel2 &&
                    range <= sensor.obsmaxrange2 &&
                    range >= sensor.obsminrange2)
            ) {
                return true;
            } else {
                return false;
            }
        } else {
            if (
                (azimuth >= sensor.obsminaz &&
                    azimuth <= sensor.obsmaxaz &&
                    elevation >= sensor.obsminel &&
                    elevation <= sensor.obsmaxel &&
                    range <= sensor.obsmaxrange &&
                    range >= sensor.obsminrange) ||
                (azimuth >= sensor.obsminaz2 &&
                    azimuth <= sensor.obsmaxaz2 &&
                    elevation >= sensor.obsminel2 &&
                    elevation <= sensor.obsmaxel2 &&
                    range <= sensor.obsmaxrange2 &&
                    range >= sensor.obsminrange2)
            ) {
                return true;
            } else {
                return false;
            }
        }
    };

    satellite.getDOPsTable = (lat, lon, alt) => {
        let now;
        let tbl = document.getElementById('dops'); // Identify the table to update
        tbl.innerHTML = ''; // Clear the table from old object data
        let tblLength = 0;
        let propOffset = timeManager.getPropOffset();
        let propTempOffset = 0;

        let tr = tbl.insertRow();
        let tdT = tr.insertCell();
        tdT.appendChild(document.createTextNode('Time'));
        let tdH = tr.insertCell();
        tdH.appendChild(document.createTextNode('HDOP'));
        let tdP = tr.insertCell();
        tdP.appendChild(document.createTextNode('PDOP'));
        let tdG = tr.insertCell();
        tdG.appendChild(document.createTextNode('GDOP'));

        for (let t = 0; t < 1440; t++) {
            propTempOffset = t * 1000 * 60 + propOffset; // Offset in seconds (msec * 1000)
            now = timeManager.propTimeCheck(
                propTempOffset,
                timeManager.propRealTime
            );

            dops = satellite.getDOPs(lat, lon, alt, false, now);

            tr = tbl.insertRow();
            tdT = tr.insertCell();
            tdT.appendChild(
                document.createTextNode(
                    timeManager.dateFormat(now, 'isoDateTime', true)
                )
            );
            tdH = tr.insertCell();
            tdH.appendChild(document.createTextNode(dops.HDOP));
            tdP = tr.insertCell();
            tdP.appendChild(document.createTextNode(dops.PDOP));
            tdG = tr.insertCell();
            tdG.appendChild(document.createTextNode(dops.GDOP));
        }
    };
    satellite.getDOPs = (lat, lon, alt, isDrawLine, propTime) => {
        if (typeof lat == 'undefined') {
            console.error('Latitude Required');
            return;
        }
        if (typeof lon == 'undefined') {
            console.error('Longitude Required');
            return;
        }
        alt = typeof alt != 'undefined' ? alt : 0;
        isDrawLine = typeof isDrawLine != 'undefined' ? isDrawLine : false;

        lat = lat * DEG2RAD;
        lon = lon * DEG2RAD;

        var sat;
        var lookAngles, az, el;
        var azList = [];
        var elList = [];
        var inViewList = [];

        if (typeof groups.GPSGroup == 'undefined') {
            groups.GPSGroup = new groups.SatGroup('nameRegex', /NAVSTAR/);
        }

        if (typeof propTime == 'undefined') propTime = timeManager.propTime();
        var j = timeManager.jday(
            propTime.getUTCFullYear(),
            propTime.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
            propTime.getUTCDate(),
            propTime.getUTCHours(),
            propTime.getUTCMinutes(),
            propTime.getUTCSeconds()
        ); // Converts time to jday (TLEs use epoch year/day)
        j += propTime.getUTCMilliseconds() * 1.15741e-8;
        var gmst = satellite.gstime(j);

        var referenceECF = {};
        var cosLat = Math.cos(lat);
        var sinLat = Math.sin(lat);
        var cosLon = Math.cos(lon + gmst);
        var sinLon = Math.sin(lon + gmst);

        referenceECF.x = (6371 + 0.25) * cosLat * cosLon; // 6371 is radius of earth
        referenceECF.y = (6371 + 0.25) * cosLat * sinLon;
        referenceECF.z = (6371 + 0.25) * sinLat;

        for (var i = 0; i < groups.GPSGroup.sats.length; i++) {
            sat = satSet.getSat(groups.GPSGroup.sats[i].satId);
            lookAngles = satellite.ecfToLookAngles(
                { longitude: lon, latitude: lat, height: alt },
                satellite.eciToEcf(sat.position, gmst)
            );
            sat.az = lookAngles.azimuth * RAD2DEG;
            sat.el = lookAngles.elevation * RAD2DEG;
            if (sat.el > settingsManager.gpsElevationMask) {
                inViewList.push(sat);
            }
        }

        return satellite.calculateDOPs(inViewList, referenceECF, isDrawLine);
    };
    satellite.calculateDOPs = (satList, referenceECF, isDrawLine) => {
        var dops = {};

        nsat = satList.length;
        if (nsat < 4) {
            dops.PDOP = 50;
            dops.HDOP = 50;
            dops.GDOP = 50;
            dops.VDOP = 50;
            dops.TDOP = 50;
            // console.error("Need More Satellites");
            return dops;
        }

        var A = window.numeric.rep([nsat, 4], 0);
        var azlist = [];
        var elvlist = [];
        if (isDrawLine) drawLineList = [];
        for (var n = 1; n <= nsat; n++) {
            var cursat = satList[n - 1];

            if (isDrawLine) {
                drawLineList[n - 1] = {};
                drawLineList[n - 1].line = new Line();
                drawLineList[n - 1].sat = cursat;
                drawLineList[n - 1].ref = [
                    referenceECF.x,
                    referenceECF.y,
                    referenceECF.z,
                ];
            }

            var az = cursat.az;
            var elv = cursat.el;

            azlist.push(az);
            elvlist.push(elv);
            var B = [
                Math.cos((elv * Math.PI) / 180.0) *
                    Math.sin((az * Math.PI) / 180.0),
                Math.cos((elv * Math.PI) / 180.0) *
                    Math.cos((az * Math.PI) / 180.0),
                Math.sin((elv * Math.PI) / 180.0),
                1,
            ];
            window.numeric.setBlock(A, [n - 1, 0], [n - 1, 3], [B]);
        }
        var Q = window.numeric.dot(window.numeric.transpose(A), A);
        var Qinv = window.numeric.inv(Q);
        var pdop = Math.sqrt(Qinv[0][0] + Qinv[1][1] + Qinv[2][2]);
        var hdop = Math.sqrt(Qinv[0][0] + Qinv[1][1]);
        var gdop = Math.sqrt(Qinv[0][0] + Qinv[1][1] + Qinv[2][2] + Qinv[3][3]);
        var vdop = Math.sqrt(Qinv[2][2]);
        var tdop = Math.sqrt(Qinv[3][3]);
        dops.PDOP = parseFloat(Math.round(pdop * 100) / 100).toFixed(2);
        dops.HDOP = parseFloat(Math.round(hdop * 100) / 100).toFixed(2);
        dops.GDOP = parseFloat(Math.round(gdop * 100) / 100).toFixed(2);
        dops.VDOP = parseFloat(Math.round(vdop * 100) / 100).toFixed(2);
        dops.TDOP = parseFloat(Math.round(tdop * 100) / 100).toFixed(2);
        return dops;
    };

    satellite.getSunTimes = (sat, sensor, searchLength, interval) => {
        // If no sensor passed to function then try to use the 'currentSensor'
        if (typeof sensor == 'undefined') {
            if (typeof sensorManager.currentSensor == 'undefined') {
                throw 'getTEARR requires a sensor or for a sensor to be currently selected.';
            } else {
                sensor = sensorManager.currentSensor;
            }
        }
        // If sensor's observerGd is not set try to set it using it parameters
        if (typeof sensor.observerGd == 'undefined') {
            try {
                sensor.observerGd = {
                    height: sensor.obshei,
                    latitude: sensor.lat,
                    longitude: sensor.long,
                };
            } catch (e) {
                throw 'observerGd is not set and could not be guessed.';
            }
        }
        // If length and interval not set try to use defaults
        if (typeof searchLength == 'undefined')
            searchLength = satellite.lookanglesLength;
        if (typeof interval == 'undefined')
            interval = satellite.lookanglesInterval;

        var propOffset = timeManager.getPropOffset();
        var propTempOffset = 0;
        var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
        var minDistanceApart = 100000000000;
        var minDistTime;
        for (var i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
            // 5second Looks
            propTempOffset = i * 1000 + propOffset; // Offset in seconds (msec * 1000)
            var now = timeManager.propTimeCheck(
                propTempOffset,
                timeManager.propRealTime
            );
            var j = timeManager.jday(
                now.getUTCFullYear(),
                now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                now.getUTCDate(),
                now.getUTCHours(),
                now.getUTCMinutes(),
                now.getUTCSeconds()
            ); // Converts time to jday (TLEs use epoch year/day)
            j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
            var gmst = satellite.gstime(j);

            var sunXYZ = sun.getDirection2(j);
            // console.log(sunXYZ);
            var sunX = sunXYZ[0] * 1000000;
            var sunY = sunXYZ[1] * 1000000;
            var sunZ = sunXYZ[2] * 1000000;

            var m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
            var positionEci = satellite.sgp4(satrec, m);
            var positionEcf, lookAngles, azimuth, elevation, range;

            var distanceApartX = Math.pow(sunX - positionEci.position.x, 2);
            var distanceApartY = Math.pow(sunY - positionEci.position.y, 2);
            var distanceApartZ = Math.pow(sunZ - positionEci.position.z, 2);
            var distanceApart = Math.sqrt(
                distanceApartX + distanceApartY + distanceApartZ
            );

            positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
            lookAngles = satellite.ecfToLookAngles(
                sensor.observerGd,
                positionEcf
            );
            gpos = satellite.eciToGeodetic(positionEci.position, gmst);
            alt = gpos.height * 1000; // Km to m
            lon = gpos.longitude;
            lat = gpos.latitude;
            azimuth = lookAngles.azimuth * RAD2DEG;
            elevation = lookAngles.elevation * RAD2DEG;
            range = lookAngles.rangeSat;

            if (sensor.obsminaz > sensor.obsmaxaz) {
                if (
                    ((azimuth >= sensor.obsminaz ||
                        azimuth <= sensor.obsmaxaz) &&
                        elevation >= sensor.obsminel &&
                        elevation <= sensor.obsmaxel &&
                        range <= sensor.obsmaxrange &&
                        range >= sensor.obsminrange) ||
                    ((azimuth >= sensor.obsminaz2 ||
                        azimuth <= sensor.obsmaxaz2) &&
                        elevation >= sensor.obsminel2 &&
                        elevation <= sensor.obsmaxel2 &&
                        range <= sensor.obsmaxrange2 &&
                        range >= sensor.obsminrange2)
                ) {
                    if (distanceApart < minDistanceApart) {
                        minDistanceApart = distanceApart;
                        minDistTime = now;
                    }
                }
            } else {
                if (
                    (azimuth >= sensor.obsminaz &&
                        azimuth <= sensor.obsmaxaz &&
                        elevation >= sensor.obsminel &&
                        elevation <= sensor.obsmaxel &&
                        range <= sensor.obsmaxrange &&
                        range >= sensor.obsminrange) ||
                    (azimuth >= sensor.obsminaz2 &&
                        azimuth <= sensor.obsmaxaz2 &&
                        elevation >= sensor.obsminel2 &&
                        elevation <= sensor.obsmaxel2 &&
                        range <= sensor.obsmaxrange2 &&
                        range >= sensor.obsminrange2)
                ) {
                    if (distanceApart < minDistanceApart) {
                        minDistanceApart = distanceApart;
                        minDistTime = now;
                    }
                }
            }
        }
    };
    satellite.lookAnglesToEcf = (
        azimuthDeg,
        elevationDeg,
        slantRange,
        obs_lat,
        obs_long,
        obs_alt
    ) => {
        // site ecef in meters
        var geodeticCoords = {};
        geodeticCoords.latitude = obs_lat;
        geodeticCoords.longitude = obs_long;
        geodeticCoords.height = obs_alt;

        var siteXYZ = satellite.geodeticToEcf(geodeticCoords);
        var sitex, sitey, sitez;
        sitex = siteXYZ.x;
        sitey = siteXYZ.y;
        sitez = siteXYZ.z;

        // some needed calculations
        var slat = Math.sin(obs_lat);
        var slon = Math.sin(obs_long);
        var clat = Math.cos(obs_lat);
        var clon = Math.cos(obs_long);

        var azRad = DEG2RAD * azimuthDeg;
        var elRad = DEG2RAD * elevationDeg;

        // az,el,range to sez convertion
        var south = -slantRange * Math.cos(elRad) * Math.cos(azRad);
        var east = slantRange * Math.cos(elRad) * Math.sin(azRad);
        var zenith = slantRange * Math.sin(elRad);

        var x =
            slat * clon * south + -slon * east + clat * clon * zenith + sitex;
        var y =
            slat * slon * south + clon * east + clat * slon * zenith + sitey;
        var z = -clat * south + slat * zenith + sitez;

        return { x: x, y: y, z: z };
    };

    satellite.eci2ll = (x, y, z) => {
        var propTime = timeManager.propTime();
        var j = timeManager.jday(
            propTime.getUTCFullYear(),
            propTime.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
            propTime.getUTCDate(),
            propTime.getUTCHours(),
            propTime.getUTCMinutes(),
            propTime.getUTCSeconds()
        ); // Converts time to jday (TLEs use epoch year/day)
        j += propTime.getUTCMilliseconds() * 1.15741e-8;
        var gmst = satellite.gstime(j);
        var latLon = satellite.eciToGeodetic({ x: x, y: y, z: z }, gmst);
        latLon.latitude = latLon.latitude * RAD2DEG;
        latLon.longitude = latLon.longitude * RAD2DEG;

        latLon.longitude =
            latLon.longitude > 180 ? latLon.longitude - 360 : latLon.longitude;
        latLon.longitude =
            latLon.longitude < -180 ? latLon.longitude + 360 : latLon.longitude;
        return latLon;
    };

    // Specific to KeepTrack.
    satellite.map = (sat, i) => {
        // Set default timing settings. These will be changed to find look angles at different times in future.
        var propOffset = timeManager.getPropOffset();
        var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
        var propTempOffset = ((i * sat.period) / 50) * 60 * 1000 + propOffset; // Offset in seconds (msec * 1000)
        return propagate(propTempOffset, satrec); // Update the table with looks for this 5 second chunk and then increase table counter by 1

        function propagate(propOffset, satrec) {
            var now = timeManager.propTimeCheck(
                propOffset,
                timeManager.propRealTime
            );
            var j = timeManager.jday(
                now.getUTCFullYear(),
                now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                now.getUTCDate(),
                now.getUTCHours(),
                now.getUTCMinutes(),
                now.getUTCSeconds()
            ); // Converts time to jday (TLEs use epoch year/day)
            j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
            var gmst = satellite.gstime(j);

            var m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
            var positionEci = satellite.sgp4(satrec, m);

            var gpos, lat, lon;

            gpos = satellite.eciToGeodetic(positionEci.position, gmst);

            lat = satellite.degreesLat(gpos.latitude);
            lon = satellite.degreesLong(gpos.longitude);
            var time = timeManager.dateFormat(now, 'isoDateTime', true);

            var positionEcf, lookAngles, azimuth, elevation, range;
            positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
            lookAngles = satellite.ecfToLookAngles(
                sensorManager.currentSensor.observerGd,
                positionEcf
            );
            azimuth = lookAngles.azimuth * RAD2DEG;
            elevation = lookAngles.elevation * RAD2DEG;
            range = lookAngles.rangeSat;
            var inview = 0;

            if (
                sensorManager.currentSensor.obsminaz <
                sensorManager.currentSensor.obsmaxaz
            ) {
                if (
                    (azimuth >= sensorManager.currentSensor.obsminaz &&
                        azimuth <= sensorManager.currentSensor.obsmaxaz &&
                        elevation >= sensorManager.currentSensor.obsminel &&
                        elevation <= sensorManager.currentSensor.obsmaxel &&
                        range <= sensorManager.currentSensor.obsmaxrange &&
                        range >= sensorManager.currentSensor.obsminrange) ||
                    (azimuth >= sensorManager.currentSensor.obsminaz2 &&
                        azimuth <= sensorManager.currentSensor.obsmaxaz2 &&
                        elevation >= sensorManager.currentSensor.obsminel2 &&
                        elevation <= sensorManager.currentSensor.obsmaxel2 &&
                        range <= sensorManager.currentSensor.obsmaxrange2 &&
                        range >= sensorManager.currentSensor.obsminrange2)
                ) {
                    inview = 1;
                }
            } else {
                if (
                    ((azimuth >= sensorManager.currentSensor.obsminaz ||
                        azimuth <= sensorManager.currentSensor.obsmaxaz) &&
                        elevation >= sensorManager.currentSensor.obsminel &&
                        elevation <= sensorManager.currentSensor.obsmaxel &&
                        range <= sensorManager.currentSensor.obsmaxrange &&
                        range >= sensorManager.currentSensor.obsminrange) ||
                    ((azimuth >= sensorManager.currentSensor.obsminaz2 ||
                        azimuth <= sensorManager.currentSensor.obsmaxaz2) &&
                        elevation >= sensorManager.currentSensor.obsminel2 &&
                        elevation <= sensorManager.currentSensor.obsmaxel2 &&
                        range <= sensorManager.currentSensor.obsmaxrange2 &&
                        range >= sensorManager.currentSensor.obsminrange2)
                ) {
                    inview = 1;
                }
            }

            return { lat: lat, lon: lon, time: time, inview: inview };
        }
    };

    // TODO: Add comments on what this is used for
    function _padEmpty(num, size) {
        var s = '   ' + num;
        return s.substr(s.length - size);
    }
    function _pad0(str, max) {
        return str.length < max ? _pad0('0' + str, max) : str;
    }
    function _Nearest180(arr) {
        let maxDiff = null;
        for (let x = 0; x < arr.length; x++) {
            for (let y = x + 1; y < arr.length; y++) {
                if (arr[x] < arr[y] && maxDiff < arr[y] - arr[x]) {
                    if (arr[y] - arr[x] > 180) {
                        arr[y] = arr[y] - 180;
                    }
                    if (maxDiff < arr[y] - arr[x]) {
                        maxDiff = arr[y] - arr[x];
                    }
                }
            }
        }
        return maxDiff === null ? -1 : maxDiff;
    }
    function _jday(year, mon, day, hr, minute, sec) {
        // from satellite.js
        if (!year) {
            // console.error('timeManager.jday should always have a date passed to it!');
            var now;
            now = Date.now();
            jDayStart = new Date(now.getFullYear(), 0, 0);
            jDayDiff = now - jDayStart;
            return Math.floor(jDayDiff / MILLISECONDS_PER_DAY);
        } else {
            return (
                367.0 * year -
                Math.floor(7 * (year + Math.floor((mon + 9) / 12.0)) * 0.25) +
                Math.floor((275 * mon) / 9.0) +
                day +
                1721013.5 +
                ((sec / 60.0 + minute) / 60.0 + hr) / 24.0 //  ut in days
            );
        }
    }
})();

// NOTE: This was an early attempt at multithreading.
// satellite.calculateTimeInCoverage = function () {
//   console.time('TIC');
//   console.log(Date.now());
//   var calcTICArray = [];
//   var ready1, ready2, ready3, ready4, ready5, ready6, ready7, ready8;
//   var debugCalculations = 17868;
//   ready1 = false;
//   ready2 = false;
//   ready3 = false;
//   ready4 = false;
//   ready5 = false;
//   ready6 = false;
//   ready7 = false;
//   ready8 = false;
//
//   // multThreadCruncher1.postMessage({type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 0, endNum: 0, sensor: sensorManager.currentSensor});
//   // multThreadCruncher2.postMessage({type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 1, endNum: 1, sensor: sensorManager.currentSensor});
//   // multThreadCruncher3.postMessage({type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 2, endNum: 2, sensor: sensorManager.currentSensor});
//   // multThreadCruncher4.postMessage({type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 3, endNum: 3, sensor: sensorManager.currentSensor});
//   // multThreadCruncher5.postMessage({type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 4, endNum: 4, sensor: sensorManager.currentSensor});
//   // multThreadCruncher6.postMessage({type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 5, endNum: 5, sensor: sensorManager.currentSensor});
//   // multThreadCruncher7.postMessage({type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 6, endNum: 6, sensor: sensorManager.currentSensor});
//   // multThreadCruncher8.postMessage({type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 7, endNum: 1599, sensor: sensorManager.currentSensor});
//
//   multThreadCruncher1.postMessage({thread: 1, type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 0, endNum: debugCalculations/8*1, sensor: sensorManager.currentSensor});
//   multThreadCruncher2.postMessage({thread: 2, type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: debugCalculations/8*1+1, endNum: debugCalculations/8*2, sensor: sensorManager.currentSensor});
//   multThreadCruncher3.postMessage({thread: 3, type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: debugCalculations/8*2+1, endNum: debugCalculations/8*3, sensor: sensorManager.currentSensor});
//   multThreadCruncher4.postMessage({thread: 4, type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: debugCalculations/8*3+1, endNum: debugCalculations/8*4, sensor: sensorManager.currentSensor});
//   multThreadCruncher5.postMessage({thread: 5, type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: debugCalculations/8*4+1, endNum: debugCalculations/8*5, sensor: sensorManager.currentSensor});
//   multThreadCruncher6.postMessage({thread: 6, type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: debugCalculations/8*5+1, endNum: debugCalculations/8*6, sensor: sensorManager.currentSensor});
//   multThreadCruncher7.postMessage({thread: 7, type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: debugCalculations/8*6+1, endNum: debugCalculations/8*7, sensor: sensorManager.currentSensor});
//   multThreadCruncher8.postMessage({thread: 8, type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: debugCalculations/8*7+1, endNum: debugCalculations/8*8, sensor: sensorManager.currentSensor});
//
//   multThreadCruncher1.onmessage = function (m) {
//     for (var i = 0; i < m.data.calcTICArray.length; i++) { calcTICArray.push(m.data.calcTICArray[i]); }
//     ready1 = true;
//     if (ready1 && ready2 && ready3 && ready4 && ready5 && ready6 && ready7 && ready8) multThreadComplete();
//   };
//   multThreadCruncher2.onmessage = function (m) {
//     for (var i = 0; i < m.data.calcTICArray.length; i++) { calcTICArray.push(m.data.calcTICArray[i]); }
//     ready2 = true;
//     if (ready1 && ready2 && ready3 && ready4 && ready5 && ready6 && ready7 && ready8) multThreadComplete();
//   };
//   multThreadCruncher3.onmessage = function (m) {
//     for (var i = 0; i < m.data.calcTICArray.length; i++) { calcTICArray.push(m.data.calcTICArray[i]); }
//     ready3 = true;
//     if (ready1 && ready2 && ready3 && ready4 && ready5 && ready6 && ready7 && ready8) multThreadComplete();
//   };
//   multThreadCruncher4.onmessage = function (m) {
//     for (var i = 0; i < m.data.calcTICArray.length; i++) { calcTICArray.push(m.data.calcTICArray[i]); }
//     ready4 = true;
//     if (ready1 && ready2 && ready3 && ready4 && ready5 && ready6 && ready7 && ready8) multThreadComplete();
//   };
//   multThreadCruncher5.onmessage = function (m) {
//     for (var i = 0; i < m.data.calcTICArray.length; i++) { calcTICArray.push(m.data.calcTICArray[i]); }
//     ready5 = true;
//     if (ready1 && ready2 && ready3 && ready4 && ready5 && ready6 && ready7 && ready8) multThreadComplete();
//   };
//   multThreadCruncher6.onmessage = function (m) {
//     for (var i = 0; i < m.data.calcTICArray.length; i++) { calcTICArray.push(m.data.calcTICArray[i]); }
//     ready6 = true;
//     if (ready1 && ready2 && ready3 && ready4 && ready5 && ready6 && ready7 && ready8) multThreadComplete();
//   };
//   multThreadCruncher7.onmessage = function (m) {
//     for (var i = 0; i < m.data.calcTICArray.length; i++) { calcTICArray.push(m.data.calcTICArray[i]); }
//     ready7 = true;
//     if (ready1 && ready2 && ready3 && ready4 && ready5 && ready6 && ready7 && ready8) multThreadComplete();
//   };
//   multThreadCruncher8.onmessage = function (m) {
//     for (var i = 0; i < m.data.calcTICArray.length; i++) { calcTICArray.push(m.data.calcTICArray[i]); }
//     ready8 = true;
//     if (ready1 && ready2 && ready3 && ready4 && ready5 && ready6 && ready7 && ready8) multThreadComplete();
//   };
//   function multThreadComplete () {
//     console.log(calcTICArray);
//     console.timeEnd('TIC');
//   }
// };
