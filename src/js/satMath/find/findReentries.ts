import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';

export const findReentries = (): string => {
  const { satSet } = keepTrackApi.programs;
  const reentries = satSet.satData.filter((sat) => sat.type === SpaceObjectType.PAYLOAD || sat.type === SpaceObjectType.ROCKET_BODY || sat.type === SpaceObjectType.DEBRIS);

  const reentriesStr = reentries
    .filter((sat) => sat.perigee > 0)
    .sort((a, b) => a.perigee - b.perigee)
    .slice(0, 100)
    .map((sat) => sat.sccNum)
    .join(',');

  return reentriesStr;
};
