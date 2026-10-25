import { getTopChromeBottom } from '@app/engine/utils/top-chrome';
import { vi } from 'vitest';

const rect = (top: number, bottom: number, width = 1366) => ({ left: 0, top, right: width, bottom, width, height: bottom - top, x: 0, y: top }) as DOMRect;

describe('getTopChromeBottom', () => {
  afterEach(() => {
    document.getElementById('tc-nav')?.remove();
    vi.restoreAllMocks();
  });

  const mountNav = (): { wrapper: HTMLElement; strip: HTMLElement } => {
    document.body.insertAdjacentHTML('beforeend', '<nav id="tc-nav"><div id="nav-wrapper"></div><div id="tc-strip"></div></nav>');

    return { wrapper: document.getElementById('nav-wrapper')!, strip: document.getElementById('tc-strip')! };
  };

  it('returns 0 when there is no top menu', () => {
    expect(getTopChromeBottom()).toBe(0);
  });

  it('includes a strip docked under the nav bar', () => {
    const { wrapper, strip } = mountNav();

    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(rect(0, 40));
    vi.spyOn(strip, 'getBoundingClientRect').mockReturnValue(rect(40, 85));

    expect(getTopChromeBottom()).toBe(85);
  });

  it('ignores a hidden strip (empty rect)', () => {
    const { wrapper, strip } = mountNav();

    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(rect(0, 40));
    vi.spyOn(strip, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 0));

    expect(getTopChromeBottom()).toBe(40);
  });
});
