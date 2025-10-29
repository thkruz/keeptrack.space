import { CatalogLoader } from '@app/app/data/catalog-loader';
import { readFileSync } from 'fs';

describe('Catalog Loader', () => {
  const errorWatch = jest.fn();

  beforeAll(() => {
    // Watch for console.error
    global.console.error = (message: string) => {
      console.warn(message);
      errorWatch(message);
    };
    // eslint-disable-next-line require-await
    global.fetch = jest.fn().mockImplementation(async () => ({
      json: () => {
        const tle = readFileSync('./test/environment/TLE2.json');
        const json = JSON.parse(tle.toString());


        return json;
      },
      catch: () => {
        console.warn('Error fetching catalog');
      },
    }));
  });
  it('should load the catalog', async () => {
    settingsManager.isDisableAsciiCatalog = true;
    await CatalogLoader.load();
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(errorWatch).toHaveBeenCalledTimes(0);
  });
});
