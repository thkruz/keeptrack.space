import { describe, it } from 'vitest';

/**
 * True when running under a CI provider. GitHub Actions (and virtually every
 * other CI) sets `CI=true` in the environment; local developer runs do not.
 */
export const isCi = Boolean(process.env.CI);

/**
 * `it` that runs locally but is skipped on CI.
 *
 * Use for CPU-intensive regression tests (e.g. numerical solvers swept over many
 * parameter combinations) that are valuable as a pre-push local check but time
 * out on shared CI runners. They still run in the normal local `npm test`, so a
 * developer exercises them before pushing; the CI pipeline just doesn't re-run them.
 */
export const itLocalOnly = it.skipIf(isCi);

/** `describe` counterpart to {@link itLocalOnly}: runs locally, skipped on CI. */
export const describeLocalOnly = describe.skipIf(isCi);
