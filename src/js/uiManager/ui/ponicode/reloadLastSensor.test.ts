import * as reloadLastSensor from '@app/js/uiManager/ui/reloadLastSensor';
// @ponicode
describe('reloadLastSensor.reloadLastSensor', () => {
  test('0', () => {
    let result: any = reloadLastSensor.reloadLastSensor();
    expect(result).toMatchSnapshot();
  });
});
