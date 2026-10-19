import type { RuntimeRequest, RuntimeResponse } from '../contracts';

type Job = { request: RuntimeRequest; timeoutMs: number; resolve: (response: RuntimeResponse) => void };
const DEFAULT_TIMEOUT_MS = 20_000;
let worker: Worker | undefined;
let active: Job | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
const queue: Job[] = [];

function failure(id: string, error: string, timedOut = false): RuntimeResponse {
  return { id, ok: false, stdout: '', stderr: '', error, ...(timedOut ? { timedOut: true } : {}) };
}

function shutdown(error: string, timedOut = false): void {
  worker?.terminate();
  worker = undefined;
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  if (active) active.resolve(failure(active.request.id, error, timedOut));
  active = undefined;
  if (timedOut) {
    // Only the running request timed out; waiting jobs have not started yet.
    dispatch();
  } else {
    for (const job of queue.splice(0)) job.resolve(failure(job.request.id, error));
  }
}

function dispatch(): void {
  if (active || queue.length === 0) return;
  if (!worker) {
    worker = new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' });
    const current = worker;
    current.onmessage = ({ data }: MessageEvent<RuntimeResponse>) => {
      if (worker !== current || !active || data.id !== active.request.id) return;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      active.resolve(data);
      active = undefined;
      dispatch();
    };
    current.onerror = (event) => {
      event.preventDefault?.();
      if (worker === current) shutdown(event.message || 'Python worker failed');
    };
  }
  active = queue.shift();
  if (!active) return;
  timer = setTimeout(() => shutdown('Python execution timed out', true), active.timeoutMs);
  try { worker.postMessage(active.request); }
  catch (error) { shutdown(error instanceof Error ? error.message : String(error)); }
}

/** Runs one request; concurrent requests are queued. Timeouts include initial Pyodide startup. */
export function runPython(request: RuntimeRequest): Promise<RuntimeResponse> {
  return new Promise((resolve) => {
    queue.push({ request, timeoutMs: DEFAULT_TIMEOUT_MS, resolve });
    dispatch();
  });
}

/** Hard-cancels execution, drops queued requests, and lazily starts a clean worker next time. */
export function cancelPython(): void { shutdown('Cancelled'); }
