/**
 * @jest-environment jsdom
 */

import { ContextMenuComponent, ContextMenuCallbacks } from '@app/engine/plugins/components/context-menu/context-menu-component';
import { IContextMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ServiceLocator } from '@app/engine/core/service-locator';

// Mock ServiceLocator
jest.mock('@app/engine/core/service-locator', () => ({
  ServiceLocator: {
    getInputManager: jest.fn().mockReturnValue({
      rmbMenuItems: [],
    }),
  },
}));

describe('ContextMenuComponent', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <ul id="right-btn-menu-ul"></ul>
      <div id="rmb-wrapper"></div>
    `;

    // Reset EventBus singleton
    (EventBus as any).instance = null;
    eventBus = EventBus.getInstance();

    // Reset input manager mock
    (ServiceLocator.getInputManager as jest.Mock).mockReturnValue({
      rmbMenuItems: [],
    });

    jest.clearAllMocks();
  });

  const createConfig = (overrides: Partial<IContextMenuConfig> = {}): IContextMenuConfig => ({
    level1Html: '<li id="test-rmb-l1" class="rmb-item">Test Action</li>',
    level1ElementName: 'test-rmb-l1',
    level2Html: '<ul><li>Sub Action 1</li><li>Sub Action 2</li></ul>',
    level2ElementName: 'test-rmb-l2',
    ...overrides,
  });

  const createCallbacks = (overrides: Partial<ContextMenuCallbacks> = {}): ContextMenuCallbacks => ({
    onAction: jest.fn(),
    ...overrides,
  });

  describe('constructor', () => {
    it('should create component with default values', () => {
      const callbacks = createCallbacks();
      const component = new ContextMenuComponent('test-plugin', createConfig(), callbacks);
      const menuInfo = component.getMenuItemInfo();

      expect(menuInfo.elementIdL1).toBe('test-rmb-l1');
      expect(menuInfo.elementIdL2).toBe('test-rmb-l2');
      expect(menuInfo.order).toBe(100); // Default order
      expect(menuInfo.isRmbOnEarth).toBe(false);
      expect(menuInfo.isRmbOffEarth).toBe(false);
      expect(menuInfo.isRmbOnSat).toBe(false);
    });

    it('should apply custom visibility options', () => {
      const callbacks = createCallbacks();
      const component = new ContextMenuComponent('test-plugin', createConfig({
        isVisibleOnEarth: true,
        isVisibleOffEarth: true,
        isVisibleOnSatellite: true,
        order: 50,
      }), callbacks);

      const menuInfo = component.getMenuItemInfo();

      expect(menuInfo.order).toBe(50);
      expect(menuInfo.isRmbOnEarth).toBe(true);
      expect(menuInfo.isRmbOffEarth).toBe(true);
      expect(menuInfo.isRmbOnSat).toBe(true);
    });
  });

  describe('init', () => {
    it('should throw if already initialized', () => {
      const callbacks = createCallbacks();
      const component = new ContextMenuComponent('test-plugin', createConfig(), callbacks);

      component.init();

      expect(() => component.init()).toThrow('already initialized');
    });

    it('should create level 1 element on rightBtnMenuAdd event', () => {
      const callbacks = createCallbacks();
      const component = new ContextMenuComponent('test-plugin', createConfig(), callbacks);

      component.init();
      eventBus.emit(EventBusEvent.rightBtnMenuAdd);

      const element = document.getElementById('test-rmb-l1');

      expect(element).not.toBeNull();
      expect(element?.textContent).toBe('Test Action');
    });

    it('should create level 2 element on uiManagerInit event', () => {
      const callbacks = createCallbacks();
      const component = new ContextMenuComponent('test-plugin', createConfig(), callbacks);

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);

      const element = document.getElementById('test-rmb-l2');

      expect(element).not.toBeNull();
      expect(element?.classList.contains('right-btn-menu')).toBe(true);
    });

    it('should register with InputManager', () => {
      const callbacks = createCallbacks();
      const mockInputManager = { rmbMenuItems: [] as any[] };

      (ServiceLocator.getInputManager as jest.Mock).mockReturnValue(mockInputManager);

      const component = new ContextMenuComponent('test-plugin', createConfig({
        isVisibleOnSatellite: true,
      }), callbacks);

      component.init();

      expect(mockInputManager.rmbMenuItems.length).toBe(1);
      expect(mockInputManager.rmbMenuItems[0].elementIdL1).toBe('test-rmb-l1');
      expect(mockInputManager.rmbMenuItems[0].isRmbOnSat).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should reset component state after destroy', () => {
      const callbacks = createCallbacks();
      const component = new ContextMenuComponent('test-plugin', createConfig(), callbacks);

      component.init();
      eventBus.emit(EventBusEvent.rightBtnMenuAdd);
      eventBus.emit(EventBusEvent.uiManagerInit);

      // Verify elements exist before destroy
      expect(component.getLevel1Element()).not.toBeNull();
      expect(component.getLevel2Element()).not.toBeNull();

      component.destroy();

      // After destroy, component allows re-initialization
      // Attempting init again should not throw
      expect(() => component.init()).not.toThrow();
    });
  });

  describe('action handling', () => {
    it('should call onAction callback when rmbMenuActions event is emitted', () => {
      const onAction = jest.fn();
      const component = new ContextMenuComponent('test-plugin', createConfig(), { onAction });

      component.init();
      eventBus.emit(EventBusEvent.rmbMenuActions, 'test-rmb-l1', 12345);

      expect(onAction).toHaveBeenCalledWith('test-rmb-l1', 12345);
    });

    it('should call onAction without satId', () => {
      const onAction = jest.fn();
      const component = new ContextMenuComponent('test-plugin', createConfig(), { onAction });

      component.init();
      eventBus.emit(EventBusEvent.rmbMenuActions, 'some-action');

      expect(onAction).toHaveBeenCalledWith('some-action', undefined);
    });
  });

  describe('getMenuItemInfo', () => {
    it('should return correct menu item info', () => {
      const callbacks = createCallbacks();
      const component = new ContextMenuComponent('test-plugin', createConfig({
        order: 75,
        isVisibleOnEarth: true,
        isVisibleOffEarth: false,
        isVisibleOnSatellite: true,
      }), callbacks);

      const info = component.getMenuItemInfo();

      expect(info).toEqual({
        elementIdL1: 'test-rmb-l1',
        elementIdL2: 'test-rmb-l2',
        order: 75,
        isRmbOnEarth: true,
        isRmbOffEarth: false,
        isRmbOnSat: true,
      });
    });
  });

  describe('getLevel1Element', () => {
    it('should return the level 1 DOM element', () => {
      const callbacks = createCallbacks();
      const component = new ContextMenuComponent('test-plugin', createConfig(), callbacks);

      component.init();
      eventBus.emit(EventBusEvent.rightBtnMenuAdd);

      const element = component.getLevel1Element();

      expect(element).not.toBeNull();
      expect(element?.id).toBe('test-rmb-l1');
    });

    it('should throw before initialization since element does not exist', () => {
      const callbacks = createCallbacks();
      const component = new ContextMenuComponent('test-plugin', createConfig(), callbacks);

      // getEl throws in node environment when element not found
      expect(() => component.getLevel1Element()).toThrow();
    });
  });

  describe('getLevel2Element', () => {
    it('should return the level 2 DOM element', () => {
      const callbacks = createCallbacks();
      const component = new ContextMenuComponent('test-plugin', createConfig(), callbacks);

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);

      const element = component.getLevel2Element();

      expect(element).not.toBeNull();
      expect(element?.id).toBe('test-rmb-l2');
    });

    it('should throw before initialization since element does not exist', () => {
      const callbacks = createCallbacks();
      const component = new ContextMenuComponent('test-plugin', createConfig(), callbacks);

      // getEl throws in node environment when element not found
      expect(() => component.getLevel2Element()).toThrow();
    });
  });

  describe('level 1 HTML processing', () => {
    it('should trim empty text nodes from HTML', () => {
      const callbacks = createCallbacks();
      const component = new ContextMenuComponent('test-plugin', createConfig({
        level1Html: `
          <li id="test-rmb-l1" class="rmb-item">Test Action</li>
        `,
      }), callbacks);

      component.init();
      eventBus.emit(EventBusEvent.rightBtnMenuAdd);

      const element = document.getElementById('test-rmb-l1');

      expect(element).not.toBeNull();
    });

    it('should append to correct container', () => {
      const callbacks = createCallbacks();
      const component = new ContextMenuComponent('test-plugin', createConfig(), callbacks);

      component.init();
      eventBus.emit(EventBusEvent.rightBtnMenuAdd);

      const container = document.getElementById('right-btn-menu-ul');

      expect(container?.children.length).toBeGreaterThan(0);
    });
  });

  describe('level 2 HTML processing', () => {
    it('should wrap level 2 content with correct class', () => {
      const callbacks = createCallbacks();
      const component = new ContextMenuComponent('test-plugin', createConfig(), callbacks);

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);

      const element = document.getElementById('test-rmb-l2');

      expect(element?.className).toBe('right-btn-menu');
    });

    it('should append to rmb-wrapper container', () => {
      const callbacks = createCallbacks();
      const component = new ContextMenuComponent('test-plugin', createConfig(), callbacks);

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);

      const container = document.getElementById('rmb-wrapper');

      expect(container?.querySelector('#test-rmb-l2')).not.toBeNull();
    });
  });
});
