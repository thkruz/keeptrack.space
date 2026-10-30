import { cappedScreeningCovarianceFromTle, StateCovariance } from '@ootk/src/main';
import { vi } from 'vitest';

/** Recomputes the TLE checksum digit (column 69) after editing a line. */
const withChecksum = (line: string): string => {
  const body = line.slice(0, 68);
  let sum = 0;

  for (const ch of body) {
    if (ch >= '0' && ch <= '9') {
      sum += parseInt(ch, 10);
    } else if (ch === '-') {
      sum += 1;
    }
  }

  return `${body}${sum % 10}`;
};

const L8_TLE1 = '1 39084U 13008A   22221.78099992  .00000176  00000-0  49109-4 0  9999';
const L8_TLE2 = '2 39084  98.2198 291.4222 0001287  95.0667 265.0678 14.57105218504766';
// An analyst clone fitted at a burn 4 h later with BSTAR 0.
const CLONE_TLE1 = withChecksum('1 90000U 13008A   22222.16666667  .00000000  00000-0  00000-0 0  9999');
const CLONE_TLE2 = withChecksum(L8_TLE2.replace('2 39084', '2 90000'));

const elementsOf = (cov: StateCovariance): number[] => cov.matrix.elements.flat();

const loadWorker = () => import('@app/webworker/debrisScreeningWorker');

describe('debrisScreeningWorker screeningCovarianceOf', () => {
  beforeEach(() => {
    globalThis.postMessage = vi.fn() as unknown as typeof globalThis.postMessage;
  });

  it('uses the covariance TLE an analyst clone sends (its parent TLE)', async () => {
    const { screeningCovarianceOf } = await loadWorker();
    const cov = screeningCovarianceOf({ tle1: CLONE_TLE1, tle2: CLONE_TLE2, name: '90000', radius: 0.01, covarianceTle1: L8_TLE1, covarianceTle2: L8_TLE2 }, 1);

    expect(elementsOf(cov)).toEqual(elementsOf(cappedScreeningCovarianceFromTle(L8_TLE1, L8_TLE2, 1)));
    expect(elementsOf(cov)).not.toEqual(elementsOf(cappedScreeningCovarianceFromTle(CLONE_TLE1, CLONE_TLE2, 1)));
  });

  it('falls back to the object TLE without one', async () => {
    const { screeningCovarianceOf } = await loadWorker();
    const cov = screeningCovarianceOf({ tle1: CLONE_TLE1, tle2: CLONE_TLE2, name: '90000', radius: 0.01 }, 1);

    expect(elementsOf(cov)).toEqual(elementsOf(cappedScreeningCovarianceFromTle(CLONE_TLE1, CLONE_TLE2, 1)));
  });
});
