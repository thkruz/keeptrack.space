/* eslint-disable dot-notation */

import { SolarBody } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { BodyGlyph } from '@app/engine/rendering/body-glyph';
import { DotsManager } from '@app/engine/rendering/dots-manager';
import { DotStatus } from '@app/engine/rendering/dots-shaders-base';
import { BaseObject, Kilometers, KilometersPerSecond, SpaceObjectType, TemeVec3 } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

/*
 * Pure accessor / bookkeeping logic in DotsManager: position lookups, the
 * spatial nearest-sat search, in-sun/in-view/velocity getters, the picking
 * color packing, and the pos/vel writer (including missile velocity smoothing).
 * GL is only touched by setupPickingBuffer, which uses the mock renderer.
 */
describe('DotsManager logic', () => {
  let dots: DotsManager;

  beforeEach(() => {
    setupStandardEnvironment();
    dots = new DotsManager();
  });

  afterEach(() => vi.restoreAllMocks());

  describe('position accessors', () => {
    beforeEach(() => {
      dots.positionData = new Float32Array([10, 20, 30, 40, 50, 60]);
    });

    it('getCurrentPosition reads the xyz triple for an index', () => {
      expect(dots.getCurrentPosition(1)).toStrictEqual({ x: 40, y: 50, z: 60 });
    });

    it('getPositionArray returns the triple as an array', () => {
      expect(dots.getPositionArray(0)).toStrictEqual([10, 20, 30]);
    });

    it('getPositionArray returns the origin when the index is out of range', () => {
      expect(dots.getPositionArray(99)).toStrictEqual([0, 0, 0]);
    });
  });

  describe('getIdFromEci (nearest-sat search)', () => {
    beforeEach(() => {
      dots.positionData = new Float32Array([1000, 0, 0, 2000, 0, 0, 3000, 0, 0]);
    });

    it('returns the id of a satellite within 1 km', () => {
      expect(dots.getIdFromEci({ x: 1000, y: 0, z: 0 })).toBe(0);
    });

    it('returns the closest candidate within the 100 km box', () => {
      expect(dots.getIdFromEci({ x: 2050, y: 0, z: 0 })).toBe(1);
    });

    it('returns null when nothing is nearby', () => {
      expect(dots.getIdFromEci({ x: 50000, y: 0, z: 0 })).toBeNull();
    });

    it('returns null when there is no position data', () => {
      dots.positionData = null as never;
      expect(dots.getIdFromEci({ x: 0, y: 0, z: 0 })).toBeNull();
    });
  });

  describe('typed-array getters', () => {
    it('return the backing array when set, else an empty array', () => {
      const inSun = new Int8Array([2, 1, 0]);

      dots.inSunData = inSun;
      expect(dots.getSatInSun()).toBe(inSun);

      dots.inViewData = null as never;
      expect(dots.getSatInView()).toHaveLength(0);
    });
  });

  describe('setupPickingBuffer', () => {
    it('packs each id into normalized RGB color components', () => {
      dots['pickingColorData'] = [];
      dots.setupPickingBuffer(2);

      // id 1 -> R=1/255; id 2 -> R=2/255; both G=B=0 (ids below 256).
      expect(dots['pickingColorData'][0]).toBeCloseTo(1 / 255, 6);
      expect(dots['pickingColorData'][1]).toBe(0);
      expect(dots['pickingColorData'][3]).toBeCloseTo(2 / 255, 6);
    });
  });

  describe('body dot sizing', () => {
    /*
     * getSize() is the un-hover path and updateSizeBuffer() is the rebuild path (search,
     * deselect, right-click "clear screen"). They have to agree on the body block, or a
     * planet's glyph changes size whenever either one runs - which is what "the glyph size
     * changes when I hit clear screen" was.
     */
    beforeEach(() => {
      dots.planetDot1 = 5;
      dots.planetDot2 = 8;
      settingsManager.lastSearchResults = [];
      settingsManager.maxZoomDistance = 1e7 as Kilometers;
    });

    it('writes the big-dot status for every body when rebuilding the buffer', () => {
      dots.updateSizeBuffer(10);

      expect(Array.from(dots.sizeData)).toStrictEqual([0, 0, 0, 0, 0, DotStatus.Big, DotStatus.Big, DotStatus.Big, 0, 0]);
    });

    it('rebuilds to exactly what getSize would restore, so nothing resizes', () => {
      dots.updateSizeBuffer(10);

      for (let i = 0; i < 10; i++) {
        expect(dots.sizeData[i]).toBe(dots.getSize(i));
      }
    });

    it('leaves the search and selection statuses on top of the body statuses', () => {
      settingsManager.lastSearchResults = [6];
      dots.updateSizeBuffer(10);

      expect(dots.sizeData[5]).toBe(DotStatus.Big);
      expect(dots.sizeData[6]).toBe(DotStatus.Searched);
    });

    it('leaves bodies at distance-based sizing in a near-Earth view', () => {
      settingsManager.maxZoomDistance = 2e5 as Kilometers;
      settingsManager.centerBody = SolarBody.Earth;
      dots.updateSizeBuffer(10);

      expect(Array.from(dots.sizeData).every((size) => size === DotStatus.None)).toBe(true);
      expect(dots.getSize(5)).toBe(DotStatus.None);
    });
  });

  describe('body glyph gating', () => {
    /*
     * The glyphs, their 1.4x sprite, the pick-size floor and the big-dot status all describe
     * the same thing, so they key off one predicate. It used to be camera RANGE, which made
     * every glyph pop back to a plain dot the moment you zoomed in on the solar system - at
     * 4e7 km from the Sun the planets are still far under a pixel and the icon is all there is.
     */
    it('keys the glyph on the view, not on how far the camera has zoomed in', () => {
      settingsManager.centerBody = SolarBody.Sun;
      settingsManager.maxZoomDistance = 1.5e10 as Kilometers;

      expect(DotsManager['isSolarSystemView_']()).toBe(true);

      settingsManager.centerBody = SolarBody.Earth;
      settingsManager.maxZoomDistance = 2e5 as Kilometers;

      expect(DotsManager['isSolarSystemView_']()).toBe(false);
    });

    it('agrees with the big-dot status, so a glyph is never drawn on an ordinary-sized dot', () => {
      dots.planetDot1 = 5;
      dots.planetDot2 = 8;
      settingsManager.lastSearchResults = [];

      for (const [centerBody, maxZoom] of [
        [SolarBody.Sun, 1.5e10],
        [SolarBody.Earth, 2e5],
        [SolarBody.Mars, 1.3e10],
      ] as const) {
        settingsManager.centerBody = centerBody;
        settingsManager.maxZoomDistance = maxZoom as Kilometers;

        expect(dots.getSize(5) === DotStatus.Big).toBe(DotsManager['isSolarSystemView_']());
      }
    });

    /*
     * The center body's dot sits at its mesh's exact center, so once the mesh is on screen the
     * dot marks something you are already looking at. On a planet the sphere's depth buries it;
     * on a probe framed at 84 m the mesh is thin booms and the dot showed through the gaps.
     */
    describe('hiddenBodyDotIndex_', () => {
      const VOYAGER = 'Voyager 1' as SolarBody;
      /** Park the camera a given range from the center body (which sits at the world origin). */
      const cameraAt = (km: number) => vi.spyOn(ServiceLocator.getMainCamera(), 'getCamPos').mockReturnValue([0, km, 0] as never);

      beforeEach(() => {
        dots.planetDot1 = 5;
        dots.setBodyGlyphs([
          { name: SolarBody.Mercury, glyph: BodyGlyph.Terrestrial },
          { name: SolarBody.Saturn, glyph: BodyGlyph.Ringed },
          { name: VOYAGER, glyph: BodyGlyph.Spacecraft },
        ]);
      });

      it('drops the probe dot at its framing distance and brings it back once the mesh is gone', () => {
        settingsManager.centerBody = VOYAGER;

        // Voyager's mesh radius is 14 m, so the dot gives way inside 14 m x 2000 = 28 km.
        // Absolute catalog index, not a slot: planetDot1 (5) + slot (2).
        cameraAt(0.084);
        expect(dots['hiddenBodyDotIndex_']()).toBe(7);

        cameraAt(1e5);
        expect(dots['hiddenBodyDotIndex_']()).toBe(-1);
      });

      it('does the same for a planet, at that planet own scale', () => {
        settingsManager.centerBody = SolarBody.Saturn;

        cameraAt(4e6);
        expect(dots['hiddenBodyDotIndex_']()).toBe(6);

        cameraAt(1e10);
        expect(dots['hiddenBodyDotIndex_']()).toBe(-1);
      });

      /*
       * REGRESSION: this used to return a slot, and slots are -1 for every vertex outside the
       * body block too - so "nothing hidden" matched every star and satellite in the catalog.
       * An index can never be negative and a real one can never be -1.
       */
      it('returns an index the shaders cannot confuse with an ordinary dot', () => {
        settingsManager.centerBody = VOYAGER;
        cameraAt(0.084);

        expect(dots['hiddenBodyDotIndex_']()).toBeGreaterThanOrEqual(dots.planetDot1);
      });

      it('names no slot for a center body that has no dot', () => {
        settingsManager.centerBody = SolarBody.Neptune;
        cameraAt(1);

        expect(dots['hiddenBodyDotIndex_']()).toBe(-1);
      });
    });
  });

  describe('updatePosVel', () => {
    beforeEach(() => {
      dots.positionData = new Float32Array([7000, 0, 0]);
      dots.velocityData = new Float32Array([3, 4, 0]);
    });

    it('writes velocity and position onto a satellite-like object', () => {
      const obj = {
        id: 0,
        isStatic: () => false,
        velocity: { x: 0, y: 0, z: 0 } as TemeVec3<KilometersPerSecond>,
        position: { x: 0, y: 0, z: 0 } as TemeVec3,
        type: SpaceObjectType.PAYLOAD,
      } as unknown as BaseObject;

      dots.updatePosVel(obj, 0);

      const o = obj as unknown as { velocity: TemeVec3; position: TemeVec3 };

      expect(o.velocity.x).toBe(3);
      expect(o.velocity.y).toBe(4);
      expect(o.position.x).toBe(7000);
    });

    it('smooths a missile total velocity from the initial zero', () => {
      const missile = {
        id: 0,
        isStatic: () => false,
        velocity: { x: 0, y: 0, z: 0 } as TemeVec3<KilometersPerSecond>,
        position: { x: 0, y: 0, z: 0 } as TemeVec3,
        type: SpaceObjectType.BALLISTIC_MISSILE,
        totalVelocity: 0,
      } as unknown as BaseObject;

      dots.updatePosVel(missile, 0);

      // |(3,4,0)| = 5; first sample seeds totalVelocity directly.
      expect((missile as unknown as { totalVelocity: number }).totalVelocity).toBe(5);
    });

    it('skips velocity work for static objects but still writes position', () => {
      const stat = {
        id: 0,
        isStatic: () => true,
        position: { x: 0, y: 0, z: 0 } as TemeVec3,
      } as unknown as BaseObject;

      expect(() => dots.updatePosVel(stat, 0)).not.toThrow();
      expect((stat as unknown as { position: TemeVec3 }).position.x).toBe(7000);
    });
  });
});

describe('DotsManager highlight', () => {
  it('reports Big for a highlighted dot and clears it again', () => {
    setupStandardEnvironment();
    const dots = new DotsManager();

    dots.setDotHighlighted(7, true);
    expect(dots.getSize(7)).toBe(DotStatus.Big);
    dots.setDotHighlighted(7, false);
    expect(dots.getSize(7)).toBe(DotStatus.None);
  });
});
