/*globals
  test
  expect
*/

import { GroupFactory } from '@app/js/groupsManager/group-factory.js';

test('GroupFactory Unit Tests', () => {
  const groupManager = new GroupFactory();
  expect(groupManager.selectGroup(null)).toBeUndefined();
  expect(groupManager.selectGroupNoOverlay(null)).toBeUndefined();
});
