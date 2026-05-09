import { KilometersPerSecond, TemeVec3 } from '@ootk/src/main';
import { errorManagerInstance } from './errorManager';

/**
 * Reasons issue #834 ("Cannot create property 'x' on number '0'") may still surface:
 *
 *  - An old cached/PWA bundle from before the unconditional reset in `DotsManager.updatePosVel`
 *  - A future code path that mutates `obj.velocity.x = …` without first guaranteeing the shape
 *  - A third-party plugin or `as unknown as` cast that bypasses TypeScript's `TemeVec3` typing
 *
 * The reset itself was always silent, which is why the bug has been impossible to localize for
 * 2.5+ years. The helpers here keep the reset but emit a one-shot per-(callsite, id) telemetry
 * warning when it actually fires on bad input — turning a silent recovery into actionable signal.
 */

const reportedKeys = new Set<string>();

export const freshZeroVec3 = (): TemeVec3<KilometersPerSecond> =>
  ({ x: 0, y: 0, z: 0 }) as TemeVec3<KilometersPerSecond>;

const isVec3Like = (value: unknown): value is { x: unknown; y: unknown; z: unknown } =>
  typeof value === 'object' && value !== null;

const summarize = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  try {
    const json = JSON.stringify(value);

    return json.length > 80 ? `${json.slice(0, 80)}…` : json;
  } catch {
    return String(value);
  }
};

/**
 * Guarantees `target.velocity` is a `{x, y, z}` object before any component is written to.
 *
 * If `target.velocity` was structurally invalid (anything other than a non-null object), it is
 * replaced with a fresh zero Vec3 and a single warning is reported per (callsite, id) — so
 * repeated calls on the same offending object don't spam telemetry.
 *
 * @returns the velocity Vec3, which is now guaranteed safe to mutate.
 */
export const ensureVelocityVec3 = (
  target: { id?: number | string; name?: string; type?: number; velocity: TemeVec3<KilometersPerSecond> },
  callsite: string,
): TemeVec3<KilometersPerSecond> => {
  const prior = target.velocity as unknown;

  if (!isVec3Like(prior)) {
    const id = target.id ?? 'unknown';
    const dedupKey = `${callsite}:${id}`;

    if (!reportedKeys.has(dedupKey)) {
      reportedKeys.add(dedupKey);
      errorManagerInstance.warn(
        `Non-object velocity detected (issue #834). callsite=${callsite} id=${id} name=${target.name ?? '?'} type=${target.type ?? '?'} priorType=${typeof prior} priorValue=${summarize(prior)} version=${__VERSION__} buildDate=${__VERSION_DATE__}`,
      );
    }

    target.velocity = freshZeroVec3();
  }

  return target.velocity;
};

/** Test-only: clears the per-session dedup so each test starts fresh. */
export const _resetVelocityInvariantReportingForTests = (): void => {
  reportedKeys.clear();
};
