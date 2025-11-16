import { getEl } from '@app/engine/utils/get-el';
import { EditSat } from '@app/plugins/edit-sat/edit-sat';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment, standardSelectSat } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { KeepTrack } from '@app/keeptrack';

describe('EditSatPlugin_class', () => {
  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSuite(EditSat);
  standardPluginMenuButtonTests(EditSat);

  it('should submit the form', () => {
    const editSatPlugin = new EditSat();

    websiteInit(editSatPlugin);
    standardSelectSat();
    const button = <HTMLButtonElement>KeepTrack.getInstance().containerRoot.querySelector('button[type="submit"]');

    button.click();
  });

  it('should create new TLE at Epoch', () => {
    const editSatPlugin = new EditSat();

    websiteInit(editSatPlugin);
    standardSelectSat();
    const toggleButton = getEl(editSatPlugin.bottomIconElementName);

    toggleButton.click();
    ServiceLocator.getCatalogManager().sccNum2Id = () => 0;
    ServiceLocator.getCatalogManager().getObject = () => defaultSat;
    const button = getEl('editSat-newTLE');

    button.click();
    jest.advanceTimersByTime(1000);
  });

  it('should save TLE', () => {
    const editSatPlugin = new EditSat();

    websiteInit(editSatPlugin);
    standardSelectSat();
    const toggleButton = getEl(editSatPlugin.bottomIconElementName);

    toggleButton.click();
    ServiceLocator.getCatalogManager().sccNum2Id = () => 0;
    ServiceLocator.getCatalogManager().getObject = () => defaultSat;
    const button = getEl('editSat-save');

    button.click();
    jest.advanceTimersByTime(1000);
  });
});
