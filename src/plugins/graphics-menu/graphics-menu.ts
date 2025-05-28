export class GraphicsMenuPlugin {
  init() {
    settingsManager.plugins.GraphicsMenuPlugin = {
      enabled: false,
    };
    console.error(
      'Graphics menu plugin is a pro plugin. Your .env file is improperly configured or you do not have the pro files!',
    );
  }
}
