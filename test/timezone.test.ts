describe('Timezones', () => {
  it('should always be the same time', () => {
    const now = new Date();
    expect(now.getTime()).toBe(new Date('2020-01-01').getTime());
  });
});
