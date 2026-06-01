import { CoverageReport } from 'monocart-coverage-reports';
import { coverageOptions } from './coverage-options';

/**
 * Playwright globalSetup. Clears the coverage cache before a coverage run so stale data
 * from a previous run is not merged in. No-op unless E2E_COVERAGE=1.
 */
export default async function globalSetup(): Promise<void> {
  if (process.env.E2E_COVERAGE !== '1') {
    return;
  }
  await new CoverageReport(coverageOptions).cleanCache();
}
