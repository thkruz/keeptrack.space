import { DopList, DopMath } from '@app/engine/math/dop-math';
import { getEl } from '@app/engine/utils/get-el';
import { KeepTrack } from '@app/keeptrack';
import { AzEl, Degrees, Kilometers } from '@ootk/src/main';
import { defaultSat } from './environment/apiMocks';
import { disableConsoleErrors, enableConsoleErrors } from './environment/standard-env';

const goodAzElList = [
  { az: 91.88445529075437, el: 19.368844568187534 },
  { az: 312.49994828332336, el: 54.33531027158056 },
  { az: 46.445203261762344, el: 18.427182663641375 },
  { az: 37.39292132345464, el: 23.824262825630246 },
  { az: 111.54154899423315, el: 34.08169499196114 },
  { az: 314.82886826794277, el: 70.2982207424431 },
  { az: 245.43661823129077, el: 50.87489483747285 },
  { az: 109.03510315382685, el: 56.11407455890305 },
  { az: 67.264804091672, el: 26.478372464164416 },
  { az: 196.80828170336332, el: 16.926229873530033 },
  { az: 299.2517011065077, el: 25.924714936175217 },
  { az: 48.192312317903856, el: 58.9006623297262 },
  { az: 56.098802502092454, el: 62.75704399994567 },
  { az: 203.4050280498886, el: 22.712664470153715 },
  { az: 297.8861272351602, el: 46.05664175259577 },
  { az: 63.12465033065439, el: 27.39450684281197 },
  { az: 274.0594394440055, el: 39.58928263964958 },
  { az: 194.18771517890687, el: 79.00594930277593 },
  { az: 47.7085155478527, el: 23.053348012729032 },
  { az: 308.29133510551395, el: 57.59655021779034 },
  { az: 357.46748959108925, el: 70.92975339703001 },
  { az: 48.33056664709723, el: 21.604133154418424 },
  { az: 235.04464595050587, el: 47.860885092776236 },
  { az: 81.74993342970184, el: 42.435806249003626 },
  { az: 159.8849131491328, el: 55.27753415824919 },
] as AzEl<Degrees>[];

describe('getDopsList_method', () => {
  let result: DopList;

  beforeEach(() => {
    const getOffsetTimeObj = (offset) => new Date(Date.now() + offset);
    const gpsSats = [defaultSat, defaultSat, defaultSat, defaultSat];
    const lat = 0 as Degrees;
    const lon = 0 as Degrees;
    const alt = 0 as Kilometers;
    const el = 0 as Degrees;

    result = DopMath.getDopsList(getOffsetTimeObj, gpsSats, lat, lon, alt, el);
  });

  // Tests that the method returns an array of DopList objects
  it('test_happy_path_returns_array_of_DopList_objects', () => {
    expect(Array.isArray(result)).toBe(true);
  });

  // Tests that the method returns an array of length 1440
  it('test_happy_path_returns_array_of_length_1440', () => {
    expect(result).toHaveLength(1440);
  });

  // Tests that each DopList object has a time property of type Date
  it('test_happy_path_returns_DopList_objects_with_time_property_of_type_Date', () => {
    expect(result.every((r) => r.time instanceof Date)).toBe(true);
  });
});

describe('updateDopsTable_method', () => {
  // Tests that the method updates the table with the correct number of rows and columns, and displays the correct header titles and DOP values for each row
  it('test_correct_table', () => {
    const dopsResults = [
      { time: new Date(), dops: { pdop: '1', hdop: '2', gdop: '3' } },
      { time: new Date(), dops: { pdop: '4', hdop: '5', gdop: '6' } },
    ] as DopList;

    KeepTrack.getInstance().containerRoot.innerHTML += '<table id="dops"></table>';
    DopMath.updateDopsTable(dopsResults);
    const table = getEl('dops') as HTMLTableElement;

    expect(table.rows).toHaveLength(3);
    expect(table.rows[0].cells[0].innerHTML).toBe('Time');
    expect(table.rows[0].cells[1].innerHTML).toBe('HDOP');
    expect(table.rows[0].cells[2].innerHTML).toBe('PDOP');
    expect(table.rows[0].cells[3].innerHTML).toBe('GDOP');
    expect(table.rows[1].cells[0].innerHTML).toBe(dopsResults[0].time.toISOString().replace('T', ' ').slice(0, -5));
    expect(table.rows[1].cells[1].innerHTML).toBe(dopsResults[0].dops.hdop);
    expect(table.rows[1].cells[2].innerHTML).toBe(dopsResults[0].dops.pdop);
    expect(table.rows[1].cells[3].innerHTML).toBe(dopsResults[0].dops.gdop);
    expect(table.rows[2].cells[0].innerHTML).toBe(dopsResults[1].time.toISOString().replace('T', ' ').slice(0, -5));
    expect(table.rows[2].cells[1].innerHTML).toBe(dopsResults[1].dops.hdop);
    expect(table.rows[2].cells[2].innerHTML).toBe(dopsResults[1].dops.pdop);
    expect(table.rows[2].cells[3].innerHTML).toBe(dopsResults[1].dops.gdop);
  });

  // Tests that the method throws an error if the table element cannot be found
  it('test_missing_table', () => {
    const temp = KeepTrack.getInstance().containerRoot.innerHTML;

    KeepTrack.getInstance().containerRoot.innerHTML = '';
    disableConsoleErrors();
    expect(() => DopMath.updateDopsTable({ fake: 'bad data' } as unknown as DopList)).toThrow();
    enableConsoleErrors();
    KeepTrack.getInstance().containerRoot.innerHTML = temp;
  });

  // Tests that the method throws an error if no DOPs results are found
  it('test_missing_dops_results', () => {
    expect(() => DopMath.updateDopsTable([])).toThrow();
  });
});

describe('calculateDops_method', () => {
  // Tests that DOP values are calculated correctly with 4 GPS satellites
  it('test_four_gps_satellites', () => {
    const azElList = goodAzElList.slice(0, 4);
    const dops = DopMath.calculateDops(azElList);

    expect(dops.pdop).toMatchSnapshot();
    expect(dops.hdop).toMatchSnapshot();
    expect(dops.gdop).toMatchSnapshot();
    expect(dops.vdop).toMatchSnapshot();
    expect(dops.tdop).toMatchSnapshot();
  });

  // Tests that DOP values are calculated correctly with more than 4 GPS satellites
  it('test_more_than_four_gps_satellites', () => {
    const azElList = goodAzElList;
    const dops = DopMath.calculateDops(azElList);

    expect(dops.pdop).toMatchSnapshot();
    expect(dops.hdop).toMatchSnapshot();
    expect(dops.gdop).toMatchSnapshot();
    expect(dops.vdop).toMatchSnapshot();
    expect(dops.tdop).toMatchSnapshot();
  });

  // Tests that default DOP values are returned when less than 4 GPS satellites are provided
  it('test_less_than_four_gps_satellites', () => {
    const azElList = goodAzElList.slice(0, 3);
    const dops = DopMath.calculateDops(azElList);

    expect(dops.pdop).toMatchSnapshot();
    expect(dops.hdop).toMatchSnapshot();
    expect(dops.gdop).toMatchSnapshot();
    expect(dops.vdop).toMatchSnapshot();
    expect(dops.tdop).toMatchSnapshot();
  });
});
