/**
// /////////////////////////////////////////////////////////////////////////////

Copyright (C) 2016-2022 Theodore Kruczek
Copyright (C) 2020 Heather Kruczek

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

// /////////////////////////////////////////////////////////////////////////////
*/

// Settings Manager Overrides
const settingsManagerOverride = {
  // Classification can be "Unclassified", "Secret", "Top Secret", "Top Secret//SCI"
  classificationStr: '',
  // This controls which of the built-in plugins are loaded
  plugins: {
    satInfoboxCore: true,
    updateSelectBoxCore: true,
    aboutManager: true,
    collisions: true,
    dops: true,
    findSat: true,
    launchCalendar: true,
    newLaunch: true,
    nextLaunch: true,
    nightToggle: true,
    photoManager: true,
    recorderManager: true,
    satChanges: true,
    stereoMap: true,
    timeMachine: true,
    twitter: true,
    initialOrbit: true,
    missile: true,
    breakup: true,
    editSat: true,
    constellations: true,
    countries: true,
    colorsMenu: true,
    shortTermFences: true,
    orbitReferences: true,
    externalSources: true,
    analysis: true,
    sensorFov: true,
    sensorSurv: true,
    satelliteView: true,
    satelliteFov: true,
    planetarium: true,
    astronomy: true,
    photo: true,
    watchlist: true,
    sensor: true,
    settingsMenu: true,
    datetime: true,
    social: true,
    topMenu: true,
    classification: true,
    soundManager: true,
    gamepad: true,
  },
  searchLimit: 150,
};

// Expose these to the console
window.settingsManagerOverride = settingsManagerOverride;
