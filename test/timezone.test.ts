describe('Timezones', () => {
  it('should always be the same time', () => {
    const now = new Date();
    const fakeTime = new Date('2022-01-01');

    fakeTime.setUTCHours(0, 0, 0, 0);
    expect(now.getTime()).toBe(fakeTime.getTime());
  });
});
