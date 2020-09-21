/* jshint esversion: 8 */

var satLinkManager = {};
satLinkManager.AEHFUsers = [];
satLinkManager.WGSUsers = [];
satLinkManager.IridiumUsers = [];
satLinkManager.GalileoUsers = [];
satLinkManager.init = (function () {
    try {
        for (let controlSite in controlSiteManager.controlSiteList) {
            if (controlSiteManager.controlSiteList[controlSite].linkAEHF) {
                satLinkManager.AEHFUsers.push(
                    controlSiteManager.controlSiteList[controlSite].name
                );
            }
            if (controlSiteManager.controlSiteList[controlSite].linkWGS) {
                satLinkManager.WGSUsers.push(
                    controlSiteManager.controlSiteList[controlSite].name
                );
            }
            if (controlSiteManager.controlSiteList[controlSite].linkIridium) {
                satLinkManager.WGSUsers.push(
                    controlSiteManager.controlSiteList[controlSite].name
                );
            }
            if (controlSiteManager.controlSiteList[controlSite].linkGalileo) {
                satLinkManager.GalileoUsers.push(
                    controlSiteManager.controlSiteList[controlSite].name
                );
            }
        }
    } catch (e) {
        console.log('ControlSiteMananger unable to load!');
    }

    for (let sensor in sensorManager.sensorList) {
        if (sensorManager.sensorList[sensor].linkAEHF) {
            satLinkManager.AEHFUsers.push(
                sensorManager.sensorList[sensor].name
            );
        }
        if (sensorManager.sensorList[sensor].linkWGS) {
            satLinkManager.WGSUsers.push(sensorManager.sensorList[sensor].name);
        }
        if (sensorManager.sensorList[sensor].linkIridium) {
            satLinkManager.WGSUsers.push(sensorManager.sensorList[sensor].name);
        }
        if (sensorManager.sensorList[sensor].linkGalileo) {
            satLinkManager.GalileoUsers.push(sensorManager.sensorList[sensor].name);
        }
    }
})();

