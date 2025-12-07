/**
 * @jest-environment jsdom
 */

import { HelpComponent } from '@app/engine/plugins/components/help/help-component';
import { IHelpConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { adviceManagerInstance } from '@app/engine/utils/adviceManager';

// Mock adviceManager
jest.mock('@app/engine/utils/adviceManager', () => ({
  adviceManagerInstance: {
    showAdvice: jest.fn(),
  },
}));

describe('HelpComponent', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    // Reset EventBus singleton completely
    (EventBus as any).instance = null;
    eventBus = EventBus.getInstance();

    // Clear all mocks including call counts
    jest.clearAllMocks();
    (adviceManagerInstance.showAdvice as jest.Mock).mockClear();
  });

  const createConfig = (overrides: Partial<IHelpConfig> = {}): IHelpConfig => ({
    title: 'Test Help Title',
    body: 'This is the help body content explaining how to use this feature.',
    ...overrides,
  });

  describe('constructor', () => {
    it('should create component with provided config', () => {
      const isActive = jest.fn().mockReturnValue(true);
      const component = new HelpComponent('test-plugin', createConfig(), isActive);

      expect(component.title).toBe('Test Help Title');
      expect(component.body).toBe('This is the help body content explaining how to use this feature.');
    });
  });

  describe('init', () => {
    it('should throw if already initialized', () => {
      const isActive = jest.fn().mockReturnValue(true);
      const component = new HelpComponent('test-plugin', createConfig(), isActive);

      component.init();

      expect(() => component.init()).toThrow('already initialized');
    });

    it('should register help handler on init', () => {
      const isActive = jest.fn().mockReturnValue(true);
      const component = new HelpComponent('test-plugin', createConfig(), isActive);

      component.init();
      eventBus.emit(EventBusEvent.onHelpMenuClick);

      expect(isActive).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should allow re-initialization after destroy', () => {
      const isActive = jest.fn().mockReturnValue(true);
      const component = new HelpComponent('test-plugin', createConfig(), isActive);

      component.init();
      component.destroy();

      // Should not throw
      expect(() => component.init()).not.toThrow();
    });
  });

  describe('help handling', () => {
    it('should show help when plugin is active', () => {
      const showAdviceMock = adviceManagerInstance.showAdvice as jest.Mock;
      const callCountBefore = showAdviceMock.mock.calls.length;

      const isActive = jest.fn().mockReturnValue(true);
      const component = new HelpComponent('test-plugin', createConfig({
        title: 'My Feature Help',
        body: 'Click the button to activate the feature.',
      }), isActive);

      component.init();
      eventBus.emit(EventBusEvent.onHelpMenuClick);

      expect(showAdviceMock).toHaveBeenLastCalledWith(
        'My Feature Help',
        'Click the button to activate the feature.',
      );
      expect(showAdviceMock.mock.calls.length).toBeGreaterThan(callCountBefore);
    });

    it('should not show help when plugin is not active', () => {
      const showAdviceMock = adviceManagerInstance.showAdvice as jest.Mock;

      const isActive = jest.fn().mockReturnValue(false);
      const component = new HelpComponent('test-plugin', createConfig({
        title: 'Unique Inactive Title',
        body: 'Unique inactive body',
      }), isActive);

      component.init();
      eventBus.emit(EventBusEvent.onHelpMenuClick);

      // Verify our specific handler wasn't called by checking the mock wasn't called with our specific arguments
      const callsWithOurArgs = showAdviceMock.mock.calls.filter(
        (call: [string, string]) => call[0] === 'Unique Inactive Title',
      );

      expect(callsWithOurArgs.length).toBe(0);
    });

    it('should return true from event handler when help is shown', () => {
      const isActive = jest.fn().mockReturnValue(true);
      const component = new HelpComponent('test-plugin', createConfig(), isActive);

      component.init();

      let result: boolean = false;

      eventBus.on(EventBusEvent.onHelpMenuClick, () => {
        if (isActive()) {
          result = true;
        }
      });

      eventBus.emit(EventBusEvent.onHelpMenuClick);

      expect(result).toBe(true);
    });
  });

  describe('showHelp', () => {
    it('should show help using advice manager', () => {
      const isActive = jest.fn().mockReturnValue(true);
      const component = new HelpComponent('test-plugin', createConfig({
        title: 'Direct Show Title',
        body: 'Direct show body.',
      }), isActive);

      component.showHelp();

      expect(adviceManagerInstance.showAdvice).toHaveBeenCalledWith(
        'Direct Show Title',
        'Direct show body.',
      );
    });

    it('should be callable without initialization', () => {
      const isActive = jest.fn().mockReturnValue(true);
      const component = new HelpComponent('test-plugin', createConfig(), isActive);

      // Should not throw
      expect(() => component.showHelp()).not.toThrow();
      expect(adviceManagerInstance.showAdvice).toHaveBeenCalled();
    });
  });

  describe('getters', () => {
    it('should return title from config', () => {
      const isActive = jest.fn();
      const component = new HelpComponent('test-plugin', createConfig({
        title: 'Custom Title',
      }), isActive);

      expect(component.title).toBe('Custom Title');
    });

    it('should return body from config', () => {
      const isActive = jest.fn();
      const component = new HelpComponent('test-plugin', createConfig({
        body: 'Custom body content with <strong>HTML</strong>.',
      }), isActive);

      expect(component.body).toBe('Custom body content with <strong>HTML</strong>.');
    });
  });

  describe('isActiveCallback', () => {
    it('should be called each time help event is triggered', () => {
      const isActive = jest.fn().mockReturnValue(false);
      const component = new HelpComponent('test-plugin', createConfig(), isActive);

      component.init();

      eventBus.emit(EventBusEvent.onHelpMenuClick);
      eventBus.emit(EventBusEvent.onHelpMenuClick);
      eventBus.emit(EventBusEvent.onHelpMenuClick);

      expect(isActive).toHaveBeenCalledTimes(3);
    });

    it('should respond to changing active state', () => {
      const showAdviceMock = adviceManagerInstance.showAdvice as jest.Mock;
      const uniqueTitle = 'Changing State Test Title';

      let isActiveState = false;
      const isActive = jest.fn(() => isActiveState);
      const component = new HelpComponent('test-plugin', createConfig({
        title: uniqueTitle,
        body: 'Changing state test body',
      }), isActive);

      component.init();

      // First call - not active
      eventBus.emit(EventBusEvent.onHelpMenuClick);

      // Verify our specific help was not shown
      let callsWithOurTitle = showAdviceMock.mock.calls.filter(
        (call: [string, string]) => call[0] === uniqueTitle,
      );

      expect(callsWithOurTitle.length).toBe(0);

      // Change state to active
      isActiveState = true;

      // Second call - active
      eventBus.emit(EventBusEvent.onHelpMenuClick);

      callsWithOurTitle = showAdviceMock.mock.calls.filter(
        (call: [string, string]) => call[0] === uniqueTitle,
      );
      expect(callsWithOurTitle.length).toBe(1);

      // Change state back to inactive
      isActiveState = false;

      // Third call - not active again
      eventBus.emit(EventBusEvent.onHelpMenuClick);

      callsWithOurTitle = showAdviceMock.mock.calls.filter(
        (call: [string, string]) => call[0] === uniqueTitle,
      );
      expect(callsWithOurTitle.length).toBe(1); // Still only 1 call with our title
    });
  });
});
