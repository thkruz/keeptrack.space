import { NaturalEventsPlugin } from '@app/plugins/natural-events/natural-events';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSmokeSuite } from '@test/generic-tests';

describe('NaturalEventsPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  it('constructs without throwing', () => {
    expect(() => new NaturalEventsPlugin()).not.toThrow();
  });

  standardPluginSmokeSuite(NaturalEventsPlugin, 'NaturalEventsPlugin');
});