satLinkManager.showLinks = async function (group) {
    let satlist;
    let userlist;
    let minTheta;
    let linkType = 0;
    switch (group) {
        case 'aehf':
            satlist = satLinkManager.AEHF;
            userlist = satLinkManager.AEHFUsers;
            minTheta = 10;
            linkType = 1;
            break;
        case 'dscs':
            satlist = satLinkManager.DSCS;
            satlist = satlist.concat(satLinkManager.WGS);
            minTheta = 10;
            linkType = 1;
            break;
        case 'wgs':
            satlist = satLinkManager.WGS;
            satlist = satlist.concat(satLinkManager.DSCS);
            userlist = satLinkManager.WGSUsers;
            minTheta = 10;
            linkType = 1;
            break;
        case 'iridium':
            satlist = satLinkManager.Iridium;
            userlist = satLinkManager.IridiumUsers;
            minTheta = 66;
            linkType = 1;
            break;
        case 'galileo':
            satlist = satLinkManager.Galileo;
            userlist = satLinkManager.GalileoUsers;
            minTheta = 20; // Not Used
            linkType = 2;
            break;
    }

    // Show the users connected to the satellites and the satellites connected
    // to each other
    if (linkType == 1) {
      for (let i = 0; i < satlist.length; i++) {
        for (let j = 0; j < satlist.length; j++) {
          if (i !== j) {
            var sat1 = satSet.getSatFromObjNum(satlist[i]);
            var sat2 = satSet.getSatFromObjNum(satlist[j]);
            //
            // Debug for finding decayed satellites
            //
            if (sat1.position.x === 0) console.log(sat1.SCC_NUM);
            if (sat1.position.y === 0) console.log(sat1.SCC_NUM);
            if (sat1.position.z === 0) console.log(sat1.SCC_NUM);
            if (sat2.position.x === 0) console.log(sat2.SCC_NUM);
            if (sat2.position.y === 0) console.log(sat2.SCC_NUM);
            if (sat2.position.z === 0) console.log(sat2.SCC_NUM);
            //
            // var semiDiamEarth = Math.asin(RADIUS_OF_EARTH/Math.sqrt(Math.pow(-sat1.position.x, 2) + Math.pow(-sat1.position.y, 2) + Math.pow(-sat1.position.z, 2))) * RAD2DEG;
            // var semiDiamSat2 = Math.asin(0.1/Math.sqrt(Math.pow(-sat1.position.x + sat2.position.x, 2) + Math.pow(-sat1.position.y + sat2.position.y, 2) + Math.pow(-sat1.position.z + sat2.position.z, 2))) * RAD2DEG;
            var theta =
            Math.acos(
              numeric.dot(
                [
                  -sat1.position.x,
                  -sat1.position.y,
                  -sat1.position.z,
                ],
                [
                  -sat1.position.x + sat2.position.x,
                  -sat1.position.y + sat2.position.y,
                  -sat1.position.z + sat2.position.z,
                ]
              ) /
              (Math.sqrt(
                Math.pow(-sat1.position.x, 2) +
                Math.pow(-sat1.position.y, 2) +
                Math.pow(-sat1.position.z, 2)
              ) *
              Math.sqrt(
                Math.pow(
                  -sat1.position.x + sat2.position.x,
                  2
                ) +
                Math.pow(
                  -sat1.position.y + sat2.position.y,
                  2
                ) +
                Math.pow(
                  -sat1.position.z + sat2.position.z,
                  2
                )
              ))
            ) * RAD2DEG;
            if (theta < minTheta) {
            } else {
              debugDrawLine('sat3', [sat1.id, sat2.id], [0, 0.6, 1, 1]);
            }
          }
        }
      }
      for (let i = 0; i < userlist.length; i++) {
        let user = satSet.getSat(satSet.getIdFromSensorName(userlist[i]));
        var bestSat;
        var bestRange = 1000000;
        for (let j = 0; j < satlist.length; j++) {
          var sat = satSet.getSatFromObjNum(satlist[j]);
          var tearr = sat.getTEARR(void 0, user);
          if (tearr.elevation > 10) {
            if (tearr.range < bestRange) bestSat = sat;
          }
        }
        if (typeof bestSat.id !== 'undefined') {
          debugDrawLine(
            'sat3',
            [bestSat.id, satSet.getIdFromSensorName(user.name)],
            [0, 1.0, 0.6, 1.0]
          );
        }
      }
    }

    // Only show the users connected to the satellites
    if (linkType == 2) {
      // Loop through all the users
      for (let i = 0; i < userlist.length; i++) {
        // Select the current user
        let user = satSet.getSat(satSet.getIdFromSensorName(userlist[i]));
        // Loop through all of the satellites
        for (let j = 0; j < satlist.length; j++) {
          // Select the current satelltie
          let sat = satSet.getSatFromObjNum(satlist[j]);
          // Calculate Time, Elevation, Azimuth, Range, and Range Rate data
          // of the current satellite relevant to the current user. This allows
          // us to figure out if the user can see the satellite
          let tearr = sat.getTEARR(void 0, user);

          // Only draw the line between the user and the satellite if the
          // elevation angle is greater than the elevation mask. This simulates
          // the effects of hills, trees, and atmospheric ducting along the
          // horizon.
          //
          // NOTE: Maybe a 5 degree mask isn't needed
          if (tearr.elevation > 5) {
            // Draw a line from the user to the satellite
            debugDrawLine(
              'sat3',
              [sat.id, satSet.getIdFromSensorName(user.name)],
              [0, 1.0, 0.6, 1.0]
            );
          }
        }
      }
    }
};

// Milstar and AEHF
satLinkManager.AEHF = [
    22988,
    23712,
    26715,
    27168,
    27711,
    36868,
    38254,
    39256,
    43651,
    44481,
];
satLinkManager.DSCS = [23628, 25019, 26052, 27691, 27875, 22915];
satLinkManager.WGS = [
    32258,
    34713,
    36108,
    38070,
    39168,
    39222,
    40746,
    41879,
    42075,
    44071,
];
satLinkManager.Iridium = [
    24841,
    24870,
    41917,
    41918,
    41919,
    41920,
    41921,
    41922,
    41923,
    41924,
    41925,
    41926,
    42803,
    42804,
    42805,
    42806,
    42807,
    42808,
    42809,
    42810,
    42811,
    42812,
    43569,
    43570,
    43571,
    43572,
    43573,
    43754,
    43575,
    43576,
    24903,
    24907,
    24944,
    24948,
    25105,
    25527,
    24946,
    24967,
    25042,
    25043,
    24796,
    25077,
    25078,
    25104,
    24795,
    25262,
    25273,
    25286,
    25319,
    24793,
    25320,
    25344,
    25467,
    24836,
    24842,
    24871,
    24873,
    // 27376, Decayed
];
satLinkManager.Galileo = [
  37846,
  37847,
  38857,
  38858,
  40128,
  40129,
  40544,
  40545,
  40889,
  40890,
  41174,
  41175,
  41549,
  41550,
  41859,
  41860,
  41861,
  41862,
  43055,
  43056,
  43057,
  43058,
  43564,
  43565,
  43566,
  43567,
];
