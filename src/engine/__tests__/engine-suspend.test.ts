import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Engine } from '../engine';

type Internals = {
  isRunning_: boolean;
  isSuspended_: boolean;
  rafId_: number;
  lastFrameTime_: number;
  isPaused: boolean;
  application_: { isReady: boolean };
  renderer: { isCapturing: boolean; resizeCanvas: ReturnType<typeof vi.fn> };
  timeManager: { setNow: ReturnType<typeof vi.fn> };
  update_: ReturnType<typeof vi.fn>;
  draw_: ReturnType<typeof vi.fn>;
};

/** Engine without its heavy constructor: only the loop fields are populated. */
function makeEngine(): { engine: Engine; s: Internals } {
  const engine = Object.create(Engine.prototype) as Engine;
  const s = engine as unknown as Internals;

  s.isRunning_ = true;
  s.isSuspended_ = false;
  s.rafId_ = 0;
  s.lastFrameTime_ = 0;
  s.isPaused = false;
  s.application_ = { isReady: true };
  s.renderer = { isCapturing: false, resizeCanvas: vi.fn() };
  s.timeManager = { setNow: vi.fn() };
  s.update_ = vi.fn();
  s.draw_ = vi.fn();

  return { engine, s };
}

describe('Engine render parking', () => {
  let nextId: number;
  let raf: ReturnType<typeof vi.fn>;
  let caf: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    nextId = 0;
    raf = vi.fn(() => ++nextId);
    caf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', caf);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const tick = (s: Internals, ts = 16): void => (s as unknown as { gameLoop_: (t: number) => void }).gameLoop_(ts);

  it('keeps requesting frames while running', () => {
    const { s } = makeEngine();

    tick(s);
    tick(s);
    expect(raf).toHaveBeenCalledTimes(2);
    expect(s.update_).toHaveBeenCalledTimes(2);
  });

  it('suspend cancels the pending frame and the loop stops rescheduling', () => {
    const { engine, s } = makeEngine();

    tick(s);
    const pending = s.rafId_;

    engine.suspendLoop();
    expect(caf).toHaveBeenCalledWith(pending);
    expect(engine.isSuspended).toBe(true);

    // A frame that was already in flight must not update, draw or reschedule.
    const before = raf.mock.calls.length;

    tick(s);
    expect(raf.mock.calls.length).toBe(before);
    expect(s.update_).toHaveBeenCalledTimes(1);
    expect(s.draw_).toHaveBeenCalledTimes(1);
  });

  it('resume forces a resize, refreshes the clock and restarts the frame chain', () => {
    const { engine, s } = makeEngine();

    tick(s);
    engine.suspendLoop();
    engine.resumeLoop();

    expect(s.renderer.resizeCanvas).toHaveBeenCalledWith(true);
    expect(s.timeManager.setNow).toHaveBeenCalledTimes(1);
    expect(engine.isSuspended).toBe(false);
    expect(s.rafId_).not.toBe(0);
    tick(s);
    expect(s.update_).toHaveBeenCalledTimes(2);
  });

  it('suspend and resume are idempotent', () => {
    const { engine, s } = makeEngine();

    tick(s);
    engine.resumeLoop();
    expect(s.renderer.resizeCanvas).not.toHaveBeenCalled();
    engine.suspendLoop();
    engine.suspendLoop();
    expect(caf).toHaveBeenCalledTimes(1);
    engine.resumeLoop();
    engine.resumeLoop();
    expect(s.renderer.resizeCanvas).toHaveBeenCalledTimes(1);
  });
});
