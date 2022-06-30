import { stringPad } from '@app/js/lib/helpers';
import { keepTrackApi } from '../../api/keepTrackApi';

export const currentEpoch = (currentDate: Date): [string, string] => {
  const { timeManager } = keepTrackApi.programs;

  const currentDateObj = new Date(currentDate);
  let epochYear = currentDateObj.getUTCFullYear().toString().substr(2, 2);
  let epochDay = timeManager.getDayOfYear(currentDateObj);
  let timeOfDay = (currentDateObj.getUTCHours() * 60 + currentDateObj.getUTCMinutes()) / 1440;
  const epochDayStr = stringPad.pad0((epochDay + timeOfDay).toFixed(8), 12);
  return [epochYear, epochDayStr];
};
