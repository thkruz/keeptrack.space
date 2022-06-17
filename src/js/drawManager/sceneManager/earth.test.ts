import { keepTrackApiStubs } from '../../api/apiMocks';
import * as externalApi from '../../api/keepTrackApi';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as earth from '../../drawManager/sceneManager/earth';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('earth.initBuffers', () => {
  test('0', () => {
    let result: any = earth.initBuffers(externalApi.keepTrackApi.programs.drawManager.gl);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.draw', () => {
  test('0', () => {
    earth.onImageLoaded(true);
    earth.init();
    let result: any = earth.draw([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], keepTrackApi.programs.mainCamera, keepTrackApi.programs.dotsManager, null);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.drawOcclusion', () => {
  test('0', () => {
    let result: any = earth.drawOcclusion(
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      externalApi.keepTrackApi.programs.drawManager.postProcessingManager.programs.occlusion,
      externalApi.keepTrackApi.programs.drawManager.sceneManager.sun.godrays.frameBuffer
    );
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.update', () => {
  test('0', () => {
    let result: any = earth.update();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.updateSunCurrentDirection', () => {
  test('0', () => {
    let result: any = earth.updateSunCurrentDirection();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.initSpecularTexture', () => {
  test('0', () => {
    let result: any = earth.initSpecularTexture(externalApi.keepTrackApi.programs.drawManager.gl);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.initNightTexture', () => {
  test('0', () => {
    let result: any = earth.initNightTexture(externalApi.keepTrackApi.programs.drawManager.gl);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.initBumpTexture', () => {
  test('0', () => {
    let result: any = earth.initBumpTexture(externalApi.keepTrackApi.programs.drawManager.gl);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.initDayTexture', () => {
  test('0', () => {
    let result: any = earth.initDayTexture(externalApi.keepTrackApi.programs.drawManager.gl);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.initTextures', () => {
  test('0', () => {
    let result: any = earth.initTextures(externalApi.keepTrackApi.programs.drawManager.gl);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.initProgram', () => {
  test('0', () => {
    let result: any = earth.initProgram(externalApi.keepTrackApi.programs.drawManager.gl);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.init', () => {
  test('0', async () => {
    let result: any = await earth.init();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.onImageLoaded', () => {
  test('0', () => {
    let result: any = earth.onImageLoaded();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.specularImgOnLoad', () => {
  test('0', () => {
    let result: any = earth.specularImgOnLoad(externalApi.keepTrackApi.programs.drawManager.gl);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.dayImgHiOnLoad', () => {
  test('0', () => {
    let result: any = earth.dayImgHiOnLoad(externalApi.keepTrackApi.programs.drawManager.gl);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.dayImgOnLoad', () => {
  test('0', () => {
    let result: any = earth.dayImgOnLoad(externalApi.keepTrackApi.programs.drawManager.gl, <HTMLImageElement>(<unknown>''));
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.nightImgHiOnLoad', () => {
  test('0', () => {
    let result: any = earth.nightImgHiOnLoad(externalApi.keepTrackApi.programs.drawManager.gl);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.nightImgOnLoad', () => {
  test('0', () => {
    let result: any = earth.nightImgOnLoad(externalApi.keepTrackApi.programs.drawManager.gl);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('earth.bumpImgOnLoad', () => {
  test('0', () => {
    let result: any = earth.bumpImgOnLoad(externalApi.keepTrackApi.programs.drawManager.gl);
    expect(result).toMatchSnapshot();
  });
});
