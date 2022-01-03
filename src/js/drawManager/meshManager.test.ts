import { defaultSat, keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';
import * as meshManager from './meshManager';

declare const settingsManager;

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

const model = {
  position: { x: 0, y: 0, z: 0 },
  id: 1,
  mesh: {
    makeBufferData: () => ({ numItems: 1 }),
    makeIndexBufferDataForMaterials: () => ({ numItems: 1 }),
    materialIndices: [0],
    vertexBuffer: {
      layout: {
        attributeMap: {
          test: {
            size: 3,
            type: 'float',
            normalized: false,
            offset: 0,
            stride: 0,
          },
        },
      },
    },
  },
};

describe('meshManager.init', () => {
  test('0', async () => {
    await meshManager.init();
  });

  test('1', async () => {
    settingsManager.disableUI = false;
    settingsManager.isDrawLess = false;
    await meshManager.init();
  });
});

// @ponicode
describe('meshManager.populateFileList', () => {
  test('0', () => {
    let result: any = meshManager.populateFileList();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('meshManager.initShaders', () => {
  test('0', () => {
    let result: any = meshManager.initShaders();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('meshManager.initBuffers', () => {
  test('0', () => {
    let result: any = meshManager.initBuffers([model.mesh]);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('meshManager.lerpPosition', () => {
  test('0', () => {
    let result: any = meshManager.lerpPosition({ x: 100, y: 70, z: 350 }, 90);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = meshManager.lerpPosition({ x: 410, y: 320, z: 400 }, 380);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = meshManager.lerpPosition({ x: 400, y: 400, z: 100 }, 90);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = meshManager.lerpPosition({ x: 100, y: 100, z: 1 }, 1);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = meshManager.lerpPosition({ x: 350, y: 100, z: 400 }, 4);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = meshManager.lerpPosition({ x: Infinity, y: Infinity, z: Infinity }, Infinity);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('meshManager.updatePosition', () => {
  test('0', () => {
    let result: any = meshManager.updatePosition({ x: 320, y: 90, z: 100 });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = meshManager.updatePosition({ x: 520, y: 100, z: 70 });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = meshManager.updatePosition({ x: 550, y: 550, z: 410 });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = meshManager.updatePosition({ x: 70, y: 410, z: 410 });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = meshManager.updatePosition({ x: 4, y: 380, z: 380 });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = meshManager.updatePosition({ x: -Infinity, y: -Infinity, z: -Infinity });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('meshManager.drawOcclusion', () => {
  test('0', () => {
    let param1: any = new Float32Array([-29.45, -29.45, 10.23, -29.45]);
    let result: any = meshManager.drawOcclusion(
      param1,
      [0.5, 0.5, -1.0, 0.0, 10.0, 1.0, -1.0, -0.5, 0.5, -1.0, -0.5, -29.45, -0.5, -0.5, 1.0, 0.0],
      keepTrackApi.programs.drawManager.postProcessingManager.occlusionPrgm,
      null
    );
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('meshManager.enableVertexAttribArrays', () => {
  test('0', () => {
    meshManager.initShaders();
    let result: any = meshManager.enableVertexAttribArrays(model);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('meshManager.disableVertexAttribArrays', () => {
  test('0', () => {
    meshManager.initShaders();
    let result: any = meshManager.disableVertexAttribArrays(model, ['test', 'fail']);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('meshManager.applyAttributePointers', () => {
  test('0', () => {
    meshManager.initShaders();
    let result: any = meshManager.applyAttributePointers(model, ['test', 'fail']);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('meshManager.setCurrentModel', () => {
  test('0', () => {
    let result: any = meshManager.setCurrentModel(model);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('meshManager.draw', () => {
  test('0', () => {
    settingsManager.isDrawLess = false;
    meshManager.initBuffers([model.mesh]);
    meshManager.initShaders();
    meshManager.setCurrentModel(model);
    let result: any = meshManager.draw([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], null);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('meshManager.updateNadirYaw', () => {
  test('0', () => {
    let result: any = meshManager.updateNadirYaw(keepTrackApi.programs.mainCamera, defaultSat, keepTrackApi.programs.timeManager);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('meshManager.update', () => {
  beforeAll(() => {
    settingsManager.isDrawLess = false;
    meshManager.initBuffers([model.mesh]);
    meshManager.initShaders();
    meshManager.setCurrentModel(model);
  });

  test('0', () => {
    const sat = defaultSat;
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('30', () => {
    const sat = defaultSat;
    settingsManager.meshOverride = 'test';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
    delete settingsManager.meshOverride;
  });

  test('31', () => {
    const sat = defaultSat;
    settingsManager.meshOverride = 'fake';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
    delete settingsManager.meshOverride;
  });

  test('1', () => {
    const sat = defaultSat;
    sat.sccNum = '25544';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    const sat = defaultSat;
    sat.type = 1;
    sat.sccNum = '5';
    sat.name = 'FLOCK';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    const sat = defaultSat;
    sat.type = 1;
    sat.sccNum = '5';
    sat.name = 'STARLINK';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    const sat = defaultSat;
    sat.type = 1;
    sat.sccNum = '5';
    sat.name = 'GLOBALSTAR';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    const sat = defaultSat;
    sat.type = 1;
    sat.sccNum = '5';
    sat.name = 'IRIDIUM';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    const sat = defaultSat;
    sat.type = 1;
    sat.sccNum = '5';
    sat.name = 'ORBCOMM';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    const sat = defaultSat;
    sat.type = 1;
    sat.sccNum = '5';
    sat.name = 'O3B';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    const sat = defaultSat;
    sat.type = 1;
    sat.sccNum = '5';
    sat.name = 'NAVSTAR';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    const sat = defaultSat;
    sat.type = 1;
    sat.sccNum = '5';
    sat.name = 'GALILEO';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('10', () => {
    const sat = defaultSat;
    sat.type = 1;
    sat.sccNum = '5';
    sat.name = 'SBIRS';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('11', () => {
    const sat = defaultSat;
    sat.type = 1;
    sat.name = 'FAKE';
    sat.sccNum = '04630';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('12', () => {
    const sat = defaultSat;
    sat.type = 1;
    sat.name = 'FAKE';
    sat.sccNum = '36868';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('13', () => {
    const sat = defaultSat;
    sat.type = 1;
    sat.name = 'FAKE';
    sat.sccNum = '5';
    sat.rcs = '0.05';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('14', () => {
    const sat = defaultSat;
    sat.type = 1;
    sat.sccNum = '5';
    sat.name = 'FAKE';
    sat.rcs = '0.15';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('15', () => {
    const sat = defaultSat;
    sat.type = 1;
    sat.sccNum = '5';
    sat.name = 'FAKE';
    sat.rcs = '0.25';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('16', () => {
    const sat = defaultSat;
    sat.type = 1;
    sat.name = 'FAKE';
    sat.sccNum = '5';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('17', () => {
    const sat = defaultSat;
    sat.type = 2;
    sat.sccNum = '5';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('18', () => {
    const sat = defaultSat;
    sat.type = 3;
    sat.sccNum = '1000';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('19', () => {
    const sat = defaultSat;
    sat.type = 3;
    sat.sccNum = '25000';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('20', () => {
    const sat = defaultSat;
    sat.type = 3;
    sat.sccNum = '40000';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });

  test('21', () => {
    const sat = defaultSat;
    sat.type = 4;
    sat.sccNum = '5';
    let result: any = meshManager.update(keepTrackApi.programs.timeManager, sat);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('meshManager.drawOcclusion ', () => {
  test('0', () => {
    settingsManager.isDrawLess = false;
    meshManager.initBuffers([model.mesh]);
    meshManager.initShaders();
    meshManager.setCurrentModel(model);
    let result: any = meshManager.drawOcclusion(
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      keepTrackApi.programs.drawManager.postProcessingManager.programs.occlusion,
      null
    );
    expect(result).toMatchSnapshot();
  });
});
