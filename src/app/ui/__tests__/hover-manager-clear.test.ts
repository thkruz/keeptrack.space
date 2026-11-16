/* biome-ignore-all lint/complexity/useLiteralKeys: Tests read the private hover id directly. */
import { HoverManager } from '@app/app/ui/hover-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';

describe('HoverManager.clearHover', () => {
  let hoverManager: HoverManager;

  beforeEach(() => {
    setupStandardEnvironment();
    settingsManager.enableHoverOverlay = true;
    settingsManager.enableHoverOrbits = true;
    hoverManager = new HoverManager();
    hoverManager.init();
  });

  it('forgets the hovered id so re-entering the same object renders again', () => {
    const updateSpy = vi.spyOn(hoverManager as never, 'updateHover_' as never).mockImplementation(function (this: HoverManager, id: number) {
      this['currentHoverId'] = id;
    } as never);

    hoverManager['currentHoverId'] = 5;
    hoverManager.clearHover();

    expect(updateSpy).toHaveBeenCalledWith(-1);
    expect(hoverManager.getHoverId()).toBe(-1);

    hoverManager.setHoverId(5);
    expect(updateSpy).toHaveBeenLastCalledWith(5);
    expect(hoverManager.getHoverId()).toBe(5);
  });

  it('resets the cached id even when hover orbits are disabled', () => {
    settingsManager.enableHoverOrbits = false;
    hoverManager['currentHoverId'] = 5;
    hoverManager.clearHover();

    expect(hoverManager.getHoverId()).toBe(-1);
  });
});
