/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

/**
 * Evaluates a basic arithmetic expression without using `eval`/`Function`.
 *
 * Supports decimal numbers (including scientific notation like `1e3`), the
 * binary operators `+ - * / %`, the `^` power operator (right-associative),
 * unary minus/plus, and parentheses. Operator precedence is the usual
 * `^` > `* / %` > `+ -`.
 *
 * Returns the numeric result, or `null` when the expression is empty, malformed,
 * or contains characters outside the supported grammar. Division (or modulo) by
 * zero yields `Infinity`/`NaN` from JS rather than `null`; callers should reject
 * non-finite results if they care.
 */
export const evalArithmetic = (expression: string): number | null => {
  const tokens = tokenize_(expression);

  if (tokens === null || tokens.length === 0) {
    return null;
  }

  const parser = new Parser_(tokens);

  try {
    const value = parser.parseExpression(0);

    return parser.atEnd() ? value : null;
  } catch {
    return null;
  }
};

type Token = { type: 'num'; value: number } | { type: 'op'; value: string } | { type: 'paren'; value: '(' | ')' };

/** First character of a number (digit or decimal point). */
const NUMBER_START_PATTERN = /\d|\./u;
/** Any character that can appear inside a number literal, including exponents. */
const NUMBER_BODY_PATTERN = /[\d.eE+-]/u;

/** Splits `expression` into tokens, or returns null on any unsupported character. */
const tokenize_ = (expression: string): Token[] | null => {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expression.length) {
    const ch = expression[i];

    if (ch === ' ' || ch === '\t') {
      i++;
      continue;
    }

    if (NUMBER_START_PATTERN.test(ch)) {
      let num = '';

      while (i < expression.length && NUMBER_BODY_PATTERN.test(expression[i])) {
        // Only consume +/- when they are part of an exponent (e.g. 1e-3).
        const c = expression[i];

        if ((c === '+' || c === '-') && !(num.endsWith('e') || num.endsWith('E'))) {
          break;
        }
        num += c;
        i++;
      }

      const parsed = Number(num);

      if (!Number.isFinite(parsed)) {
        return null;
      }
      tokens.push({ type: 'num', value: parsed });
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%' || ch === '^') {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }

    return null;
  }

  return tokens;
};

/** Binary operator precedence; higher binds tighter. */
const PRECEDENCE_: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };

/** Recursive-descent (precedence-climbing) parser over a pre-tokenized stream. */
class Parser_ {
  private pos_ = 0;
  private readonly tokens_: Token[];

  constructor(tokens: Token[]) {
    this.tokens_ = tokens;
  }

  atEnd(): boolean {
    return this.pos_ >= this.tokens_.length;
  }

  private peek_(): Token | null {
    return this.tokens_[this.pos_] ?? null;
  }

  private next_(): Token | null {
    return this.tokens_[this.pos_++] ?? null;
  }

  /** Precedence-climbing: parse operators with precedence >= minPrecedence. */
  parseExpression(minPrecedence: number): number {
    let left = this.parseUnary_();

    for (;;) {
      const token = this.peek_();

      if (!token || token.type !== 'op' || PRECEDENCE_[token.value] < minPrecedence) {
        break;
      }

      this.next_();
      const isRightAssociative = token.value === '^';
      const nextMin = isRightAssociative ? PRECEDENCE_[token.value] : PRECEDENCE_[token.value] + 1;
      const right = this.parseExpression(nextMin);

      left = this.applyOperator_(token.value, left, right);
    }

    return left;
  }

  private parseUnary_(): number {
    const token = this.peek_();

    if (token?.type === 'op' && (token.value === '+' || token.value === '-')) {
      this.next_();
      const operand = this.parseUnary_();

      return token.value === '-' ? -operand : operand;
    }

    return this.parsePrimary_();
  }

  private parsePrimary_(): number {
    const token = this.next_();

    if (!token) {
      throw new Error('Unexpected end of expression');
    }

    if (token.type === 'num') {
      return token.value;
    }

    if (token.type === 'paren' && token.value === '(') {
      const value = this.parseExpression(0);
      const closing = this.next_();

      if (!closing || closing.type !== 'paren' || closing.value !== ')') {
        throw new Error('Mismatched parentheses');
      }

      return value;
    }

    throw new Error('Unexpected token');
  }

  private applyOperator_(op: string, left: number, right: number): number {
    switch (op) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return left / right;
      case '%':
        return left % right;
      case '^':
        return left ** right;
      default:
        throw new Error(`Unknown operator: ${op}`);
    }
  }
}
