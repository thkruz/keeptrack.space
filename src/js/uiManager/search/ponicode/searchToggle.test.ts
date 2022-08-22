import * as searchToggle from '@app/js/uiManager/search/searchToggle';
// @ponicode
describe('searchToggle.searchToggle', () => {
  test('0', () => {
    let result: any = searchToggle.searchToggle(true);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = searchToggle.searchToggle(false);
    expect(result).toMatchSnapshot();
  });
});
