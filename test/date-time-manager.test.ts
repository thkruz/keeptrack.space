import { DateTimeManager } from '@app/js/plugins/date-time-manager/date-time-manager';
import { TopMenu } from '@app/js/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite, websiteInit } from './generic-tests';

describe('DateTimeManager_class', () => {
  let dtm: DateTimeManager;
  beforeEach(() => {
    // Mock DateTimeManager uiManagerFinal to prevent errors
    DateTimeManager.prototype.uiManagerFinal = jest.fn();
    setupStandardEnvironment([TopMenu]);
    dtm = new DateTimeManager();
  });

  standardPluginSuite(DateTimeManager, 'DateTimeManager');

  it('should process datetimeInputFormChange', () => {
    websiteInit(dtm);
    const newDate = new Date();
    expect(() => dtm.datetimeInputFormChange(newDate)).not.toThrow();
  });

  it('should process updateDateTime', () => {
    websiteInit(dtm);
    const newDate = new Date();
    expect(() => dtm.updateDateTime(newDate)).not.toThrow();
  });

  it('should process datetimeTextClick', () => {
    websiteInit(dtm);
    expect(() => dtm.datetimeTextClick()).not.toThrow();
    expect(() => dtm.datetimeTextClick()).not.toThrow();
  });
});
