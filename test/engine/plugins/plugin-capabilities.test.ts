/**
 * @jest-environment jsdom
 */

import {
  hasBottomIcon,
  hasContextMenu,
  hasDownload,
  hasFormSubmit,
  hasHelp,
  hasKeyboardShortcuts,
  hasSecondaryMenu,
  hasSideMenu,
  IBottomIconCapable,
  IBottomIconConfig,
  IContextMenuCapable,
  IContextMenuConfig,
  IDownloadCapable,
  IFormSubmitCapable,
  IHelpCapable,
  IHelpConfig,
  IKeyboardShortcut,
  IKeyboardShortcutCapable,
  ISecondaryMenuCapable,
  ISecondaryMenuConfig,
  ISideMenuCapable,
  ISideMenuConfig,
  IRequiresSatellite,
  IRequiresSensor,
  requiresSatellite,
  requiresSensor,
} from '@app/engine/plugins/core/plugin-capabilities';
import { MenuMode } from '@app/engine/core/interfaces';

describe('Plugin Capabilities Type Guards', () => {
  describe('hasBottomIcon', () => {
    it('should return true for objects implementing IBottomIconCapable', () => {
      const plugin: IBottomIconCapable = {
        getBottomIconConfig: (): IBottomIconConfig => ({
          elementName: 'test-icon',
          label: 'Test',
          image: 'test.png',
          menuMode: [MenuMode.ALL],
        }),
      };

      expect(hasBottomIcon(plugin)).toBe(true);
    });

    it('should return false for objects not implementing IBottomIconCapable', () => {
      const plugin = { id: 'test' };

      expect(hasBottomIcon(plugin)).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(hasBottomIcon(null)).toBe(false);
      expect(hasBottomIcon(undefined)).toBe(false);
    });
  });

  describe('hasSideMenu', () => {
    it('should return true for objects implementing ISideMenuCapable', () => {
      const plugin: ISideMenuCapable = {
        getSideMenuConfig: (): ISideMenuConfig => ({
          elementName: 'test-menu',
          title: 'Test Menu',
          html: '<div>Test</div>',
        }),
      };

      expect(hasSideMenu(plugin)).toBe(true);
    });

    it('should return false for objects not implementing ISideMenuCapable', () => {
      const plugin = { id: 'test' };

      expect(hasSideMenu(plugin)).toBe(false);
    });
  });

  describe('hasSecondaryMenu', () => {
    it('should return true for objects implementing ISecondaryMenuCapable', () => {
      const plugin: ISecondaryMenuCapable = {
        getSecondaryMenuConfig: (): ISecondaryMenuConfig => ({
          html: '<div>Settings</div>',
        }),
      };

      expect(hasSecondaryMenu(plugin)).toBe(true);
    });

    it('should return false for objects not implementing ISecondaryMenuCapable', () => {
      const plugin = { id: 'test' };

      expect(hasSecondaryMenu(plugin)).toBe(false);
    });
  });

  describe('hasContextMenu', () => {
    it('should return true for objects implementing IContextMenuCapable', () => {
      const plugin: IContextMenuCapable = {
        getContextMenuConfig: (): IContextMenuConfig => ({
          level1Html: '<li>Action</li>',
          level1ElementName: 'test-l1',
          level2Html: '<ul></ul>',
          level2ElementName: 'test-l2',
        }),
        onContextMenuAction: jest.fn(),
      };

      expect(hasContextMenu(plugin)).toBe(true);
    });

    it('should return false for objects not implementing IContextMenuCapable', () => {
      const plugin = { id: 'test' };

      expect(hasContextMenu(plugin)).toBe(false);
    });
  });

  describe('hasHelp', () => {
    it('should return true for objects implementing IHelpCapable', () => {
      const plugin: IHelpCapable = {
        getHelpConfig: (): IHelpConfig => ({
          title: 'Help Title',
          body: 'Help body content',
        }),
      };

      expect(hasHelp(plugin)).toBe(true);
    });

    it('should return false for objects not implementing IHelpCapable', () => {
      const plugin = { id: 'test' };

      expect(hasHelp(plugin)).toBe(false);
    });
  });

  describe('hasFormSubmit', () => {
    it('should return true for objects implementing IFormSubmitCapable', () => {
      const plugin: IFormSubmitCapable = {
        onFormSubmit: jest.fn(),
      };

      expect(hasFormSubmit(plugin)).toBe(true);
    });

    it('should return false for objects not implementing IFormSubmitCapable', () => {
      const plugin = { id: 'test' };

      expect(hasFormSubmit(plugin)).toBe(false);
    });
  });

  describe('hasDownload', () => {
    it('should return true for objects implementing IDownloadCapable', () => {
      const plugin: IDownloadCapable = {
        onDownload: jest.fn(),
      };

      expect(hasDownload(plugin)).toBe(true);
    });

    it('should return false for objects not implementing IDownloadCapable', () => {
      const plugin = { id: 'test' };

      expect(hasDownload(plugin)).toBe(false);
    });
  });

  describe('hasKeyboardShortcuts', () => {
    it('should return true for objects implementing IKeyboardShortcutCapable', () => {
      const plugin: IKeyboardShortcutCapable = {
        getKeyboardShortcuts: (): IKeyboardShortcut[] => [
          { key: 'N', callback: jest.fn() },
        ],
      };

      expect(hasKeyboardShortcuts(plugin)).toBe(true);
    });

    it('should return false for objects not implementing IKeyboardShortcutCapable', () => {
      const plugin = { id: 'test' };

      expect(hasKeyboardShortcuts(plugin)).toBe(false);
    });
  });

  describe('requiresSensor', () => {
    it('should return true for objects implementing IRequiresSensor', () => {
      const plugin: IRequiresSensor = {
        requiresSensorSelected: true,
      };

      expect(requiresSensor(plugin)).toBe(true);
    });

    it('should return false for objects not implementing IRequiresSensor', () => {
      const plugin = { id: 'test' };

      expect(requiresSensor(plugin)).toBe(false);
    });
  });

  describe('requiresSatellite', () => {
    it('should return true for objects implementing IRequiresSatellite', () => {
      const plugin: IRequiresSatellite = {
        requiresSatelliteSelected: true,
      };

      expect(requiresSatellite(plugin)).toBe(true);
    });

    it('should return false for objects not implementing IRequiresSatellite', () => {
      const plugin = { id: 'test' };

      expect(requiresSatellite(plugin)).toBe(false);
    });
  });
});

