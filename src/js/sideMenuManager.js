/** @format */

// Side Menu Manager
var sMM = {};

let isLookanglesMenuOpen = false;
sMM.isLookanglesMenuOpen = (val) => {
  if (typeof val == 'undefined') return isLookanglesMenuOpen;
  isLookanglesMenuOpen = val;
};
let isDOPMenuOpen = false;
sMM.isDOPMenuOpen = (val) => {
  if (typeof val == 'undefined') return isDOPMenuOpen;
  isDOPMenuOpen = val;
};
let isLookanglesMultiSiteMenuOpen = false;
sMM.isLookanglesMultiSiteMenuOpen = (val) => {
  if (typeof val == 'undefined') return isLookanglesMultiSiteMenuOpen;
  isLookanglesMultiSiteMenuOpen = val;
};
let isAnalysisMenuOpen = false;
sMM.isAnalysisMenuOpen = (val) => {
  if (typeof val == 'undefined') return isAnalysisMenuOpen;
  isAnalysisMenuOpen = val;
};
let isEditSatMenuOpen = false;
sMM.isEditSatMenuOpen = (val) => {
  if (typeof val == 'undefined') return isEditSatMenuOpen;
  isEditSatMenuOpen = val;
};
let isNewLaunchMenuOpen = false;
sMM.isNewLaunchMenuOpen = (val) => {
  if (typeof val == 'undefined') return isNewLaunchMenuOpen;
  isNewLaunchMenuOpen = val;
};
let isBreakupMenuOpen = false;
sMM.isBreakupMenuOpen = (val) => {
  if (typeof val == 'undefined') return isBreakupMenuOpen;
  isBreakupMenuOpen = val;
};
let isMissileMenuOpen = false;
sMM.isMissileMenuOpen = (val) => {
  if (typeof val == 'undefined') return isMissileMenuOpen;
  isMissileMenuOpen = val;
};

export { sMM };
