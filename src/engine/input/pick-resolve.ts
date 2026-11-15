/** A catalog id seen in the pick box and the squared pixel distance of its closest pixel to the cursor. */
export interface PickCandidate {
  id: number;
  /** Squared distance (buffer px) from the cursor to the nearest pixel of this id inside the box. */
  pixelDistance2: number;
}

/** Dot centre in the same drawing-buffer pixel space as the cursor. */
export interface PickCentre {
  x: number;
  y: number;
}

/**
 * Chooses the object a click means. Pick squares are far larger than the visible dot, so the id
 * under the cursor pixel is just whichever overlapping square won the depth test. When more than
 * one id is in the box and centres are known, the dot whose centre is nearest the cursor wins;
 * ties (and ids with no known centre) fall back to the nearest pixel.
 *
 * @param candidates Distinct ids found in the pick box.
 * @param cursor Cursor in drawing-buffer pixels.
 * @param getCentre Returns an id's dot centre, or null when unknown.
 */
export const resolvePickCandidate = (candidates: PickCandidate[], cursor: PickCentre, getCentre: (id: number) => PickCentre | null): number => {
  if (candidates.length === 0) {
    return -1;
  }

  let best = candidates[0];
  let bestCentre = Number.POSITIVE_INFINITY;

  if (candidates.length > 1) {
    for (const cand of candidates) {
      const centre = getCentre(cand.id);
      const d2 = centre ? (centre.x - cursor.x) ** 2 + (centre.y - cursor.y) ** 2 : Number.POSITIVE_INFINITY;

      if (d2 < bestCentre || (d2 === bestCentre && cand.pixelDistance2 < best.pixelDistance2)) {
        best = cand;
        bestCentre = d2;
      }
    }
  }

  return best.id;
};
