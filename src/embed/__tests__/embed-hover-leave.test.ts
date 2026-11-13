import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KeepTrackEmbedEngine } from '../embed-engine-impl';

describe('onHoverChanged', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('reports none after the pointer leaves the canvas and resumes on the next move', () => {
    document.body.innerHTML = '';
    const canvas = document.createElement('canvas');

    canvas.id = 'keeptrack-canvas';
    document.body.appendChild(canvas);
    const mouse = { mouseSat: 5 };

    vi.spyOn(ServiceLocator, 'getInputManager').mockReturnValue({ mouse } as never);
    let loop: (() => void) | undefined;

    vi.spyOn(EventBus, 'getInstance').mockReturnValue({
      on: (evt: EventBusEvent, cb: () => void) => {
        if (evt === EventBusEvent.updateLoop) {
          loop = cb;
        }
      },
    } as never);

    const seen: number[] = [];

    new KeepTrackEmbedEngine().onHoverChanged((id) => seen.push(id));

    loop?.();
    canvas.dispatchEvent(new Event('pointerleave'));
    loop?.();
    loop?.();
    canvas.dispatchEvent(new Event('pointermove'));
    loop?.();

    expect(seen).toEqual([5, -1, 5]);
  });
});
