import { vi } from 'vitest';
import * as apiFetchMod from '@app/app/data/api-fetch';
import { fetchSensorGroups, sensorGroups } from '@app/app/data/catalogs/sensor-groups';
import { errorManagerInstance } from '@app/engine/utils/errorManager';

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
