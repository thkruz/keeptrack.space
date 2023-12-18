import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { EditSatPlugin } from '@app/plugins/edit-sat/edit-sat';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment, standardSelectSat } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('EditSatPlugin_class', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setupStandardEnvironment();
  });

  standardPluginSuite(EditSatPlugin);
  standardPluginMenuButtonTests(EditSatPlugin);

  it('should submit the form', () => {
    const editSatPlugin = new EditSatPlugin();
    websiteInit(editSatPlugin);
    standardSelectSat();
    const button = <HTMLButtonElement>document.querySelector('button[type="submit"]');
    button.click();
  });

  it('should create new TLE at Epoch', () => {
    const editSatPlugin = new EditSatPlugin();
    websiteInit(editSatPlugin);
    standardSelectSat();
    const toggleButton = getEl(editSatPlugin.bottomIconElementName);
    toggleButton.click();
    keepTrackApi.getCatalogManager().getIdFromObjNum = () => 0;
    keepTrackApi.getCatalogManager().getSat = () => defaultSat;
    const button = getEl('editSat-newTLE');
    button.click();
    jest.advanceTimersByTime(1000);
  });

  it('should save TLE', () => {
    const editSatPlugin = new EditSatPlugin();
    websiteInit(editSatPlugin);
    standardSelectSat();
    const toggleButton = getEl(editSatPlugin.bottomIconElementName);
    toggleButton.click();
    keepTrackApi.getCatalogManager().getIdFromObjNum = () => 0;
    keepTrackApi.getCatalogManager().getSat = () => defaultSat;
    const button = getEl(`editSat-save`);
    button.click();
    jest.advanceTimersByTime(1000);
  });
});