describe('Plugin Capability Interfaces', () => {
  describe('IBottomIconConfig', () => {
    it('should accept valid configuration', () => {
      const config: IBottomIconConfig = {
        elementName: 'test-bottom-icon',
        label: 'Test Plugin',
        image: 'test.png',
        menuMode: [MenuMode.BASIC, MenuMode.ADVANCED],
        order: 100,
        isDisabledOnLoad: false,
      };

      expect(config.elementName).toBe('test-bottom-icon');
      expect(config.menuMode).toContain(MenuMode.BASIC);
    });

    it('should accept minimal configuration', () => {
      const config: IBottomIconConfig = {
        elementName: 'test-bottom-icon',
        label: 'Test Plugin',
        image: 'test.png',
      };

      expect(config.elementName).toBe('test-bottom-icon');
      expect(config.menuMode).toBeUndefined();
    });
  });

  describe('ISideMenuConfig', () => {
    it('should accept valid configuration', () => {
      const config: ISideMenuConfig = {
        elementName: 'test-menu',
        title: 'Test Menu',
        html: '<div>Content</div>',
        zIndex: 10,
        width: 400,
        dragOptions: {
          isDraggable: true,
          minWidth: 200,
          maxWidth: 600,
        },
      };

      expect(config.elementName).toBe('test-menu');
      expect(config.dragOptions?.isDraggable).toBe(true);
    });
  });

  describe('IContextMenuConfig', () => {
    it('should accept valid configuration', () => {
      const config: IContextMenuConfig = {
        level1Html: '<li class="rmb-item">Action</li>',
        level1ElementName: 'test-rmb-l1',
        level2Html: '<ul><li>Sub Action</li></ul>',
        level2ElementName: 'test-rmb-l2',
        order: 50,
        isVisibleOnEarth: true,
        isVisibleOffEarth: false,
        isVisibleOnSatellite: true,
      };

      expect(config.level1ElementName).toBe('test-rmb-l1');
      expect(config.isVisibleOnSatellite).toBe(true);
    });
  });

  describe('IKeyboardShortcut', () => {
    it('should accept valid configuration', () => {
      const shortcut: IKeyboardShortcut = {
        key: 'N',
        code: 'KeyN',
        ctrl: false,
        shift: false,
        alt: false,
        callback: () => { /* toggle something */ },
      };

      expect(shortcut.key).toBe('N');
      expect(typeof shortcut.callback).toBe('function');
    });

    it('should accept minimal configuration', () => {
      const shortcut: IKeyboardShortcut = {
        key: 'Escape',
        callback: () => { /* close menu */ },
      };

      expect(shortcut.key).toBe('Escape');
      expect(shortcut.ctrl).toBeUndefined();
    });
  });
});
