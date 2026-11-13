import { describe, expect, it } from 'vitest';
import { SatInfoBox } from '../sat-info-box';

describe('sat info box copy button', () => {
  it('uses the same PNG icon class as the watchlist toggle, not a font glyph', () => {
    const header = (SatInfoBox.prototype as unknown as { createHeader: () => string }).createHeader.call({});

    expect(header).toContain('sat-info-copy-values');
    expect(header).toContain('class="sat-watchlist-icon off-watchlist"');
    expect(header).not.toContain('material-icons');
    expect(header).not.toContain('content_copy');
    expect(header).toContain('aria-label=');
    expect(header).toContain('kt-tooltip=');
  });
});
