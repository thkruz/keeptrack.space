import { Container } from '@app/engine/core/container';
import { Singletons } from '@app/engine/core/interfaces';
import { SoundManager } from '@app/engine/audio/sound-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('TopMenu', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(TopMenu, 'TopMenu');
});

describe('TopMenu_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    const soundManagerPlugin = new SoundManager();

    Container.getInstance().registerSingleton(Singletons.SoundManager, soundManagerPlugin);
  });

  standardPluginSuite(TopMenu, 'TopMenu');
});
