import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { setupStandardEnvironment } from '@test/environment/standard-env';

/** CSS keys off body.kt-satinfo-open instead of body:has(#sat-infobox[style*=...]). */
describe('sat info box open class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    document.body.className = '';
    document.body.innerHTML = '<div id="sat-infobox"></div>';
  });

  it('mirrors initPosition show/hide onto body', () => {
    const plugin = new SatInfoBox();
    const el = document.getElementById('sat-infobox') as HTMLElement;

    plugin.initPosition(el, true);
    expect(document.body.classList.contains('kt-satinfo-open')).toBe(true);
    plugin.initPosition(el, false);
    expect(document.body.classList.contains('kt-satinfo-open')).toBe(false);
  });

  it('clears the class on hide()', () => {
    const plugin = new SatInfoBox();

    document.body.classList.add('kt-satinfo-open');
    plugin.hide();
    expect(document.body.classList.contains('kt-satinfo-open')).toBe(false);
  });
});
