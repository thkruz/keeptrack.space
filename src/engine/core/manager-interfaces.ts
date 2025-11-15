/**
 * Generic interfaces for application managers.
 * These interfaces allow the engine to work with app-specific implementations
 * without creating tight coupling to concrete classes.
 */

import type { BaseObject, DetailedSatellite } from '@ootk/src/main';
import type { GetSatType, SensorObjectCruncher } from './interfaces';

/**
 * Density bin for spatial density calculations
 */
export interface IDensityBin {
  minAltitude: number;
  maxAltitude: number;
  count: number;
  density: number; // spatial density (objects per km³)
}

/**
 * Interface for managing satellite catalogs and space objects
 */
export interface ICatalogManager {
  /**
   * Get an object by its satellite number
   */
  getObject(id: number, getSatType?: GetSatType): BaseObject | null;

  /**
   * Array of all objects in the catalog
   */
  objectCache: BaseObject[];

  /**
   * Web worker for satellite position calculations
   */
  satCruncher: Worker;

  /**
   * Number of orbital satellites
   */
  orbitalSats: number;

  /**
   * Number of satellites (excluding static objects)
   */
  numSatellites: number;

  /**
   * Number of all objects
   */
  numObjects: number;

  /**
   * Whether sensor manager is loaded
   */
  isSensorManagerLoaded: boolean;

  /**
   * Orbit density data
   */
  orbitDensity: IDensityBin[];

  /**
   * Maximum orbit density
   */
  orbitDensityMax: number;

  /**
   * Orbital plane density data
   */
  orbitalPlaneDensity: number[][];

  /**
   * Maximum orbital plane density
   */
  orbitalPlaneDensityMax: number;

  /**
   * Convert international designator to object ID
   */
  intlDes2id?(intlDes: string): number | null;

  /**
   * Convert SCC number to object ID
   */
  sccNum2Id?(sccNum: number): number | null;
}

/**
 * Interface for managing groups of objects
 */
export interface IGroupsManager {
  /**
   * Get objects in a specific group
   */
  getGroup(groupName: string): number[] | null;

  /**
   * Create a new group
   */
  createGroup?(groupName: string, objectIds: number[]): void;

  /**
   * Delete a group
   */
  deleteGroup?(groupName: string): void;
}

/**
 * Interface for sensor management
 */
export interface ISensorManager {
  /**
   * Currently selected sensors (array)
   */
  currentSensors: SensorObjectCruncher[];

  /**
   * Get all sensors
   */
  getAllSensors?(): SensorObjectCruncher[];

  /**
   * Check if a sensor is selected
   */
  isSensorSelected?(): boolean;

  /**
   * Calculate sensor position
   */
  calculateSensorPos?(time: Date, sensors: SensorObjectCruncher[]): any;

  /**
   * Get sensor by ID
   */
  getSensor?(id: number): SensorObjectCruncher | null;

  /**
   * Set the current sensor
   */
  setSensor?(sensor: SensorObjectCruncher | null): void;
}

/**
 * Interface for sensor-related calculations
 */
export interface ISensorMath {
  /**
   * Calculate if an object is in view of a sensor
   */
  isInView?(sat: DetailedSatellite, sensor?: SensorObjectCruncher): boolean;

  /**
   * Calculate sensor-to-satellite look angles
   */
  calculateLookAngles?(sat: DetailedSatellite, sensor?: SensorObjectCruncher): any;
}

/**
 * Interface for UI management
 */
export interface IUiManager {
  /**
   * Show a toast notification
   */
  toast?(message: string, type?: string): void;

  /**
   * Update search results
   */
  searchUpdate?(): void;

  /**
   * Initialize the UI
   */
  init?(): void;
}

/**
 * Interface for hover state management
 */
export interface IHoverManager {
  /**
   * Currently hovered object
   */
  hoveredSat: number;

  /**
   * Set the hovered object
   */
  setHoveredSat?(id: number): void;

  /**
   * Clear the hovered state
   */
  clearHover?(): void;
}
