import { EventBus } from '../events/event-bus';

/**
 * Base abstract class for all systems in the DORIS engine.
 * Systems are responsible for managing specific aspects of the engine,
 * such as rendering, physics, input, audio, etc.
 */
export abstract class System {
  /**
   * Unique identifier for this system
   */
  protected id: string;

  /**
   * Whether this system is currently enabled
   */
  protected enabled: boolean = true;

  /**
   * Priority for update order (lower numbers update first)
   */
  protected priority: number = 0;

  /**
   * Reference to the event bus for communication
   */
  protected eventBus?: EventBus;

  constructor(id: string = '') {
    this.id = id || this.constructor.name;
  }

  /**
   * Sets the event bus for this system
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
    this.onEventBusSet();
  }

  /**
   * Called when the event bus is set
   */
  protected onEventBusSet(): void {
    // Override in subclasses to register event handlers
  }

  /**
   * Gets the system ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Sets the system's priority
   */
  setPriority(priority: number): void {
    this.priority = priority;
  }

  /**
   * Gets the system's priority
   */
  getPriority(): number {
    return this.priority;
  }

  /**
   * Initializes the system
   */
  initialize(): void {
    // Override in subclasses
  }

  /**
   * Updates the system for the current frame
   * @param deltaTime Time elapsed since last update in milliseconds
   */
  abstract update(deltaTime: number): void;

  /**
   * Enables the system
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disables the system
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Checks if the system is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Cleans up resources when the system is destroyed
   */
  destroy(): void {
    // Override in subclasses to clean up resources
  }
}
