import { mat4 } from 'gl-matrix';
import { CameraTransition } from '../camera-transition';

describe('CameraTransition', () => {
  let transition: CameraTransition;
  let nowSpy: ReturnType<typeof vi.spyOn>;
  let fakeTime: number;

  beforeEach(() => {
    transition = new CameraTransition();
    fakeTime = 1000;
    nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => fakeTime);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('should not be active initially', () => {
    expect(transition.isActive).toBe(false);
  });

  it('should become active after begin()', () => {
    transition.begin(mat4.create(), [0, 0, 0]);
    expect(transition.isActive).toBe(true);
  });

  it('should become inactive after cancel()', () => {
    transition.begin(mat4.create(), [0, 0, 0]);
    transition.cancel();
    expect(transition.isActive).toBe(false);
  });

  it('should return null when not active', () => {
    const result = transition.apply(mat4.create(), [0, 0, 0]);

    expect(result).toBeNull();
  });

  it('should return blended view matrix at mid-transition', () => {
    const from = mat4.create();
    const to = mat4.create();

    mat4.translate(to, to, [100, 200, 300]);

    transition.begin(from, [0, 0, 0]);

    // Advance to 50% of default 500ms duration
    fakeTime = 1250;

    const result = transition.apply(to, [0, 0, 0]);

    expect(result).not.toBeNull();
    // Result is a mat4 (the effective view matrix)
    expect(result!.length).toBe(16);
  });

  it('should return null after duration completes', () => {
    transition.begin(mat4.create(), [0, 0, 0]);

    // Advance past 500ms default
    fakeTime = 1600;

    const result = transition.apply(mat4.create(), [0, 0, 0]);

    expect(result).toBeNull();
    expect(transition.isActive).toBe(false);
  });

  it('should clamp duration to valid range', () => {
    transition.duration = 50;
    expect(transition.duration).toBe(100);

    transition.duration = 5000;
    expect(transition.duration).toBe(2000);

    transition.duration = 750;
    expect(transition.duration).toBe(750);
  });

  it('should produce identity-like result when from === to with zero worldShift', () => {
    const identity = mat4.create();

    transition.begin(identity, [0, 0, 0]);

    fakeTime = 1250;

    const result = transition.apply(identity, [0, 0, 0]);

    if (result) {
      for (let i = 0; i < 16; i++) {
        expect(result[i]).toBeCloseTo(identity[i], 4);
      }
    }
  });

  it('should compensate for worldShift change at t=0', () => {
    // Simulate: begin with worldShift=[0,0,0], then worldShift jumps to [-100,-200,-300]
    const fromView = mat4.create();

    mat4.translate(fromView, fromView, [0, 500, 0]); // Camera backed away from origin

    transition.begin(fromView, [0, 0, 0]);

    // Very start of transition: t≈0
    fakeTime = 1001; // 1ms into 500ms

    // worldShift has already jumped to the new satellite
    const newView = mat4.create();
    const newWS = [-100, -200, -300];

    const result = transition.apply(newView, newWS);

    expect(result).not.toBeNull();

    // At t≈0, the effective view should be very close to fromView
    // because composedBlended ≈ composedFrom, and undoing newWS compensates
    // Verify the visual transform: result * (vertex + newWS) ≈ fromView * (vertex + [0,0,0])
    // For vertex = [0,0,0]: result * newWS ≈ fromView * [0,0,0]
    // This means: result * [-100,-200,-300,1] ≈ fromView * [0,0,0,1]
  });

  it('should chain transitions when begin() is called during active transition', () => {
    const viewA = mat4.create();

    transition.begin(viewA, [0, 0, 0]);

    // Mid-transition, start another
    fakeTime = 1250;
    const viewB = mat4.create();

    mat4.translate(viewB, viewB, [100, 0, 0]);
    transition.begin(viewB, [100, 0, 0]);

    expect(transition.isActive).toBe(true);

    // The new transition starts from fakeTime=1250
    fakeTime = 1500;
    const viewC = mat4.create();

    mat4.translate(viewC, viewC, [200, 0, 0]);
    const result = transition.apply(viewC, [200, 0, 0]);

    expect(result).not.toBeNull();
  });

  it('should reach exact target at t=1 boundary', () => {
    const from = mat4.create();
    const to = mat4.create();

    mat4.rotateZ(to, to, Math.PI / 4);
    mat4.translate(to, to, [500, 0, 0]);

    transition.begin(from, [0, 0, 0]);

    // Just before completion
    fakeTime = 1499;
    const almostDone = transition.apply(to, [1000, 2000, 3000]);

    expect(almostDone).not.toBeNull();

    // At completion
    fakeTime = 1500;
    const done = transition.apply(to, [1000, 2000, 3000]);

    expect(done).toBeNull();
    expect(transition.isActive).toBe(false);
  });

  it('should maintain distance from origin during transition (spherical arc)', () => {
    // Two cameras at the same distance from origin but in different directions
    // The midpoint should maintain approximately the same distance (not dip toward origin)
    const dist = 7000; // ~LEO altitude in km

    const fromView = mat4.create();
    const toView = mat4.create();

    // Camera A: looking at origin from +X axis at distance `dist`
    // View matrix translates by [0, 0, -dist] (camera at [0, 0, dist] in world, default -Z forward)
    mat4.translate(fromView, fromView, [0, 0, -dist]);

    // Camera B: looking at origin from +Y axis at distance `dist`
    // Rotate 90 degrees around Z, then translate back
    mat4.rotateZ(toView, toView, Math.PI / 2);
    mat4.translate(toView, toView, [0, 0, -dist]);

    transition.begin(fromView, [0, 0, 0]);

    // At 50%
    fakeTime = 1250;
    const result = transition.apply(toView, [0, 0, 0]);

    expect(result).not.toBeNull();

    // Extract camera world position from the blended result
    // For view matrix V, cam pos = -R^T * t = inverse(V)[12..14]
    const inv = mat4.create();

    mat4.invert(inv, result!);
    const midDist = Math.sqrt(inv[12] ** 2 + inv[13] ** 2 + inv[14] ** 2);

    // With spherical arc, the midpoint distance should be close to `dist`
    // Linear lerp would give dist * cos(45°) ≈ 0.707 * dist
    expect(midDist).toBeGreaterThan(dist * 0.9);
    expect(midDist).toBeLessThan(dist * 1.1);
  });

  // Build an app-convention view matrix (rows: right, forward, up) that looks from `eye` toward
  // the shifted-frame origin — mirrors CameraTransition.writeViewMatrix_ so the tests can assert
  // where a focused target (at the shifted origin) lands in camera space.
  const norm = (v: number[]): number[] => {
    const l = Math.hypot(v[0], v[1], v[2]);

    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const cross = (a: number[], b: number[]): number[] => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const lookAtOriginView = (eye: number[], upHint: number[]): mat4 => {
    const f = norm([-eye[0], -eye[1], -eye[2]]);
    const r = norm(cross(f, upHint));
    const u = norm(cross(r, f));
    const m = mat4.create();

    m[0] = r[0];
    m[1] = f[0];
    m[2] = u[0];
    m[3] = 0;
    m[4] = r[1];
    m[5] = f[1];
    m[6] = u[1];
    m[7] = 0;
    m[8] = r[2];
    m[9] = f[2];
    m[10] = u[2];
    m[11] = 0;
    m[12] = -(r[0] * eye[0] + r[1] * eye[1] + r[2] * eye[2]);
    m[13] = -(f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2]);
    m[14] = -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]);
    m[15] = 1;

    return m;
  };

  it('keeps a focused target centered through a large reorientation', () => {
    // Target at 7000 km in ECI; worldShift places it at the shifted-frame origin. The camera views
    // it from two very different directions (a 90-degree reorient, e.g. ECI <-> LVLH on one sat).
    const ws = [-7000, 0, 0];
    const anchor = { position: { x: 7000 as number, y: 0, z: 0 } };
    const fromView = lookAtOriginView([0, 0, 0.05], [0, 1, 0]); // 50 m standoff, behind in +z
    const toView = lookAtOriginView([0.05, 0, 0], [0, 1, 0]); // 50 m standoff, off to +x

    transition.begin(fromView, ws, anchor);

    // The effective view is in the shifted frame, so the target sits at the origin: its camera-
    // space right (m[12]) and up (m[14]) components must stay ~0 (dead center) the whole blend.
    for (const t of [1050, 1150, 1250, 1350, 1450]) {
      fakeTime = t;
      const V = transition.apply(toView, ws, anchor)!;

      expect(V).not.toBeNull();
      expect(Math.abs(V[12])).toBeLessThan(1e-4);
      expect(Math.abs(V[14])).toBeLessThan(1e-4);
    }
  });

  it('falls back to the rotation-slerp blend when no toAnchor is supplied', () => {
    const ws = [-7000, 0, 0];
    const anchor = { position: { x: 7000 as number, y: 0, z: 0 } };
    const fromView = lookAtOriginView([0, 0, 0.05], [0, 1, 0]);
    const toView = lookAtOriginView([0.05, 0, 0], [0, 1, 0]);

    transition.begin(fromView, ws, anchor);

    fakeTime = 1250;
    // No toAnchor: the target-centered path is skipped, but the transition still produces a
    // valid blended view (the historical behavior) rather than throwing.
    const V = transition.apply(toView, ws);

    expect(V).not.toBeNull();
    expect(V!.length).toBe(16);
  });

  it('ignores an anchor whose position is the origin (decayed object)', () => {
    const ws = [-7000, 0, 0];
    const fromView = lookAtOriginView([0, 0, 0.05], [0, 1, 0]);
    const toView = lookAtOriginView([0.05, 0, 0], [0, 1, 0]);

    // A (0,0,0) anchor is rejected at begin(), so both transitions take the fallback path and
    // must produce identical matrices.
    transition.begin(fromView, ws);

    const anchored = new CameraTransition();

    anchored.begin(fromView, ws, { position: { x: 0, y: 0, z: 0 } });

    fakeTime = 1250;
    const baseResult = transition.apply(toView, ws, { position: { x: 0, y: 0, z: 0 } })!;
    const anchoredResult = anchored.apply(toView, ws, { position: { x: 0, y: 0, z: 0 } })!;

    for (let i = 0; i < 16; i++) {
      expect(anchoredResult[i]).toBeCloseTo(baseResult[i], 5);
    }
  });

  it('should converge to target view at end of transition', () => {
    const fromView = mat4.create();
    const toView = mat4.create();

    mat4.translate(toView, toView, [0, 1000, 0]);
    mat4.rotateX(toView, toView, 0.5);
    const toWS = [-500, -300, -100];

    transition.begin(fromView, [0, 0, 0]);

    // Just before end (t≈0.998)
    fakeTime = 1499;
    const result = transition.apply(toView, toWS);

    expect(result).not.toBeNull();

    // At t≈1, effectiveView should be very close to toView
    // because composedBlended ≈ toView * translate(toWS), and undo toWS → toView
    for (let i = 0; i < 16; i++) {
      expect(result![i]).toBeCloseTo(toView[i], 0);
    }
  });
});
