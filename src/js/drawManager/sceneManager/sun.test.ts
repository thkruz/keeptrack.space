import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as sun from './sun';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('sun.init', () => {
  test('0', async () => {
    await sun.init();
  });
});

describe('sun.initGodrays', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initGodrays(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.update', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.update();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.draw', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.draw([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], keepTrackApi.programs.drawManager.sceneManager.sun.godrays.frameBuffer);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      sun.draw([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], null);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.drawGodrays', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.drawGodrays(keepTrackApi.programs.drawManager.gl, keepTrackApi.programs.drawManager.sceneManager.sun.godrays.frameBuffer);
    };

    expect(callFunction).not.toThrow();
  });
  test('1', () => {
    const callFunction: any = () => {
      sun.drawGodrays(keepTrackApi.programs.drawManager.gl, null);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun._getScreenCoords', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun._getScreenCoords([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.initGodraysFrameBuffer', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initGodraysFrameBuffer(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.initGodraysTextures', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initGodraysTextures(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.initGodraysVao', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initGodraysVao(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.initGodraysBuffers', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initGodraysBuffers(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.initGodraysProgram', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initGodraysProgram(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.initProgram', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initProgram(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.initBuffers', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initBuffers(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.initVao', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initVao(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sun.initGodrays', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initGodrays(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sun.initProgram', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initProgram(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sun.initBuffers', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initBuffers(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sun.initVao', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initVao(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sun.initGodraysFrameBuffer', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initGodraysFrameBuffer(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sun.initGodraysTextures', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initGodraysTextures(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sun.initGodraysVao', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initGodraysVao(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sun.initGodraysBuffers', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initGodraysBuffers(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sun.initGodraysProgram', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.initGodraysProgram(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sun.update', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.update();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sun.draw', () => {
  test('0', () => {
    const param1: any = new Float32Array([70, 30, 90, 1, 520]);
    const param2: any = new Float32Array([10.23, 0.5, -1.0, -29.45, 0.5, 0.0, 10.0, -29.45]);
    const callFunction: any = () => {
      sun.draw(param1, param2, {});
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const param1: any = new Float32Array([-0.5, 320, 1.0, -29.45, 410]);
    const param2: any = new Float32Array([0.5, -29.45, -1.0, -1.0, -0.5, 10.23, -29.45, -1.0]);
    const callFunction: any = () => {
      sun.draw(param1, param2, {});
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const param1: any = new Float32Array([30, 30, 320, 400, 30]);
    const param2: any = new Float32Array([10.23, 10.23, 10.0, -1.0, 10.23, -0.5, 0.0, -1.0]);
    const callFunction: any = () => {
      sun.draw(param1, param2, {});
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const param2: any = new Float32Array([410, 320, 520, 10.0, 90]);
    const callFunction: any = () => {
      sun.draw([4, 520, 320, 380, 1, 30, 380, 520, 100, 4, 90, 30, 1, 30, 380, 90], param2, {});
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const param1: any = new Float32Array([320, 100, 320, 100, 350, 410, 520, 30]);
    const callFunction: any = () => {
      sun.draw(param1, [10.23, -29.45, -0.5, -29.45, 0.5, 0.5, -1.0, 0.5, 1.0, 0.0, 0.5, -0.5, -0.5, -1.0, 10.0, 1.0], {});
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const param1: any = new Float32Array([]);
    const param2: any = new Float32Array([]);
    const callFunction: any = () => {
      sun.draw(param1, param2, {});
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sun.drawGodrays', () => {
  test('0', () => {
    const callFunction: any = () => {
      sun.drawGodrays(keepTrackApi.programs.drawManager.gl, {});
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sun._getScreenCoords', () => {
  test('0', () => {
    const param1: any = new Float32Array([1.0, 10.0, 10.23, 10.0, 1.0]);
    const param2: any = new Float32Array([0.5, 0.5, 1.0, 1.0, -29.45]);
    const callFunction: any = () => {
      sun._getScreenCoords(param1, param2);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const param1: any = new Float32Array([-0.5, -0.5, 10.23, 10.23, 10.23, -0.5, -1.0, -0.5]);
    const param2: any = new Float32Array([]);
    const callFunction: any = () => {
      sun._getScreenCoords(param1, param2);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      sun._getScreenCoords([10.0, -29.45, 0.5, 10.23, -0.5, 1.0, -29.45, 0.5, 0.0, 10.0, -29.45, -1.0, 10.23, 10.0, 10.0, 0.5], [0.5, 10.0, 10.23, 10.0, -29.45, 1.0, 10.0, 10.23, 1.0, -1.0, 0.0, -29.45, 1.0, -29.45, -0.5, 1.0]);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const param1: any = new Float32Array([10.0, -0.5, 10.23, -29.45, 1.0]);
    const param2: any = new Float32Array([10.0, 0.5, 0.5, 10.23, 0.0]);
    const callFunction: any = () => {
      sun._getScreenCoords(param1, param2);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      sun._getScreenCoords([-0.5, -29.45, -0.5, 10.23, -29.45, -1.0, 0.5, 0.0, -29.45, -29.45, 10.0, 10.23, -1.0, -0.5, -29.45, -1.0], [1.0, 1.0, 10.23, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5, 0.0, -0.5, 0.0, 0.5, -0.5, 10.0, -29.45]);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      sun._getScreenCoords([-0.5, -29.45, -0.5, 10.23, -29.45, -1.0, 0.5, 0.0, -29.45, -29.45, 10.0, 10.23, -1.0, -0.5, -29.45, -1.0], [-0.5, -29.45, -0.5, 10.23, -29.45, -1.0, 0.5, 0.0, -29.45, -29.45, 10.0, 10.23, -1.0, -0.5, -29.45, -1.0]);
    };

    expect(callFunction).not.toThrow();
  });
});
