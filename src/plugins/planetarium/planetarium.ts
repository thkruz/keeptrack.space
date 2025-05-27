import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class Planetarium extends KeepTrackPlugin {
  init() {
    console.error(
      'Planetarium plugin is a pro plugin. Your .env file is improperly configured or you do not have the pro files!',
    );
  }
}
