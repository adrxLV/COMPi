/// <reference lib="webworker" />
import { loadPyodide } from 'pyodide';
import type { RuntimeRequest, RuntimeResponse } from '../contracts';
import { PYTHON_RUNNER } from './runner';

const context = self as DedicatedWorkerGlobalScope;
let initialization: ReturnType<typeof loadPyodide> | undefined;

function getPython(): ReturnType<typeof loadPyodide> {
  if (!initialization) {
    const indexURL = new URL(`${import.meta.env.BASE_URL}pyodide/`, context.location.origin).href;
    initialization = loadPyodide({ indexURL }).then((python) => {
      python.runPython(PYTHON_RUNNER);
      return python;
    });
  }
  return initialization;
}

context.onmessage = async ({ data: request }: MessageEvent<RuntimeRequest>) => {
  try {
    const python = await getPython();
    python.globals.set('__runtime_request_json', JSON.stringify(request));
    const result = python.runPython('json.dumps(run_request(json.loads(__runtime_request_json)))') as string;
    context.postMessage(JSON.parse(result) as RuntimeResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.postMessage({ id: request.id, ok: false, stdout: '', stderr: message, error: message } satisfies RuntimeResponse);
  }
};
