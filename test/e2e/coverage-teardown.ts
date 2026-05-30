import { CoverageReport } from 'monocart-coverage-reports';
import { coverageOptions } from './coverage-options';

/**
 * Playwright globalTeardown. Generates the merged E2E coverage report from every per-test
 * V8 sample added during the run. No-op unless E2E_COVERAGE=1.
 */
export default async function globalTeardown(): Promise<void> {
  if (process.env.E2E_COVERAGE !== '1') {
    return;
  }
  const results = await new CoverageReport(coverageOptions).generate();
  const summary = (results as { summary?: Record<string, { pct?: number }> })?.summary;

  if (summary) {
    // eslint-disable-next-line no-console
    console.log(
      `\nE2E coverage — lines ${summary.lines?.pct ?? '?'}%, ` +
      `statements ${summary.statements?.pct ?? '?'}%, ` +
      `functions ${summary.functions?.pct ?? '?'}%, ` +
      `branches ${summary.branches?.pct ?? '?'}%`,
    );
  }
}
