export class DebugMenuPlugin {
  init() {
    throw new Error(
      'Debug menu plugin is a pro plugin. Your .env file is improperly configured or you do not have the pro files!',
    );
  }
}
