import { useMockWorkers } from '@app/js/api/apiMocks';

const drawManager = require('./drawManager');

useMockWorkers();

// @ponicode
describe('drawManager.clearFrameBuffers', () => {
  test('0', () => {
    let callFunction = () => {
      drawManager.clearFrameBuffers(global.mocks.glMock, true, true);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('drawManager.checkIfPostProcessingRequired', () => {
  test('0', () => {
    let callFunction = () => {
      drawManager.checkIfPostProcessingRequired();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('drawManager.resizePostProcessingTexture', () => {
  test('0', () => {
    let callFunction = () => {
      drawManager.resizePostProcessingTexture({}, { initGodrays: () => {} }, { init: () => {} });
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      drawManager.resizePostProcessingTexture({}, undefined);
    };

    expect(callFunction).toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      drawManager.resizePostProcessingTexture({}, { initGodrays: () => {} }, null);
    };

    expect(callFunction).toThrow();
  });
});

// @ponicode
describe('drawManager.onDrawLoopComplete', () => {
  test('0', () => {
    let callFunction = () => {
      drawManager.onDrawLoopComplete(() => {
        console.log('test');
      });
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      drawManager.onDrawLoopComplete(undefined);
    };

    expect(callFunction).toThrow();
  });
});

// @ponicode
describe('drawManager.createDotsManager', () => {
  test('0', () => {
    let callFunction = () => {
      const Dots = String;
      drawManager.createDotsManager(Dots, {});
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      const Dots = String;
      drawManager.createDotsManager(Dots);
    };

    expect(callFunction).toThrow();
  });
});

// @ponicode
describe('drawManager.glInit', () => {
  test('0', async () => {
    await drawManager.glInit();
  });
});
