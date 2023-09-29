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

import { CatalogManager, Singletons } from '@app/js/interfaces';
import { isThisNode } from '@app/js/keepTrackApi';
import { constellations } from '../catalogs/constellations';
import { keepTrackContainer } from '../container';
import { DotsManager } from './dots-manager';
import { lineManagerInstance } from './draw-manager/line-manager';

export class StarManager {
  public isConstellationVisible = false;
  public isAllConstellationVisible = false;
  private currentConstellationName_ = null;
  constellations = constellations;

  public findStarsConstellation(starName: string) {
    for (let i = 0; i < this.constellations.length; i++) {
      for (let s = 0; s < this.constellations[i].stars.length; s++) {
        if (this.constellations[i].stars[s][0] === starName) {
          return this.constellations[i].name;
        }
        if (this.constellations[i].stars[s][1] === starName) {
          return this.constellations[i].name;
        }
      }
    }
    return null;
  }

  public drawAllConstellations() {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

    for (let i = 0; i < this.constellations.length; i++) {
      for (let s = 0; s < this.constellations[i].stars.length; s++) {
        // Verify Stars Exist
        let star1, star2;
        try {
          const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);
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
        lineManagerInstance.create('sat5', [star1, star2], 'p');
        this.isConstellationVisible = true;
        this.isAllConstellationVisible = true;
      }
    }
  }

  public drawConstellations(C: string) {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

    if (typeof C === 'undefined') return;
    if (this.currentConstellationName_ === C) return;
    for (let i = 0; i < this.constellations.length; i++) {
      if (this.constellations[i].name === C) {
        for (let s = 0; s < this.constellations[i].stars.length; s++) {
          // Verify Stars Exist
          const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);
          const starIdx1 = dotsManagerInstance.starIndex1;
          const starIdx2 = dotsManagerInstance.starIndex2;
          const star1 = catalogManagerInstance.getIdFromStarName(this.constellations[i].stars[s][0], starIdx1, starIdx2);
          const star2 = catalogManagerInstance.getIdFromStarName(this.constellations[i].stars[s][1], starIdx1, starIdx2);
          if (star1 == null && star2 == null) return; // TODO: Not all constellations are ready yet
          /* istanbul ignore next */
          if (typeof star1 == 'undefined' || star1 == null || typeof star2 == 'undefined' || star2 == null) {
            continue;
          }
          lineManagerInstance.create('sat5', [star1, star2], 'p');
          this.isConstellationVisible = true;
        }
        return;
      }
    }
  }

  public clearConstellations() {
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
