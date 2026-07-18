import * as apiFetchMod from '@app/app/data/api-fetch';
import { fetchSensorGroups, sensorGroups } from '@app/app/data/catalogs/sensor-groups';
import { sensors } from '@app/app/data/catalogs/sensors';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { vi } from 'vitest';

/*
 * fetchSensorGroups pulls the sensor-group definitions from the KeepTrack API and
 * falls back to the bundled static list when the API returns nothing.
 */
describe('fetchSensorGroups', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the API groups when the response is non-empty', async () => {
    const apiData = [{ name: 'x', header: 'h', topLink: { name: 'n', badge: 'b' }, list: ['1'] }];

    vi.spyOn(apiFetchMod, 'apiFetch').mockResolvedValue({ json: () => Promise.resolve(apiData) } as never);

    expect(await fetchSensorGroups()).toEqual(apiData);
  });

  it('falls back to the bundled groups when the API returns an empty list', async () => {
    vi.spyOn(apiFetchMod, 'apiFetch').mockResolvedValue({ json: () => Promise.resolve([]) } as never);
    const warn = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);

    expect(await fetchSensorGroups()).toBe(sensorGroups);
    expect(warn).toHaveBeenCalled();
  });
});

describe('sensorGroups catalog integrity', () => {
  it('every sensor listed in a group exists in the sensors catalog', () => {
    for (const group of sensorGroups) {
      for (const key of group.list) {
        expect(sensors[key], `Sensor ${key} in group ${group.name} is missing from the sensors catalog`).toBeDefined();
      }
    }
  });

  it('every catalog sensor objName matches its catalog key', () => {
    for (const [key, sensor] of Object.entries(sensors)) {
      expect(sensor.objName, `Sensor ${key} has mismatched objName ${sensor.objName}`).toBe(key);
    }
  });

  it('group names are unique', () => {
    const names = sensorGroups.map((group) => group.name);

    expect(new Set(names).size).toBe(names.length);
  });
});
