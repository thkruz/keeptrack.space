/**
 * @jest-environment jsdom
 */

import { BottomIconComponent, BottomIconCallbacks } from '@app/engine/plugins/components/bottom-icon/bottom-icon-component';
import { IBottomIconConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { MenuMode } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';

// Mock settingsManager
(global as any).settingsManager = {
  activeMenuMode: MenuMode.BASIC,
};

describe('BottomIconComponent', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '<div id="bottom-icons"></div>';

    // Reset EventBus singleton
    (EventBus as any).instance = null;
    eventBus = EventBus.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createConfig = (overrides: Partial<IBottomIconConfig> = {}): IBottomIconConfig => ({
    elementName: 'test-icon',
    label: 'Test Icon',
    image: 'test.png',
    ...overrides,
  });

  describe('constructor', () => {
    it('should create component with default values', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      expect(component.elementName).toBe('test-icon');
      expect(component.selected).toBe(false);
      expect(component.disabled).toBe(false);
    });

    it('should apply custom menuMode', () => {
      const component = new BottomIconComponent('test-plugin', createConfig({
        menuMode: [MenuMode.BASIC, MenuMode.ADVANCED],
      }));

      expect(component.menuModes).toContain(MenuMode.BASIC);
      expect(component.menuModes).toContain(MenuMode.ADVANCED);
    });

    it('should apply isDisabledOnLoad', () => {
      const component = new BottomIconComponent('test-plugin', createConfig({
        isDisabledOnLoad: true,
      }));

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);

      expect(component.disabled).toBe(true);
    });
  });

  describe('init', () => {
    it('should throw if already initialized', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      component.init();

      expect(() => component.init()).toThrow('already initialized');
    });

    it('should create DOM element on uiManagerInit event', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);

      const element = document.getElementById('test-icon');

      expect(element).not.toBeNull();
      expect(element?.classList.contains('bmenu-item')).toBe(true);
    });

    it('should add disabled class when isDisabledOnLoad is true', () => {
      const component = new BottomIconComponent('test-plugin', createConfig({
        isDisabledOnLoad: true,
      }));

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);

      const element = document.getElementById('test-icon');

      expect(element?.classList.contains('bmenu-item-disabled')).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should handle destroy correctly', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);

      // Verify element exists before destroy
      expect(component.getElement()).not.toBeNull();
      expect(component.selected).toBe(false);

      // Select the component first
      component.select();
      expect(component.selected).toBe(true);

      component.destroy();

      // After destroy, component state should be reset
      expect(component.selected).toBe(false);
      expect(component.disabled).toBe(false);
    });

    it('should reset state', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.select();
      component.destroy();

      expect(component.selected).toBe(false);
    });
  });

  describe('select/deselect', () => {
    it('should select the icon', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.select();

      expect(component.selected).toBe(true);
      expect(component.getElement()?.classList.contains('bmenu-item-selected')).toBe(true);
    });

    it('should not select if already selected', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.select();
      component.select(); // Should not throw or change state

      expect(component.selected).toBe(true);
    });

    it('should deselect the icon', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.select();
      component.deselect();

      expect(component.selected).toBe(false);
      expect(component.getElement()?.classList.contains('bmenu-item-selected')).toBe(false);
    });

    it('should emit hideSideMenus on deselect by default', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());
      const hideSpy = jest.fn();

      eventBus.on(EventBusEvent.hideSideMenus, hideSpy);

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.select();
      component.deselect();

      expect(hideSpy).toHaveBeenCalled();
    });

    it('should not emit hideSideMenus when emitHideSideMenus is false', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());
      const hideSpy = jest.fn();

      eventBus.on(EventBusEvent.hideSideMenus, hideSpy);

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.select();
      component.deselect(false);

      expect(hideSpy).not.toHaveBeenCalled();
    });

    it('should call onDeselect callback', () => {
      const onDeselect = jest.fn();
      const component = new BottomIconComponent('test-plugin', createConfig(), { onDeselect });

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.select();
      component.deselect();

      expect(onDeselect).toHaveBeenCalled();
    });
  });

  describe('enable/disable', () => {
    it('should enable the icon', () => {
      const component = new BottomIconComponent('test-plugin', createConfig({
        isDisabledOnLoad: true,
      }));

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.enable();

      expect(component.disabled).toBe(false);
      expect(component.getElement()?.classList.contains('bmenu-item-disabled')).toBe(false);
    });

    it('should disable the icon', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.disable();

      expect(component.disabled).toBe(true);
      expect(component.getElement()?.classList.contains('bmenu-item-disabled')).toBe(true);
    });

    it('should deselect when disabling by default', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.select();
      component.disable();

      expect(component.selected).toBe(false);
    });

    it('should not deselect when disabling with alsoDeselect=false', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.select();
      component.disable(false);

      expect(component.selected).toBe(true);
    });
  });

  describe('show/hide', () => {
    it('should show the icon', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.hide();
      component.show();

      expect(component.getElement()?.style.display).toBe('block');
    });

    it('should hide the icon', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.hide();

      expect(component.getElement()?.style.display).toBe('none');
    });
  });

  describe('toggle', () => {
    it('should toggle from unselected to selected', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      const result = component.toggle();

      expect(result).toBe(true);
      expect(component.selected).toBe(true);
    });

    it('should toggle from selected to unselected', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.select();
      const result = component.toggle();

      expect(result).toBe(false);
      expect(component.selected).toBe(false);
    });
  });

  describe('click handling', () => {
    it('should handle bottom menu click event', () => {
      const onClick = jest.fn();
      const component = new BottomIconComponent('test-plugin', createConfig(), { onClick });

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      eventBus.emit(EventBusEvent.bottomMenuClick, 'test-icon');

      expect(onClick).toHaveBeenCalled();
    });

    it('should ignore click events for other icons', () => {
      const onClick = jest.fn();
      const component = new BottomIconComponent('test-plugin', createConfig(), { onClick });

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      eventBus.emit(EventBusEvent.bottomMenuClick, 'other-icon');

      expect(onClick).not.toHaveBeenCalled();
    });

    it('should verify requirements before selecting', () => {
      const onVerifyRequirements = jest.fn().mockReturnValue(false);
      const component = new BottomIconComponent('test-plugin', createConfig(), {
        onVerifyRequirements,
      });

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      eventBus.emit(EventBusEvent.bottomMenuClick, 'test-icon');

      expect(onVerifyRequirements).toHaveBeenCalled();
      expect(component.selected).toBe(false);
    });

    it('should call onToggleSideMenu when selecting', () => {
      const onToggleSideMenu = jest.fn();
      const component = new BottomIconComponent('test-plugin', createConfig(), {
        onToggleSideMenu,
      });

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      eventBus.emit(EventBusEvent.bottomMenuClick, 'test-icon');

      expect(onToggleSideMenu).toHaveBeenCalledWith(true);
    });

    it('should call onToggleSideMenu(false) when deselecting', () => {
      const onToggleSideMenu = jest.fn();
      const component = new BottomIconComponent('test-plugin', createConfig(), {
        onToggleSideMenu,
      });

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      eventBus.emit(EventBusEvent.bottomMenuClick, 'test-icon'); // Select
      eventBus.emit(EventBusEvent.bottomMenuClick, 'test-icon'); // Deselect

      expect(onToggleSideMenu).toHaveBeenLastCalledWith(false);
    });
  });

  describe('getElement', () => {
    it('should return the DOM element after initialization', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);

      const element = component.getElement();

      expect(element).not.toBeNull();
      expect(element?.id).toBe('test-icon');
      expect(element?.classList.contains('bmenu-item')).toBe(true);
    });

    it('should throw when element not found before initialization', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      // getEl throws in node environment when element not found
      expect(() => component.getElement()).toThrow();
    });

    it('should clear internal state after destroy', () => {
      const component = new BottomIconComponent('test-plugin', createConfig());

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);

      // Verify element exists and state is set
      expect(component.getElement()).not.toBeNull();

      component.destroy();

      // After destroy, component state should be reset
      expect(component.selected).toBe(false);
      expect(component.disabled).toBe(false);
    });
  });
});
