import { readFileSync } from 'fs';
import { resolve } from 'path';

// #520: guards the specificity of the add-row margin reset against Materialize's input rule.
describe('watchlist add-row CSS (#520)', () => {
  const css = readFileSync(resolve(__dirname, '../watchlist.css'), 'utf8');

  it('zeroes input and input-field bottom margins under the menu id so it outranks Materialize', () => {
    expect(css).toMatch(/#watchlist-menu \.watchlist-add-row \.input-field input\s*\{\s*margin-bottom: 0;/u);
    expect(css).toMatch(/#watchlist-menu \.watchlist-add-row \.input-field\s*\{\s*margin-bottom: 0;/u);
  });
});
