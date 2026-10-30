import { getEl } from './get-el';

/**
 * Bottom edge, in viewport CSS px, of the top chrome that paints over the canvas.
 *
 * The canvas runs under the whole header, so overlays drawn on it (pane labels,
 * plot labels) must start below this line. It covers the nav bar AND any strip
 * docked under it inside `<nav>` (TimeSlider, Pro AccessTimeline). Measuring only
 * `#nav-wrapper` misses those strips: the access timeline alone is 45px and hid
 * the Multi-View pane labels and the Polar View "N" label whenever a sensor was
 * selected.
 *
 * Strips are measured rather than read from `--time-slider-height`, because the
 * variable is set by the stylesheet whether or not the strip is showing. Hidden
 * children (display: none) report an empty rect and are skipped, and a hidden
 * header returns 0.
 */
export const getTopChromeBottom = (): number => {
  const navWrapper = getEl('nav-wrapper', true);
  const nav = navWrapper?.parentElement;

  if (!navWrapper || !nav) {
    return 0;
  }

  let bottom = 0;

  for (const child of Array.from(nav.children)) {
    const rect = child.getBoundingClientRect();

    if (rect.height > 0 && rect.width > 0) {
      bottom = Math.max(bottom, rect.bottom);
    }
  }

  return bottom;
};
