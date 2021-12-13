// Import CSS needed for loading screen

export const importCss = async (): Promise<void> => {
  try {
    if (!settingsManager.disableUI) {
      import('@app/css/fonts.css').catch(() => {});
      import('@app/css/materialize.css').catch(() => {});
      import('@app/css/astroux/css/astro.css').catch(() => {});
      import('@app/css/materialize-local.css').catch(() => {});
      import('@app/js/lib/external/colorPick.css').catch(() => {});
      import('@app/css/perfect-scrollbar.min.css').catch(() => {});
      import('@app/css/jquery-ui.min.css').catch(() => {});
      import('@app/css/jquery-ui-timepicker-addon.css').catch(() => {});
      import('@app/css/style.css').then(await import('@app/css/responsive.css').catch(() => {})).catch(() => {});
    } else if (settingsManager.enableLimitedUI) {
      import('@app/css/limitedUI.css').catch(() => {});
    }
  } catch (e) {
    // intentionally left blank
  }
};
