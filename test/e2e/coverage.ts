/**
 * Playwright test object used by every spec. It re-exports `expect` unchanged and an
 * extended `test` whose `page` fixture collects Chromium V8 coverage when E2E_COVERAGE=1.
 *
 * Specs import { test, expect } from here instead of '@playwright/test' so coverage can be
 * gathered without per-spec changes. When E2E_COVERAGE is unset this is a transparent
 * pass-through with zero overhead, so normal runs are unaffected.
 */
import { test as base, expect } from '@playwright/test';
import { CoverageReport } from 'monocart-coverage-reports';
import { coverageOptions } from './coverage-options';

const isCoverageEnabled = process.env.E2E_COVERAGE === '1';

export const test = base.extend({
  page: async ({ page, browserName }, use) => {
    // V8 coverage is Chromium-only; skip silently elsewhere.
    const collect = isCoverageEnabled && browserName === 'chromium';

    if (collect) {
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
    }

    await use(page);

    if (collect) {
      const jsCoverage = await page.coverage.stopJSCoverage();
      // Each add() appends a uniquely-named entry to the shared cache dir, so parallel
      // workers are safe; the global teardown calls generate() once over the whole cache.
      await new CoverageReport(coverageOptions).add(jsCoverage);
    }
  },
});

export { expect };
