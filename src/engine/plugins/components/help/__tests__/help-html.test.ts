/**
 * @jest-environment jsdom
 */

import { buildHelpHtml } from '@app/engine/plugins/components/help/help-html';
import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';

describe('buildHelpHtml', () => {
  it('passes legacy body-only configs through unchanged', () => {
    const config: IHelpConfig = {
      title: 'Legacy',
      body: 'Plain <strong>HTML</strong> body.',
    };

    expect(buildHelpHtml(config)).toBe('Plain <strong>HTML</strong> body.');
  });

  it('returns an empty string for a legacy config without a body', () => {
    expect(buildHelpHtml({ title: 'Empty' })).toBe('');
  });

  it('renders sections with headings, content, and images', () => {
    const config: IHelpConfig = {
      title: 'Structured',
      sections: [
        {
          heading: 'Overview',
          content: 'What this plugin does.',
          image: { src: 'img/help/test/menu.png', alt: 'The menu', caption: 'The menu open.' },
        },
        { content: 'Heading-less section.' },
      ],
    };

    const result = buildHelpHtml(config);

    expect(result).toContain('<div class="help-rich">');
    expect(result).toContain('<h3 class="help-section-heading">Overview</h3>');
    expect(result).toContain('What this plugin does.');
    // src is prefixed with the install directory at render time
    expect(result).toMatch(/src="[^"]*img\/help\/test\/menu\.png"/u);
    expect(result).toContain('alt="The menu"');
    expect(result).toContain('<figcaption>The menu open.</figcaption>');
    expect(result).toContain('Heading-less section.');
    // Second section has no heading element
    expect(result.match(/help-section-heading/gu)?.length).toBe(1);
  });

  it('renders tips as a callout list with the shared heading', () => {
    const config: IHelpConfig = {
      title: 'Tips',
      sections: [{ content: 'Body.' }],
      tips: ['First tip.', 'Second tip.'],
    };

    const result = buildHelpHtml(config);

    expect(result).toContain('help-tips');
    expect(result).toContain('<h3 class="help-section-heading">Tips</h3>');
    expect(result).toContain('<li>First tip.</li>');
    expect(result).toContain('<li>Second tip.</li>');
  });

  it('renders shortcuts as kbd chips joined by plus separators', () => {
    const config: IHelpConfig = {
      title: 'Shortcuts',
      sections: [{ content: 'Body.' }],
      shortcuts: [{ keys: ['Ctrl', 'F'], description: 'Toggle the menu' }],
    };

    const result = buildHelpHtml(config);

    expect(result).toContain('<h3 class="help-section-heading">Keyboard Shortcuts</h3>');
    expect(result).toContain('<kbd>Ctrl</kbd><span class="help-kbd-plus">+</span><kbd>F</kbd>');
    expect(result).toContain('Toggle the menu');
  });

  it('leaves absolute image URLs untouched', () => {
    const config: IHelpConfig = {
      title: 'Absolute',
      sections: [{ content: 'Body.', image: { src: 'https://example.com/a.png', alt: 'a' } }],
    };

    expect(buildHelpHtml(config)).toContain('src="https://example.com/a.png"');
  });
});
