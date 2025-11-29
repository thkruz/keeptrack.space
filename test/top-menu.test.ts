import { SoundManager } from '@app/engine/audio/sound-manager';
import { Container } from '@app/engine/core/container';
import { Singletons } from '@app/engine/core/interfaces';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite } from './generic-tests';

describe('TopMenu_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    const soundManagerPlugin = new SoundManager();

    Container.getInstance().registerSingleton(Singletons.SoundManager, soundManagerPlugin);
  });

  standardPluginSuite(TopMenu, 'TopMenu');
});
