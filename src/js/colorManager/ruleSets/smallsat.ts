import { SatObject } from '@app/js/api/keepTrackTypes';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { ColorInformation, colorSchemeManager, Pickable } from '../colorSchemeManager';

export const smallsatsRules = (sat: SatObject): ColorInformation => {
  if (sat.type === SpaceObjectType.PAYLOAD && colorSchemeManager.objectTypeFlags.satSmall === false) {
    return {
      color: colorSchemeManager.colorTheme.deselected,
      pickable: Pickable.No,
    };
  }
  if (parseFloat(sat.rcs) < 0.1 && sat.type === SpaceObjectType.PAYLOAD) {
    return {
      color: colorSchemeManager.colorTheme.satSmall,
      pickable: Pickable.Yes,
    };
  } else {
    return {
      color: colorSchemeManager.colorTheme.transparent,
      pickable: Pickable.No,
    };
  }
};
