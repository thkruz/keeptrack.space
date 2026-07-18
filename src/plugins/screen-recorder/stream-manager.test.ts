/* eslint-disable @typescript-eslint/no-explicit-any */
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { KeepTrack } from '@app/keeptrack';
import { vi } from 'vitest';
import { StreamManager } from './stream-manager';

// Mock dependencies
vi.mock('@app/engine/utils/errorManager');
vi.mock('@app/keeptrack');

describe('StreamManager', () => {
  let streamManager: StreamManager;
  let onStopMock: vi.Mock;
  let onMinorErrorMock: vi.Mock;
  let onErrorMock: vi.Mock;
  let mockStream: MediaStream;
  let mockMediaRecorder: MediaRecorder;

  beforeEach(() => {
    onStopMock = vi.fn();
    onMinorErrorMock = vi.fn();
    onErrorMock = vi.fn();

    // Mock MediaStream
    mockStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    } as unknown as MediaStream;

    // Mock MediaRecorder
    mockMediaRecorder = {
      start: vi.fn(),
      stop: vi.fn(),
      onstop: null,
      ondataavailable: null,
      isTypeSupported: vi.fn().mockReturnValue(true),
    } as unknown as MediaRecorder;

    global.window = {
      isSecureContext: true,
      location: { protocol: 'https:' },
      MediaRecorder: vi.fn().mockImplementation(() => mockMediaRecorder),
      URL: {
        createObjectURL: vi.fn().mockReturnValue('blob:test'),
        revokeObjectURL: vi.fn(),
      },
    } as any;

    global.navigator = {} as Navigator;
    global.document = {
      createElement: vi.fn().mockReturnValue({
        style: {},
        click: vi.fn(),
      }),
    } as any;

    (KeepTrack.getInstance as vi.Mock) = vi.fn().mockReturnValue({
      containerRoot: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
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
    it('should return false if not in a secure context', () => {
      (global.window as any).isSecureContext = false;
      (global as any).settingsManager = { offlineMode: false };

      const result = streamManager.getStream();

      expect(result).toBe(false);
      expect(onErrorMock).toHaveBeenCalled();
    });

    it.skip('should call getDisplayMedia if available on navigator', async () => {
      const mockGetDisplayMedia = vi.fn().mockResolvedValue(mockStream);

      (global.navigator as any).getDisplayMedia = mockGetDisplayMedia;

      await streamManager.getStream();
      expect(mockGetDisplayMedia).toHaveBeenCalled();
    });

    it.skip('should call getDisplayMedia on mediaDevices if available', async () => {
      const mockGetDisplayMedia = vi.fn().mockResolvedValue(mockStream);

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
      vi.useFakeTimers();
      (streamManager as any).mediaRecorder_ = mockMediaRecorder;
      (streamManager as any).recordedBlobs = [new Blob(['test'])];

      const mockAnchor = { style: {}, click: vi.fn() };

      (document.createElement as vi.Mock).mockReturnValue(mockAnchor);

      streamManager.save('test.webm');

      expect(mockAnchor.click).toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
      // Restore fake timers to avoid leaking real timers to other test files
      vi.useFakeTimers();
    });
  });

  describe('start', () => {
    it('should not start if getStream returns false', () => {
      (global.window as any).isSecureContext = false;
      (global as any).settingsManager = { offlineMode: false };

      streamManager.start();
      expect((streamManager as any).mediaRecorder_).toBeNull();
    });
  });
});
