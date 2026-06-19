import { NeighborhoodHistoryCallbacks, NeighborhoodHistoryThreadManager } from '@app/app/threads/neighborhood-history-thread-manager';
import type { NhFileInput } from '@app/webworker/neighborhood-history-messages';
import { vi } from 'vitest';

const OUT = { CHUNK: 0, PROGRESS: 1, COMPLETE: 2, ERROR: 3 } as const;
const IN_START = 0;
const IN_CANCEL = 1;

interface OnMessageable { onMessage(e: { data: unknown }): void }

const makeManager = () => {
  const postMessage = vi.fn();
  const stub = { postMessage, terminate: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as Worker;
  const mgr = new NeighborhoodHistoryThreadManager([]);

  mgr.init(stub);

  return { mgr, postMessage };
};

const files = (): NhFileInput[] => [{ fileId: 0, blocks: [{ name: 'SAT-A', objectId: '2020-001A', states: [] }] }];

const callbacks = (): NeighborhoodHistoryCallbacks => ({
  onChunk: vi.fn(),
  onProgress: vi.fn(),
  onComplete: vi.fn(),
  onError: vi.fn(),
});

describe('NeighborhoodHistoryThreadManager', () => {
  it('posts a START message and returns an incrementing runId', () => {
    const { mgr, postMessage } = makeManager();

    const runId = mgr.startConversion(files(), callbacks());

    expect(runId).toBe(1);
    const sent = postMessage.mock.calls[0][0] as { typ: number; runId: number; files: NhFileInput[] };

    expect(sent.typ).toBe(IN_START);
    expect(sent.runId).toBe(1);
    expect(sent.files).toHaveLength(1);
  });

  it('routes CHUNK / PROGRESS / COMPLETE messages to callbacks for the current run', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();
    const runId = mgr.startConversion(files(), cbs);
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.CHUNK, runId, fileId: 0, datasets: [] } });
    expect(cbs.onChunk).toHaveBeenCalledWith(0, []);

    handler.onMessage({ data: { typ: OUT.PROGRESS, runId, processed: 1, total: 3 } });
    expect(cbs.onProgress).toHaveBeenCalledWith(1, 3);

    handler.onMessage({ data: { typ: OUT.COMPLETE, runId } });
    expect(cbs.onComplete).toHaveBeenCalled();
  });

  it('routes ERROR messages', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();
    const runId = mgr.startConversion(files(), cbs);
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.ERROR, runId, message: 'boom' } });
    expect(cbs.onError).toHaveBeenCalledWith('boom');
  });

  it('discards messages from a stale runId', () => {
    const { mgr } = makeManager();
    const cbs = callbacks();

    mgr.startConversion(files(), cbs); // runId 1
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: { typ: OUT.CHUNK, runId: 999, fileId: 0, datasets: [] } });
    expect(cbs.onChunk).not.toHaveBeenCalled();
  });

  it('marks ready on the "ready" message', () => {
    const { mgr } = makeManager();
    const handler = mgr as unknown as OnMessageable;

    handler.onMessage({ data: 'ready' });
    expect(mgr.isReady).toBe(true);
  });

  it('posts a CANCEL message on cancelConversion', () => {
    const { mgr, postMessage } = makeManager();

    mgr.startConversion(files(), callbacks());
    postMessage.mockClear();
    mgr.cancelConversion();

    expect((postMessage.mock.calls[0][0] as { typ: number }).typ).toBe(IN_CANCEL);
  });
});
