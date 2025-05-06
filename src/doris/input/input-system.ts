import { InputEvents } from '@app/doris/events/event-types';
import { EventBus } from '../events/event-bus';
import { System } from '../system/system';
import { KeyboardHandler } from './keyboard-handler';
import { MouseHandler } from './mouse-handler';
import { TouchHandler } from './touch-handler';

/**
 * Manages input from various sources (keyboard, mouse, touch) by coordinating specialized handlers.
 */
export class InputSystem extends System {
  /**
   * Event bus for broadcasting input events
   */
  eventBus: EventBus;

  /**
   * Specialized input handlers
   */
  private readonly keyboardHandler: KeyboardHandler;
  private readonly mouseHandler: MouseHandler;
  private readonly touchHandler: TouchHandler;

  /**
   * DOM element that input events are attached to
   */
  private targetElement: HTMLElement;

  constructor(eventBus: EventBus) {
    super('InputSystem');
    this.eventBus = eventBus;

    // Create the specialized handlers
    this.keyboardHandler = new KeyboardHandler(this.eventBus);
    this.mouseHandler = new MouseHandler(this.eventBus);
    this.touchHandler = new TouchHandler(this.eventBus);
  }

  /**
   * Sets up the input handlers
   */
  initialize(targetElement: HTMLElement = document.body): void {
    this.targetElement = targetElement;

    // Initialize keyboard handler
    this.keyboardHandler.initialize();

    /*
     * For mouse and touch handlers, we need to provide canvas element
     * If targetElement is a canvas, use it directly
     */
    const canvas = this.targetElement instanceof HTMLCanvasElement
      ? this.targetElement
      : this.findOrCreateCanvas();

    // Initialize mouse and touch handlers with the canvas
    this.mouseHandler.initialize(canvas);
    this.touchHandler.initialize(canvas);

    // Register for any global event listeners that aren't covered by the specialized handlers
    this.setupGlobalListeners();
  }

  /**
   * Updates all input handlers
   * @param deltaTime Time elapsed since last update in milliseconds
   */
  update(deltaTime: number): void {
    // Update all handlers
    this.keyboardHandler.update(deltaTime);
    this.mouseHandler.update(deltaTime);
    this.touchHandler.update(deltaTime);
  }

  /**
   * Finds or creates a canvas element to use for input handling
   */
  private findOrCreateCanvas(): HTMLCanvasElement {
    // Try to find an existing canvas within the target element
    let canvas = this.targetElement.querySelector('canvas');

    if (!canvas) {
      // If no canvas exists, create one
      canvas = document.createElement('canvas');
      canvas.width = this.targetElement.clientWidth || 800;
      canvas.height = this.targetElement.clientHeight || 600;
      this.targetElement.appendChild(canvas);
    }

    return canvas;
  }

  /**
   * Sets up any global event listeners not covered by specialized handlers
   */
  private setupGlobalListeners(): void {
    /*
     * Handle window-level events that might not be covered by individual handlers
     * For example, focus/blur, visibility changes, etc.
     */
    window.addEventListener('blur', () => {
      /*
       * Reset input states when window loses focus
       * This prevents stuck keys and inputs
       */
      this.eventBus.emit(InputEvents.InputReset);
    });

    // Similarly, handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Reset input when page is hidden
        this.eventBus.emit(InputEvents.InputReset);
      }
    });
  }

  /**
   * Exposes input handler APIs for direct state checking
   */
  isKeyDown(key: string): boolean {
    return this.keyboardHandler.isKeyDown(key);
  }

  getMousePosition(): { x: number, y: number } {
    return this.mouseHandler.getPosition();
  }

  isMouseButtonDown(button: number): boolean {
    return this.mouseHandler.isButtonDown(button);
  }

  /**
   * Cleans up all event handlers
   */
  destroy(): void {
    // Clean up all handlers
    this.keyboardHandler.destroy();
    this.mouseHandler.destroy();
    this.touchHandler.destroy();

    /*
     * Clean up global listeners
     * (You'd need to bind the handlers to class properties to remove them properly)
     */
  }
}
