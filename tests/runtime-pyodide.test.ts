import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { expect, it } from 'vitest';
import { loadPyodide } from 'pyodide';
import { PYTHON_RUNNER } from '../src/runtime/runner';
import type { RuntimeRequest, RuntimeResponse } from '../src/contracts';

it('executes grade and trace against the real Pyodide interpreter', async () => {
  const python = await loadPyodide({ indexURL: dirname(createRequire(import.meta.url).resolve('pyodide/package.json')) + '/' });
  python.runPython(PYTHON_RUNNER);
  const execute = (request: RuntimeRequest): RuntimeResponse => {
    python.globals.set('__runtime_request_json', JSON.stringify(request));
    return JSON.parse(python.runPython('json.dumps(run_request(json.loads(__runtime_request_json)))') as string);
  };
  const graded = execute({ id: 'grade', mode: 'grade', code: 'print(input())', inputs: [], tests: [
    { description: 'one', input: ['first'], expectedOutput: 'first\n' },
    { description: 'two', input: ['second'], expectedOutput: 'second\n' },
  ] });
  expect(graded).toMatchObject({ ok: true, cases: [{ actual: 'first\n', passed: true }, { actual: 'second\n', passed: true }] });
  const traced = execute({ id: 'trace', mode: 'trace', code: 'x = []\ny = x\nx.append(9)\nprint(y)', inputs: [] });
  expect(traced).toMatchObject({ ok: true, stdout: '[9]\n' });
  const last = traced.frames?.at(-1);
  expect(last?.bindings.find((binding) => binding.name === 'x')?.objectId)
    .toBe(last?.bindings.find((binding) => binding.name === 'y')?.objectId);
}, 60_000);
