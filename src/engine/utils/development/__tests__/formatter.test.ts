import { glsl, html } from '@app/engine/utils/development/formatter';

describe('formatter', () => {
  describe('html', () => {
    it('interpolates string placeholders', () => {
      const name = 'world';

      expect(html`<div>${name}</div>`).toBe('<div>world</div>');
    });

    it('returns the raw string with no placeholders', () => {
      expect(html`<br/>`).toBe('<br/>');
    });

    it('errors (throws in test env) when a placeholder is not a string', () => {
      expect(() => html(['a', 'b'] as unknown as TemplateStringsArray, undefined as unknown as string)).toThrow(/Invalid input/u);
    });
  });

  describe('glsl', () => {
    it('concatenates literals and placeholders in order', () => {
      const uniform = 'float u';

      expect(glsl`uniform ${uniform};`).toBe('uniform float u;');
    });

    it('handles a template with no placeholders', () => {
      expect(glsl`void main() {}`).toBe('void main() {}');
    });

    it('joins multiple placeholders', () => {
      expect(glsl`${'a'}-${'b'}-${'c'}`).toBe('a-b-c');
    });
  });
});
