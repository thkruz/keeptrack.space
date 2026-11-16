import { computeFooterPlacement } from '@app/app/ui/plugin-drawer-helpers';

/** #513 / #519: pill placement between the side menu and the satellite info box. */
describe('computeFooterPlacement', () => {
  const base = { viewportWidth: 1366, viewportHeight: 768 };

  it('stays centred with no menu and no info box', () => {
    expect(computeFooterPlacement({ ...base, menuRight: 0, infoBox: null })).toEqual({ left: 683, bottom: 12 });
  });

  it('centres in the free space right of a wide menu when there is no info box', () => {
    expect(computeFooterPlacement({ ...base, menuRight: 800, infoBox: null }).left).toBe(1083);
  });

  it('centres in the gap between menu and info box (1366x768 planner case)', () => {
    const p = computeFooterPlacement({ ...base, menuRight: 800, infoBox: { left: 1006, top: 400, right: 1366 } });

    expect(p).toEqual({ left: 903, bottom: 12 });
    expect(p.left + 24).toBeLessThanOrEqual(1006);
    expect(p.left - 24).toBeGreaterThanOrEqual(800);
  });

  it('keeps the centre when the info box is far right and the menu is narrow', () => {
    expect(computeFooterPlacement({ ...base, menuRight: 300, infoBox: { left: 1006, top: 400, right: 1366 } }).left).toBe(683);
  });

  it('moves left of the info box when the info box would cover the centred pill', () => {
    const p = computeFooterPlacement({ ...base, menuRight: 300, infoBox: { left: 700, top: 400, right: 1366 } });

    expect(p.left + 24).toBeLessThanOrEqual(700);
  });

  it('rises above the info box when the gap is too narrow', () => {
    const p = computeFooterPlacement({ ...base, menuRight: 960, infoBox: { left: 1006, top: 400, right: 1366 } });

    expect(p.bottom).toBe(768 - 400 + 8);
    expect(p.left - 24).toBeGreaterThanOrEqual(960);
  });

  it('adapts on resize to 1920x1080', () => {
    const p = computeFooterPlacement({ viewportWidth: 1920, viewportHeight: 1080, menuRight: 800, infoBox: { left: 1560, top: 600, right: 1920 } });

    expect(p.left).toBe(960);
    expect(p.bottom).toBe(12);
  });
});
