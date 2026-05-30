import { SatelliteTimeline } from '@app/plugins/timeline-satellite/satellite-timeline';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSmokeSuite } from '@test/generic-tests';

describe('SatelliteTimeline_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSmokeSuite(SatelliteTimeline, 'SatelliteTimeline');
});
