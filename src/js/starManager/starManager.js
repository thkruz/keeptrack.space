/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2020, Theodore Kruczek
http://keeptrack.space

All code is Copyright © 2016-2020 by Theodore Kruczek. All rights reserved.
No part of this web site may be reproduced, published, distributed, displayed,
performed, copied or stored for public or private use, without written
permission of the author.

No part of this code may be modified or changed or exploited in any way used
for derivative works, or offered for sale, or used to construct any kind of database
or mirrored at any other location without the express written permission of the author.

///////////////////////////////////////////////////////////////////////////// */

import { constellations } from './constellations.js';
import { keepTrackApi } from '@app/js/api/externalApi.ts';
import { stars } from './stars.js';

var starManager = {};
starManager.stars = stars;

let lineManager, getIdFromStarName;
starManager.init = () => {
  lineManager = keepTrackApi.programs.lineManager;
  getIdFromStarName = keepTrackApi.programs.satSet.getIdFromStarName;

  // Requires starManager Module
  try {
    starManager.isConstellationVisible = false;
    starManager.isAllConstellationVisible = false;
    starManager.findStarsConstellation = function (starName) {
      for (var i = 0; i < starManager.constellations.length; i++) {
        for (var s = 0; s < starManager.constellations[i].stars.length; s++) {
          if (starManager.constellations[i].stars[s][0] === starName) {
            return starManager.constellations[i].name;
          }
          if (starManager.constellations[i].stars[s][1] === starName) {
            return starManager.constellations[i].name;
          }
        }
      }
      return null;
    };
    starManager.drawAllConstellations = function () {
      for (var i = 0; i < starManager.constellations.length; i++) {
        for (var s = 0; s < starManager.constellations[i].stars.length; s++) {
          // Verify Stars Exist
          var star1, star2;
          try {
            star1 = getIdFromStarName(starManager.constellations[i].stars[s][0]);
            star2 = getIdFromStarName(starManager.constellations[i].stars[s][1]);
            if (star1 == null || star2 == null) {
              continue;
            }
          } catch (e) {
            console.warn(`Constellation/Star error - i: ${i} - s: ${s}`);
            continue;
          }
          lineManager.create('sat5', [star1, star2], 'w');
          starManager.isConstellationVisible = true;
          starManager.isAllConstellationVisible = true;
        }
      }
    };
    starManager.drawConstellations = function (C) {
      for (var i = 0; i < starManager.constellations.length; i++) {
        if (starManager.constellations[i].name === C) {
          for (var s = 0; s < starManager.constellations[i].stars.length; s++) {
            // Verify Stars Exist
            var star1, star2;
            star1 = getIdFromStarName(starManager.constellations[i].stars[s][0]);
            star2 = getIdFromStarName(starManager.constellations[i].stars[s][1]);
            if (typeof star1 == 'undefined' || star1 == null || typeof star2 == 'undefined' || star2 == null) {
              continue;
            }
            lineManager.create('sat5', [star1, star2], 'p');
            starManager.isConstellationVisible = true;
          }
        }
      }
    };
    starManager.clearConstellations = function () {
      starManager.isConstellationVisible = false;
      var isFoundStar = true;
      var attempts = 0;
      // No idea why this took 3 tries -- maybe unnecessary now?
      while (isFoundStar && attempts < 30) {
        isFoundStar = lineManager.removeStars();
        attempts++;
      }
    };

    starManager.constellations = constellations;
  } catch (e) {
    console.log('starManager.constellations Plugin failed to load!');
  }
};

export { starManager };
