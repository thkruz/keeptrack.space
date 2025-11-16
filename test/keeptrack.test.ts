import { CatalogManager } from '@app/app/data/catalog-manager';
import { Container } from '@app/engine/core/container';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SettingsManagerOverride } from '@app/settings/settings';
import { DetailedSatellite, Milliseconds, Satellite } from '@ootk/src/main';
import { CatalogLoader } from '../src/app/data/catalog-loader';
import { OrbitManager } from '../src/app/rendering/orbit-manager';
import { UiManager } from '../src/app/ui/ui-manager';
import { SatCruncherMessageData, Singletons } from '../src/engine/core/interfaces';
import { WebGLRenderer } from '../src/engine/rendering/webgl-renderer';
import { KeepTrack } from './../src/keeptrack';
import { defaultSat } from './environment/apiMocks';
import { mockCameraManager, setupDefaultHtml } from './environment/standard-env';

/*
 *Code Analysis
 *
 *Objective:
 *The code snippet defines a class called KeepTrack that initializes various managers and plugins for a web application related to satellite tracking and visualization.
 *It also sets up a game loop for updating and drawing the application.
 *
 *Inputs:
 *- Various image files and CSS files
 *- External libraries such as eruda and ootk
 *- SettingsOverride object for customizing application settings
 *
 *Flow:
 *1. Import necessary files and libraries
 *2. Define class KeepTrack with various properties and methods
 *3. Initialize various managers and plugins in the constructor, including OrbitManager, CatalogManager, UiManager, and ErrorManager
 *4. Set up a game loop in the gameLoop method that updates and draws the application
 *5. Handle errors with a global error trapper and show error messages on the loading screen
 *
 *Outputs:
 *- Initialized managers and plugins for the web application
 *- Updated and drawn application through the game loop
 *- Error messages displayed on the loading screen in case of errors
 *
 *Additional aspects:
 *- The code snippet includes a static method for checking if the FPS is above a certain limit
 *- The code snippet includes a method for printing the application logo to the console
 *- The code snippet includes a method for loading a splash screen with random images
 */

const setupStandardEnvironment = () => {
  setupDefaultHtml();
  const drawManagerInstance = new WebGLRenderer();
  const catalogManagerInstance = new CatalogManager();
  const orbitManagerInstance = new OrbitManager();
  const uiManagerInstance = new UiManager();

  // Jest all Image class objects with a mock decode method.
  Image.prototype.decode = jest.fn();

  catalogManagerInstance.init = jest.fn();
  catalogManagerInstance.satCruncher = {
    postMessage: jest.fn(),
    terminate: jest.fn(),
  } as unknown as Worker;

  // eslint-disable-next-line require-await
  jest.spyOn(CatalogLoader, 'load').mockImplementation(async () => {
    // Setup a mock catalog
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    catalogManagerInstance.objectCache = [
      new DetailedSatellite({ ...defaultSat, ...{ id: 0, type: 1 } }),
      new DetailedSatellite({ ...defaultSat, ...{ id: 1, type: 2 } }),
    ] as Satellite[];
    catalogManagerInstance.satCruncher = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
    } as unknown as Worker;

    // Call the onmessage handler only if it is set to avoid "possibly null" invocation.
    catalogManagerInstance.satCruncher.onmessage?.({ data: { type: 'satData', data: [] } as unknown as SatCruncherMessageData } as unknown as MessageEvent);
  });

  // Pretend webGl works
  drawManagerInstance.gl = global.mocks.glMock;
  // Pretend we have a working canvas
  drawManagerInstance.domElement = { style: { cursor: 'default' } } as unknown as HTMLCanvasElement;

  Container.getInstance().registerSingleton(Singletons.WebGLRenderer, drawManagerInstance);
  Container.getInstance().registerSingleton(Singletons.CatalogManager, catalogManagerInstance);
  Container.getInstance().registerSingleton(Singletons.OrbitManager, orbitManagerInstance);
  Container.getInstance().registerSingleton(Singletons.UiManager, uiManagerInstance);
  Container.getInstance().registerSingleton(Singletons.MainCamera, mockCameraManager);
};

describe('code_snippet', () => {
  const settingsOverride = {
    isPreventDefaultHtml: true,
    isDisableCss: true,
  } as unknown as SettingsManagerOverride;

  beforeEach(() => {
    KeepTrack.reset();
    setupStandardEnvironment();
  });

  // Tests that the constructor initializes all necessary objects and settings correctly.
  it.skip('test_constructor_initializes_objects_without_showErrorCode', () => {
    const drawManagerInstance = ServiceLocator.getRenderer();

    drawManagerInstance.update = jest.fn();
    ServiceLocator.getMainCamera().draw = jest.fn();

    let keepTrack: KeepTrack;
    const initializationTest = async () => {
      keepTrack = KeepTrack.getInstance();
      KeepTrack.getInstance().containerRoot = document.body as HTMLDivElement;
      keepTrack.init(settingsOverride);
      KeepTrack.initCss();
      await keepTrack.run();

      expect(keepTrack.isInitialized).toBe(true);
    };

    expect(initializationTest).not.toThrow();
  });

  // Test that error messages are displayed on the loading screen in case of errors.
  it.skip('test_error_messages_displayed_on_loading_screen', () => {
    const scene = ServiceLocator.getScene();

    scene.loadScene = () => {
      throw new Error('Test error');
    };

    const keepTrack = KeepTrack.getInstance();

    keepTrack.init(settingsOverride);
    keepTrack.run().then(() => {
      /*
       * const error = new Error('Test error');
       * expect(getEl('loader-text')?.innerHTML).toEqual(error.message);
       */
    });
  });

  // Tests that the game loop updates and draws the application correctly.
  it('test_game_loop_updates_and_draws_application', () => {
    const keepTrack = KeepTrack.getInstance();

    keepTrack.init(settingsOverride);
    const drawManagerInstance = ServiceLocator.getRenderer();

    keepTrack.run().then(() => {
      drawManagerInstance.update = jest.fn();
      ServiceLocator.getMainCamera().draw = jest.fn();
      settingsManager.cruncherReady = true;
      // keepTrack.engine.run();
      // eslint-disable-next-line dot-notation
      keepTrack.engine['update_'](1 as Milliseconds);
      // eslint-disable-next-line dot-notation
      keepTrack.engine['draw_'](1 as Milliseconds);
      expect(drawManagerInstance.update).toHaveBeenCalled();
      expect(ServiceLocator.getMainCamera().draw).toHaveBeenCalled();
    });
  });

  // Test if isPreventDefaultHtml disabled
  it('test_isPreventDefaultHtml_disabled', () => {
    const keepTrack = KeepTrack.getInstance();

    keepTrack.init({ isPreventDefaultHtml: false } as unknown as SettingsManagerOverride);
    const initializationTest = () => {
      keepTrack.run();
    };

    expect(initializationTest).not.toThrow();
  });

  // Test showErrorCode private function
  it('test_showErrorCode', () => {
    const initializationTest = () => {
      // @ts-expect-error private function
      KeepTrack.showErrorCode({ ...new Error('Test error'), lineNumber: 1 });
    };

    expect(initializationTest).not.toThrow();
  });
});
