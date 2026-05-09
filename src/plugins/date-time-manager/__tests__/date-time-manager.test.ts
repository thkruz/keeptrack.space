import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('DateTimeManager_class', () => {
  let dtm: DateTimeManager;

  beforeEach(() => {
    (DateTimeManager.prototype as unknown as { uiManagerFinal_: () => void }).uiManagerFinal_ = vi.fn();
    setupStandardEnvironment([TopMenu]);
    dtm = new DateTimeManager();
  });

  standardPluginSuite(DateTimeManager, 'DateTimeManager');

  it('should process updateDateTime', () => {
    const newDate = new Date();

    expect(() => dtm.updateDateTime(newDate)).not.toThrow();
  });
});

describe('DateTimeManager_updateDateTime_guards', () => {
  let dtm: DateTimeManager;

  beforeEach(() => {
    (DateTimeManager.prototype as unknown as { uiManagerFinal_: () => void }).uiManagerFinal_ = vi.fn();
    setupStandardEnvironment([TopMenu]);
    dtm = new DateTimeManager();
  });

  it('returns early without throwing when date is null', () => {
    const getElementByIdSpy = vi.spyOn(document, 'getElementById');

    getElementByIdSpy.mockClear();

    expect(() => dtm.updateDateTime(null as unknown as Date)).not.toThrow();
    expect(getElementByIdSpy).not.toHaveBeenCalled();
  });

  it('returns early without throwing when date is undefined', () => {
    const getElementByIdSpy = vi.spyOn(document, 'getElementById');

    getElementByIdSpy.mockClear();

    expect(() => dtm.updateDateTime(undefined as unknown as Date)).not.toThrow();
    expect(getElementByIdSpy).not.toHaveBeenCalled();
  });

  it('returns early without throwing when date is an Invalid Date', () => {
    // `toISOString()` on an Invalid Date throws RangeError. Without the guard,
    // this is the exact crash from the user-reported stack trace.
    const invalid = new Date('not-a-date');

    expect(Number.isNaN(invalid.getTime())).toBe(true);

    const getElementByIdSpy = vi.spyOn(document, 'getElementById');

    getElementByIdSpy.mockClear();

    expect(() => dtm.updateDateTime(invalid)).not.toThrow();
    expect(getElementByIdSpy).not.toHaveBeenCalled();
  });

  it('proceeds past the guard for a valid date (positive control)', () => {
    const getElementByIdSpy = vi.spyOn(document, 'getElementById');

    getElementByIdSpy.mockClear();

    dtm.updateDateTime(new Date());

    expect(getElementByIdSpy).toHaveBeenCalled();
  });
});
