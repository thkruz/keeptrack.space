import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';

/**
 * `--search-box-bottom` is read by `#search-results` alone. Writing it on the root restyles every element that
 * inherits it, so it is written on the results list.
 */
describe('SatInfoBox.setSearchBoxBottom', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
    document.body.innerHTML = '<div id="search-results"></div>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('writes the variable on the results list and never on the root', () => {
    const rootSpy = vi.spyOn(document.documentElement.style, 'setProperty');

    SatInfoBox.setSearchBoxBottom('120px');

    expect((document.getElementById('search-results') as HTMLElement).style.getPropertyValue('--search-box-bottom')).toBe('120px');
    expect(document.documentElement.style.getPropertyValue('--search-box-bottom')).toBe('');
    expect(rootSpy).not.toHaveBeenCalled();
  });

  it('skips the write when the value is unchanged', () => {
    const results = document.getElementById('search-results') as HTMLElement;

    SatInfoBox.setSearchBoxBottom('0px');
    const spy = vi.spyOn(results.style, 'setProperty');

    SatInfoBox.setSearchBoxBottom('0px');
    expect(spy).not.toHaveBeenCalled();

    SatInfoBox.setSearchBoxBottom('40px');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the results list does not exist', () => {
    document.body.innerHTML = '';

    expect(() => SatInfoBox.setSearchBoxBottom('0px')).not.toThrow();
  });
});
