import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';
import { timeManager } from './timeManager';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

test(`Basic Functions of Time Manager`, () => {
  // Setup a unit test enviornment that doesn't worry about other modules
  document.body.innerHTML = `
    <div id="datetime-text"><div>
  `;

  (<any>window).settingsManager = { plugins: {} };
  timeManager.init();
  expect(timeManager.drawDt).toBe(0);

  document.getElementById('datetime-text').innerText = timeManager.timeTextStr;
  timeManager.setSelectedDate(new Date());

  timeManager.setLastTime(new Date());
  timeManager.setSelectedDate(new Date());

  timeManager.calculateSimulationTime(new Date());

  timeManager.calculateSimulationTime(null);

  timeManager.changePropRate(0);
  timeManager.calculateSimulationTime();

  timeManager.calculateSimulationTime();

  timeManager.changePropRate(1);
  timeManager.calculateSimulationTime();

  timeManager.setNow(new Date(), 60);

  timeManager.setSelectedDate(null);
});
