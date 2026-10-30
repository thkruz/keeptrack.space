import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';
import { StreamManager } from '../stream-manager';
import { readWebmDurationMs } from '../webm-duration';

describe('recording lifecycle', () => {
  let manager: StreamManager;
  let track: { stop: ReturnType<typeof vi.fn>; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };
  let recorder: MediaRecorder;
  let getDisplayMedia: ReturnType<typeof vi.fn>;
  let onStop: ReturnType<typeof vi.fn>;
  let onMinorError: ReturnType<typeof vi.fn>;
  let onNotice: ReturnType<typeof vi.fn>;
  let createUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupStandardEnvironment();
    vi.useFakeTimers();
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    track = { stop: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;

    getDisplayMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getDisplayMedia } });
    recorder = {
      state: 'inactive',
      start: vi.fn(() => {
        Object.assign(recorder, { state: 'recording' });
      }),
      stop: vi.fn(() => {
        Object.assign(recorder, { state: 'inactive' });
      }),
      ondataavailable: null,
      onstop: null,
      onerror: null,
    } as unknown as MediaRecorder;
    const recorderConstructor = vi.fn(function () {
      return recorder;
    });

    Object.assign(recorderConstructor, { isTypeSupported: vi.fn().mockReturnValue(true) });
    vi.stubGlobal('MediaRecorder', recorderConstructor);
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, writable: true, value: recorderConstructor });
    createUrl = vi.fn().mockReturnValue('blob:recording');
    vi.stubGlobal('URL', { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    Object.defineProperty(window, 'URL', { configurable: true, value: URL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    onStop = vi.fn(() => manager.save('recording.webm'));
    onMinorError = vi.fn();
    onNotice = vi.fn();
    manager = new StreamManager(1000000, onStop, onMinorError, vi.fn(), vi.fn(), onNotice);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const startRecording = async () => {
    manager.start();
    await Promise.resolve();
    vi.advanceTimersByTime(StreamManager.RECORDING_START_DELAY_MS);
  };
  const data = (value: string) => recorder.ondataavailable?.({ data: new Blob([value]) } as BlobEvent);
  const finish = () => recorder.onstop?.(new Event('stop'));

  it('stays requesting until permission and recorder startup complete', async () => {
    manager.start();
    expect(manager.state).toBe('requesting');
    expect(manager.isVideoRecording).toBe(false);
    await Promise.resolve();
    expect(manager.state).toBe('requesting');
    vi.advanceTimersByTime(StreamManager.RECORDING_START_DELAY_MS);
    expect(manager.state).toBe('recording');
  });

  it('returns to idle after permission denial and permits retry', async () => {
    getDisplayMedia.mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
    manager.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(manager.state).toBe('idle');
    expect(onMinorError).toHaveBeenCalledOnce();
    // A cancelled picker (Chromium: NotAllowedError) is a localized "cancelled" notice, never the browser text.
    expect(onNotice).toHaveBeenCalledExactlyOnceWith('cancelled');
    await startRecording();
    expect(manager.state).toBe('recording');
  });

  it('discards a late permission result after cancellation without affecting the next request', async () => {
    let grant: (stream: MediaStream) => void = () => undefined;
    const lateTrack = { stop: vi.fn() };

    getDisplayMedia.mockReturnValueOnce(
      new Promise<MediaStream>((resolve) => {
        grant = resolve;
      })
    );
    manager.start();
    manager.stop();
    await startRecording();
    grant({ getTracks: () => [lateTrack] } as unknown as MediaStream);
    await Promise.resolve();
    expect(lateTrack.stop).toHaveBeenCalledOnce();
    expect(manager.state).toBe('recording');
    expect(onStop).not.toHaveBeenCalled();
  });

  it('cancels startup and releases permission-granted tracks without exporting', async () => {
    manager.start();
    await Promise.resolve();
    manager.stop();
    vi.advanceTimersByTime(StreamManager.RECORDING_START_DELAY_MS);
    expect(track.stop).toHaveBeenCalledOnce();
    expect(recorder.start).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
    expect(manager.state).toBe('idle');
  });

  it('waits for the terminal chunk and stop event, saves once, then ends tracks', async () => {
    await startRecording();
    data('initial');
    manager.stop();
    manager.stop();
    manager.save('premature.webm');
    expect(manager.state).toBe('stopping');
    expect(createUrl).not.toHaveBeenCalled();
    expect(track.stop).not.toHaveBeenCalled();
    data('distinctive final frame');
    finish();
    finish();
    manager.save('duplicate.webm');
    expect(onStop).toHaveBeenCalledOnce();
    expect(createUrl).toHaveBeenCalledOnce();
    expect(createUrl.mock.calls[0][0].size).toBe(new Blob(['initialdistinctive final frame']).size);
    expect(track.stop).toHaveBeenCalledOnce();
    expect(manager.state).toBe('idle');
  });

  it('finalizes when browser Stop Sharing ends a track', async () => {
    await startRecording();
    const ended = track.addEventListener.mock.calls.find(([name]) => name === 'ended')?.[1];

    ended();
    data('final');
    finish();
    expect(recorder.stop).toHaveBeenCalledOnce();
    expect(onStop).toHaveBeenCalledOnce();
    expect(manager.state).toBe('idle');
  });

  it('releases tracks after constructor or start failure and allows retry', async () => {
    vi.mocked(window.MediaRecorder).mockImplementationOnce(function () {
      throw new Error('codec');
    });
    await startRecording();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(manager.state).toBe('idle');
    expect(onMinorError).toHaveBeenCalledOnce();
    vi.mocked(recorder.start).mockImplementationOnce(() => {
      throw new Error('start');
    });
    await startRecording();
    expect(track.stop).toHaveBeenCalledTimes(2);
    expect(manager.state).toBe('idle');
    expect(onStop).not.toHaveBeenCalled();
  });

  it('keeps consecutive recordings separate and ignores prior recorder callbacks', async () => {
    await startRecording();
    const oldData = recorder.ondataavailable;
    const oldStop = recorder.onstop;
    const oldError = recorder.onerror;

    data('first');
    manager.stop();
    finish();
    await startRecording();
    oldData?.({ data: new Blob(['stale']) } as BlobEvent);
    oldStop?.(new Event('stop'));
    oldError?.(new Event('error'));
    data('second');
    manager.stop();
    finish();
    expect(onStop).toHaveBeenCalledTimes(2);
    expect(createUrl.mock.calls.map(([blob]) => blob.size)).toEqual([5, 6]);
  });

  it('ignores repeated starts while requesting, recording, and stopping', async () => {
    manager.start();
    manager.start();
    await Promise.resolve();
    vi.advanceTimersByTime(StreamManager.RECORDING_START_DELAY_MS);
    manager.start();
    data('valid');
    manager.stop();
    manager.start();
    expect(getDisplayMedia).toHaveBeenCalledOnce();
    finish();
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('cleans runtime recorder errors without downloading a partial file', async () => {
    await startRecording();
    data('partial');
    recorder.onerror?.(new Event('error'));
    data('terminal');
    finish();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(manager.state).toBe('idle');
    expect(onMinorError).toHaveBeenCalledOnce();
    expect(onStop).not.toHaveBeenCalled();
  });

  it('cleans a stop failure and permits the next attempt', async () => {
    await startRecording();
    vi.mocked(recorder.stop).mockImplementationOnce(() => {
      throw new Error('stop failed');
    });
    manager.stop();
    expect(manager.state).toBe('idle');
    expect(track.stop).toHaveBeenCalledOnce();
    expect(onStop).not.toHaveBeenCalled();
    await startRecording();
    expect(manager.state).toBe('recording');
  });

  it('does not export an empty recording', async () => {
    await startRecording();
    data('');
    manager.stop();
    finish();
    expect(onStop).not.toHaveBeenCalled();
    expect(onMinorError).toHaveBeenCalledOnce();
    expect(onNotice).toHaveBeenCalledExactlyOnceWith('tooShort');
    expect(track.stop).toHaveBeenCalledOnce();
    expect(manager.state).toBe('idle');
  });
  it('writes the recorded duration into the saved WebM so players can seek', async () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);

    await startRecording();
    // Chrome's first chunk: EBML header, unknown-size Segment, Info without Duration.
    const head = new Uint8Array([
      0x1a, 0x45, 0xdf, 0xa3, 0x87, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d, 0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x15, 0x49, 0xa9, 0x66, 0x87,
      0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40,
    ]);
    const headChunk = new Blob([head]);

    recorder.ondataavailable?.({ data: headChunk } as BlobEvent);
    await headChunk.arrayBuffer();
    await Promise.resolve();
    data('cluster bytes');
    now.mockReturnValue(1000 + 14545);
    manager.stop();
    finish();

    const saved = new Uint8Array(await (createUrl.mock.calls[0][0] as Blob).arrayBuffer());

    expect(readWebmDurationMs(saved)).toBeCloseTo(14545, 3);
    expect(new TextDecoder().decode(saved.subarray(saved.length - 'cluster bytes'.length))).toBe('cluster bytes');
  });

  it('reports a cancelled pending request as cancelled', () => {
    manager.start();
    manager.stop();
    expect(manager.state).toBe('idle');
    expect(onNotice).toHaveBeenCalledExactlyOnceWith('cancelled');
  });

  it('reports Stop Sharing before any data as too short and saves nothing', async () => {
    manager.start();
    await Promise.resolve();
    // Stream granted, still inside the start delay: the browser ends the share.
    const ended = track.addEventListener.mock.calls.find(([name]) => name === 'ended')?.[1];

    ended();
    vi.advanceTimersByTime(StreamManager.RECORDING_START_DELAY_MS);
    expect(manager.state).toBe('idle');
    expect(recorder.start).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledExactlyOnceWith('tooShort');
  });

  it('reports Stop Sharing after recording without a chunk as too short', async () => {
    await startRecording();
    const ended = track.addEventListener.mock.calls.find(([name]) => name === 'ended')?.[1];

    ended();
    finish();
    expect(onStop).not.toHaveBeenCalled();
    expect(createUrl).not.toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledExactlyOnceWith('tooShort');
  });

  it('saves on Stop Sharing with data and reports no failure notice', async () => {
    await startRecording();
    data('partial');
    const ended = track.addEventListener.mock.calls.find(([name]) => name === 'ended')?.[1];

    ended();
    finish();
    expect(onStop).toHaveBeenCalledOnce();
    expect(createUrl).toHaveBeenCalledOnce();
    expect(onNotice).not.toHaveBeenCalled();
  });

  it('save returns true once and false when there is nothing left to save', async () => {
    onStop.mockImplementation(() => undefined);
    await startRecording();
    data('frame');
    manager.stop();
    finish();
    expect(manager.save('a.webm')).toBe(true);
    expect(manager.save('b.webm')).toBe(false);
  });

  it('reports recorder construction failures as failed and an unreadable surface as notReadable', async () => {
    vi.mocked(window.MediaRecorder).mockImplementationOnce(function () {
      throw new Error('codec');
    });
    await startRecording();
    expect(onNotice).toHaveBeenLastCalledWith('failed');

    getDisplayMedia.mockRejectedValueOnce(new DOMException('Could not start video source', 'NotReadableError'));
    manager.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(onNotice).toHaveBeenLastCalledWith('notReadable');
  });

  it('classifyError maps browser error names to notices', () => {
    expect(StreamManager.classifyError(new DOMException('Permission denied', 'NotAllowedError'))).toBe('cancelled');
    expect(StreamManager.classifyError(new DOMException('Aborted', 'AbortError'))).toBe('cancelled');
    expect(StreamManager.classifyError(new DOMException('Busy', 'NotReadableError'))).toBe('notReadable');
    expect(StreamManager.classifyError(new Error('anything else'))).toBe('failed');
    expect(StreamManager.classifyError(null)).toBe('failed');
  });
});
