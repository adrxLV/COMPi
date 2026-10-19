import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeRequest, RuntimeResponse } from '../src/contracts';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<RuntimeResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: RuntimeRequest[] = [];
  terminated = false;
  constructor() { FakeWorker.instances.push(this); }
  postMessage(request: RuntimeRequest) { this.posted.push(request); }
  terminate() { this.terminated = true; }
  reply(response: RuntimeResponse) { this.onmessage?.({ data: response } as MessageEvent<RuntimeResponse>); }
}

const request = (id: string): RuntimeRequest => ({ id, mode: 'run', code: 'print(1)', inputs: [] });

beforeEach(() => { FakeWorker.instances = []; vi.stubGlobal('Worker', FakeWorker); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.resetModules(); });

describe('runPython worker lifecycle', () => {
  it('returns the worker response matched by request id', async () => {
    const { runPython } = await import('../src/runtime/client');
    const pending = runPython(request('one'));
    expect(FakeWorker.instances).toHaveLength(1);
    expect(FakeWorker.instances[0].posted).toEqual([request('one')]);
    FakeWorker.instances[0].reply({ id: 'one', ok: true, stdout: '1\n', stderr: '' });
    await expect(pending).resolves.toMatchObject({ id: 'one', stdout: '1\n' });
  });

  it('serializes requests and dispatches the next after completion', async () => {
    const { runPython } = await import('../src/runtime/client');
    const first = runPython(request('one'));
    const second = runPython(request('two'));
    const worker = FakeWorker.instances[0];
    expect(worker.posted).toEqual([request('one')]);
    worker.reply({ id: 'one', ok: true, stdout: '', stderr: '' });
    await first;
    expect(worker.posted).toEqual([request('one'), request('two')]);
    worker.reply({ id: 'two', ok: true, stdout: '2\n', stderr: '' });
    await expect(second).resolves.toMatchObject({ stdout: '2\n' });
  });

  it('terminates a timed-out run and creates a fresh worker for recovery', async () => {
    const { runPython } = await import('../src/runtime/client');
    const pending = runPython(request('loop'));
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(pending).resolves.toMatchObject({ id: 'loop', ok: false, timedOut: true });
    expect(FakeWorker.instances[0].terminated).toBe(true);
    const recovered = runPython(request('next'));
    expect(FakeWorker.instances).toHaveLength(2);
    FakeWorker.instances[1].reply({ id: 'next', ok: true, stdout: 'ready\n', stderr: '' });
    await expect(recovered).resolves.toMatchObject({ stdout: 'ready\n' });
  });

  it('retries queued requests on a fresh worker after an active timeout', async () => {
    const { runPython } = await import('../src/runtime/client');
    const stalled = runPython(request('stalled'));
    const waiting = runPython(request('waiting'));
    await vi.advanceTimersByTimeAsync(20_000);
    await expect(stalled).resolves.toMatchObject({ timedOut: true });
    expect(FakeWorker.instances).toHaveLength(2);
    expect(FakeWorker.instances[1].posted).toEqual([request('waiting')]);
    FakeWorker.instances[1].reply({ id: 'waiting', ok: true, stdout: 'done', stderr: '' });
    await expect(waiting).resolves.toMatchObject({ ok: true, stdout: 'done' });
  });

  it('cancels active and queued runs without accepting stale worker messages', async () => {
    const { runPython, cancelPython } = await import('../src/runtime/client');
    const first = runPython(request('first'));
    const second = runPython(request('second'));
    const oldWorker = FakeWorker.instances[0];
    cancelPython();
    await expect(first).resolves.toMatchObject({ ok: false, error: 'Cancelled' });
    await expect(second).resolves.toMatchObject({ ok: false, error: 'Cancelled' });
    oldWorker.reply({ id: 'first', ok: true, stdout: 'stale', stderr: '' });
    const next = runPython(request('third'));
    expect(FakeWorker.instances).toHaveLength(2);
    FakeWorker.instances[1].reply({ id: 'third', ok: true, stdout: 'fresh', stderr: '' });
    await expect(next).resolves.toMatchObject({ stdout: 'fresh' });
  });
});
