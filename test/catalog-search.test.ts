import { CatalogSearch } from '@app/app/data/catalog-search';
import { SpaceObjectType, TleLine1 } from '@ootk/src/main';
import { defaultSat } from './environment/apiMocks';

describe('CatalogSearch_class', () => {
  const sat1 = defaultSat.clone();

  sat1.id = 1;
  sat1.name = 'ISS (ZARYA)';
  sat1.country = 'USA';
  sat1.shape = 'SPHERICAL';
  sat1.bus = 'TRASH CAN';
  sat1.type = SpaceObjectType.PAYLOAD;

  const sat2_ = defaultSat.clone();

  sat2_.tle1 = '1 25544U 01067A   98286.88032407  .00000000  00000-0  10000-3 0  9999' as TleLine1;
  const sat2 = sat2_.clone();

  sat2.id = 2;
  sat2.name = 'TERRA';
  sat2.country = 'CAN';
  sat2.shape = 'CONE';
  sat2.bus = 'A2100';
  sat2.type = SpaceObjectType.ROCKET_BODY;

  const satData = [sat1, sat2];

  // Tests that year method filters correctly based on year
  it('test_year_filters_correctly', () => {
    const filteredData = CatalogSearch.year(satData, 98);

    expect(filteredData).toHaveLength(1);
    expect(filteredData[0].id).toBe(1);
  });

  // Tests that yearOrLess method filters correctly based on year
  it('test_year_or_less_filters_correctly', () => {
    const filteredData = CatalogSearch.yearOrLess(satData, 99);

    expect(filteredData).toHaveLength(1);
  });

  // Tests that yearOrLess method filters correctly when year greater than 99
  it('test_year_or_less_filters_correctly_when_year_greater_than_99', () => {
    const filteredData = CatalogSearch.yearOrLess(satData, 2);

    expect(filteredData).toHaveLength(2);
  });

  // Tests that objectName method filters correctly based on object name
  it('test_object_name_filters_correctly', () => {
    const filteredData = CatalogSearch.objectName(satData, /ISS/u);

    expect(filteredData).toHaveLength(1);
  });

  // Tests that country method filters correctly based on country
  it('test_country_filters_correctly', () => {
    const filteredData = CatalogSearch.country(satData, /USA/u);

    expect(filteredData).toHaveLength(1);
  });

  // Tests that shape method filters correctly based on shape
  it('test_shape_filters_correctly', () => {
    const filteredData = CatalogSearch.shape(satData, 'SPHERICAL');

    expect(filteredData).toHaveLength(1);
  });

  // Tests that bus method filters correctly based on bus
  it('test_bus_filters_correctly', () => {
    const filteredData = CatalogSearch.bus(satData, 'A2100');

    expect(filteredData).toHaveLength(1);
  });

  // Tests that type method filters correctly based on type
  it('test_type_filters_correctly', () => {
    const filteredData = CatalogSearch.type(satData, SpaceObjectType.PAYLOAD as SpaceObjectType);

    expect(filteredData).toHaveLength(1);
  });
});
