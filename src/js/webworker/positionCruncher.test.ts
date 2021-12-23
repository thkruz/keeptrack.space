import { defaultSat, defaultSensor } from '../api/apiMocks';
import { SpaceObjectType } from '../api/SpaceObjectType';
import { satellite } from '../satMath/satMath';
import { onmessageProcessing, propagationLoop, sendDataToSatSet } from './positionCruncher';

class MockWorker {
  onmessage: () => void;
  constructor() {
    this.onmessage = () => {};
  }

  postMessage(msg) {
    console.log(this);
    onmessageProcessing(msg);
    return sendDataToSatSet();
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
    message.data.positions = [
      {
        x: 0,
        y: 0,
        z: 0,
      },
    ];
    expect(() => worker.postMessage(message)).not.toThrow();
  });
  it('should handle m.data.isSunlightView', () => {
    const worker = new MockWorker();
    message.data.isSunlightView = true;
    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle m.data.satelliteSelected', () => {
    const worker = new MockWorker();
    message.data.satelliteSelected = [0];
    message.data.typ = 'satelliteSelected';
    expect(() => worker.postMessage(message)).not.toThrow();
    message.data.satelliteSelected = [-1];
    message.data.typ = 'satelliteSelected';
    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle m.data.isSlowCPUModeEnabled', () => {
    const worker = new MockWorker();
    message.data.isSlowCPUModeEnabled = true;
    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle m.data.isLowPerf', () => {
    const worker = new MockWorker();
    message.data.isLowPerf = true;
    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle m.data.fieldOfViewSetLength', () => {
    const worker = new MockWorker();
    message.data.fieldOfViewSetLength = 1;
    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle m.data.isShowSatOverfly', () => {
    const worker = new MockWorker();
    message.data.isShowSatOverfly = 'enable';
    message.data.typ = 'isShowSatOverfly';
    expect(() => worker.postMessage(message)).not.toThrow();
    message.data.isShowSatOverfly = 'reset';
    message.data.typ = 'isShowSatOverfly';
    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle m.data.isShowSurvFence', () => {
    const worker = new MockWorker();
    message.data.isShowSurvFence = 'enable';
    expect(() => worker.postMessage(message)).not.toThrow();
    message.data.isShowSurvFence = 'reset';
    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle m.data.isShowFOVBubble', () => {
    const worker = new MockWorker();
    message.data.isShowFOVBubble = 'enable';
    expect(() => worker.postMessage(message)).not.toThrow();
    message.data.isShowFOVBubble = 'reset';
    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle m.data.multiSensor', () => {
    const worker = new MockWorker();
    message.data.multiSensor = true;
    message.data.sensor = [defaultSensor];
    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle m.data.sensor', () => {
    const worker = new MockWorker();
    message.data.sensor = [defaultSensor, defaultSensor];
    message.data.typ = 'sensor';
    expect(() => worker.postMessage(message)).not.toThrow();

    message.data.sensor = [defaultSensor];
    message.data.typ = 'sensor';
    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle m.data.setlatlong', () => {
    const worker = new MockWorker();
    message.data.sensor = [defaultSensor];
    message.data.setlatlong = true;
    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle m.data.typ as offset', () => {
    const worker = new MockWorker();
    message.data.typ = 'offset';
    message.data.staticOffset = 0;
    message.data.dynamicOffsetEpoch = 0;
    message.data.propRate = 1;
    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle m.data.typ as satdata', () => {
    const worker = new MockWorker();
    message.data.typ = 'satdata';
    message.data.dat = JSON.stringify([defaultSat, { ...defaultSat, ...{ static: true } }]);
    expect(() => worker.postMessage(message)).not.toThrow();
  });

  it('should handle m.data.typ as satEdit', () => {
    const worker = new MockWorker();
    message.data.typ = 'satdata';
    message.data.dat = JSON.stringify([defaultSat, { ...defaultSat, ...{ static: true } }]);
    worker.postMessage(message);

    message.data = {
      typ: 'satEdit',
      id: 0,
      active: true,
      TLE1: defaultSat.TLE1,
      TLE2: defaultSat.TLE2,
    };
    expect(() => worker.postMessage(message)).not.toThrow();
  });
});

