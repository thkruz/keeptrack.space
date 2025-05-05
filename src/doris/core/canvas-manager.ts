import { EventBus } from '../events/event-bus';
import { CanvasEvents, CoreEngineEvents } from '../events/event-types';

export interface CanvasInfo {
  width: number;
  height: number;
}

export class CanvasManager {
  private canvas_: HTMLCanvasElement;
  private lastResizeTimer_: number | null = null;

  constructor(
    private readonly eventBus: EventBus,
    private readonly canvasContainer_: HTMLElement | null = null,
  ) {
    // Listen for orientation changes
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
    window.addEventListener('resize', this.handleWindowResize.bind(this));

    // Listen for engine resize events
    this.eventBus.on(CoreEngineEvents.Resize, this.handleResize.bind(this));
  }

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas_ = canvas;
    // Initial setup of canvas size
    this.updateCanvasSize();
  }

  getCanvas(): HTMLCanvasElement {
    if (!this.canvas_) {
      throw new Error('Canvas not initialized');
    }

    return this.canvas_;
  }

  private handleOrientationChange(): void {
    const { width, height } = this.getCanvasSize(this.canvasContainer_);

    this.eventBus.emit(CoreEngineEvents.Resize, width, height);
  }

  private handleWindowResize(): void {
    // Debounce window resize events
    if (this.lastResizeTimer_ !== null) {
      window.clearTimeout(this.lastResizeTimer_);
    }

    this.lastResizeTimer_ = window.setTimeout(() => {
      const { width, height } = this.getCanvasSize(this.canvasContainer_);

      this.eventBus.emit(CoreEngineEvents.Resize, width, height);
    }, 100);
  }

  private handleResize(): void {
    // Clear existing timer
    if (this.lastResizeTimer_ !== null) {
      window.clearTimeout(this.lastResizeTimer_);
    }

    // Debounce resize event
    this.lastResizeTimer_ = window.setTimeout(() => {
      this.updateCanvasSize();
    }, 100);
  }

  /**
   * Updates the canvas size based on viewport/container dimensions
   */
  updateCanvasSize(): void {
    const { width, height } = this.getCanvasSize(this.canvasContainer_);

    // Notify that we're about to resize the canvas
    this.eventBus.emit(CanvasEvents.BeforeResize, this.canvas_, width, height);

    // Update canvas dimensions
    this.setCanvasSize(height, width);

    // Notify that canvas size has changed
    this.eventBus.emit(CanvasEvents.Resize, width, height);

    // Allow application code to respond to resize
    this.eventBus.emit(CanvasEvents.AfterResize, this.canvas_, width, height);
  }

  /**
   * Set the canvas dimensions directly
   */
  setCanvasSize(height: number, width: number): void {
    if (!this.canvas_) {
      return;
    }

    this.canvas_.width = width;
    this.canvas_.height = height;
  }

  /**
   * Trigger a forced canvas resize, useful for taking screenshots or other special cases
   * This is a simplified version that doesn't contain application-specific code
   */
  forceCanvasResize(width: number, height: number): void {
    this.eventBus.emit(CanvasEvents.BeforeResize, this.canvas_, width, height);
    this.setCanvasSize(height, width);
    this.eventBus.emit(CanvasEvents.Resize, width, height);
    this.eventBus.emit(CanvasEvents.AfterResize, this.canvas_, width, height);
  }

  /**
   * Gets the optimal canvas dimensions based on the container and viewport
   */
  getCanvasSize(container?: HTMLElement | null): { width: number; height: number } {
    // Get container dimensions if provided
    const containerWidth = container?.clientWidth ?? document.documentElement.clientWidth ?? 0;
    const containerHeight = container?.clientHeight ?? document.documentElement.clientHeight ?? 0;

    // Get viewport dimensions
    const viewportWidth = window.innerWidth || 0;
    const viewportHeight = window.innerHeight || 0;

    // Use the minimum of container and viewport to avoid scrollbars
    const width = Math.min(containerWidth, viewportWidth);
    const height = Math.min(containerHeight, viewportHeight);

    return { width, height };
  }

  /**
   * Sets the cursor style for the canvas
   */
  setCursor(cursor: 'default' | 'pointer' | 'grab' | 'grabbing'): void {
    if (this.canvas_) {
      this.canvas_.style.cursor = cursor;
    }
  }
}
