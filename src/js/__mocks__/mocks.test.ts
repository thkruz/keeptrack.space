import { Worker as OrbitCruncher } from './orbitCruncher';
import { Worker as PositionCruncher } from './positionCruncher';

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
