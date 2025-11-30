import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { LinkedInLinkPlugin } from '@app/plugins/linkedin-link/linkedin-link';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';

describe('LinkedInLinkPlugin', () => {
  let linkedInLinkPlugin: LinkedInLinkPlugin;

  beforeEach(() => {
    setupStandardEnvironment([TopMenu]);
    linkedInLinkPlugin = new LinkedInLinkPlugin();
  });

  describe('basic functionality', () => {
    it('should initialize without errors', () => {
      expect(() => linkedInLinkPlugin.init()).not.toThrow();
    });

    it('should throw on double init', () => {
      linkedInLinkPlugin.init();
      expect(() => linkedInLinkPlugin.init()).toThrow();
    });

    it('should add html without errors', () => {
      expect(() => linkedInLinkPlugin.addHtml()).not.toThrow();
    });

    it('should throw on double addHtml', () => {
      linkedInLinkPlugin.addHtml();
      expect(() => linkedInLinkPlugin.addHtml()).toThrow();
    });

    it('should add js without errors', () => {
      expect(() => linkedInLinkPlugin.addJs()).not.toThrow();
    });

    it('should throw on double addJs', () => {
      linkedInLinkPlugin.addJs();
      expect(() => linkedInLinkPlugin.addJs()).toThrow();
    });
  });

  describe('onClick functionality', () => {
    let windowOpenSpy: jest.SpyInstance;

    beforeEach(() => {
      windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    });

    afterEach(() => {
      windowOpenSpy.mockRestore();
    });

    it('should open LinkedIn URL when clicked', () => {
      // Initialize the plugin
      linkedInLinkPlugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      // Simulate click
      linkedInLinkPlugin['onClick_']();

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://www.linkedin.com/company/keeptrackspace/',
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  describe('tooltipText', () => {
    it('should return localized tooltip text', () => {
      // The addHtml method sets the tooltipText
      linkedInLinkPlugin.addHtml();

      // After addHtml, tooltipText should be set
      expect(linkedInLinkPlugin['tooltipText']).toBeDefined();
      expect(typeof linkedInLinkPlugin['tooltipText']).toBe('string');
    });
  });

  describe('id property', () => {
    it('should have correct id', () => {
      expect(linkedInLinkPlugin.id).toBe('LinkedInLinkPlugin');
    });
  });

  describe('image property', () => {
    it('should have image defined', () => {
      expect(linkedInLinkPlugin['image']).toBeDefined();
    });
  });
});
