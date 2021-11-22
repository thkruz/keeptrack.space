import { init } from './social';
import { keepTrackApi } from '@app/js/api/externalApi';

describe('social', () => {
  it('should be initialized', () => {
    init();
  });

  it('should add social media icons', () => {
    keepTrackApi.methods.uiManagerFinal();
  });
});
