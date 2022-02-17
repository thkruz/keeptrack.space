import { Worker as OrbitCruncher } from '../src/js/__mocks__/orbitCruncher';
import { Worker as PositionCruncher } from '../src/js/__mocks__/positionCruncher';

describe('Mocks', () => {
  test('OrbitCruncher', () => {
    const orbitCruncher = new OrbitCruncher();
    expect(orbitCruncher).toBeDefined();
  });
  test('PositionCruncher', () => {
    const positionCruncher = new PositionCruncher();
    expect(positionCruncher).toBeDefined();
  });
});
