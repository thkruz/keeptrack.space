import { readFileSync } from 'fs';
import { resolve } from 'path';
import { HELP_ICON_CLASS, STASH_ATTR, syncPhoneHelpIcons } from '../phone-help-icons';

/** Pro issue #464: on phones the label tooltip moves to a help icon so read-only rows can be 30px. */
describe('phone help icons (#464)', () => {
  let box: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `<div id="box">
      <div class="sat-info-row"><div class="sat-info-key" kt-tooltip="International Designator">COSPAR</div><div class="sat-info-value">1998-067A</div></div>
      <div class="sat-info-row"><div class="sat-info-key sat-info-key--help" kt-tooltip="Apogee help" role="button">Apogee</div><div class="sat-info-value">420</div></div>
      <div class="sat-info-row"><div class="sat-info-key">Plain</div><div class="sat-info-value">x</div></div>
    </div>`;
    box = document.getElementById('box') as HTMLElement;
  });

  it('moves the label tooltip onto a labelled, tappable help icon on phones', () => {
    syncPhoneHelpIcons(box, true);
    const key = box.querySelector('.sat-info-key') as HTMLElement;
    const icon = key.querySelector(`.${HELP_ICON_CLASS}`) as HTMLElement;

    expect(key.hasAttribute('kt-tooltip')).toBe(false);
    expect(icon.getAttribute('kt-tooltip')).toBe('International Designator');
    expect(icon.getAttribute('aria-label')).toBe('International Designator');
    expect(icon.hasAttribute('kt-tooltip-tap')).toBe(true);
    expect(icon.tabIndex).toBe(0);
    expect(icon.textContent).toBe('');
  });

  it('leaves --help toggle keys and tooltip-less keys alone', () => {
    syncPhoneHelpIcons(box, true);

    expect(box.querySelectorAll(`.${HELP_ICON_CLASS}`)).toHaveLength(1);
    expect(box.querySelector('.sat-info-key--help')?.getAttribute('kt-tooltip')).toBe('Apogee help');
  });

  it('is idempotent', () => {
    syncPhoneHelpIcons(box, true);
    syncPhoneHelpIcons(box, true);

    expect(box.querySelectorAll(`.${HELP_ICON_CLASS}`)).toHaveLength(1);
  });

  it('restores the label tooltip on laptop and removes the icon', () => {
    syncPhoneHelpIcons(box, true);
    syncPhoneHelpIcons(box, false);
    const key = box.querySelector('.sat-info-key') as HTMLElement;

    expect(key.getAttribute('kt-tooltip')).toBe('International Designator');
    expect(key.hasAttribute(STASH_ATTR)).toBe(false);
    expect(box.querySelector(`.${HELP_ICON_CLASS}`)).toBeNull();
  });

  it('does nothing on laptop when nothing was converted', () => {
    const before = box.innerHTML;

    syncPhoneHelpIcons(box, false);

    expect(box.innerHTML).toBe(before);
  });
});

describe('phone help icon CSS (#464)', () => {
  const css = readFileSync(resolve(__dirname, '../sat-info-box.css'), 'utf8');

  it('sizes the icon 44px wide and a full 30px row high', () => {
    expect(css).toMatch(/\.sat-info-key \.sat-info-help-icon \{[^}]*width: 44px[^}]*height: 30px/u);
  });

  it('keeps copyable and circle rows at 44px and lets only read-only rows drop to 30px', () => {
    expect(css).toMatch(/\.sat-info-row:has\([^)]*\.sat-info-copyable\) \{\s*min-height: 44px/u);
    expect(css).toMatch(/\.sat-info-row:not\(:has\([^)]*\.sat-info-copyable\)\) \{\s*min-height: 30px/u);
  });
});
