/* jshint esversion: 8 */

var satLinkManager = {};
satLinkManager.aehfUsers = [];
satLinkManager.wgsUsers = [];
satLinkManager.iridiumUsers = [];
satLinkManager.starlinkUsers = [];
satLinkManager.galileoUsers = [];
satLinkManager.init = (function () {
    try {
        for (let controlSite in controlSiteManager.controlSiteList) {
            if (controlSiteManager.controlSiteList[controlSite].linkAehf) {
                satLinkManager.aehfUsers.push(
                    controlSiteManager.controlSiteList[controlSite].name
                );
            }
            if (controlSiteManager.controlSiteList[controlSite].linkWgs) {
                satLinkManager.wgsUsers.push(
                    controlSiteManager.controlSiteList[controlSite].name
                );
            }
            if (controlSiteManager.controlSiteList[controlSite].linkIridium) {
                satLinkManager.wgsUsers.push(
                    controlSiteManager.controlSiteList[controlSite].name
                );
            }
            if (controlSiteManager.controlSiteList[controlSite].linkGalileo) {
                satLinkManager.galileoUsers.push(
                    controlSiteManager.controlSiteList[controlSite].name
                );
            }
            if (controlSiteManager.controlSiteList[controlSite].linkStarlink) {
                satLinkManager.starlinkUsers.push(
                    controlSiteManager.controlSiteList[controlSite].name
                );
            }
        }
    } catch (e) {
        console.log('ControlSiteMananger unable to load!');
    }

    for (let sensor in sensorManager.sensorList) {
        if (sensorManager.sensorList[sensor].linkAehf) {
            satLinkManager.aehfUsers.push(
                sensorManager.sensorList[sensor].name
            );
        }
        if (sensorManager.sensorList[sensor].linkWgs) {
            satLinkManager.wgsUsers.push(sensorManager.sensorList[sensor].name);
        }
        if (sensorManager.sensorList[sensor].linkIridium) {
            satLinkManager.wgsUsers.push(sensorManager.sensorList[sensor].name);
        }
        if (sensorManager.sensorList[sensor].linkGalileo) {
            satLinkManager.galileoUsers.push(
                sensorManager.sensorList[sensor].name
            );
        }
        if (sensorManager.sensorList[sensor].linkStarlink) {
            satLinkManager.starlinkUsers.push(
                sensorManager.sensorList[sensor].name
            );
        }
    }
})();

