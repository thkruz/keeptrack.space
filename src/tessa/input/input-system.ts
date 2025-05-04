import { EventBus } from '../events/event-bus';
import { KeyboardHandler } from './keyboard-handler';
import { MouseHandler } from './mouse-handler';
import { TouchHandler } from './touch-handler';

export class InputSystem {
  private readonly keyboardHandler: KeyboardHandler;
  private readonly mouseHandler: MouseHandler;
  private readonly touchHandler: TouchHandler;

  constructor(
    eventBus: EventBus,
  ) {
    this.keyboardHandler = new KeyboardHandler(eventBus);
    this.mouseHandler = new MouseHandler(eventBus);
    this.touchHandler = new TouchHandler(eventBus);
  }

  initialize(canvas: HTMLCanvasElement): void {
    this.keyboardHandler.initialize();
    this.mouseHandler.initialize(canvas);
    this.touchHandler.initialize(canvas);
  }

  update(): void {
    this.keyboardHandler.update();
    this.mouseHandler.update();
    this.touchHandler.update();
  }
}
