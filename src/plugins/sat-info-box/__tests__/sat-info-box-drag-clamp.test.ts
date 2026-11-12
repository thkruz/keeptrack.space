import { describe, expect, it, vi } from 'vitest';
import { SatInfoBox } from '../sat-info-box';

const rectAt = (top: number, bottom: number) => () => ({ top, bottom, left: 0, right: 100, width: 100, height: bottom - top }) as DOMRect;

describe('SatInfoBox.clampAfterResize_', () => {
  it('pulls an enlarged box back inside the container and remeasures containment', () => {
    const container = document.createElement('div');
    const el = document.createElement('div');

    container.getBoundingClientRect = rectAt(0, 768);
    el.getBoundingClientRect = rectAt(307, 921);
    const draggie = { position: { x: 0, y: 307 }, startPosition: { x: 0, y: 307 }, measureContainment: vi.fn() };

    SatInfoBox.clampAfterResize_(draggie, el, container);

    expect(draggie.position.y).toBe(154);
    expect(draggie.startPosition.y).toBe(154);
    expect(el.style.top).toBe('154px');
    expect(draggie.measureContainment).toHaveBeenCalled();
  });

  it('leaves a box that still fits where it is', () => {
    const container = document.createElement('div');
    const el = document.createElement('div');

    container.getBoundingClientRect = rectAt(0, 768);
    el.getBoundingClientRect = rectAt(100, 500);
    const draggie = { position: { x: 0, y: 100 }, startPosition: { x: 0, y: 100 }, measureContainment: vi.fn() };

    SatInfoBox.clampAfterResize_(draggie, el, container);

    expect(draggie.position.y).toBe(100);
    expect(el.style.top).toBe('');
    expect(draggie.measureContainment).toHaveBeenCalled();
  });
});
