declare interface uiManagerI {
  /**
   *
   * @param {string} toastText - text to be displayed
   * @param {string} type - determines the color [standby, normal, caution, serious, critical] (default: standby)
   * @param {boolean} isLong - 10 seconds if false and 100 seconds if true (default: false)
   */
  toast: (toastText: string, type?: string, isLong?: boolean) => void;
  doSearch: (searchString: string, isPreventDropDown?: boolean) => void;
  colorSchemeChangeAlert: (colorScheme: any) => void;
  hideSideMenus: () => void;
  searchToggle: (force: boolean) => void;
  updateNextPassOverlay: (nextPassArray: any, isForceUpdate?: any) => void;
}
