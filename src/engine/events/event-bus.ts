import type { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import type { User } from '@supabase/supabase-js';
import type { BaseObject, DetailedSatellite, DetailedSensor, Milliseconds } from '@ootk/src/main';
import type { PanTouchEvent, TapTouchEvent } from '../input/input-manager/touch-input';
import type { LineManager } from '../rendering/line-manager';
import { errorManagerInstance } from '../utils/errorManager';
import { EventBusEvent } from './event-bus-events';

export interface EngineEventMap {
  [EventBusEvent.update]: [number];
  [EventBusEvent.bottomMenuClick]: [string];
  [EventBusEvent.hideSideMenus]: [];
  [EventBusEvent.orbitManagerInit]: [];
  [EventBusEvent.drawManagerLoadScene]: [];
  [EventBusEvent.drawOptionalScenery]: [];
  [EventBusEvent.updateLoop]: [];
  [EventBusEvent.rmbMenuActions]: [string, number];
  [EventBusEvent.rightBtnMenuOpen]: [boolean, number];
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
  [EventBusEvent.onKeepTrackReady]: [];
  [EventBusEvent.selectSatData]: [DetailedSatellite | MissileObject | BaseObject, number];
  [EventBusEvent.setSecondarySat]: [DetailedSatellite | null, number];
  [EventBusEvent.uiManagerInit]: [];
  [EventBusEvent.uiManagerOnReady]: [];
  [EventBusEvent.updateSelectBox]: [DetailedSatellite | MissileObject];
  [EventBusEvent.ConeMeshUpdate]: [];
  [EventBusEvent.bottomMenuModeChange]: [];
  [EventBusEvent.saveSettings]: [];
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
  [EventBusEvent.error]: [Error, string]; // error, function name
  [EventBusEvent.userAccountChange]: [User | null]; // user
  [EventBusEvent.userLogin]: [User | null]; // user
  [EventBusEvent.userLogout]: []; // no arguments
  [EventBusEvent.SceneReady]: []; // no arguments
  [EventBusEvent.highPerformanceRender]: [Milliseconds]; // delta time
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
  };

  emit<T extends EventBusEvent>(event: T, ...args: EngineEventMap[T]) {
    this.verifyEvent_(event);

    (<EventBusRegisterParams<T>[]>this.events[event]).forEach((cb: EventBusRegisterParams<T>) => cb.cb(...args));
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
