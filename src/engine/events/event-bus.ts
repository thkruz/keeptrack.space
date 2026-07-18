import type { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import type { OemSatellite } from '@app/app/objects/oem-satellite';
import type { User } from '@supabase/supabase-js';
import type { BaseObject, Satellite, Milliseconds } from '@ootk/src/main';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import type { StorageKey } from '../persistence/storage-key';
import type { RmbMenuContext } from '../plugins/core/plugin-capabilities';
import type { PanTouchEvent, TapTouchEvent } from '../input/input-manager/touch-input';
import type { LineManager } from '../rendering/line-manager';
import type { TextureStatus } from '../rendering/texture-load-registry';
import { errorManagerInstance } from '../utils/errorManager';
import { EventBusEvent } from './event-bus-events';

export interface EngineEventMap {
  [EventBusEvent.update]: [number];
  [EventBusEvent.bottomMenuClick]: [string];
  [EventBusEvent.hideSideMenus]: [];
  [EventBusEvent.orbitManagerInit]: [];
  [EventBusEvent.drawManagerLoadScene]: [];
  [EventBusEvent.drawOptionalScenery]: [];
  [EventBusEvent.drawOverlay]: [];
  [EventBusEvent.updateLoop]: [];
  [EventBusEvent.rmbMenuActions]: [string, number];
  [EventBusEvent.rightBtnMenuOpen]: [RmbMenuContext];
  [EventBusEvent.rightBtnMenuAdd]: [];
  [EventBusEvent.updateDateTime]: [Date];
  [EventBusEvent.calculateSimulationTime]: [Date];
  [EventBusEvent.selectedDateChange]: [Date];
  [EventBusEvent.propRateChanged]: [number];
  [EventBusEvent.uiManagerFinal]: [];
  [EventBusEvent.resetSensor]: [];
  [EventBusEvent.setSensor]: [DetailedSensor | string | null, number | null];
  [EventBusEvent.changeSensorMarkers]: [string];
  [EventBusEvent.resize]: [];
  [EventBusEvent.altCanvasResize]: [];
  [EventBusEvent.endOfDraw]: [Milliseconds];
  [EventBusEvent.captureStart]: [];
  [EventBusEvent.captureEnd]: [];
  [EventBusEvent.onWatchlistUpdated]: [{ id: number, inView: boolean }[]];
  [EventBusEvent.onWatchlistAdd]: [{ id: number, inView: boolean }[]];
  [EventBusEvent.onWatchlistRemove]: [{ id: number, inView: boolean }[]];
  [EventBusEvent.staticOffsetChange]: [number];
  [EventBusEvent.onLineAdded]: [LineManager];
  [EventBusEvent.onLinesCleared]: [LineManager];
  [EventBusEvent.sensorDotSelected]: [DetailedSensor];
  [EventBusEvent.canvasMouseDown]: [MouseEvent];
  [EventBusEvent.touchStart]: [TapTouchEvent | PanTouchEvent];
  [EventBusEvent.onCruncherMessage]: [];
  [EventBusEvent.onCruncherReady]: [];
  [EventBusEvent.onHelpMenuClick]: [];
  [EventBusEvent.helpMenuShown]: [string];
  [EventBusEvent.onKeepTrackReady]: [];
  [EventBusEvent.selectSatData]: [Satellite | MissileObject | BaseObject, number];
  [EventBusEvent.setSecondarySat]: [Satellite | null, number];
  [EventBusEvent.uiManagerInit]: [];
  [EventBusEvent.uiManagerOnReady]: [];
  [EventBusEvent.updateSelectBox]: [Satellite | MissileObject | OemSatellite];
  [EventBusEvent.ConeMeshUpdate]: [];
  [EventBusEvent.FrustumMeshUpdate]: [];
  [EventBusEvent.bottomMenuModeChange]: [];
  [EventBusEvent.saveSettings]: [];
  [EventBusEvent.remoteSettingsApplied]: [StorageKey[]]; // locally-changed keys from an account sync
  [EventBusEvent.filterChanged]: [];
  [EventBusEvent.loadSettings]: [];
  [EventBusEvent.KeyDown]: [string, string, boolean, boolean, boolean]; // key, code, isRepeat, isShiftKey, isCtrlKey
  [EventBusEvent.KeyUp]: [string, string, boolean, boolean, boolean]; // key, code, isRepeat, isShiftKey, isCtrlKey
  [EventBusEvent.KeyPress]: [string, string, boolean, boolean, boolean]; // key, code, isRepeat, isShiftKey, isCtrlKey
  [EventBusEvent.parseGetVariables]: [string[]]; // params
  [EventBusEvent.searchUpdated]: [string, number, number]; // search term, result count, search limit
  [EventBusEvent.layerUpdated]: [string]; // legend name
  [EventBusEvent.satInfoBoxAddListeners]: [];
  [EventBusEvent.satInfoBoxInit]: [];
  [EventBusEvent.satInfoBoxFinal]: [];
  [EventBusEvent.satInfoBoxShown]: [];
  [EventBusEvent.error]: [Error, string]; // error, function name
  [EventBusEvent.userAccountChange]: [User | null]; // user
  [EventBusEvent.userLogin]: [User | null]; // user
  [EventBusEvent.userLogout]: []; // no arguments
  [EventBusEvent.SceneReady]: []; // no arguments
  [EventBusEvent.highPerformanceRender]: [Milliseconds]; // delta time
  [EventBusEvent.soundMuteChanged]: [boolean]; // isMuted
  [EventBusEvent.renderCustomBackground]: [];
  [EventBusEvent.shouldSkipEarthDraw]: [];
  [EventBusEvent.shouldSkipSatelliteModels]: [];
  [EventBusEvent.shouldSkipTransparentObjects]: [];
  [EventBusEvent.screenshotComposite]: [CanvasRenderingContext2D, number, number];
  [EventBusEvent.screenshotShouldCropSquare]: [];
  [EventBusEvent.catalogReloaded]: [];
  [EventBusEvent.beforeFilterTLEDatabase]: [];
  [EventBusEvent.connectivityChange]: [boolean]; // isOnline
  [EventBusEvent.loginGateStateChange]: [boolean]; // isAuthenticated
  [EventBusEvent.colorSchemeChanged]: [unknown]; // scheme instance
  [EventBusEvent.scenarioBoundsChanged]: [unknown]; // ScenarioData
  [EventBusEvent.scenarioUpdated]: [unknown]; // ScenarioData
  [EventBusEvent.cameraTypeChanged]: [string]; // camera type name
  [EventBusEvent.viewportLayoutChanged]: [string]; // ViewportLayout value
  [EventBusEvent.onColorBufferReady]: [];
  [EventBusEvent.onFovPredictionReady]: [];
  [EventBusEvent.textureStatusChanged]: [TextureStatus];
  [EventBusEvent.settingsMenuRefresh]: [];
  [EventBusEvent.splashScreenHidden]: [];
}

interface EventBusRegisterParams<T extends EventBusEvent> {
  event: T;
  cb: (...args: EngineEventMap[T]) => void;
}

export class EventBus {
  private static instance_: EventBus;

  static getInstance(): EventBus {
    if (!EventBus.instance_) {
      EventBus.instance_ = new EventBus();
    }

    return EventBus.instance_;
  }

  events = {
    altCanvasResize: [] as EventBusRegisterParams<EventBusEvent.altCanvasResize>[],
  } as {
      [K in EventBusEvent]: EventBusRegisterParams<K>[];
    };

  methods = {
    altCanvasResize: (): boolean => this.events.altCanvasResize.some((cb) => cb.cb()),
    renderCustomBackground: (): boolean => (this.events[EventBusEvent.renderCustomBackground] || []).some((cb) => cb.cb()),
    shouldSkipEarthDraw: (): boolean => (this.events[EventBusEvent.shouldSkipEarthDraw] || []).some((cb) => cb.cb()),
    shouldSkipSatelliteModels: (): boolean => (this.events[EventBusEvent.shouldSkipSatelliteModels] || []).some((cb) => cb.cb()),
    shouldSkipTransparentObjects: (): boolean => (this.events[EventBusEvent.shouldSkipTransparentObjects] || []).some((cb) => cb.cb()),
    screenshotShouldCropSquare: (): boolean => (this.events[EventBusEvent.screenshotShouldCropSquare] || []).some((cb) => cb.cb()),
  };

  emit<T extends EventBusEvent>(event: T, ...args: EngineEventMap[T]) {
    this.verifyEvent_(event);

    const listeners = <EventBusRegisterParams<T>[]>this.events[event];

    // Hot path: this runs for every per-frame emit (update, updateLoop, endOfDraw, ...).
    // Branch on arity so the common 0/1-arg emits call the listener directly, avoiding the
    // per-listener arguments array + spread that forEach(cb => cb.cb(...args)) allocates.
    // for-of yields only in-range elements, so a once() listener that splices itself out
    // mid-emit stays crash-safe (same as the previous forEach).
    switch (args.length) {
      case 0:
        for (const listener of listeners) {
          (listener.cb as (...a: unknown[]) => void)();
        }
        break;
      case 1:
        for (const listener of listeners) {
          (listener.cb as (a: unknown) => void)(args[0]);
        }
        break;
      default:
        for (const listener of listeners) {
          listener.cb(...args);
        }
    }
  }

  async emitAsync<T extends EventBusEvent>(event: T, ...args: EngineEventMap[T]): Promise<void> {
    this.verifyEvent_(event);

    // Wrap each invocation in Promise.resolve().then(...) so a synchronous throw
    // in one listener turns into a rejected promise rather than bailing out of
    // the .map() before the remaining listeners are scheduled. Fail-fast still
    // applies: the first rejection rejects emitAsync, but every listener gets
    // a chance to run.
    await Promise.all(
      (<EventBusRegisterParams<T>[]>this.events[event]).map(
        (cb: EventBusRegisterParams<T>) => Promise.resolve().then(() => cb.cb(...args)),
      ),
    );
  }

  /**
   * Registers a callback function for a specific event.
   * @param {EventBusEvent} params.event - The name of the event to register the callback for.
   * @param {string} params.cbName - The name of the callback function.
   * @param params.cb - The callback function to register.
   * @throws An error if the event is invalid.
   */
  on<T extends EventBusEvent>(event: T, cb: (...args: EngineEventMap[T]) => void) {
    this.verifyEvent_(event);

    // Add the callback
    this.events[event].push({
      cb,
      event: <T><unknown>null,
    });
  }

  /** If the callback does not exist, create it */
  private verifyEvent_(event: EventBusEvent) {
    if (typeof this.events[event] === 'undefined') {
      this.events[event] = [];
    }
  }

  /**
   * Registers a callback function for a specific event that will be called only once.
   * @param {EventBusEvent} params.event - The name of the event to register the callback for.
   * @param {string} params.cbName - The name of the callback function.
   * @param params.cb - The callback function to register.
   */
  once<T extends EventBusEvent>(event: T, cb: (...args: EngineEventMap[T]) => void) {
    this.verifyEvent_(event);
    // Add the callback
    this.events[event].push({
      cb: (...args: EngineEventMap[T]) => {
        cb(...args);
        // if this.unregister is not null
        if (this.events[event]) {
          // Remove the callback after it has been called once
          this.unregister(event, cb);
        } else {
          errorManagerInstance.log(`Callback for event ${event} was not found in unregister.`);
        }
      },
      event: <T><unknown>null,
    });
  }

  unregister<T extends EventBusEvent>(event: T, cb: (...args: EngineEventMap[T]) => void) {
    for (let i = 0; i < this.events[event].length; i++) {
      if (this.events[event][i].cb === cb) {
        this.events[event].splice(i, 1);

        return;
      }
    }
    // If we got this far, it means we couldn't find the callback
    errorManagerInstance.log(`Callback for event ${event} was not found in unregister.`);
  }

  /**
   * Unregisters all events in the event bus. Used for testing.
   */
  unregisterAllEvents() {
    for (const event of Object.values(EventBusEvent)) {
      this.events[event] = [];
    }
  }

  init() {
    // Unused for now
  }
}
