/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { OrbitManager } from '@app/app/rendering/orbit-manager';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const fakeLineManager = () => ({
  program: {},
  setWorldUniforms: vi.fn(),
  setColorUniforms: vi.fn(),
  setAttribsAndDrawLineStrip: vi.fn(),
});

describe('OrbitManager', () => {
  let om: OrbitManager;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = () => om as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let gl: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let catalog: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lineMgr: any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    settingsManager.isDrawOrbits = true;

    om = new OrbitManager();
    gl = ServiceLocator.getRenderer().gl;

    catalog = { missileSats: 6, objectCache: [defaultSat], getObject: vi.fn(() => ({ isStatic: () => false, isMissile: () => false })) };
    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue(catalog as never);

    // Avoid touching the real orbit-cruncher worker.
    vi.spyOn(om.orbitThreadMgr, 'init').mockImplementation(() => undefined);
    vi.spyOn(om.orbitThreadMgr, 'sendInit').mockImplementation(() => undefined);
    vi.spyOn(om.orbitThreadMgr, 'sendSatelliteUpdate').mockImplementation(() => undefined);
    vi.spyOn(om.orbitThreadMgr, 'sendMissileUpdate').mockImplementation(() => undefined);
    vi.spyOn(om.orbitThreadMgr, 'sendChangeOrbitType').mockImplementation(() => undefined);

    lineMgr = fakeLineManager();
  });

  afterEach(() => vi.restoreAllMocks());

  const initialized = () => {
    om.init(lineMgr as never, gl);

    return om;
  };

  describe('static helpers', () => {
    it('getObjDataString tags missiles, ignores non-satellites, and emits TLEs', () => {
      const str = (OrbitManager as unknown as { getObjDataString: (d: unknown[]) => string }).getObjDataString([
        { isMissile: () => true },
        { isMissile: () => false }, // not a Satellite instance -> ignored
        defaultSat,
      ]);
      const parsed = JSON.parse(str);

      expect(parsed[0]).toEqual({ missile: true });
      expect(parsed[1]).toEqual({ ignore: true });
      expect(parsed[2].tle1).toBeDefined();
    });

    it('checkColorBuffersValidity_ requires all four channels to be defined', () => {
      const C = OrbitManager as unknown as { checkColorBuffersValidity_: (id: number, d: Float32Array) => boolean };

      expect(C.checkColorBuffersValidity_(0, new Float32Array([1, 1, 1, 1]))).toBe(true);
      expect(C.checkColorBuffersValidity_(1, new Float32Array([1, 1, 1, 1]))).toBe(false); // out of range -> undefined
    });
  });

  describe('init', () => {
    it('allocates a GL buffer per satellite and sends the init payload', () => {
      initialized();

      expect(o().isInitialized_).toBe(true);
      expect(o().glBuffers_.length).toBe(6);
      expect(om.orbitThreadMgr.sendInit).toHaveBeenCalled();
    });

    it('does not re-initialize on a second call', () => {
      initialized();
      const before = (om.orbitThreadMgr.sendInit as ReturnType<typeof vi.fn>).mock.calls.length;

      om.init(lineMgr as never, gl);

      expect((om.orbitThreadMgr.sendInit as ReturnType<typeof vi.fn>).mock.calls.length).toBe(before);
    });

    it('skips initialization when orbits are disabled', () => {
      settingsManager.isDrawOrbits = false;

      om.init(lineMgr as never, gl);

      expect(o().isInitialized_).toBe(false);
    });
  });

  describe('in-view orbit list management', () => {
    beforeEach(() => initialized());

    it('adds an id once and updates its buffer', () => {
      const upd = vi.spyOn(om, 'updateOrbitBuffer').mockImplementation(() => undefined);

      om.addInViewOrbit(3);
      om.addInViewOrbit(3); // duplicate ignored

      expect(o().currentInView_).toEqual([3]);
      expect(upd).toHaveBeenCalledTimes(1);
    });

    it('removes an id from the in-view list', () => {
      vi.spyOn(om, 'updateOrbitBuffer').mockImplementation(() => undefined);
      om.addInViewOrbit(3);
      om.addInViewOrbit(4);

      om.removeInViewOrbit(3);

      expect(o().currentInView_).toEqual([4]);
    });

    it('clearInViewOrbit empties the list', () => {
      vi.spyOn(om, 'updateOrbitBuffer').mockImplementation(() => undefined);
      om.addInViewOrbit(3);

      om.clearInViewOrbit();

      expect(o().currentInView_).toEqual([]);
    });
  });

  describe('select / hover orbits', () => {
    beforeEach(() => initialized());

    it('setSelectOrbit stores primary and secondary ids', () => {
      vi.spyOn(om, 'updateOrbitBuffer').mockImplementation(() => undefined);

      om.setSelectOrbit(7, false);
      om.setSelectOrbit(8, true);

      expect(o().currentSelectId_).toBe(7);
      expect(o().secondarySelectId_).toBe(8);
    });

    it('clearSelectOrbit resets the id and clears the GL buffer', () => {
      const bufferData = vi.spyOn(gl, 'bufferData');

      o().currentSelectId_ = 7;
      om.clearSelectOrbit(false);

      expect(o().currentSelectId_).toBe(-1);
      expect(bufferData).toHaveBeenCalled();
    });

    it('setHoverOrbit stores the hover id', () => {
      vi.spyOn(om, 'updateOrbitBuffer').mockImplementation(() => undefined);

      om.setHoverOrbit(9);

      expect(o().currentHoverId_).toBe(9);
    });

    it('clearHoverOrbit resets the hover id', () => {
      o().currentHoverId_ = 9;

      om.clearHoverOrbit();

      expect(o().currentHoverId_).toBe(-1);
    });
  });

  describe('updateOrbitBuffer', () => {
    beforeEach(() => initialized());

    it('returns early for an unknown object', () => {
      catalog.getObject.mockReturnValue(null);

      om.updateOrbitBuffer(2);

      expect(om.orbitThreadMgr.sendSatelliteUpdate).not.toHaveBeenCalled();
    });

    it('sends a satellite update for a normal satellite', () => {
      catalog.getObject.mockReturnValue({ isStatic: () => false, isMissile: () => false });

      om.updateOrbitBuffer(2);

      expect(om.orbitThreadMgr.sendSatelliteUpdate).toHaveBeenCalled();
      expect(o().inProgress_[2]).toBe(true);
    });

    it('sends a missile update for a missile', () => {
      catalog.getObject.mockReturnValue({ isStatic: () => false, isMissile: () => true });

      om.updateOrbitBuffer(2);

      expect(om.orbitThreadMgr.sendMissileUpdate).toHaveBeenCalled();
    });

    it('does nothing for a static object', () => {
      catalog.getObject.mockReturnValue({ isStatic: () => true, isMissile: () => false });

      om.updateOrbitBuffer(2);

      expect(om.orbitThreadMgr.sendSatelliteUpdate).not.toHaveBeenCalled();
    });
  });

  describe('orbit type / settings toggles', () => {
    beforeEach(() => initialized());

    it('updateOrbitType forwards the trailing-orbit flag', () => {
      settingsManager.isDrawTrailingOrbits = true;

      om.updateOrbitType();

      expect(om.orbitThreadMgr.sendChangeOrbitType).toHaveBeenCalled();
    });

    it('changeOrbitBufferData forwards a TLE update', () => {
      om.changeOrbitBufferData(2, 'tle1', 'tle2');

      expect(om.orbitThreadMgr.sendSatelliteUpdate).toHaveBeenCalled();
    });

    it('toggleEciToEcf_ flips the ECF flag and clears the cache', () => {
      vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined as never);
      settingsManager.isOrbitCruncherInEcf = false;
      o().orbitCache.set(1, new Float32Array(4));

      o().toggleEciToEcf_();

      expect(settingsManager.isOrbitCruncherInEcf).toBe(true);
      expect(o().orbitCache.size).toBe(0);
    });

    it('toggleOrbitLines_ cycles full -> tails -> off', () => {
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast').mockImplementation(() => undefined as never);

      settingsManager.isDrawOrbits = true;
      settingsManager.isDrawTrailingOrbits = false;

      o().toggleOrbitLines_(); // -> tails only

      expect(settingsManager.isDrawTrailingOrbits).toBe(true);
      expect(toast).toHaveBeenCalled();
    });
  });

  describe('updateAllVisibleOrbits', () => {
    beforeEach(() => initialized());

    it('refreshes a throttled window of the open search results', () => {
      const upd = vi.spyOn(om, 'updateOrbitBuffer').mockImplementation(() => undefined);

      vi.spyOn(ServiceLocator.getUiManager(), 'searchManager', 'get').mockReturnValue({
        isResultsOpen: true,
        getLastResultGroup: () => ({ ids: [10, 11, 12] }),
      } as never);
      settingsManager.disableUI = false;
      settingsManager.lowPerf = false;

      om.updateAllVisibleOrbits();

      expect(upd).toHaveBeenCalled();
    });
  });

  describe('buffer data alignment', () => {
    beforeEach(() => initialized());

    it('alignOrbitSelectedObject shifts cached orbit points to a new first position', () => {
      const sub = vi.spyOn(gl, 'bufferSubData');

      o().orbitCache.set(0, new Float32Array([1, 2, 3, 1, 5, 6, 7, 1]));

      om.alignOrbitSelectedObject(0, [10, 20, 30]);

      const data = o().orbitCache.get(0) as Float32Array;

      // First point becomes the requested position (delta applied).
      expect(data[0]).toBe(10);
      expect(data[1]).toBe(20);
      expect(data[2]).toBe(30);
      expect(sub).toHaveBeenCalled();
    });

    it('getBufferData returns null for an unallocated buffer', () => {
      expect(om.getBufferData(999)).toBeNull();
    });
  });

  describe('draw', () => {
    it('returns early before initialization', () => {
      const bindFb = vi.spyOn(gl, 'bindFramebuffer');

      om.draw([] as never, null, { getHoverId: () => -1 } as never, { colorData: new Float32Array(40) } as never, { cameraType: 0 } as never);

      expect(bindFb).not.toHaveBeenCalled();
    });

    it('binds the framebuffer and program and sets world uniforms when initialized', () => {
      initialized();
      vi.spyOn(ServiceLocator, 'getGroupsManager').mockReturnValue({ selectedGroup: null } as never);
      settingsManager.enableConstantSelectedSatRedraw = false;
      const useProgram = vi.spyOn(gl, 'useProgram');

      om.draw(
        [] as never,
        null,
        { getHoverId: () => -1 } as never,
        { colorData: new Float32Array(40) } as never,
        { cameraType: 0 } as never,
      );

      expect(useProgram).toHaveBeenCalledWith(lineMgr.program);
      expect(lineMgr.setWorldUniforms).toHaveBeenCalled();
    });
  });

  describe('resetForCatalogSwap', () => {
    it('resizes buffers to the new catalog and re-sends init', () => {
      initialized();
      catalog.missileSats = 3; // shrink

      om.resetForCatalogSwap();

      expect(o().glBuffers_.length).toBe(3);
      expect(o().currentSelectId_).toBe(-1);
      expect(om.orbitThreadMgr.sendInit).toHaveBeenCalled();
    });
  });
});
