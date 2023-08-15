import { CatalogLoader } from '@app/js/static/catalog-loader';
import { readFileSync } from 'fs';

describe('Catalog Loader', () => {
  let errorWatch = jest.fn();
  beforeAll(() => {
    // Watch for console.error
    global.console.error = (message: string) => {
      console.warn(message);
      errorWatch(message);
    };
    global.fetch = jest.fn().mockImplementation(async () => ({
      json: () => readFileSync('./test/environment/TLE2.json').toJSON(),
    }));
  });
  it('should load the catalog', async () => {
    await CatalogLoader.load();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(errorWatch).toHaveBeenCalledTimes(0);
  });
});
