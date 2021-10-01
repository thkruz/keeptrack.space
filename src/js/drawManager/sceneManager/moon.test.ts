import * as externalApi from "@app/js/api/externalApi"
import * as moon from "@app/js/drawManager/sceneManager/moon"

import { expect } from "@jest/globals"
import { keepTrackApi } from "@app/js/api/externalApi"
import { keepTrackApiStubs } from "@app/js/api/apiMocks"

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe("moon.init", () => {
    test("0", async () => {
        await moon.init()
    })
})

describe('moon.update', () => {
  test('0', () => {
    let callFunction: any = () => {
      moon.update();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe("moon.draw", () => {
    test("0", () => {
        let callFunction: any = () => {
            moon.draw([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], externalApi.keepTrackApi.programs.drawManager.sceneManager.sun.godrays.frameBuffer)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            moon.draw([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], null)
        }
    
        expect(callFunction).not.toThrow()
    })
})

describe('moon.initTextures', () => {
  test('0', () => {
    let callFunction: any = () => {
      moon.initTextures(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('moon.initBuffers', () => {
  test('0', () => {
    let callFunction: any = () => {
      moon.initBuffers(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('moon.initVao', () => {
  test('0', () => {
    let callFunction: any = () => {
      moon.initVao(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('moon.onTextureLoaded', () => {
  test('0', () => {
    let callFunction: any = () => {
      moon.onTextureLoaded(keepTrackApi.programs.drawManager.gl);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe("moon.initProgram", () => {
    test("0", () => {
        let callFunction: any = () => {
            moon.initProgram(externalApi.keepTrackApi.programs.drawManager.gl)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            moon.initProgram(null)
        }
    
        expect(callFunction).toThrow()
    })
})
