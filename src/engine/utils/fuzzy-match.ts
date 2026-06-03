/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

/**
 * Returns a 0-60 score for how well `query` matches as a character subsequence
 * of `label`. Rewards consecutive matches and word-boundary matches.
 * 0 means no match.
 */
export const fuzzySubsequenceScore = (label: string, query: string): number => {
  let queryIdx = 0;
  let score = 0;
  let consecutiveBonus = 0;

  for (let i = 0; i < label.length && queryIdx < query.length; i++) {
    if (label[i] === query[queryIdx]) {
      queryIdx++;
      score += 1 + consecutiveBonus;
      consecutiveBonus += 1;

      if (i === 0 || label[i - 1] === ' ' || label[i - 1] === '-' || label[i - 1] === '_') {
        score += 3;
      }
    } else {
      consecutiveBonus = 0;
    }
  }

  if (queryIdx < query.length) {
    return 0;
  }

  const maxPossible = query.length * 5;

  return Math.min(60, Math.round((score / maxPossible) * 60));
};

/**
 * Multi-tier fuzzy score for ranking labels against a user query.
 *  1. Exact prefix match (150)
 *  2. Substring match (100)
 *  3. First-letter acronym match (80-100) — e.g. "tmaj" -> "Tell Me A Joke"
 *  4. Fuzzy subsequence match (0-60)
 *
 * Returns 0 when no match.
 */
export const fuzzyScore = (label: string, query: string): number => {
  if (query === '') {
    return 0;
  }
  const lowerQuery = query.toLowerCase();
  const lowerLabel = label.toLowerCase();

  if (lowerLabel.startsWith(lowerQuery)) {
    return 150;
  }
  if (lowerLabel.includes(lowerQuery)) {
    return 100;
  }

  const words = label.split(/\s+/u);
  const firstLetters = words.map((w) => w[0]?.toLowerCase() ?? '').join('');

  if (firstLetters.startsWith(lowerQuery)) {
    return 100;
  }
  if (firstLetters.includes(lowerQuery)) {
    return 80;
  }

  return fuzzySubsequenceScore(lowerLabel, lowerQuery);
};
