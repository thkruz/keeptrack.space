/**
 * @jest-environment jsdom
 */

import { SecondaryMenuComponent } from '@app/engine/plugins/components/secondary-menu/secondary-menu-component';
import { ISecondaryMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ServiceLocator } from '@app/engine/core/service-locator';

// Mock ServiceLocator
jest.mock('@app/engine/core/service-locator', () => ({
  ServiceLocator: {
    getSoundManager: jest.fn().mockReturnValue({
      play: jest.fn(),
    }),
  },
}));

// Mock slide utilities
jest.mock('@app/engine/utils/slide', () => ({
  slideInRight: jest.fn(),
  slideOutLeft: jest.fn(),
}));

// Mock click-and-drag
const mockEdgeElement = { style: { top: '', position: '' } };

jest.mock('@app/engine/utils/click-and-drag', () => ({
  clickAndDragWidth: jest.fn().mockReturnValue(mockEdgeElement),
}));

describe('SecondaryMenuComponent', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="left-menus"></div>
      <div id="test-side-menu" style="width: 300px;">
        <button id="test-side-menu-secondary-btn"></button>
        <button id="test-side-menu-download-btn"></button>
      </div>
    `;

    // Reset EventBus singleton
    (EventBus as any).instance = null;
    eventBus = EventBus.getInstance();

    jest.clearAllMocks();
  });

  const createConfig = (overrides: Partial<ISecondaryMenuConfig> = {}): ISecondaryMenuConfig => ({
    html: '<div class="settings-content">Settings Form</div>',
    ...overrides,
  });

  describe('constructor', () => {
    it('should create component with default values', () => {
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      expect(component.elementName).toBe('test-side-menu-secondary');
      expect(component.buttonElementName).toBe('test-side-menu-secondary-btn');
      expect(component.opened).toBe(false);
      expect(component.enabled).toBe(true);
    });

    it('should apply custom width and zIndex', () => {
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig({
          width: 400,
          zIndex: 10,
        }),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);

      const element = document.getElementById('test-side-menu-secondary');

      expect(element?.style.width).toBe('400px');
      expect(element?.style.zIndex).toBe('10');
    });
  });

  describe('init', () => {
    it('should throw if already initialized', () => {
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      component.init();

      expect(() => component.init()).toThrow('already initialized');
    });

    it('should create DOM element on uiManagerInit event', () => {
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);

      const element = document.getElementById('test-side-menu-secondary');

      expect(element).not.toBeNull();
      expect(element?.classList.contains('side-menu-parent')).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should reset component state', () => {
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);

      // Verify element exists before destroy
      const elementBefore = component.getElement();

      expect(elementBefore).not.toBeNull();

      component.destroy();

      // After destroy, the component state should be reset
      expect(component.opened).toBe(false);
    });

    it('should reset state', () => {
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.open();
      component.destroy();

      expect(component.opened).toBe(false);
    });
  });

  describe('open/close', () => {
    it('should open the menu', () => {
      const { slideInRight } = require('@app/engine/utils/slide');
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.open();

      expect(component.opened).toBe(true);
      expect(slideInRight).toHaveBeenCalled();
    });

    it('should not open if already open', () => {
      const { slideInRight } = require('@app/engine/utils/slide');
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.open();
      component.open();

      expect(slideInRight).toHaveBeenCalledTimes(1);
    });

    it('should not open if disabled', () => {
      const { slideInRight } = require('@app/engine/utils/slide');
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.enabled = false;
      component.open();

      expect(component.opened).toBe(false);
      expect(slideInRight).not.toHaveBeenCalled();
    });

    it('should close the menu', () => {
      const { slideOutLeft } = require('@app/engine/utils/slide');
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.open();
      component.close();

      expect(component.opened).toBe(false);
      expect(slideOutLeft).toHaveBeenCalled();
    });

    it('should not close if already closed', () => {
      const { slideOutLeft } = require('@app/engine/utils/slide');
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.close();

      expect(slideOutLeft).not.toHaveBeenCalled();
    });

    it('should call onOpen callback', () => {
      const onOpen = jest.fn();
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
        { onOpen },
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.open();

      expect(onOpen).toHaveBeenCalled();
    });

    it('should call onClose callback', () => {
      const onClose = jest.fn();
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
        { onClose },
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.open();
      component.close();

      expect(onClose).toHaveBeenCalled();
    });

    it('should position menu using leftOffset when provided', () => {
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig({ leftOffset: 350 }),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.open();

      const element = document.getElementById('test-side-menu-secondary');

      expect(element?.style.left).toBe('350px');
    });
  });

  describe('toggle', () => {
    it('should toggle from closed to open', () => {
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      const result = component.toggle();

      expect(result).toBe(true);
      expect(component.opened).toBe(true);
    });

    it('should toggle from open to closed', () => {
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.open();
      const result = component.toggle();

      expect(result).toBe(false);
      expect(component.opened).toBe(false);
    });
  });

  describe('button handling', () => {
    it('should toggle on button click', () => {
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      eventBus.emit(EventBusEvent.uiManagerFinal);

      const button = document.getElementById('test-side-menu-secondary-btn');

      button?.click();

      expect(component.opened).toBe(true);

      button?.click();

      expect(component.opened).toBe(false);
    });

    it('should not toggle if disabled', () => {
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      eventBus.emit(EventBusEvent.uiManagerFinal);
      component.enabled = false;

      const button = document.getElementById('test-side-menu-secondary-btn');

      button?.click();

      expect(component.opened).toBe(false);
    });

    it('should play click sound on button click', () => {
      const mockPlay = jest.fn();

      (ServiceLocator.getSoundManager as jest.Mock).mockReturnValue({
        play: mockPlay,
      });

      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      eventBus.emit(EventBusEvent.uiManagerFinal);

      const button = document.getElementById('test-side-menu-secondary-btn');

      button?.click();

      expect(mockPlay).toHaveBeenCalled();
    });

    it('should track open/close state via programmatic open/close', () => {
      const onOpen = jest.fn();
      const onClose = jest.fn();
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
        { onOpen, onClose },
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      eventBus.emit(EventBusEvent.uiManagerFinal);

      // Initially closed
      expect(component.opened).toBe(false);

      // Open programmatically
      component.open();

      expect(component.opened).toBe(true);
      expect(onOpen).toHaveBeenCalled();

      // Close programmatically
      component.close();

      expect(component.opened).toBe(false);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('download button', () => {
    it('should call onDownload callback on download button click', () => {
      const onDownload = jest.fn();
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
        { onDownload },
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      eventBus.emit(EventBusEvent.uiManagerFinal);

      const downloadBtn = document.getElementById('test-side-menu-download-btn');

      downloadBtn?.click();

      expect(onDownload).toHaveBeenCalled();
    });

    it('should play export sound on download', () => {
      const mockPlay = jest.fn();

      (ServiceLocator.getSoundManager as jest.Mock).mockReturnValue({
        play: mockPlay,
      });

      const onDownload = jest.fn();
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
        { onDownload },
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      eventBus.emit(EventBusEvent.uiManagerFinal);

      const downloadBtn = document.getElementById('test-side-menu-download-btn');

      downloadBtn?.click();

      expect(mockPlay).toHaveBeenCalled();
    });
  });

  describe('hideSideMenus event', () => {
    it('should close when hideSideMenus event is emitted', () => {
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      component.open();
      eventBus.emit(EventBusEvent.hideSideMenus);

      expect(component.opened).toBe(false);
    });
  });

  describe('generateHtml', () => {
    it('should generate valid HTML structure', () => {
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig({ html: '<input type="text" />' }),
      );

      const html = component.generateHtml();

      expect(html).toContain('id="test-side-menu-secondary"');
      expect(html).toContain('class="side-menu-parent');
      expect(html).toContain('<input type="text" />');
    });
  });

  describe('drag options', () => {
    it('should register drag handler when dragOptions provided', () => {
      const { clickAndDragWidth } = require('@app/engine/utils/click-and-drag');
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig({
          dragOptions: {
            isDraggable: true,
            minWidth: 200,
            maxWidth: 500,
          },
        }),
      );

      component.init();
      eventBus.emit(EventBusEvent.uiManagerInit);
      eventBus.emit(EventBusEvent.uiManagerFinal);

      expect(clickAndDragWidth).toHaveBeenCalled();
    });
  });

  describe('enabled property', () => {
    it('should get and set enabled state', () => {
      const component = new SecondaryMenuComponent(
        'test-plugin',
        'test-side-menu',
        createConfig(),
      );

      expect(component.enabled).toBe(true);

      component.enabled = false;

      expect(component.enabled).toBe(false);
    });
  });
});