satLinkManager.showLinks = async function (group) {
    let satlist;
    let userlist;
    let minTheta;
    let elevationMask;
    let linkType = 0;
    switch (group) {
        case 'aehf':
            satlist = satLinkManager.aehf;
            userlist = satLinkManager.aehfUsers;
            minTheta = 10;
            linkType = 1;
            elevationMask = 5;
            break;
        case 'dscs':
            satlist = satLinkManager.dscs;
            satlist = satlist.concat(satLinkManager.wgs);
            minTheta = 10;
            linkType = 1;
            elevationMask = 5;
            break;
        case 'wgs':
            satlist = satLinkManager.wgs;
            satlist = satlist.concat(satLinkManager.dscs);
            userlist = satLinkManager.wgsUsers;
            minTheta = 10;
            linkType = 1;
            elevationMask = 5;
            break;
        case 'iridium':
            satlist = satLinkManager.iridium;
            userlist = satLinkManager.iridiumUsers;
            minTheta = 66;
            linkType = 1;
            elevationMask = 5;
            break;
        case 'starlink':
            satlist = satLinkManager.starlink;
            userlist = satLinkManager.starlinkUsers;
            minTheta = 66;
            linkType = 2;
            elevationMask = 5;
            break;
        case 'galileo':
            satlist = satLinkManager.galileo;
            userlist = [];
            minTheta = 20; // Not Used
            linkType = 2;
            elevationMask = 5;
            break;
    }

    // Show the users connected to the satellites and the satellites connected
    // to each other
    if (linkType == 1) {
        for (let i = 0; i < satlist.length; i++) {
            for (let j = 0; j < satlist.length; j++) {
                if (i !== j) {
                    var sat1 = satSet.getSat(satlist[i]);
                    var sat2 = satSet.getSat(satlist[j]);
                    //
                    // Debug for finding decayed satellites
                    //
                    if (sat1.position.x === 0) continue;
                    if (sat1.position.y === 0) continue;
                    if (sat1.position.z === 0) continue;
                    if (sat2.position.x === 0) continue;
                    if (sat2.position.y === 0) continue;
                    if (sat2.position.z === 0) continue;
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
                                                -sat1.position.y +
                                                    sat2.position.y,
                                                2
                                            ) +
                                            Math.pow(
                                                -sat1.position.z +
                                                    sat2.position.z,
                                                2
                                            )
                                    ))
                        ) * RAD2DEG;
                    if (theta < minTheta) {
                    } else {
                        debugDrawLine(
                            'sat3',
                            [sat1.id, sat2.id],
                            [0, 0.6, 1, 1]
                        );
                    }
                }
            }
        }
        for (let i = 0; i < userlist.length; i++) {
            let user = satSet.getSat(satSet.getIdFromSensorName(userlist[i]));
            var bestSat;
            var bestRange = 1000000;
            for (let j = 0; j < satlist.length; j++) {
                var sat = satSet.getSat(satlist[j]);
                var tearr = sat.getTEARR(void 0, user);
                if (tearr.elevation > elevationMask) {
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
                let sat = satSet.getSat(satlist[j]);
                // Calculate Time, Elevation, Azimuth, Range, and Range Rate data
                // of the current satellite relevant to the current user. This allows
                // us to figure out if the user can see the satellite
                let tearr = sat.getTEARR(void 0, user);

                // Only draw the line between the user and the satellite if the
                // elevation angle is greater than the elevation mask. This simulates
                // the effects of hills, trees, and atmospheric ducting along the
                // horizon.
                //
                if (tearr.elevation > elevationMask) {
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
satLinkManager.aehf = [17862,17868,17881,17882,17884,17893,17900,17906,17917,18712];

satLinkManager.dscs = [17866,17871,17876,17883,17885,18668];

satLinkManager.wgs = [17889,17890,17891,17896,17901,17905,17908,17913,17914,18276];

satLinkManager.iridium = [6207,6212,15434,15435,15436,15437,15438,15439,15440,15441,15442,15443,16341,16342,16343,16344,16345,16346,16347,16348,16349,16350,17106,17107,17108,17109,17110,17840,17112,17113,6224,6225,6237,6239,6287,6434,6238,6246,6267,6268,6188,6280,6281,6286,6187,6332,6334,6340,6349,6186,6350,6357,6406,6206,6208,6213,6214];

satLinkManager.starlink = [18418,18419,18420,18421,18422,18423,18424,18425,18426,18427,18428,18429,18430,18431,18432,18433,18434,18435,18436,18437,18438,18439,18440,18441,18442,18443,18444,18445,18446,18447,18448,18449,18450,18451,18452,18453,18454,18455,18456,18457,18458,18459,18460,18461,18462,18463,18464,18465,18466,18467,18468,18469,18470,18471,18472,18473,18474,18475,18476,18971,18972,18973,18974,18975,18976,18977,18978,18979,18980,18981,18982,18983,18984,18985,18986,18987,18988,18989,18990,18991,18992,18993,18994,18995,18996,18997,18998,18999,19000,19001,19002,19003,19004,19005,19006,19007,19008,19009,19010,19011,19012,19013,19014,19015,19016,19017,19018,19019,19020,19021,19022,19023,19024,19025,19026,19027,19028,19029,19030,19168,19169,19170,19171,19172,19173,19174,19175,19176,19177,19178,19179,19180,19181,19182,19183,19184,19185,19186,19187,19188,19189,19190,19191,19192,19193,19194,19195,19196,19197,19198,19199,19200,19201,19202,19203,19204,19205,19206,19207,19208,19209,19210,19211,19212,19213,19214,19215,19216,19217,19218,19219,19220,19221,19222,19223,19224,19225,19226,19276,19277,19278,19279,19280,19281,19282,19283,19284,19285,19286,19287,19288,19289,19290,19291,19292,19293,19294,19295,19296,19297,19298,19299,19300,19301,19302,19303,19304,19305,19306,19307,19308,19309,19310,19311,19312,19313,19314,19315,19316,19317,19318,19319,19320,19321,19322,19323,19324,19325,19326,19327,19328,19329,19330,19331,19332,19333,19334,19335,19394,19395,19396,19397,19398,19399,19400,19401,19402,19403,19404,19405,19406,19407,19408,19409,19410,19411,19412,19413,19414,19415,19416,19417,19418,19419,19420,19421,19422,19423,19424,19425,19426,19427,19428,19429,19430,19431,19432,19433,19434,19435,19436,19437,19438,19439,19440,19441,19442,19443,19444,19445,19446,19447,19448,19449,19450,19451,19452,19600,19601,19602,19603,19604,19605,19606,19607,19608,19609,19610,19611,19612,19613,19614,19615,19616,19617,19618,19619,19620,19621,19622,19623,19624,19625,19626,19627,19628,19629,19630,19631,19632,19633,19634,19635,19636,19637,19638,19639,19640,19641,19642,19643,19644,19645,19646,19647,19648,19649,19650,19651,19652,19653,19654,19655,19656,19657,19658,19659,19735,19736,19737,19738,19739,19740,19741,19742,19743,19744,19745,19746,19747,19748,19749,19750,19752,19753,19754,19755,19757,19758,19759,19760,19761,19762,19763,19765,19766,19767,19768,19769,19770,19771,19773,19774,19775,19776,19777,19778,19779,19781,19782];

satLinkManager.galileo = [12703,12704,13375,13376,14134,14135,14429,14430,14647,14648,14867,14868,15187,15188,15390,15391,15392,15393,16635,16636,16637,16638,17101,17102,17103,17104];
