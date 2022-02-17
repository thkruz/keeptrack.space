import { defaultSensor } from '../api/apiMocks';
import { onmessageProcessing, postMessageProcessing } from './orbitCruncher';

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
    jest.mock('satellite.js');
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
    message.data.satData = JSON.stringify([]);
    message.data.orbitFadeFactor = JSON.stringify([]);
    message.data.numSegs = 10;
    expect(() => worker.postMessage(message)).not.toThrow();
  });
});
