import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite } from './generic-tests';

describe('DateTimeManager_class', () => {
  let dtm: DateTimeManager;

  beforeEach(() => {
    // Mock DateTimeManager uiManagerFinal to prevent errors
    DateTimeManager.prototype.uiManagerFinal = jest.fn();
    setupStandardEnvironment([TopMenu]);
    dtm = new DateTimeManager();
  });

  standardPluginSuite(DateTimeManager, 'DateTimeManager');

  it.skip('should process datetimeInputFormChange', () => {
    const newDate = new Date();

    expect(() => dtm.calendar.setDate(newDate)).not.toThrow();
  });

  it('should process updateDateTime', () => {
    const newDate = new Date();

    expect(() => dtm.updateDateTime(newDate)).not.toThrow();
  });

  it.skip('should process datetimeTextClick', () => {
    expect(() => dtm.datetimeTextClick()).not.toThrow();
    expect(() => dtm.datetimeTextClick()).not.toThrow();
  });
});
