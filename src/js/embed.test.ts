import * as embed from './embed';
// @ponicode
describe('embed.initalizeKeepTrack', () => {
  test('0', async () => {
    try {
      await embed.initalizeKeepTrack();
    } catch (e) {
      console.warn(e);
    }
  });
});
