// Import CSS needed for loading screen

export const importCss = async (): Promise<void> => {
  try {
    if (!settingsManager.disableUI) {
      import('../css/fonts.css').catch(() => {});
      import('../css/materialize.css').catch(() => {});
      import('../css/astroux/css/astro.css').catch(() => {});
      import('../css/materialize-local.css').catch(() => {});
      import('../js/lib/external/colorPick.css').catch(() => {});
      import('../css/perfect-scrollbar.min.css').catch(() => {});
      import('../css/jquery-ui.min.css').catch(() => {});
      import('../css/jquery-ui-timepicker-addon.css').catch(() => {});
      import('../css/style.css').then(await import('../css/responsive.css').catch(() => {})).catch(() => {});
    } else if (settingsManager.enableLimitedUI) {
      import('../css/limitedUI.css').catch(() => {});
    }
  } catch (e) {
    // intentionally left blank
  }
};
