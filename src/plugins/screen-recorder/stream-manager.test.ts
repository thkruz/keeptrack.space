/* eslint-disable @typescript-eslint/no-explicit-any */
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { KeepTrack } from '@app/keeptrack';
import { StreamManager } from './stream-manager';

// Mock dependencies
jest.mock('@app/engine/utils/errorManager');
jest.mock('@app/keeptrack');

describe('StreamManager', () => {
  let streamManager: StreamManager;
  let onStopMock: jest.Mock;
  let onMinorErrorMock: jest.Mock;
  let onErrorMock: jest.Mock;
  let mockStream: MediaStream;
  let mockMediaRecorder: MediaRecorder;

  beforeEach(() => {
    onStopMock = jest.fn();
    onMinorErrorMock = jest.fn();
    onErrorMock = jest.fn();

    // Mock MediaStream
    mockStream = {
      getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
    } as unknown as MediaStream;

    // Mock MediaRecorder
    mockMediaRecorder = {
      start: jest.fn(),
      stop: jest.fn(),
      onstop: null,
      ondataavailable: null,
      isTypeSupported: jest.fn().mockReturnValue(true),
    } as unknown as MediaRecorder;

    global.window = {
      location: { protocol: 'https:' },
      MediaRecorder: jest.fn().mockImplementation(() => mockMediaRecorder),
      URL: {
        createObjectURL: jest.fn().mockReturnValue('blob:test'),
        revokeObjectURL: jest.fn(),
      },
    } as any;

    global.navigator = {} as Navigator;
    global.document = {
      createElement: jest.fn().mockReturnValue({
        style: {},
        click: jest.fn(),
      }),
    } as any;

    (KeepTrack.getInstance as jest.Mock) = jest.fn().mockReturnValue({
      containerRoot: {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
      },
    });

    streamManager = new StreamManager(StreamManager.BIT_RATE_30_MBPS, onStopMock, onMinorErrorMock, onErrorMock);
  });

  describe('constructor', () => {
    it('should initialize with provided callbacks', () => {
      expect(streamManager.isVideoRecording).toBe(false);
    });
  });

  describe.skip('handleError', () => {
    it('should warn about permission denied', () => {
      const error = new Error('Permission denied');

      StreamManager.handleError(error);
      expect(errorManagerInstance.warn).toHaveBeenCalledWith('Permission denied! Did you click "Share"?');
    });

    it('should warn about other errors', () => {
      const error = new Error('Some error');

      StreamManager.handleError(error);
      expect(errorManagerInstance.warn).toHaveBeenCalledWith('Error:Error: Some error');
    });
  });

  describe('getStream', () => {
    it('should return false if protocol is not https', () => {
      (global.window as any).location.protocol = 'http:';
      (global as any).settingsManager = { offlineMode: false };

      const result = streamManager.getStream();

      expect(result).toBe(false);
      expect(onErrorMock).toHaveBeenCalled();
    });

    it.skip('should call getDisplayMedia if available on navigator', async () => {
      const mockGetDisplayMedia = jest.fn().mockResolvedValue(mockStream);

      (global.navigator as any).getDisplayMedia = mockGetDisplayMedia;

      await streamManager.getStream();
      expect(mockGetDisplayMedia).toHaveBeenCalled();
    });

    it.skip('should call getDisplayMedia on mediaDevices if available', async () => {
      const mockGetDisplayMedia = jest.fn().mockResolvedValue(mockStream);

      (global.navigator as any).mediaDevices = { getDisplayMedia: mockGetDisplayMedia };

      await streamManager.getStream();
      expect(mockGetDisplayMedia).toHaveBeenCalled();
    });
  });

  describe('handleDataAvailable', () => {
    it('should add blob to recordedBlobs if data size > 0', () => {
      const mockBlob = new Blob(['test'], { type: 'video/webm' });
      const event = { data: mockBlob } as BlobEvent;

      streamManager.handleDataAvailable(event);
      expect((streamManager as any).recordedBlobs).toContain(mockBlob);
    });

    it('should not add blob if data size is 0', () => {
      const mockBlob = new Blob([], { type: 'video/webm' });
      const event = { data: mockBlob } as BlobEvent;

      streamManager.handleDataAvailable(event);
      expect((streamManager as any).recordedBlobs).toHaveLength(0);
    });
  });

  describe('stop', () => {
    it('should call onStop if no mediaRecorder', () => {
      streamManager.stop();
      expect(onStopMock).toHaveBeenCalled();
    });

    it('should not stop if already stopped', () => {
      (streamManager as any).mediaRecorder_ = mockMediaRecorder;
      streamManager.isVideoRecording = false;

      streamManager.stop();
      expect(mockMediaRecorder.stop).not.toHaveBeenCalled();
    });

    it('should stop recording and tracks', () => {
      (streamManager as any).mediaRecorder_ = mockMediaRecorder;
      (streamManager as any).stream_ = mockStream;
      streamManager.isVideoRecording = true;

      streamManager.stop();
      expect(mockStream.getTracks).toHaveBeenCalled();
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
      expect(streamManager.isVideoRecording).toBe(false);
      expect(onStopMock).toHaveBeenCalled();
    });
  });

  describe.skip('save', () => {
    it('should not save if no mediaRecorder', () => {
      streamManager.save('test.webm');
      expect(document.createElement).not.toHaveBeenCalled();
    });

    it('should create download link and trigger download', () => {
      jest.useFakeTimers();
      (streamManager as any).mediaRecorder_ = mockMediaRecorder;
      (streamManager as any).recordedBlobs = [new Blob(['test'])];

      const mockAnchor = { style: {}, click: jest.fn() };

      (document.createElement as jest.Mock).mockReturnValue(mockAnchor);

      streamManager.save('test.webm');

      expect(mockAnchor.click).toHaveBeenCalled();
      jest.advanceTimersByTime(100);
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('start', () => {
    it('should not start if getStream returns false', () => {
      (global.window as any).location.protocol = 'http:';
      (global as any).settingsManager = { offlineMode: false };

      streamManager.start();
      expect((streamManager as any).mediaRecorder_).toBeNull();
    });
  });
});
