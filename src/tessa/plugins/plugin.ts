import { EventBus } from '../events/event-bus';

export interface Plugin {
  readonly id: string;
  initialize(eventBus: EventBus): Promise<void>;
  start(): void;
  stop(): void;
}
