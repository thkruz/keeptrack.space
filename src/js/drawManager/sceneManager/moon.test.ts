import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as moon from './moon';
/* eslint-disable no-undefined */

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('moon.init', () => {
  test('0', async () => {
    await moon.init();
  });
});

describe('moon.update', () => {
  test('0', () => {
    const callFunction: any = () => {
      moon.update();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('moon.draw', () => {
  test('0', () => {
    const callFunction: any = () => {
      moon.draw([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], keepTrackApi.programs.drawManager.sceneManager.sun.godrays.frameBuffer);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      moon.draw([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], null);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      moon.draw([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], keepTrackApi.programs.drawManager.sceneManager.sun.godrays.frameBuffer);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      moon.draw([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], undefined);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      moon.draw([90, 320, 550, 4, 400, 410, 380, 520, 380, 30, 90, 550, 400, 30, 320, 400], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], keepTrackApi.programs.drawManager.sceneManager.sun.godrays.frameBuffer);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      moon.draw([1, 400, 70, 320, 30, 380, 550, 400, 520, 70, 100, 90, 380, 350, 350, 400], [90, 320, 550, 4, 400, 410, 380, 520, 380, 30, 90, 550, 400, 30, 320, 400], keepTrackApi.programs.drawManager.sceneManager.sun.godrays.frameBuffer);
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      moon.draw([1, 70, 410, 50, 30, 100, 30, 410, 400, 520, 4, 520, 400, 350, 320, 520], [1, 400, 70, 320, 30, 380, 550, 400, 520, 70, 100, 90, 380, 350, 350, 400], keepTrackApi.programs.drawManager.sceneManager.sun.godrays.frameBuffer);
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    const callFunction: any = () => {
      moon.draw([1, 400, 70, 320, 30, 380, 550, 400, 520, 70, 100, 90, 380, 350, 350, 400], [10.0, 1.0, 10.0, 1.0, 10.23, -29.45, -0.5, 10.0, 10.0, 10.0, 10.23, -0.5, 0.0, -29.45, 0.5, 0.5], undefined);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('moon.initTextures', () => {
  test('0', () => {
    const callFunction: any = () => {
      moon.initTextures(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('moon.initBuffers', () => {
  test('0', () => {
    const callFunction: any = () => {
      moon.initBuffers(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('moon.initVao', () => {
  test('0', () => {
    const callFunction: any = () => {
      moon.initVao(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('moon.onTextureLoaded', () => {
  test('0', () => {
    const callFunction: any = () => {
      moon.onTextureLoaded(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('moon.initProgram', () => {
  test('0', () => {
    const callFunction: any = () => {
      moon.initProgram(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      moon.initProgram(null);
    };

    expect(callFunction).toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      moon.initProgram(undefined);
    };

    expect(callFunction).toThrow();
  });
});

// @ponicode
describe('moon.initTextures', () => {
  test('0', () => {
    const callFunction: any = () => {
      moon.initTextures(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('moon.initBuffers', () => {
  test('0', () => {
    const callFunction: any = () => {
      moon.initBuffers(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('moon.initVao', () => {
  test('0', () => {
    const callFunction: any = () => {
      moon.initVao(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('moon.update', () => {
  test('0', () => {
    const callFunction: any = () => {
      moon.update();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('moon.onTextureLoaded', () => {
  test('0', () => {
    const callFunction: any = () => {
      moon.onTextureLoaded(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});
