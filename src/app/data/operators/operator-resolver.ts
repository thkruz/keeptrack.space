import { OPERATOR_RULES, type OperatorRule } from './operator-rules';

/** Name fragments that mark debris, rocket bodies and unidentified objects (upper case). */
const NON_OPERATED_CONTAINS_ = ['DEBRIS', 'ROCKET BODY', ' DEB', 'R/B'] as const;

/**
 * Resolve the operator slug for a catalog object, or null when no rule applies.
 *
 * Order: a rule that pins `sccNum` wins outright; then debris, rocket bodies and
 * `OBJECT x` placeholders return null; then the first rule whose `prefix` or
 * `contains` matches the upper-cased name wins.
 *
 * Pure: no engine, DOM or catalog imports.
 */
export const operatorKey = (name: string, sccNum?: number, rules: readonly OperatorRule[] = OPERATOR_RULES): string | null => {
  if (typeof sccNum === 'number') {
    const pinned = rules.find((rule) => rule.sccNums?.includes(sccNum));

    if (pinned) {
      return pinned.slug;
    }
  }

  const upper = (name ?? '').trim().toUpperCase();

  if (upper === '' || upper.startsWith('OBJECT ') || NON_OPERATED_CONTAINS_.some((frag) => upper.includes(frag))) {
    return null;
  }

  for (const rule of rules) {
    if (rule.prefix?.some((p) => upper.startsWith(p)) || rule.contains?.some((c) => upper.includes(c))) {
      return rule.slug;
    }
  }

  return null;
};
