import { vi } from 'vitest';
import { GroupsManager } from '@app/app/data/groups-manager';
import { GroupType, ObjectGroup } from '@app/app/data/object-group';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';

/*
 * GroupsManager owns the lifecycle of satellite groups: caching named groups,
 * selecting one (with/without the color overlay), clearing, and resetting on
 * catalog reload. ObjectGroup construction is exercised separately; here it
 * runs against an empty catalog stub so the manager logic is isolated.
 */
describe('GroupsManager', () => {
  let manager: GroupsManager;
  let setToGroupColorScheme: ReturnType<typeof vi.fn>;
  let calculateColorBuffers: ReturnType<typeof vi.fn>;
  let colorScheme: { setToGroupColorScheme: typeof setToGroupColorScheme; isUseGroupColorScheme: boolean; calculateColorBuffers: typeof calculateColorBuffers };

  beforeEach(() => {
    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue({ objectCache: [] } as never);

    setToGroupColorScheme = vi.fn();
    calculateColorBuffers = vi.fn();
    colorScheme = { setToGroupColorScheme, isUseGroupColorScheme: false, calculateColorBuffers };
    vi.spyOn(ServiceLocator, 'getColorSchemeManager').mockReturnValue(colorScheme as never);

    manager = new GroupsManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    EventBus.getInstance().unregisterAllEvents();
  });

  describe('createGroup', () => {
    it('caches a named group and returns the same instance on subsequent calls', () => {
      const first = manager.createGroup(GroupType.ALL, null, 'everything');
      const second = manager.createGroup(GroupType.ALL, null, 'everything');

      expect(second).toBe(first);
      expect(manager.groupList.everything).toBe(first);
    });

    it('does not cache an unnamed group', () => {
      const a = manager.createGroup(GroupType.ALL, null);
      const b = manager.createGroup(GroupType.ALL, null);

      expect(b).not.toBe(a);
      expect(Object.keys(manager.groupList)).toHaveLength(0);
    });
  });

  describe('selectGroup', () => {
    it('sets the selected group, updates orbits, and switches to the group color scheme', () => {
      const updateOrbits = vi.fn();
      const group = { updateOrbits } as unknown as ObjectGroup<GroupType>;

      manager.stopUpdatingInViewSoon = true;
      manager.selectGroup(group);

      expect(manager.selectedGroup).toBe(group);
      expect(updateOrbits).toHaveBeenCalledOnce();
      expect(setToGroupColorScheme).toHaveBeenCalledOnce();
      expect(manager.stopUpdatingInViewSoon).toBe(false);
    });
  });

  describe('selectGroupNoOverlay', () => {
    it('disables the overlay and recalculates color buffers in group mode', () => {
      settingsManager.isGroupOverlayDisabled = false;

      manager.selectGroupNoOverlay();

      expect(settingsManager.isGroupOverlayDisabled).toBe(true);
      expect(colorScheme.isUseGroupColorScheme).toBe(true);
      expect(calculateColorBuffers).toHaveBeenCalledOnce();
    });
  });

  describe('clearSelect', () => {
    it('clears the selection and re-enables the overlay', () => {
      manager.selectedGroup = {} as ObjectGroup<GroupType>;
      settingsManager.isGroupOverlayDisabled = true;

      manager.clearSelect();

      expect(manager.selectedGroup).toBeNull();
      expect(settingsManager.isGroupOverlayDisabled).toBe(false);
      expect(manager.stopUpdatingInViewSoon).toBe(true);
    });
  });

  describe('init', () => {
    it('resets selection, the flag, and the cache', () => {
      manager.selectedGroup = {} as ObjectGroup<GroupType>;
      manager.stopUpdatingInViewSoon = true;
      manager.groupList.foo = {} as ObjectGroup<GroupType>;

      manager.init();

      expect(manager.selectedGroup).toBeNull();
      expect(manager.stopUpdatingInViewSoon).toBe(false);
      expect(Object.keys(manager.groupList)).toHaveLength(0);
    });
  });

  it('re-initializes when the catalog is reloaded', () => {
    manager.groupList.foo = {} as ObjectGroup<GroupType>;
    manager.selectedGroup = {} as ObjectGroup<GroupType>;

    EventBus.getInstance().emit(EventBusEvent.catalogReloaded);

    expect(manager.selectedGroup).toBeNull();
    expect(Object.keys(manager.groupList)).toHaveLength(0);
  });
});
