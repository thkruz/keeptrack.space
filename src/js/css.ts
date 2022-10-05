// Import CSS needed for loading screen

export const importCss = async (): Promise<void> => {
  try {
    if (!settingsManager.isDisableCss) {
      import(/* webpackMode: "eager" */ '@css/materialize.css').catch(() => {
        // This is intentional
      });
      import(/* webpackMode: "eager" */ '@css/astroux/css/astro.css').catch(() => {
        // This is intentional
      });
      import(/* webpackMode: "eager" */ '@css/materialize-local.css').catch(() => {
        // This is intentional
      });
      import(/* webpackMode: "eager" */ '@app/js/lib/external/colorPick.css').catch(() => {
        // This is intentional
      });
      import(/* webpackMode: "eager" */ '@css/jquery-ui.min.css').catch(() => {
        // This is intentional
      });
      import(/* webpackMode: "eager" */ '@css/jquery-ui-timepicker-addon.css').catch(() => {
        // This is intentional
      });
      import(/* webpackMode: "eager" */ '@css/style.css')
        .then(
          await import(/* webpackMode: "eager" */ '@css/responsive.css').catch(() => {
            // This is intentional
          })
        )
        .catch(() => {
          // This is intentional
        });
    } else if (settingsManager.enableLimitedUI) {
      import(/* webpackMode: "eager" */ '@css/limitedUI.css').catch(() => {
        // This is intentional
      });
    }
  } catch (e) {
    // intentionally left blank
  }
};
