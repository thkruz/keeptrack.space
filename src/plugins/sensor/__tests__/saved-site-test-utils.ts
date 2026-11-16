import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { SpaceObjectType } from '@ootk/src/main';
import { vi } from 'vitest';
import type { CustomSensorSource } from '../custom-sensor-persistence';

/** In-memory PersistenceManager so a test sees exactly what the registry writes. Restore with vi.restoreAllMocks(). */
export const mockPersistence = (): Map<string, string> => {
  const store = new Map<string, string>();
  const persistence = PersistenceManager.getInstance();

  vi.spyOn(persistence, 'saveItem').mockImplementation((key: string, value: string) => {
    store.set(key, value);
  });
  vi.spyOn(persistence, 'getItem').mockImplementation((key: string) => store.get(key) ?? null);
  vi.spyOn(persistence, 'removeItem').mockImplementation((key: string) => {
    store.delete(key);
  });

  return store;
};

/** A custom-site source with sane defaults. */
export const makeSiteSource = (objName: string, name: string, lat = 10): CustomSensorSource => ({
  objName,
  name,
  uiName: name,
  type: SpaceObjectType.MECHANICAL,
  lat,
  lon: 20,
  alt: 0.1,
  minAz: 0,
  maxAz: 360,
  minEl: 5,
  maxEl: 90,
  minRng: 100,
  maxRng: 50000,
  isCustomSensor: true,
});
