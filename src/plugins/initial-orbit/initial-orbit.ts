export class InitialOrbitDeterminationPlugin {
  init() {
    throw new Error(
      'Initial orbit determination plugin is a pro plugin. Your .env file is improperly configured or you do not have the pro files!',
    );
  }
}
