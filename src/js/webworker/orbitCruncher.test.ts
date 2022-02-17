import * as satellite from 'satellite.js';
import { defaultSensor } from '../api/apiMocks';
import { onmessageProcessing, postMessageProcessing } from './orbitCruncher';

jest.mock('satellite.js');
class MockWorker {
  onmessage: () => void;
  constructor() {
    this.onmessage = () => {};
  }

  postMessage(msg) {
    console.log(this);
    onmessageProcessing(msg);
    const m = {
      pointsOut: new Float32Array([1, 2, 3]),
      satId: 1,
    };
    return postMessageProcessing(m);
  }
}

let message;
defaultSensor.observerGd = <any>{
  latitude: defaultSensor.observerGd.lat,
  longitude: defaultSensor.observerGd.lon,
  height: defaultSensor.observerGd.alt,
};

describe('positionCruncher.onmessage', () => {
  beforeEach(() => {
    message = {
      data: {},
    };
  });
  it('should do something when receiving a message', () => {
    const worker = new MockWorker();
    expect(() => worker.postMessage(message)).not.toThrow();
  });
  it('should handle isUpdate with satId', () => {
    const worker = new MockWorker();
    message.data.isUpdate = true;
    message.data.satId = 1;
    message.data.TLE1 = 'TLE1';
    message.data.TLE2 = 'TLE2';
    jest.spyOn(satellite, 'twoline2satrec').mockImplementation(
      () =>
        <any>{
          jdsatepoch: 0,
        }
    );
    expect(() => worker.postMessage(message)).not.toThrow();
  });
  it('should handle isUpdate with missile', () => {
    const worker = new MockWorker();
    message.data.isUpdate = true;
    message.data.satId = 1;
    message.data.missile = true;
    expect(() => worker.postMessage(message)).not.toThrow();
  });
  it('should handle isInit', () => {
    const worker = new MockWorker();
    message.data.isInit = true;
    message.data.satData = JSON.stringify([
      { id: 1, static: true },
      { id: 2, missile: true },
      { id: 3, TLE1: 'TLE1', TLE2: 'TLE2' },
    ]);
    message.data.orbitFadeFactor = JSON.stringify([]);
    message.data.numSegs = 10;
    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle drawing missile orbits', () => {
    const worker = new MockWorker();
    message.data.isInit = true;
    message.data.satData = JSON.stringify([
      { id: 1, static: true },
      { id: 2, missile: true, altList: [1, 2, 3], latList: [1, 2, 3], lonList: [1, 2, 3] },
    ]);
    message.data.orbitFadeFactor = JSON.stringify([]);
    message.data.numSegs = 10;
    message.data.satId = 1;
    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle drawing satellite orbits', () => {
    const worker = new MockWorker();
    message.data.isInit = true;
    message.data.satData = JSON.stringify([{ id: 1, TLE1: 'TLE1', TLE2: 'TLE2' }]);
    message.data.orbitFadeFactor = JSON.stringify([]);
    message.data.numSegs = 10;
    message.data.satId = 0;
    jest.spyOn(satellite, 'sgp4').mockImplementation(
      () =>
        <any>{
          position: {
            x: 1,
            y: 2,
            z: 3,
          },
        }
    );
    jest.spyOn(satellite, 'twoline2satrec').mockImplementation(
      () =>
        <any>{
          jdsatepoch: 0,
        }
    );

    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle failed satellite orbits', () => {
    const worker = new MockWorker();
    message.data.isInit = true;
    message.data.satData = JSON.stringify([{ id: 1, TLE1: 'TLE1', TLE2: 'TLE2' }]);
    message.data.orbitFadeFactor = JSON.stringify([]);
    message.data.numSegs = 10;
    message.data.satId = 0;
    jest.spyOn(satellite, 'sgp4').mockImplementation(
      () =>
        <any>{
          position: false,
        }
    );
    jest.spyOn(satellite, 'twoline2satrec').mockImplementation(
      () =>
        <any>{
          jdsatepoch: 0,
        }
    );

    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle time changes', () => {
    const worker = new MockWorker();
    message.data.dynamicOffsetEpoch = 1;
    message.data.staticOffset = 2;
    message.data.propRate = 3;
    expect(() => worker.postMessage(message)).not.toThrow();
  });
});