describe('positionCruncher.propagationLoop', () => {
  beforeEach(() => {
    message = {
      data: {},
    };
  });
  it('should handle isShowSatOverfly', () => {
    const worker = new MockWorker();
    message.data.satelliteSelected = [0];
    message.data.typ = 'satelliteSelected';
    expect(() => worker.postMessage(message)).not.toThrow();
    message.data.isShowSatOverfly = 'enable';
    message.data.typ = 'isShowSatOverfly';
    expect(() => worker.postMessage(message)).not.toThrow();

    const fakeCatalog = <any>[];

    const satrec = satellite.twoline2satrec(
      // perform and store sat init calcs
      defaultSat.TLE1,
      defaultSat.TLE2
    );
    fakeCatalog.push({ ...defaultSat, ...satrec, ...{ satnum: true } });
    for (let i = 0; i < 50000; i++) {
      fakeCatalog.push({ ...defaultSat, ...{ marker: true } });
    }

    onmessageProcessing({
      data: {
        typ: 'satdata',
        dat: JSON.stringify([{ ...defaultSat, ...satrec, ...{ satnum: true } }]),
      },
    });

    onmessageProcessing({
      data: {
        typ: 'isShowSatOverfly',
        isShowSatOverfly: 'enable',
        selectedSatFOV: 30,
      },
    });

    const result = () => propagationLoop(fakeCatalog);

    expect(result).not.toThrow();
  });
  it('should handle FOVs', () => {
    const worker = new MockWorker();
    message.data.sensor = [defaultSensor];
    message.data.setlatlong = true;
    message.data.isShowSurvFence = 'disable';
    message.data.isShowFOVBubble = 'enable';
    expect(() => worker.postMessage(message)).not.toThrow();

    const fakeCatalog = <any>[
      // { ...defaultSat, ...{ missile: true, type: SpaceObjectType.BALLISTIC_MISSILE }, altList: [1, 2, 3] },
      { ...defaultSat, ...{ static: true, type: SpaceObjectType.STAR } },
      { ...defaultSensor, ...{ static: true, type: SpaceObjectType.PHASED_ARRAY_RADAR } },
      { ...defaultSat, ...{ skip: true } },
    ];

    for (let i = 0; i < 100000; i++) {
      fakeCatalog.push({ ...defaultSat, ...{ marker: true } });
    }

    const result = () => propagationLoop(fakeCatalog);

    expect(result).not.toThrow();

    message.data.sensor = [{ ...defaultSensor, ...{ obsminaz: 10, obsmaxaz: 11, obsminel: 10, obsmaxel: 11, obsminrange: 100, obsmaxrange: 101 } }];
    message.data.setlatlong = true;
    message.data.typ = 'sensor';
    expect(() => worker.postMessage(message)).not.toThrow();
    expect(result).not.toThrow();

    message.data.sensor = [{ ...defaultSensor, ...{ obsminaz2: 10, obsmaxaz2: 11, obsminel2: 10, obsmaxel2: 11, obsminrange2: 101, obsmaxrange2: 111 } }];
    message.data.setlatlong = true;
    message.data.typ = 'sensor';
    expect(() => worker.postMessage(message)).not.toThrow();
    expect(result).not.toThrow();

    message.data.sensor = [{ ...defaultSensor, ...{ obsminaz: 0, obsmaxaz: 360, obsminel: 3, obsmaxel: 85, obsminrange: 10, obsmaxrange: 5500, volume: true } }];
    message.data.setlatlong = true;
    message.data.typ = 'sensor';
    expect(() => worker.postMessage(message)).not.toThrow();
    expect(result).not.toThrow();

    message.data.sensor = [{ ...defaultSensor, ...{ obsminaz: 0, obsmaxaz: 360, obsminel: 3, obsmaxel: 20, obsminrange: 10, obsmaxrange: 5500, volume: true } }];
    message.data.setlatlong = true;
    message.data.typ = 'sensor';
    expect(() => worker.postMessage(message)).not.toThrow();
    expect(result).not.toThrow();

    message.data.sensor = [{ ...defaultSensor, ...{ obsminaz2: 0, obsmaxaz2: 360, obsminel2: 15, obsmaxel2: 70, obsminrange2: 10, obsmaxrange2: 5500 } }];
    message.data.setlatlong = true;
    message.data.typ = 'sensor';
    expect(() => worker.postMessage(message)).not.toThrow();
    expect(result).not.toThrow();
  });
  it('should handle surveillance', () => {
    const worker = new MockWorker();
    message.data.sensor = [defaultSensor];
    message.data.setlatlong = true;
    message.data.isShowSurvFence = 'enable';
    expect(() => worker.postMessage(message)).not.toThrow();

    const fakeCatalog = <any>[
      // { ...defaultSat, ...{ missile: true, type: SpaceObjectType.BALLISTIC_MISSILE }, altList: [1, 2, 3] },
      { ...defaultSat, ...{ static: true, type: SpaceObjectType.STAR } },
      { ...defaultSensor, ...{ static: true, type: SpaceObjectType.PHASED_ARRAY_RADAR } },
      { ...defaultSat, ...{ skip: true } },
    ];

    for (let i = 0; i < 50000; i++) {
      fakeCatalog.push({ ...defaultSat, ...{ marker: true } });
    }

    const result = () => propagationLoop(fakeCatalog);

    expect(result).not.toThrow();
  });
});
