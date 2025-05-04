import { EventBus } from '../events/event-bus';
import { InputEvents } from '../events/event-types';

/**
 * Information about an active touch
 */
interface TouchInfo {
  id: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
}

/**
 * Basic touch input handler
 */
export class TouchHandler {
  private readonly activeTouches: Map<number, TouchInfo> = new Map();
  private isPinching = false;
  private initialPinchDistance = 0;
  private canvas: HTMLCanvasElement;

  constructor(
    private readonly eventBus: EventBus,
  ) {
    // Initialize touch event listeners
  }

  /**
   * Initialize touch event listeners
   */
  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.canvas.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
  }

  /**
   * Update method called each frame
   */
  update(): void {
    // Process ongoing touches if needed
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
  }

  /**
   * Convert touch event to element coordinates
   */
  private getTouchCoordinates(touch: Touch): { x: number, y: number } {
    const rect = this.canvas.getBoundingClientRect();


    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }

  /**
   * Handle touch start events
   */
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();

    // Store information about each new touch
    for (const touch of event.changedTouches) {
      const { x, y } = this.getTouchCoordinates(touch);

      this.activeTouches.set(touch.identifier, {
        id: touch.identifier,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
        startTime: Date.now(),
      });
    }

    // Check for pinch gesture start
    if (event.touches.length === 2 && !this.isPinching) {
      this.isPinching = true;
      this.initialPinchDistance = this.calculatePinchDistance(event.touches);

      const center = this.calculatePinchCenter(event.touches);

      this.eventBus.emit(InputEvents.PinchStart, event, center.x, center.y);
    }

    this.eventBus.emit(InputEvents.TouchStart, event, event.touches);
  }

  /**
   * Handle touch move events
   */
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();

    // Update touch positions
    for (const touch of event.changedTouches) {
      const touchInfo = this.activeTouches.get(touch.identifier);

      if (touchInfo) {
        const { x, y } = this.getTouchCoordinates(touch);

        touchInfo.currentX = x;
        touchInfo.currentY = y;
      }
    }

    // Handle pinch
    if (this.isPinching && event.touches.length === 2) {
      const currentDistance = this.calculatePinchDistance(event.touches);
      const scale = currentDistance / this.initialPinchDistance;
      const center = this.calculatePinchCenter(event.touches);

      this.eventBus.emit(InputEvents.Pinch, event, center.x, center.y, scale);
    }

    this.eventBus.emit(InputEvents.TouchMove, event, event.touches);
  }

  /**
   * Handle touch end events
   */
  private handleTouchEnd(event: TouchEvent): void {
    // Remove ended touches
    for (const touch of event.changedTouches) {
      this.activeTouches.delete(touch.identifier);
    }

    // End pinch if we have fewer than 2 touches
    if (this.isPinching && event.touches.length < 2) {
      this.isPinching = false;

      if (event.touches.length > 0) {
        const lastTouch = event.touches[0];
        const { x, y } = this.getTouchCoordinates(lastTouch);

        this.eventBus.emit(InputEvents.PinchEnd, event, x, y);
      } else {
        // Use the last center if all touches ended
        const touch = event.changedTouches[0];
        const { x, y } = this.getTouchCoordinates(touch);

        this.eventBus.emit(InputEvents.PinchEnd, event, x, y);
      }
    }

    this.eventBus.emit(InputEvents.TouchEnd, event, event.touches);
  }

  /**
   * Handle touch cancel events
   */
  private handleTouchCancel(event: TouchEvent): void {
    // Remove cancelled touches
    for (const touch of event.changedTouches) {
      this.activeTouches.delete(touch.identifier);
    }

    // End pinch if active
    if (this.isPinching) {
      this.isPinching = false;
    }

    this.eventBus.emit(InputEvents.TouchCancel, event, event.touches);
  }

  /**
   * Calculate the distance between two touch points
   */
  private calculatePinchDistance(touches: TouchList): number {
    if (touches.length < 2) {
      return 0;
    }

    const touch1 = touches[0];
    const touch2 = touches[1];

    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate the center point between two touch points
   */
  private calculatePinchCenter(touches: TouchList): { x: number, y: number } {
    if (touches.length < 2) {
      const touch = touches[0];


      return this.getTouchCoordinates(touch);
    }

    const touch1 = touches[0];
    const touch2 = touches[1];
    const rect = this.canvas.getBoundingClientRect();

    return {
      x: (touch1.clientX + touch2.clientX) / 2 - rect.left,
      y: (touch1.clientY + touch2.clientY) / 2 - rect.top,
    };
  }
}
