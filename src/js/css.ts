// Import CSS needed for loading screen

export const importCss = async (): Promise<void> => {
  try {
    if (!settingsManager.disableUI) {
      import('../css/materialize.css').catch(() => {
        // This is intentional
      });
      import('../css/astroux/css/astro.css').catch(() => {
        // This is intentional
      });
      import('../css/materialize-local.css').catch(() => {
        // This is intentional
      });
      import('../js/lib/external/colorPick.css').catch(() => {
        // This is intentional
      });
      import('../css/jquery-ui.min.css').catch(() => {
        // This is intentional
      });
      import('../css/jquery-ui-timepicker-addon.css').catch(() => {
        // This is intentional
      });
      import('../css/style.css')
        .then(
          await import('../css/responsive.css').catch(() => {
            // This is intentional
          })
        )
        .catch(() => {
          // This is intentional
        });
    } else if (settingsManager.enableLimitedUI) {
      import('../css/limitedUI.css').catch(() => {
        // This is intentional
      });
    }
  } catch (e) {
    // intentionally left blank
  }
};
