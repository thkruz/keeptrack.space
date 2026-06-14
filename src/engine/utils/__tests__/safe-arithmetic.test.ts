import { evalArithmetic } from '@app/engine/utils/safe-arithmetic';

describe('evalArithmetic', () => {
  it('evaluates basic operators', () => {
    expect(evalArithmetic('2+2')).toBe(4);
    expect(evalArithmetic('10-3')).toBe(7);
    expect(evalArithmetic('6*7')).toBe(42);
    expect(evalArithmetic('20/4')).toBe(5);
    expect(evalArithmetic('10%3')).toBe(1);
  });

  it('respects operator precedence', () => {
    expect(evalArithmetic('2+3*4')).toBe(14);
    expect(evalArithmetic('2*3+4')).toBe(10);
    expect(evalArithmetic('2+10/5')).toBe(4);
  });

  it('handles parentheses', () => {
    expect(evalArithmetic('(2+3)*4')).toBe(20);
    expect(evalArithmetic('2*(3+(4-1))')).toBe(12);
  });

  it('handles unary minus and plus', () => {
    expect(evalArithmetic('-5+3')).toBe(-2);
    expect(evalArithmetic('3*-2')).toBe(-6);
    expect(evalArithmetic('-(4+1)')).toBe(-5);
    expect(evalArithmetic('+7')).toBe(7);
  });

  it('handles the right-associative power operator', () => {
    expect(evalArithmetic('2^3')).toBe(8);
    expect(evalArithmetic('2^3^2')).toBe(512); // 2^(3^2), not (2^3)^2 = 64
  });

  it('handles decimals and scientific notation', () => {
    expect(evalArithmetic('1.5+2.5')).toBe(4);
    expect(evalArithmetic('1e3*2')).toBe(2000);
    expect(evalArithmetic('1.5e-2')).toBe(0.015);
  });

  it('ignores whitespace', () => {
    expect(evalArithmetic('  2  +   3 * 4 ')).toBe(14);
  });

  it('returns null for empty or whitespace-only input', () => {
    expect(evalArithmetic('')).toBeNull();
    expect(evalArithmetic('   ')).toBeNull();
  });

  it('returns null for malformed expressions', () => {
    expect(evalArithmetic('2+')).toBeNull();
    expect(evalArithmetic('(2+3')).toBeNull();
    expect(evalArithmetic('2 3')).toBeNull();
    expect(evalArithmetic('*2')).toBeNull();
  });

  it('treats a doubled sign as a unary operator (2++2 = 4)', () => {
    expect(evalArithmetic('2++2')).toBe(4);
    expect(evalArithmetic('2--2')).toBe(4);
  });

  it('returns null for unsupported characters (no code execution)', () => {
    expect(evalArithmetic('alert(1)')).toBeNull();
    expect(evalArithmetic('2+a')).toBeNull();
    expect(evalArithmetic('Math.PI')).toBeNull();
  });

  it('returns Infinity for division by zero (caller decides how to handle)', () => {
    expect(evalArithmetic('1/0')).toBe(Infinity);
  });
});
