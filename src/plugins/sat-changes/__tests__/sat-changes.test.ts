import { vi } from 'vitest';
import { getSatChngJson } from '@app/plugins/sat-changes/sat-changes';
import { setupStandardEnvironment } from '@test/environment/standard-env';

describe('sat-changes', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an empty table when given no JSON (node guard)', () => {
    expect(getSatChngJson(null)).toStrictEqual({ resp: null, satChngTable: [] });
  });
});
