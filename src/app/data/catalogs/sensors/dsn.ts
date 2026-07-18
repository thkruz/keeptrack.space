import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { Degrees, Kilometers, Milliseconds, SpaceObjectType, ZoomValue } from '@ootk/src/main';
import { Operators, SensorList } from './types';

/**
 * NASA Deep Space Network (DSN) - one entry per communications complex, using
 * the parameters of the complex's 70m antenna. Antennas within a complex are
 * within ~10 km of each other, so per-complex entries keep the globe readable.
 *
 * These are cooperative TT&C dishes, not surveillance sensors: they can only
 * track spacecraft that are transmitting to them.
 */
export const dsnSensors = <SensorList>{
  DSNGDSCC: new DetailedSensor({
    objName: 'DSNGDSCC',
    shortName: 'GDS',
    id: 0,
    name: 'Goldstone Deep Space Communications Complex, California',
    uiName: 'Goldstone (GDSCC)',
    system: 'NASA Deep Space Network',
    freqBand: 'S/X/Ka-Band',
    type: SpaceObjectType.GROUND_SENSOR_STATION,
    lat: <Degrees>35.426667, // DSS-14 70m antenna
    lon: <Degrees>-116.89,
    alt: <Kilometers>1.002,
    minAz: <Degrees>0,
    maxAz: <Degrees>360,
    minEl: <Degrees>6, // DSN standard horizon mask
    maxEl: <Degrees>90,
    minRng: <Kilometers>100,
    maxRng: <Kilometers>400000, // Link-budget limited; capped at lunar distance for visualization
    beamwidth: <Degrees>0.04, // 70m dish at X-band
    zoom: ZoomValue.GEO,
    changeObjectInterval: <Milliseconds>20000,
    url: 'https://www.nasa.gov/communicating-with-missions/dsn/',
    country: 'United States',
    operator: Operators.NASA,
  }),
  DSNMDSCC: new DetailedSensor({
    objName: 'DSNMDSCC',
    shortName: 'MDS',
    id: 0,
    name: 'Madrid Deep Space Communications Complex, Robledo de Chavela, Spain',
    uiName: 'Madrid (MDSCC)',
    system: 'NASA Deep Space Network',
    freqBand: 'S/X/Ka-Band',
    type: SpaceObjectType.GROUND_SENSOR_STATION,
    lat: <Degrees>40.431389, // DSS-63 70m antenna
    lon: <Degrees>-4.248056,
    alt: <Kilometers>0.865,
    minAz: <Degrees>0,
    maxAz: <Degrees>360,
    minEl: <Degrees>6,
    maxEl: <Degrees>90,
    minRng: <Kilometers>100,
    maxRng: <Kilometers>400000,
    beamwidth: <Degrees>0.04,
    zoom: ZoomValue.GEO,
    changeObjectInterval: <Milliseconds>20000,
    url: 'https://www.nasa.gov/communicating-with-missions/dsn/',
    country: 'Spain',
    operator: Operators.NASA,
  }),
  DSNCDSCC: new DetailedSensor({
    objName: 'DSNCDSCC',
    shortName: 'CDS',
    id: 0,
    name: 'Canberra Deep Space Communication Complex, Tidbinbilla, Australia',
    uiName: 'Canberra (CDSCC)',
    system: 'NASA Deep Space Network',
    freqBand: 'S/X/Ka-Band',
    type: SpaceObjectType.GROUND_SENSOR_STATION,
    lat: <Degrees>-35.402547, // DSS-43 70m antenna
    lon: <Degrees>148.981728,
    alt: <Kilometers>0.689,
    minAz: <Degrees>0,
    maxAz: <Degrees>360,
    minEl: <Degrees>6,
    maxEl: <Degrees>90,
    minRng: <Kilometers>100,
    maxRng: <Kilometers>400000,
    beamwidth: <Degrees>0.04,
    zoom: ZoomValue.GEO,
    changeObjectInterval: <Milliseconds>20000,
    url: 'https://www.nasa.gov/communicating-with-missions/dsn/',
    country: 'Australia',
    operator: Operators.NASA,
  }),
};
