import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';
import { screenShot, watermarkedDataUrl } from './screenShot';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

declare const settingsManager;

describe('Screenshot Package', () => {
  beforeAll(() => {
    const mockEleement = {
      getContext: () => ({
        globalAlpha: 1,
        fillStyle: '#fff',
        fillText: () => {},
        drawImage: () => {},
        measureText: () => ({ width: 0 }),
      }),
      toDataURL: () => '',
      parentNode: {
        removeChild: () => {},
      },
      download: '',
      href: '',
      click: () => {},
    };
    document.body.innerHTML = `<canvas id="watermarkCanvas" width="100" height="100"></canvas>`;
    keepTrackApi.programs.drawManager.canvas = document.getElementById('watermarkCanvas') as HTMLCanvasElement;
    document.createElement = () => <any>{ ...keepTrackApi.programs.drawManager.canvas, ...mockEleement };
    document.body.appendChild = () => <any>{};
  });
  describe('screenShot', () => {
    test('if queued screenshot off prevents a screenshot', () => {
      keepTrackApi.programs.drawManager.gl = <WebGL2RenderingContext>(<unknown>{
        viewport: () => {},
        drawingBufferWidth: 0,
        drawingBufferHeight: 0,
        canvas: {
          width: 0,
          height: 0,
        },
      });
      let result: any = screenShot();
      expect(result).toMatchSnapshot();
    });
    test('if queued screenshot triggers a screenshot', () => {
      settingsManager.queuedScreenShot = true;
      keepTrackApi.programs.drawManager.gl = <WebGL2RenderingContext>(<unknown>{
        viewport: () => {},
        drawingBufferWidth: 0,
        drawingBufferHeight: 0,
        canvas: {
          width: 0,
          height: 0,
        },
      });
      let result: any = screenShot();
      expect(result).toMatchSnapshot();
    });
  });

  describe('watermarkedDataUrl', () => {
    it('should create a watermark on the canvas', () => {
      let result: any = watermarkedDataUrl(keepTrackApi.programs.drawManager.canvas, 'test');
      jest.spyOn(console, 'log');
      expect(result).toMatchSnapshot();
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should account for classification banner', () => {
      settingsManager.classificationStr = 'Secret';
      let result: any = watermarkedDataUrl(keepTrackApi.programs.drawManager.canvas, 'test');
      expect(result).toMatchSnapshot();
    });

    it('should handle all classification options', () => {
      settingsManager.classificationStr = 'Top Secret//SCI';
      let result = watermarkedDataUrl(keepTrackApi.programs.drawManager.canvas, 'test');
      expect(result).toMatchSnapshot();
      settingsManager.classificationStr = 'Top Secret';
      result = watermarkedDataUrl(keepTrackApi.programs.drawManager.canvas, 'test');
      expect(result).toMatchSnapshot();
      settingsManager.classificationStr = 'Secret';
      result = watermarkedDataUrl(keepTrackApi.programs.drawManager.canvas, 'test');
      expect(result).toMatchSnapshot();
      settingsManager.classificationStr = 'Confidential';
      result = watermarkedDataUrl(keepTrackApi.programs.drawManager.canvas, 'test');
      expect(result).toMatchSnapshot();
      settingsManager.classificationStr = 'CUI';
      result = watermarkedDataUrl(keepTrackApi.programs.drawManager.canvas, 'test');
      expect(result).toMatchSnapshot();
      settingsManager.classificationStr = 'Unclassified';
      result = watermarkedDataUrl(keepTrackApi.programs.drawManager.canvas, 'test');
      expect(result).toMatchSnapshot();
      settingsManager.classificationStr = 'Fake';
      let errorResult = () => watermarkedDataUrl(keepTrackApi.programs.drawManager.canvas, 'test');
      expect(errorResult).toThrow();
    });
  });
});
