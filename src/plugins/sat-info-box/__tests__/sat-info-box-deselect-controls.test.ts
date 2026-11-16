import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

/*
 * Deselecting blanks every per-object value in the info box. Rows that hold a form control (Doppler Ref Preset select,
 * Ref Frequency input with its " MHz" unit) are settings and must keep their text, or the preset list showed blank
 * options after deselect and reselect (#350).
 */
describe('SatInfoBox deselect keeps form-control rows (#350)', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    const box = document.getElementById('sat-infobox') ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'sat-infobox' }));

    box.innerHTML =
      '<div class="sat-info-value" id="plain-value">420 km</div>' +
      '<div class="sat-info-value" data-select-container="body"><select id="preset"><option value="custom">Custom</option>' +
      '<option value="uhf">UHF amateur (437.5 MHz)</option></select></div>' +
      '<div class="sat-info-value" id="freq-cell"><input type="number" id="freq" value="437.5"> MHz</div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.getElementById('sat-infobox')?.remove();
  });

  it('blanks plain values but keeps option labels and the unit after an input', () => {
    const plugin = new SatInfoBox();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = plugin as any;

    vi.spyOn(SatInfoBox, 'isCurrentSelection').mockReturnValue(true);
    vi.spyOn(plugin, 'hide').mockImplementation(() => undefined);

    p.renderSelection_(undefined, p.selectionRevision_);

    expect(document.getElementById('plain-value')!.textContent).toBe('');
    const options = [...(document.getElementById('preset') as HTMLSelectElement).options].map((o) => o.textContent);

    expect(options).toStrictEqual(['Custom', 'UHF amateur (437.5 MHz)']);
    expect(document.getElementById('freq-cell')!.textContent).toContain('MHz');
  });
});
