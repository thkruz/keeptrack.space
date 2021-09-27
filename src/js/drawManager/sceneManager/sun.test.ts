import * as sun from '@app/js/drawManager/sceneManager/sun';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('sun.init', () => {
  test('0', async () => {
    await sun.init();
  });
});

describe('sun.initGodrays', () => {
  test('0', () => {
    let callFunction: any = () => {
      sun.initGodrays(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.update', () => {
  test('0', () => {
    let callFunction: any = () => {
      sun.update();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.draw', () => {
  test('0', () => {
    let callFunction: any = () => {
      sun.draw([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],keepTrackApi.programs.drawManager.sceneManager.sun.godrays.frameBuffer);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      sun.draw([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], null);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.drawGodrays', () => {
  test('0', () => {
    let callFunction: any = () => {
      sun.drawGodrays(keepTrackApi.programs.drawManager.gl, keepTrackApi.programs.drawManager.sceneManager.sun.godrays.frameBuffer);
    };

    expect(callFunction).not.toThrow();
  });
  test('1', () => {
    let callFunction: any = () => {
      sun.drawGodrays(keepTrackApi.programs.drawManager.gl, null);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun._getScreenCoords', () => {
  test('0', () => {
    let callFunction: any = () => {
      sun._getScreenCoords([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.initGodraysFrameBuffer', () => {
  test('0', () => {
    let callFunction: any = () => {
      sun.initGodraysFrameBuffer(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.initGodraysTextures', () => {
  test('0', () => {
    let callFunction: any = () => {
      sun.initGodraysTextures(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.initGodraysVao', () => {
  test('0', () => {
    let callFunction: any = () => {
      sun.initGodraysVao(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.initGodraysBuffers', () => {
  test('0', () => {
    let callFunction: any = () => {
      sun.initGodraysBuffers(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.initGodraysProgram', () => {
  test('0', () => {
    let callFunction: any = () => {
      sun.initGodraysProgram(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.initProgram', () => {
  test('0', () => {
    let callFunction: any = () => {
      sun.initProgram(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.initBuffers', () => {
  test('0', () => {
    let callFunction: any = () => {
      sun.initBuffers(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sun.initVao', () => {
  test('0', () => {
    let callFunction: any = () => {
      sun.initVao(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});
