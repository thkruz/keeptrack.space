import { describe, expect, it } from 'vitest';
import lookAngles from '../../sensor/locales/en.src.json';
import sensorBox from '../locales/en.src.json';

describe('observer view uncertainty wording (#44)', () => {
  it('labels Vis Mag as an estimate', () => {
    expect(JSON.stringify(sensorBox)).toMatch(/Vis Mag \(est\.\)/u);
    expect(JSON.stringify(sensorBox)).toMatch(/Estimated visual magnitude/u);
  });
  it('states weather is not considered next to the optical flag', () => {
    expect(JSON.stringify(lookAngles)).toMatch(/Weather and cloud cover are not considered/u);
  });
});
