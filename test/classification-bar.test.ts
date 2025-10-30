import { ClassificationString } from '@app/app/ui/classification';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { getEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import { ClassificationBar } from '@app/plugins/classification-bar/classification-bar';
import { setupMinimumHtml } from './environment/standard-env';
import { standardPluginInit, standardPluginSuite } from './generic-tests';

describe('classification_bar_plugin', () => {
  let classificationPlugin: ClassificationBar;

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    classificationPlugin = new ClassificationBar();
    setupMinimumHtml();
  });

  standardPluginSuite(ClassificationBar, 'Classification');

  it('process_init', () => {
    standardPluginInit(ClassificationBar);
    expect(getEl('classification-string')).toBeDefined();
  });

  /**
   * TODO: Remove KeepTrackApi dependency
   */
  it('process_init_with_settings_classification', () => {
    ['Unclassified', 'Secret', 'Top Secret', 'Top Secret//SCI'].forEach((testClassificationStr) => {
      PluginRegistry.unregisterAllPlugins();
      classificationPlugin = new ClassificationBar();
      setupMinimumHtml();
      settingsManager.classificationStr = testClassificationStr as ClassificationString;
      expect(() => classificationPlugin.init()).not.toThrow();

      expect(() => keepTrackApi.events.uiManagerInit.forEach((callback) => callback.cb())).not.toThrow();
      expect(() => keepTrackApi.events.uiManagerFinal.forEach((callback) => callback.cb())).not.toThrow();

      expect(getEl('classification-string')!.innerHTML).toBe(testClassificationStr);
    });
  });

  it('process_no_classification_container', () => {
    expect(() => classificationPlugin.updateString('Unclassified')).not.toThrow();
  });

  it('process_update_classification_unofficial_string', () => {
    settingsManager.classificationStr = 'Test' as ClassificationString;
    expect(() => classificationPlugin.init()).not.toThrow();

    expect(() => keepTrackApi.events.uiManagerInit.forEach((callback) => callback.cb())).not.toThrow();
    expect(() => keepTrackApi.events.uiManagerFinal.forEach((callback) => callback.cb())).not.toThrow();
  });
});
