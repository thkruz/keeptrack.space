/**
 * CelesTrak answered 200 with a body that is not TLE text (it sometimes sends a one-line
 * plain-text notice instead of data). Upstream and transient, so it is not reported (#1447).
 */
export class CelesTrakNoDataError extends Error {
  constructor(body: string) {
    super(`CelesTrak returned no TLE data: ${body.trimStart().split('\n', 1)[0].slice(0, 120)}`);
    this.name = 'CelesTrakNoDataError';
  }
}
