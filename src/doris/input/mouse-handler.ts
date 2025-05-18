import { EventBus } from '../events/event-bus';
import { InputEvents } from '../events/event-types';

/**
 * Basic mouse input handler
 */
export class MouseHandler {
  private readonly mousePosition = { x: 0, y: 0 };
  private readonly prevMousePosition = { x: 0, y: 0 };
  private buttonStates: boolean[] = [false, false, false]; // Primary, Secondary, Middle
  private isDragging = false;
  private dragButton = -1;
  private element: HTMLElement;
  private mouseMoveTimeout = -1;

  constructor(
    private readonly eventBus: EventBus,
  ) {
    // Initialize mouse event listeners
  }

  /**
   * Initialize mouse event listeners
   */
  initialize(canvas: HTMLCanvasElement): void {
    this.element = canvas;
    this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.element.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.element.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.element.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
    this.element.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.element.addEventListener('wheel', this.handleMouseWheel.bind(this));
    this.element.addEventListener('contextmenu', this.handleContextMenu.bind(this));

    // Add window listeners for mouseup outside the element
    window.addEventListener('mouseup', this.handleWindowMouseUp.bind(this));
  }

  /**
   * Update method called each frame
   * @param deltaTime Time elapsed since last update in milliseconds
   */
  update(deltaTime: number): void {
    if (deltaTime <= 0) {
      return;
    }
    // Store previous position for delta calculations
    this.prevMousePosition.x = this.mousePosition.x;
    this.prevMousePosition.y = this.mousePosition.y;
  }

  /**
   * Get current mouse position
   */
  getPosition(): { x: number, y: number } {
    return { ...this.mousePosition };
  }

  /**
   * Check if a mouse button is currently pressed
   * @param button Button index (0: primary, 1: secondary, 2: middle)
   */
  isButtonDown(button: number): boolean {
    return this.buttonStates[button] || false;
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.element.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.element.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.element.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.element.removeEventListener('mouseenter', this.handleMouseEnter.bind(this));
    this.element.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.element.removeEventListener('wheel', this.handleMouseWheel.bind(this));
    this.element.removeEventListener('contextmenu', this.handleContextMenu.bind(this));

    window.removeEventListener('mouseup', this.handleWindowMouseUp.bind(this));
  }

  /**
   * Handle mouse down events
   */
  private handleMouseDown(event: MouseEvent): void {
    const rect = this.element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const button = event.button;

    this.buttonStates[button] = true;
    this.mousePosition.x = x;
    this.mousePosition.y = y;

    this.eventBus.emit(InputEvents.MouseDown, event, x, y, button);

    // Start drag
    this.isDragging = true;
    this.dragButton = button;
    this.eventBus.emit(InputEvents.MouseDragStart, event, x, y, button);
  }

  /**
   * Handle mouse up events
   */
  private handleMouseUp(event: MouseEvent): void {
    const rect = this.element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const button = event.button;

    this.buttonStates[button] = false;
    this.mousePosition.x = x;
    this.mousePosition.y = y;

    this.eventBus.emit(InputEvents.MouseUp, event, x, y, button);

    // End drag if this is the drag button
    if (this.isDragging && this.dragButton === button) {
      this.isDragging = false;
      this.dragButton = -1;
      this.eventBus.emit(InputEvents.MouseDragEnd, event, x, y, button);
    }
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(event: MouseEvent): void {
    if (this.mouseMoveTimeout === -1) {
      // Avoid running the event handler too often, no more than 60 FPS
      this.mouseMoveTimeout = window.setTimeout(() => {
        const rect = this.element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const deltaX = x - this.mousePosition.x;
        const deltaY = y - this.mousePosition.y;

        this.mousePosition.x = x;
        this.mousePosition.y = y;

        this.eventBus.emit(InputEvents.MouseMove, event, x, y, deltaX, deltaY);

        // Emit drag event if dragging
        if (this.isDragging) {
          this.eventBus.emit(
            InputEvents.MouseDrag,
            event,
            x,
            y,
            deltaX,
            deltaY,
            this.dragButton,
          );
        }

        // Clear the timeout
        this.mouseMoveTimeout = -1;
      }, 16);
    }
  }

  /**
   * Handle mouse enter events
   */
  private handleMouseEnter(event: MouseEvent): void {
    const rect = this.element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.mousePosition.x = x;
    this.mousePosition.y = y;

    this.eventBus.emit(InputEvents.MouseEnter, event, x, y);
  }

  /**
   * Handle mouse leave events
   */
  private handleMouseLeave(event: MouseEvent): void {
    const rect = this.element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.mousePosition.x = x;
    this.mousePosition.y = y;

    this.eventBus.emit(InputEvents.MouseLeave, event, x, y);
  }

  /**
   * Handle mouse wheel events
   */
  private handleMouseWheel(event: WheelEvent): void {
    event.preventDefault();

    const rect = this.element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const delta = event.deltaY;

    this.eventBus.emit(InputEvents.MouseWheel, event, x, y, delta);
  }

  /**
   * Handle context menu events
   */
  private handleContextMenu(event: MouseEvent): void {
    event.preventDefault();

    const rect = this.element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.eventBus.emit(InputEvents.ContextMenu, event, x, y);
  }

  /**
   * Handle mouse up events outside the element
   */
  private handleWindowMouseUp(event: MouseEvent): void {
    // Only handle if we were dragging
    if (this.isDragging && event.button === this.dragButton) {
      this.buttonStates[event.button] = false;
      this.isDragging = false;
      this.dragButton = -1;

      /*
       * We can't get proper coordinates outside the element,
       * so just use the last known position
       */
      this.eventBus.emit(
        InputEvents.MouseDragEnd,
        event,
        this.mousePosition.x,
        this.mousePosition.y,
        event.button,
      );
    }
  }
}
