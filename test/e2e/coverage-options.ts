/**
 * Shared monocart-coverage-reports options for the E2E (Playwright V8) coverage run.
 * Imported by the coverage fixture (add), global setup (cleanCache) and teardown (generate)
 * so every stage uses the same cache dir and filters.
 */
export const coverageOptions = {
  name: 'KeepTrack E2E Coverage',
  // Sibling of coverage/ (NOT under it) so a vitest unit run, which wipes its own
  // reportsDirectory (coverage/), can never clobber the E2E report or its V8 cache.
  outputDir: './coverage-e2e',
  // v8 = interactive HTML report; lcovonly = for merging with the vitest unit lcov;
  // console-details = per-file summary printed at the end of the run.
  reports: ['v8', 'lcovonly', 'console-details'] as string[],

  // Entries are the served bundles; ignore anything outside our dist JS.
  entryFilter: (entry: { url: string }): boolean =>
    entry.url.includes('localhost') && entry.url.endsWith('.js'),

  // After source-map remapping, keep only first-party TypeScript under src/, matching the
  // scope of the combined report (drops node_modules, generated locales, vendored ootk,
  // and the test harness itself).
  sourceFilter: (sourcePath: string): boolean =>
    /(?:^|\/)src\//u.test(sourcePath) &&
    /\.tsx?$/u.test(sourcePath) &&
    !sourcePath.includes('node_modules') &&
    !/\.(?:spec|test)\.tsx?$/u.test(sourcePath) &&
    !sourcePath.includes('/__tests__/') &&
    !/(?:^|\/)src\/engine\/ootk\//u.test(sourcePath) &&
    !/(?:^|\/)src\/locales\//u.test(sourcePath),

  // Normalize webpack:// source paths to repo-relative for clean lcov output.
  sourcePath: (filePath: string): string => filePath.replace(/^webpack:\/\/[^/]*\//u, ''),
};
