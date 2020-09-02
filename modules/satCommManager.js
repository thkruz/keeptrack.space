/* jshint esversion: 8 */

var satCommManager = {}
satCommManager.AEHFUsers = []
satCommManager.WGSUsers = []
satCommManager.IridiumUsers = []
satCommManager.init = (function () {
  try {
    for (let controlSite in controlSiteManager.controlSiteList) {
      if (controlSiteManager.controlSiteList[controlSite].linkAEHF) {
        satCommManager.AEHFUsers.push(
          controlSiteManager.controlSiteList[controlSite].name,
        )
      }
      if (controlSiteManager.controlSiteList[controlSite].linkWGS) {
        satCommManager.WGSUsers.push(
          controlSiteManager.controlSiteList[controlSite].name,
        )
      }
      if (controlSiteManager.controlSiteList[controlSite].linkIridium) {
        satCommManager.WGSUsers.push(
          controlSiteManager.controlSiteList[controlSite].name,
        )
      }
    }
  } catch {
    console.log('ControlSiteMananger unable to load!')
  }

  for (let sensor in sensorManager.sensorList) {
    if (sensorManager.sensorList[sensor].linkAEHF) {
      satCommManager.AEHFUsers.push(sensorManager.sensorList[sensor].name)
    }
    if (sensorManager.sensorList[sensor].linkWGS) {
      satCommManager.WGSUsers.push(sensorManager.sensorList[sensor].name)
    }
    if (sensorManager.sensorList[sensor].linkIridium) {
      satCommManager.WGSUsers.push(sensorManager.sensorList[sensor].name)
    }
  }
})()

satCommManager.showLinks = async function (group) {
  var satlist
  var userlist
  var minTheta
  switch (group) {
    case 'aehf':
      satlist = satCommManager.AEHF
      userlist = satCommManager.AEHFUsers
      minTheta = 10
      break
    case 'dscs':
      satlist = satCommManager.DSCS
      satlist = satlist.concat(satCommManager.WGS)
      minTheta = 10
      break
    case 'wgs':
      satlist = satCommManager.WGS
      satlist = satlist.concat(satCommManager.DSCS)
      userlist = satCommManager.WGSUsers
      minTheta = 10
      break
    case 'iridium':
      satlist = satCommManager.Iridium
      userlist = satCommManager.IridiumUsers
      minTheta = 66
      break
  }

  for (let i = 0; i < satlist.length; i++) {
    for (let j = 0; j < satlist.length; j++) {
      if (i !== j) {
        var sat1 = satSet.getSatFromObjNum(satlist[i])
        var sat2 = satSet.getSatFromObjNum(satlist[j])
        //
        // Debug for finding decayed satellites
        //
        // if (sat1.position.x === 0) console.log(sat1.SCC_NUM);
        // if (sat1.position.y === 0) console.log(sat1.SCC_NUM);
        // if (sat1.position.z === 0) console.log(sat1.SCC_NUM);
        // if (sat2.position.x === 0) console.log(sat2.SCC_NUM);
        // if (sat2.position.y === 0) console.log(sat2.SCC_NUM);
        // if (sat2.position.z === 0) console.log(sat2.SCC_NUM);
        //
        // var semiDiamEarth = Math.asin(RADIUS_OF_EARTH/Math.sqrt(Math.pow(-sat1.position.x, 2) + Math.pow(-sat1.position.y, 2) + Math.pow(-sat1.position.z, 2))) * RAD2DEG;
        // var semiDiamSat2 = Math.asin(0.1/Math.sqrt(Math.pow(-sat1.position.x + sat2.position.x, 2) + Math.pow(-sat1.position.y + sat2.position.y, 2) + Math.pow(-sat1.position.z + sat2.position.z, 2))) * RAD2DEG;
        var theta =
          Math.acos(
            numeric.dot(
              [-sat1.position.x, -sat1.position.y, -sat1.position.z],
              [
                -sat1.position.x + sat2.position.x,
                -sat1.position.y + sat2.position.y,
                -sat1.position.z + sat2.position.z,
              ],
            ) /
              (Math.sqrt(
                Math.pow(-sat1.position.x, 2) +
                  Math.pow(-sat1.position.y, 2) +
                  Math.pow(-sat1.position.z, 2),
              ) *
                Math.sqrt(
                  Math.pow(-sat1.position.x + sat2.position.x, 2) +
                    Math.pow(-sat1.position.y + sat2.position.y, 2) +
                    Math.pow(-sat1.position.z + sat2.position.z, 2),
                )),
          ) * RAD2DEG
        if (theta < minTheta) {
        } else {
          debugDrawLine('sat3', [sat1.id, sat2.id], [0, 0.6, 1, 1])
        }
      }
    }
  }

  for (let i = 0; i < userlist.length; i++) {
    let user = satSet.getSat(satSet.getIdFromSensorName(userlist[i]))
    var bestSat
    var bestRange = 1000000
    for (let j = 0; j < satlist.length; j++) {
      var sat = satSet.getSatFromObjNum(satlist[j])
      var tearr = sat.getTEARR(void 0, user)
      if (tearr.elevation > 10) {
        if (tearr.range < bestRange) bestSat = sat
      }
    }
    if (typeof bestSat.id !== 'undefined') {
      debugDrawLine(
        'sat3',
        [bestSat.id, satSet.getIdFromSensorName(user.name)],
        [0, 1, 0.6, 1],
      )
    }
  }
}

// Milstar and AEHF
satCommManager.AEHF = [
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
]
satCommManager.DSCS = [23628, 25019, 26052, 27691, 27875, 22915]
satCommManager.WGS = [
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
]
satCommManager.Iridium = [
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
  27376,
]
