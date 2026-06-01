import { ClassificationBar } from '@app/plugins/classification-bar/classification-bar';
import { ClassificationString } from '@app/app/ui/classification';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import * as isThisNodeMod from '@app/engine/utils/isThisNode';
import { keepTrackApi } from '@app/keepTrackApi';
import { setupMinimumHtml, setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginInit, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('ClassificationBar', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(ClassificationBar, 'ClassificationBar');
});

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

  it('updateString returns early when the text element is missing', () => {
    // Browser branch so getEl returns null (instead of throwing) for the missing inner span.
    vi.spyOn(isThisNodeMod, 'isThisNode').mockReturnValue(false);

    // Pretend the container is already loaded so createContainer_ is skipped, then provide
    // only the container element (no inner classification-string span).
    (classificationPlugin as unknown as { isClassificationContainerLoaded_: boolean }).isClassificationContainerLoaded_ = true;
    const container = document.createElement('div');

    container.id = 'classification-container';
    document.body.appendChild(container);

    expect(() => classificationPlugin.updateString('Unclassified' as ClassificationString)).not.toThrow();
  });

  it('logs debug and skips creation when classificationStr is empty on uiManagerInit', () => {
    settingsManager.classificationStr = '' as ClassificationString;
    expect(() => classificationPlugin.init()).not.toThrow();

    const debugSpy = vi.spyOn(errorManagerInstance, 'debug');

    keepTrackApi.events.uiManagerInit.forEach((callback) => callback.cb());

    expect(debugSpy).toHaveBeenCalled();
  });
});
