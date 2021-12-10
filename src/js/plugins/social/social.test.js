import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { init } from './social';

describe('social', () => {
  it('should be initialized', () => {
    init();
  });

  it('should add social media icons', () => {
    keepTrackApi.methods.uiManagerFinal();
  });
});
