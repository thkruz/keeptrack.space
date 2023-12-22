import * as gremlins from 'gremlins.js';

import { getEl, setInnerHtml } from '@app/lib/get-el';

import { KeepTrackApiEvents, keepTrackApi } from '@app/keepTrackApi';
import debugPng from '@public/img/icons/debug.png';

import { LineTypes, lineManagerInstance } from '@app/singletons/draw-manager/line-manager';
import eruda from 'eruda';
import { Milliseconds } from 'ootk';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class DebugMenuPlugin extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Debug Menu';
  isErudaVisible = false;
  constructor() {
    super(DebugMenuPlugin.PLUGIN_NAME);
  }

  bottomIconImg = debugPng;
  bottomIconElementName = 'menu-debug';
  bottomIconLabel = 'Debug';

  dragOptions: clickDragOptions = {
    isDraggable: true,
    minWidth: 300,
    maxWidth: 500,
  };

  helpTitle: string = 'Debug Menu';
  helpBody: string = keepTrackApi.html`The Debug Menu is used for debugging the app. It is probably not very useful unless you are assisting me with debugging an issue
  <br><br>
  Open Debug Menu allows you to access the console even when it is blocked by the browser. This is useful for debugging issues that only occur in the browser console.
  <br><br>
  Run Gremlins will run a series of tests to try to break the app. This kind of fuzz testing is useful for testing the app's robustness.`;

  sideMenuElementName = 'debug-menu';
  sideMenuElementHtml = keepTrackApi.html`
    <div id="debug-menu" class="side-menu-parent start-hidden text-select">
      <div id="debug-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Debug Menu</h5>
          <div class="center-align row">
            <button id="debug-console" class="btn btn-ui waves-effect waves-light" type="button">Open Debug Menu &#9658;</button>
          </div>
          <div class="center-align row">
            <button id="debug-gremlins" class="btn btn-ui waves-effect waves-light" type="button">Unleash Gremlins &#9658;</button>
          </div>
        </div>
        <div class="row">
          <h6 class="center-align">Camera</h5>
          <div class="center-align row">
            <span id="debug-camera-position-x"></span>
          </div>
          <div class="center-align row">
            <span id="debug-camera-position-y"></span>
          </div>
          <div class="center-align row">
            <span id="debug-camera-position-z"></span>
          </div>
          <div class="center-align row">
            <span id="debug-camera-distance-from-earth"></span>
          </div>
          <div class="center-align row">
            <button id="debug-cam-to-center" class="btn btn-ui waves-effect waves-light" type="button">Draw Cam to Center Line &#9658;</button>
          </div>
          <div class="center-align row">
            <button id="debug-cam-to-sat" class="btn btn-ui waves-effect waves-light" type="button">Draw Cam to Sat Line &#9658;</button>
          </div>
        </div>
        <div class="row">
          <h6 class="center-align">Satellite</h5>
          <div class="center-align row">
            <span id="debug-sat-position-x"></span>
          </div>
          <div class="center-align row">
            <span id="debug-sat-position-y"></span>
          </div>
          <div class="center-align row">
            <span id="debug-sat-position-z"></span>
          </div>
        </div>
    </div>
  `;

  gremlinsSettings = {
    nb: 100000,
    delay: 5,
  };

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: (): void => {
        getEl('debug-console')?.addEventListener('click', () => {
          if (this.isErudaVisible) {
            eruda.hide();
            this.isErudaVisible = false;
          } else {
            eruda.show();
            this.isErudaVisible = true;
          }
        });

        getEl('debug-gremlins')?.addEventListener('click', () => {
          this.runGremlins();
        });

        getEl('debug-cam-to-sat')?.addEventListener('click', () => {
          const camera = keepTrackApi.getMainCamera();
          if (camera) {
            const selectedSat = keepTrackApi.getPlugin(SelectSatManager)?.selectedSat;
            if (!selectedSat || selectedSat === -1) return;

            const sat = keepTrackApi.getCatalogManager().getSat(selectedSat);
            if (sat) {
              const offsetFromSat = keepTrackApi.getMainCamera().getCameraPosition(sat.position, keepTrackApi.getMainCamera().getCameraOrientation());
              const position = [sat.position.x + offsetFromSat[0], sat.position.y + offsetFromSat[1], sat.position.z + offsetFromSat[2]];
              lineManagerInstance.create(LineTypes.REF_TO_SAT, [selectedSat, position[0], position[1], position[2]], 'o');
            }
          }
        });

        getEl('debug-cam-to-center')?.addEventListener('click', () => {
          const camera = keepTrackApi.getMainCamera();
          if (camera) {
            const position = camera.getCameraPosition();
            lineManagerInstance.create(LineTypes.CENTER_OF_EARTH_TO_REF, [position[0], position[1], position[2]], 'r');
          }
        });
      },
    });
  }

  delayForCameraUpdates = <Milliseconds>1000;
  lastCameraUpdate = <Milliseconds>0;

  addJs(): void {
    super.addJs();

    keepTrackApi.register({
      event: KeepTrackApiEvents.updateLoop,
      cbName: this.PLUGIN_NAME,
      cb: (): void => {
        if (new Date().getTime() - this.lastCameraUpdate < this.delayForCameraUpdates) return;
        const camera = keepTrackApi.getMainCamera();
        const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager);

        if (camera && selectSatManagerInstance) {
          const selectedSat = selectSatManagerInstance.selectedSat;
          const sat = selectedSat !== -1 ? keepTrackApi.getCatalogManager().getSat(selectedSat) : null;

          const position = camera.getCameraPosition(sat?.position);
          setInnerHtml('debug-camera-position-x', `X: ${position[0].toFixed(2)}`);
          setInnerHtml('debug-camera-position-y', `Y: ${position[1].toFixed(2)}`);
          setInnerHtml('debug-camera-position-z', `Z: ${position[2].toFixed(2)}`);
          setInnerHtml('debug-camera-distance-from-earth', `Distance from Center: ${camera.getCameraDistance().toFixed(2)} km`);
          this.lastCameraUpdate = <Milliseconds>new Date().getTime();
        }
        if (selectSatManagerInstance.selectedSat >= 0) {
          const sat = keepTrackApi.getCatalogManager().getSat(selectSatManagerInstance.selectedSat);
          if (!sat) {
            console.warn('Satellite not found');
            return;
          }
          const position = sat.position;
          setInnerHtml('debug-sat-position-x', `X: ${position.x.toFixed(2)}`);
          setInnerHtml('debug-sat-position-y', `Y: ${position.y.toFixed(2)}`);
          setInnerHtml('debug-sat-position-z', `Z: ${position.z.toFixed(2)}`);
        }
      },
    });
  }

  /*
   * Returns a random integer between min (inclusive) and max (inclusive).
   * The value is no lower than min (or the next integer greater than min
   * if min isn't an integer) and no greater than max (or the next integer
   * lower than max if max isn't an integer).
   * Using Math.round() will give you a non-uniform distribution!
   */
  private static getRandomInt_(min: number, max: number): number {
    min = Number.isNaN(min) ? 0 : Math.ceil(min);
    max = Number.isNaN(max) ? 100 : Math.floor(max);
    // The use of Math.random here is for debugging purposes only.
    // It is not used in any cryptographic way.
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private static defaultPositionSelector_() {
    const x = DebugMenuPlugin.getRandomInt_(0, Math.max(0, document.documentElement.clientWidth - 1));
    const y = DebugMenuPlugin.getRandomInt_(Math.max(0, document.documentElement.clientHeight - 100), Math.max(0, document.documentElement.clientHeight - 1));
    return [x, y];
  }

  private static canClick_(element: { parentElement: { className: string } }) {
    if (typeof element.parentElement == 'undefined' || element.parentElement == null) return null;
    return element.parentElement.className === 'bmenu-item';
  }

  startGremlins() {
    const bottomMenuGremlinClicker = gremlins.species.clicker({
      // Click only if parent is has class test-class
      canClick: DebugMenuPlugin.canClick_,
      defaultPositionSelector: DebugMenuPlugin.defaultPositionSelector_,
    });
    const bottomMenuGremlinScroller = gremlins.species.toucher({
      touchTypes: ['gesture'],
      defaultPositionSelector: DebugMenuPlugin.defaultPositionSelector_,
    });
    const distributionStrategy = gremlins.strategies.distribution({
      distribution: [0.3, 0.3, 0.1, 0.1, 0.1, 0.1],
      delay: this.gremlinsSettings.delay,
    });

    gremlins
      .createHorde({
        species: [
          bottomMenuGremlinClicker,
          bottomMenuGremlinScroller,
          gremlins.species.clicker(),
          gremlins.species.toucher(),
          gremlins.species.formFiller(),
          gremlins.species.typer({
            log: true,
            logger: console,
          }),
        ],
        mogwais: [gremlins.mogwais.alert(), gremlins.mogwais.fps(), gremlins.mogwais.gizmo({ maxErrors: 1000 })],
        strategies: [distributionStrategy],
      })
      .unleash();
  }

  runGremlins() {
    // If any of the required elements are missing then throw an error
    if (!getEl('nav-footer')) throw new Error('nav-footer is missing');
    if (!getEl('nav-footer-toggle')) throw new Error('nav-footer-toggle is missing');
    if (!getEl('bottom-icons-container')) throw new Error('bottom-icons-container is missing');
    if (!getEl('bottom-icons')) throw new Error('bottom-icons is missing');

    (<HTMLElement>getEl('nav-footer')).style.height = '200px';
    (<HTMLElement>getEl('nav-footer-toggle')).style.display = 'none';
    (<HTMLElement>getEl('bottom-icons-container')).style.height = '200px';
    (<HTMLElement>getEl('bottom-icons')).style.height = '200px';
    this.startGremlins();
  }
}

export const debugMenuPlugin = new DebugMenuPlugin();
