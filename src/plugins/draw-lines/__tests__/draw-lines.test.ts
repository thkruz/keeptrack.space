import { vi } from 'vitest';
import { DrawLinesPlugin } from '@app/plugins/draw-lines/draw-lines';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('DrawLinesPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(DrawLinesPlugin, 'DrawLinesPlugin');
});
