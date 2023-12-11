/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2023, Theodore Kruczek
http://keeptrack.space

All code is Copyright © 2016-2023 by Theodore Kruczek. All rights reserved.
No part of this web site may be reproduced, published, distributed, displayed,
performed, copied or stored for or private use, without written
permission of the author.

No part of this code may be modified or changed or exploited in any way used
for derivative works, or offered for sale, or used to construct any kind of database
or mirrored at any other location without the express written permission of the author.

///////////////////////////////////////////////////////////////////////////// */

import { keepTrackApi } from '@app/js/keepTrackApi';
import { constellations } from '../catalogs/constellations';
import { isThisNode } from '../static/isThisNode';
import { LineTypes, lineManagerInstance } from './draw-manager/line-manager';

export class StarManager {
  isConstellationVisible = false;
  isAllConstellationVisible = false;
  constellations = constellations;
  private currentConstellationName_ = null;

  findStarsConstellation(starName: string) {
    for (const constellation of this.constellations) {
      for (const starPair of constellation.stars) {
        if (starPair[0] === starName) {
          return constellation.name;
        }
        if (starPair[1] === starName) {
          return constellation.name;
        }
      }
    }
    return null;
  }

  drawAllConstellations() {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    for (let i = 0; i < this.constellations.length; i++) {
      for (let s = 0; s < this.constellations[i].stars.length; s++) {
        // Verify Stars Exist
        let star1, star2;
        try {
          const dotsManagerInstance = keepTrackApi.getDotsManager();
          const starIdx1 = dotsManagerInstance.starIndex1;
          const starIdx2 = dotsManagerInstance.starIndex2;
          star1 = catalogManagerInstance.getIdFromStarName(this.constellations[i].stars[s][0], starIdx1, starIdx2);
          star2 = catalogManagerInstance.getIdFromStarName(this.constellations[i].stars[s][1], starIdx1, starIdx2);
          if (star1 == null || star2 == null) continue;
        } catch (e) {
          // IF this isn't Jest testing, then throw a warning
          /* istanbul ignore next */
          if (isThisNode()) {
            console.warn(`Constellation/Star error - i: ${i} - s: ${s}`);
          }
          continue;
        }
        lineManagerInstance.create(LineTypes.SENSOR_TO_SAT, [star1, star2], 'p');
        this.isConstellationVisible = true;
        this.isAllConstellationVisible = true;
      }
    }
  }

  drawConstellations(C: string) {
    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    if (typeof C === 'undefined') return;
    if (this.currentConstellationName_ === C) return;
    for (const constellation of this.constellations) {
      if (constellation.name === C) {
        for (const starPair of constellation.stars) {
          // Verify Stars Exist
          const dotsManagerInstance = keepTrackApi.getDotsManager();
          const starIdx1 = dotsManagerInstance.starIndex1;
          const starIdx2 = dotsManagerInstance.starIndex2;
          const star1 = catalogManagerInstance.getIdFromStarName(starPair[0], starIdx1, starIdx2);
          const star2 = catalogManagerInstance.getIdFromStarName(starPair[1], starIdx1, starIdx2);
          if (star1 == null && star2 == null) return; // TODO: Not all constellations are ready yet
          /* istanbul ignore next */
          if (typeof star1 == 'undefined' || star1 == null || typeof star2 == 'undefined' || star2 == null) {
            continue;
          }
          lineManagerInstance.create(LineTypes.SENSOR_TO_SAT, [star1, star2], 'p');
          this.isConstellationVisible = true;
        }
        return;
      }
    }
  }

  clearConstellations() {
    this.isConstellationVisible = false;
    this.currentConstellationName_ = null;
    let isFoundStar = true;
    let attempts = 0;
    // No idea why this took 3 tries -- maybe unnecessary now?
    while (isFoundStar && attempts < 30) {
      isFoundStar = lineManagerInstance.removeStars();
      attempts++;
    }
  }
}

export const starManager = new StarManager();
