import { beforeEach, expect, it, vi } from 'vitest';
import type { RuntimeRequest, RuntimeResponse } from '../src/contracts';

const mocks = vi.hoisted(() => ({ loadPyodide: vi.fn() }));
vi.mock('pyodide', () => ({ loadPyodide: mocks.loadPyodide }));

beforeEach(() => { vi.resetModules(); mocks.loadPyodide.mockReset(); });

it('loads locally hosted Pyodide and routes JSON requests through the runner', async () => {
  let handler: ((event: MessageEvent<RuntimeRequest>) => void) | undefined;
  const postMessage = vi.fn();
  vi.stubGlobal('self', { location: { origin: 'https://example.test' }, set onmessage(fn: typeof handler) { handler = fn; }, postMessage });
  const globals = { set: vi.fn() };
  mocks.loadPyodide.mockResolvedValue({
    globals,
    runPython: vi.fn((code: string) => code.startsWith('json.dumps')
      ? JSON.stringify({ id: 'one', ok: true, stdout: 'hello\n', stderr: '' }) : undefined),
  });
  await import('../src/runtime/python.worker');
  handler?.({ data: { id: 'one', mode: 'run', code: 'print("hello")', inputs: [] } } as MessageEvent<RuntimeRequest>);
  await vi.waitFor(() => expect(postMessage).toHaveBeenCalledWith({ id: 'one', ok: true, stdout: 'hello\n', stderr: '' } satisfies RuntimeResponse));
  expect(mocks.loadPyodide).toHaveBeenCalledWith({ indexURL: expect.stringMatching(/^https:\/\/example\.test\/.*pyodide\/$/) });
  vi.unstubAllGlobals();
});
