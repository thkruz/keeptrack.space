import { defaultSat } from '@app/js/api/apiMocks';
import * as sat2ric from '@app/js/satMath/transforms/sat2ric';
// @ponicode
describe('sat2ric.sat2ric', () => {
  test('0', () => {
    let result: any = sat2ric.sat2ric(defaultSat, defaultSat);
    expect(result).toMatchSnapshot();
  });
});
