import { Worker as OrbitCruncher } from './__mocks__/orbitCruncher';
import { Worker as PositionCruncher } from './__mocks__/positionCruncher';

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
