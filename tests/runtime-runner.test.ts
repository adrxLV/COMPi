import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import type { RuntimeRequest, RuntimeResponse } from '../src/contracts';
import { PYTHON_RUNNER } from '../src/runtime/runner';

function run(request: Partial<RuntimeRequest>): RuntimeResponse {
  const script = `${PYTHON_RUNNER}\nimport sys, json\nprint(json.dumps(run_request(json.loads(sys.stdin.read()))))`;
  return JSON.parse(execFileSync('python3', ['-c', script], { input: JSON.stringify({ id: 'x', mode: 'run', code: '', inputs: [], ...request }), encoding: 'utf8' }));
}

describe('Python execution', () => {
  it('executes actual Python with prompts and ordered inputs', () => {
    expect(run({ code: 'x = input("first? ")\ny = input("second? ")\nprint(x + y)', inputs: ['a', 'b'] }))
      .toMatchObject({ ok: true, stdout: 'first? second? ab\n', stderr: '' });
  });
  it('preserves partial stdout and captures error information', () => {
    const result = run({ code: 'print("before")\n1 / 0' });
    expect(result).toMatchObject({ ok: false, stdout: 'before\n', error: 'ZeroDivisionError: division by zero' });
    expect(result.stderr).toContain('ZeroDivisionError: division by zero');
  });
  it('grades independent cases without leaking namespace or output', () => {
    expect(run({ mode: 'grade', code: 'try:\n    n += 1\nexcept NameError:\n    n = 1\nprint(input(), n)', tests: [
      { description: 'a', input: ['A'], expectedOutput: 'A 1\n' },
      { description: 'b', input: ['B'], expectedOutput: 'B 1\n' },
    ] })).toMatchObject({ ok: true, cases: [
      { description: 'a', passed: true, actual: 'A 1\n' },
      { description: 'b', passed: true, actual: 'B 1\n' },
    ] });
  });
  it('reports exhausted ordered input and failed grade cases', () => {
    expect(run({ mode: 'grade', code: 'print(input())', tests: [{ description: 'missing', input: [], expectedOutput: 'X\n' }] }))
      .toMatchObject({ ok: false, cases: [{ passed: false, error: 'EOFError: No more input available' }] });
  });
  it('records line snapshots with stable object identity and cumulative output', () => {
    const result = run({ mode: 'trace', code: 'items = []\nalias = items\nitems.append(5)\nprint(alias)', maxSteps: 30 });
    expect(result.ok).toBe(true);
    const last = result.frames?.at(-1);
    expect(last?.output).toBe('[5]\n');
    const items = last?.bindings.find((binding) => binding.name === 'items');
    const alias = last?.bindings.find((binding) => binding.name === 'alias');
    expect(items?.objectId).toBe(alias?.objectId);
    expect(items?.repr).toBe('[5]');
    expect(result.frames?.some((frame) => frame.line === 3)).toBe(true);
  });
  it('bounds runaway traced programs by maxSteps', () => {
    const result = run({ mode: 'trace', code: 'while True:\n    pass', maxSteps: 8 });
    expect(result).toMatchObject({ ok: false, error: 'RuntimeError: Trace step limit exceeded (8)' });
    expect(result.frames?.length).toBeLessThanOrEqual(8);
  });
});
