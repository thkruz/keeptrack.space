import { describe, expect, it } from 'vitest';
import { formatLocaleNumber } from '../format-locale-number';

describe('formatLocaleNumber', () => {
  it('rounds to the requested decimals', () => {
    expect(formatLocaleNumber(1.234, 1)).toMatch(/^1[.,]2$/u);
  });

  it('keeps trailing zeros', () => {
    expect(formatLocaleNumber(3, 1)).toMatch(/^3[.,]0$/u);
  });
});
