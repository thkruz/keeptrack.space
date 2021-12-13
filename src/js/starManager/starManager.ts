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

import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { constellations } from './constellations.js';
import { stars } from './stars.js';

export const findStarsConstellation = (starName: string) => {
  for (let i = 0; i < starManager.constellations.length; i++) {
    for (let s = 0; s < starManager.constellations[i].stars.length; s++) {
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
export const drawAllConstellations = () => {
  const getIdFromStarName = keepTrackApi.programs.satSet.getIdFromStarName;
  const { lineManager } = keepTrackApi.programs;
  for (let i = 0; i < starManager.constellations.length; i++) {
    for (let s = 0; s < starManager.constellations[i].stars.length; s++) {
      // Verify Stars Exist
      let star1, star2;
      try {
        star1 = getIdFromStarName(starManager.constellations[i].stars[s][0]);
        star2 = getIdFromStarName(starManager.constellations[i].stars[s][1]);
        if (star1 == null || star2 == null) continue;
      } catch (e) {
        // IF this isn't Jest testing, then throw a warning
        /* istanbul ignore next */
        if (typeof process === 'undefined') {
          console.warn(`Constellation/Star error - i: ${i} - s: ${s}`);
        }
        continue;
      }
      lineManager.create('sat5', [star1, star2], 'w');
      starManager.isConstellationVisible = true;
      starManager.isAllConstellationVisible = true;
    }
  }
};
export const drawConstellations = (C: string) => {
  if (typeof C === 'undefined') return;

  const getIdFromStarName = keepTrackApi.programs.satSet.getIdFromStarName;
  const { lineManager } = keepTrackApi.programs;
  if (starManager.currentConstellationName === C) return;
  for (let i = 0; i < starManager.constellations.length; i++) {
    if (starManager.constellations[i].name === C) {
      for (let s = 0; s < starManager.constellations[i].stars.length; s++) {
        // Verify Stars Exist
        const star1 = getIdFromStarName(starManager.constellations[i].stars[s][0]);
        const star2 = getIdFromStarName(starManager.constellations[i].stars[s][1]);
        if (star1 == null && star2 == null) return; // TODO: Not all constellations are ready yet
        /* istanbul ignore next */
        if (typeof star1 == 'undefined' || star1 == null || typeof star2 == 'undefined' || star2 == null) {
          continue;
        }
        lineManager.create('sat5', [star1, star2], 'p');
        starManager.isConstellationVisible = true;
      }
      return;
    }
  }
};
export const clearConstellations = () => {
  const { lineManager } = keepTrackApi.programs;
  starManager.isConstellationVisible = false;
  starManager.currentConstellationName = null;
  let isFoundStar = true;
  let attempts = 0;
  // No idea why this took 3 tries -- maybe unnecessary now?
  while (isFoundStar && attempts < 30) {
    isFoundStar = lineManager.removeStars();
    attempts++;
  }
};
export const init = () => {
  // Requires starManager Module
  try {
    starManager.isConstellationVisible = false;
    starManager.isAllConstellationVisible = false;
    starManager.currentConstellationName = null;
    starManager.findStarsConstellation = findStarsConstellation;
    starManager.drawAllConstellations = drawAllConstellations;
    starManager.drawConstellations = drawConstellations;
    starManager.clearConstellations = clearConstellations;

    starManager.constellations = constellations;
  } catch (e) {
    /* istanbul ignore next */
    console.log('starManager.constellations Plugin failed to load!');
  }
};

export const starManager: any = {
  stars: stars,
  init: init,
};
