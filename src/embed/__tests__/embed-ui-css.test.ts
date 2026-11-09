import { applyEmbedUiCss } from '../embed-ui';

describe('applyEmbedUiCss', () => {
  it('hides the plugin drawer chrome together with the bottom menu', () => {
    applyEmbedUiCss({ bottomMenu: false }, new Set());
    const css = document.getElementById('keeptrack-embed-ui')?.textContent ?? '';

    for (const sel of ['#nav-footer', '#plugin-drawer', '#drawer-hamburger', '#drawer-utility-footer', '#drawer-overlay']) {
      expect(css).toContain(`${sel}{display:none !important;}`);
    }
  });

  it('shows it again when the flag turns back on', () => {
    const hidden = new Set<'bottomMenu'>();

    applyEmbedUiCss({ bottomMenu: false }, hidden);
    applyEmbedUiCss({ bottomMenu: true }, hidden);

    expect(document.getElementById('keeptrack-embed-ui')?.textContent).toBe('');
  });
});
