import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { EditSat } from '@app/plugins/edit-sat/edit-sat';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment, standardSelectSat } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('EditSatPlugin_class', () => {
  beforeEach(() => {
    keepTrackApi.containerRoot.innerHTML = '';
    setupStandardEnvironment();
  });

  standardPluginSuite(EditSat);
  standardPluginMenuButtonTests(EditSat);

  it('should submit the form', () => {
    const editSatPlugin = new EditSat();

    websiteInit(editSatPlugin);
    standardSelectSat();
    const button = <HTMLButtonElement>keepTrackApi.containerRoot.querySelector('button[type="submit"]');

    button.click();
  });

  it('should create new TLE at Epoch', () => {
    const editSatPlugin = new EditSat();

    websiteInit(editSatPlugin);
    standardSelectSat();
    const toggleButton = getEl(editSatPlugin.bottomIconElementName);

    toggleButton.click();
    keepTrackApi.getCatalogManager().sccNum2Id = () => 0;
    keepTrackApi.getCatalogManager().getObject = () => defaultSat;
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
    keepTrackApi.getCatalogManager().sccNum2Id = () => 0;
    keepTrackApi.getCatalogManager().getObject = () => defaultSat;
    const button = getEl('editSat-save');

    button.click();
    jest.advanceTimersByTime(1000);
  });
});
