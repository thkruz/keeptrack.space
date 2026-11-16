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

describe('SatInfoBox.freezeFloatingGeometry_', () => {
  it('pins a bottom-docked box at its on-screen position so the first drag does not jump to y = 0', () => {
    const container = document.createElement('div');
    const el = document.createElement('div');

    container.getBoundingClientRect = rectAt(0, 768);
    el.getBoundingClientRect = () => ({ top: 307, bottom: 768, left: 1006, right: 1366, width: 360, height: 461 }) as DOMRect;
    const draggie = { position: { x: 0, y: 0 }, startPosition: { x: 0, y: 0 } };

    SatInfoBox.freezeFloatingGeometry_(draggie, el, container);

    expect(el.style.top).toBe('307px');
    expect(el.style.left).toBe('1006px');
    expect(el.style.bottom).toBe('auto');
    expect(draggie.position).toEqual({ x: 1006, y: 307 });
    expect(draggie.startPosition).toEqual({ x: 1006, y: 307 });
  });
});

describe('SatInfoBox top inset (#49)', () => {
  it('never lets the clamp pull the header above the top bar', () => {
    const container = document.createElement('div');
    const el = document.createElement('div');

    container.getBoundingClientRect = rectAt(0, 768);
    el.getBoundingClientRect = rectAt(100, 900);
    const draggie = { position: { x: 0, y: 100 }, startPosition: { x: 0, y: 100 }, measureContainment: vi.fn() };

    SatInfoBox.clampAfterResize_(draggie, el, container, 90);

    expect(draggie.position.y).toBe(90);
    expect(el.style.top).toBe('90px');
  });

  it('shrinks Draggabilly containment from the top so a drag stops below the top bar', () => {
    const draggie = { relativeStartPosition: { x: 0, y: 300 } };

    SatInfoBox.applyTopInset_(draggie, 90);

    expect(draggie.relativeStartPosition.y).toBe(210);
  });

  it('pins a docked box no higher than the top inset', () => {
    const container = document.createElement('div');
    const el = document.createElement('div');

    container.getBoundingClientRect = rectAt(0, 768);
    el.getBoundingClientRect = rectAt(10, 600);
    const draggie = { position: { x: 0, y: 0 }, startPosition: { x: 0, y: 0 } };

    SatInfoBox.freezeFloatingGeometry_(draggie, el, container, 90);

    expect(el.style.top).toBe('90px');
  });
});

describe('SatInfoBox.releaseStalePointer_ (#49)', () => {
  it('clears a press whose pointerup never arrived so the next drag from the dock starts', () => {
    const element = document.createElement('div');

    element.classList.add('is-pointer-down', 'is-dragging');
    element.style.transform = 'translate3d(5px, 5px, 0)';
    const draggie = {
      isPointerDown: true,
      isDragging: true,
      element,
      pointerDone: vi.fn(() => {
        draggie.isPointerDown = false;
      }),
    };

    expect(SatInfoBox.releaseStalePointer_(draggie)).toBe(true);
    expect(draggie.pointerDone).toHaveBeenCalledTimes(1);
    expect(draggie.isPointerDown).toBe(false);
    expect(draggie.isDragging).toBe(false);
    expect(element.classList.contains('is-dragging')).toBe(false);
    expect(element.classList.contains('is-pointer-down')).toBe(false);
    expect(element.style.transform).toBe('');
  });

  it('does nothing when no press is recorded', () => {
    const draggie = { isPointerDown: false, isDragging: false, pointerDone: vi.fn() };

    expect(SatInfoBox.releaseStalePointer_(draggie)).toBe(false);
    expect(draggie.pointerDone).not.toHaveBeenCalled();
  });
});
