/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
import { vi } from 'vitest';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { ProximityOps } from '@app/plugins/proximity-ops/proximity-ops';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';

describe('ProximityOps_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(ProximityOps, 'ProximityOps');
  standardPluginMenuButtonTests(ProximityOps, 'ProximityOps');

  describe('Configuration', () => {
    it('should have correct id', () => {
      const plugin = new ProximityOps();

      expect(plugin.id).toBe('ProximityOps');
    });

    it('should have correct dependencies', () => {
      const plugin = new ProximityOps();

      expect(plugin.dependencies_).toContain('SelectSatManager');
    });

    it('should have correct side menu element name', () => {
      const plugin = new ProximityOps();

      expect(plugin.sideMenuElementName).toBe('proximityOps-menu');
    });

    it('should have draggable side menu', () => {
      const plugin = new ProximityOps();

      expect(plugin.dragOptions.isDraggable).toBe(true);
      expect(plugin.dragOptions.minWidth).toBe(480);
      expect(plugin.dragOptions.maxWidth).toBe(650);
    });

    it('should have draggable secondary menu', () => {
      const plugin = new ProximityOps();

      expect(plugin.dragOptionsSecondary.isDraggable).toBe(true);
      expect(plugin.dragOptionsSecondary.minWidth).toBe(600);
      expect(plugin.dragOptionsSecondary.maxWidth).toBe(1000);
    });

    it('should have help content', () => {
      const plugin = new ProximityOps();

      expect(plugin.helpTitle).toBeDefined();
      expect(plugin.helpBody).toBeDefined();
    });

    it('should have bottom icon label', () => {
      const plugin = new ProximityOps();

      expect(plugin.bottomIconLabel).toBeDefined();
    });
  });

  describe('keyboard shortcuts', () => {
    it('should return keyboard shortcuts with X key', () => {
      const plugin = new ProximityOps();
      const shortcuts = plugin.getKeyboardShortcuts();

      expect(shortcuts).toHaveLength(1);
      expect(shortcuts[0].key).toBe('X');
    });
  });

  describe('bottomIconCallback', () => {
    it('should call updateNoradId_ bridge', () => {
      const plugin = new ProximityOps();

      websiteInit(plugin);

      const spy = vi.spyOn(plugin as any, 'updateNoradId_');

      plugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('convertRPOsToCSV_', () => {
    it('should produce CSV with 15 headers matching 15 data columns', () => {
      const plugin = new ProximityOps();
      const mockRPOs = [
        {
          sat1Id: 1,
          sat1SccNum: '25544',
          sat1Name: 'ISS',
          sat2Id: 2,
          sat2SccNum: '48274',
          sat2Name: 'STARLINK-1234',
          ric: {
            position: { x: 1, y: 2, z: 3 },
            velocity: { x: 0.1, y: 0.2, z: 0.3 },
          },
          dist: 10.5,
          vel: 0.05,
          date: new Date('2024-01-01T12:00:00Z'),
        },
      ];

      const csv = plugin['convertRPOsToCSV_'](mockRPOs as any);
      const lines = csv.split('\n');
      const headerCount = lines[0].split(',').length;
      const dataCount = lines[1].split(',').length;

      expect(headerCount).toBe(15);
      expect(dataCount).toBe(15);
    });

    it('should handle satellite names with commas', () => {
      const plugin = new ProximityOps();
      const mockRPOs = [
        {
          sat1Id: 1,
          sat1SccNum: '25544',
          sat1Name: 'SAT, WITH COMMA',
          sat2Id: 2,
          sat2SccNum: '48274',
          sat2Name: 'ANOTHER SAT',
          ric: {
            position: { x: 1, y: 2, z: 3 },
            velocity: { x: 0.1, y: 0.2, z: 0.3 },
          },
          dist: 10.5,
          vel: 0.05,
          date: new Date('2024-01-01T12:00:00Z'),
        },
      ];

      const csv = plugin['convertRPOsToCSV_'](mockRPOs as any);
      const lines = csv.split('\n');

      // Data values are quoted, so the comma in the name doesn't create extra columns
      expect(lines[1]).toContain('"SAT, WITH COMMA"');
    });

    it('should return empty CSV with only headers for empty array', () => {
      const plugin = new ProximityOps();

      const csv = plugin['convertRPOsToCSV_']([]);
      const lines = csv.split('\n');

      expect(lines.length).toBe(1);
      expect(lines[0]).toContain('t_id');
    });
  });

  describe('downloadIconCb', () => {
    it('should show toast when no RPOs available', () => {
      const plugin = new ProximityOps();

      websiteInit(plugin);
      plugin.RPOs = [];

      plugin.downloadIconCb();

      // No error should be thrown, toast is shown
    });
  });

  describe('search + RPO computation', () => {
    let plugin: ProximityOps;
    const p = () => plugin as any;

    const cloneSat = (over: Record<string, unknown> = {}) =>
      Object.assign(Object.create(Object.getPrototypeOf(defaultSat)), defaultSat, { id: 1, ...over });

    beforeEach(() => {
      plugin = new ProximityOps();
      websiteInit(plugin);
      const catalog = ServiceLocator.getCatalogManager();

      catalog.getSats = vi.fn(() => [defaultSat, cloneSat()]) as never;
      catalog.getSat = vi.fn(() => defaultSat) as never;
    });

    it('findClosestApproach returns a proximity event with dist/vel/ric', () => {
      const event = plugin.findClosestApproach(defaultSat, cloneSat() as never, new Date('2022-01-01T00:00:00Z'), 5400 as never);

      expect(typeof event.dist).toBe('number');
      expect(typeof event.vel).toBe('number');
      expect(event.ric).toBeDefined();
    });

    it('findRPOs_ collects pairs within the distance/velocity limits', () => {
      const rpos = p().findRPOs_([defaultSat, cloneSat()], 1e9, 1e9, 5400, false);

      expect(Array.isArray(rpos)).toBe(true);
    });

    it('getFilteredSatellites applies the payload-only filter', () => {
      (getEl('proximity-ops-payload-only') as HTMLInputElement).checked = true;

      const sats = p().getFilteredSatellites();

      expect(Array.isArray(sats)).toBe(true);
    });

    it('populateTable_ renders a row per event and a no-results row when empty', () => {
      const event = plugin.findClosestApproach(defaultSat, cloneSat() as never, new Date('2022-01-01T00:00:00Z'), 5400 as never);

      p().populateTable_([event]);
      expect(getEl('proximity-ops-table')!.querySelectorAll('tr').length).toBeGreaterThan(1);

      p().populateTable_([]);
      expect(getEl('proximity-ops-table')!.textContent).toBeTruthy();
    });

    it('processRPOSearch_ toasts when the primary satellite is not found', () => {
      ServiceLocator.getCatalogManager().sccNum2Id = vi.fn(() => null) as never;
      (getEl('proximity-ops-ava') as HTMLInputElement).checked = false;
      (getEl('proximity-ops-type') as HTMLInputElement).value = 'GEO';
      (getEl('proximity-ops-norad') as HTMLInputElement).value = '99999';
      const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');

      const result = p().processRPOSearch_();

      expect(result).toEqual([]);
      expect(toast).toHaveBeenCalled();
    });
  });
});
