import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { GithubLinkPlugin } from '@app/plugins/github-link/github-link';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';

describe('GithubLinkPlugin', () => {
  let githubLinkPlugin: GithubLinkPlugin;

  beforeEach(() => {
    setupStandardEnvironment([TopMenu]);
    githubLinkPlugin = new GithubLinkPlugin();
  });

  describe('basic functionality', () => {
    it('should initialize without errors', () => {
      expect(() => githubLinkPlugin.init()).not.toThrow();
    });

    it('should throw on double init', () => {
      githubLinkPlugin.init();
      expect(() => githubLinkPlugin.init()).toThrow();
    });

    it('should add html without errors', () => {
      expect(() => githubLinkPlugin.addHtml()).not.toThrow();
    });

    it('should throw on double addHtml', () => {
      githubLinkPlugin.addHtml();
      expect(() => githubLinkPlugin.addHtml()).toThrow();
    });

    it('should add js without errors', () => {
      expect(() => githubLinkPlugin.addJs()).not.toThrow();
    });

    it('should throw on double addJs', () => {
      githubLinkPlugin.addJs();
      expect(() => githubLinkPlugin.addJs()).toThrow();
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

    it('should open GitHub URL when clicked', () => {
      // Initialize the plugin
      githubLinkPlugin.init();
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      // Simulate click
      githubLinkPlugin['onClick_']();

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://github.com/thkruz/keeptrack.space/',
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  describe('tooltipText', () => {
    it('should return localized tooltip text', () => {
      // The addHtml method sets the tooltipText
      githubLinkPlugin.addHtml();

      // After addHtml, tooltipText should be set
      expect(githubLinkPlugin['tooltipText']).toBeDefined();
      expect(typeof githubLinkPlugin['tooltipText']).toBe('string');
    });
  });

  describe('id property', () => {
    it('should have correct id', () => {
      expect(githubLinkPlugin.id).toBe('GithubLinkPlugin');
    });
  });

  describe('image property', () => {
    it('should have image defined', () => {
      expect(githubLinkPlugin['image']).toBeDefined();
    });
  });
});
