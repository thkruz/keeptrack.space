import { CreateSat } from '@app/plugins/create-sat/create-sat';

describe('mean motion formatting', () => {
  it.each([
    ['15.05490646', '15.05490646'],
    ['15.0549', '15.05490'],
    ['16', '16.00000'],
    ['1.0027', '01.00270'],
    ['15.054906461', '15.05490646'],
  ])('formats %s as %s without dropping typed precision', (raw, expected) => {
    expect(CreateSat.formatMeanMotion_(raw)).toBe(expected);
  });
});
