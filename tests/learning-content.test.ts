import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { exercises } from '../src/content/index.ts';
import { learningUnits } from '../src/content/learning.ts';

const output = (code: string) => {
  const run = spawnSync('python3', ['-c', code], { encoding: 'utf8' });
  expect(run.status, run.stderr).toBe(0);
  return run.stdout;
};

// These expected outputs are independently checked against CPython, not inferred from captions.
const expectedExamples: Record<string, string> = {
  'errors-and-parsing': '', 'execution-and-runtime': '7\n',
  'assignment-updates': '9.0\n', 'arithmetic-and-comparisons': '3 2 True\n',
  'logical-conditions': 'False\n', 'string-conversion-and-indexing': '11225\n',
  'string-method-results': 'hello\n', 'input-and-positions': '77 14\n',
  'list-indexing-and-slices': 'c\n[1, 3]\n', 'list-mutation-and-append': '[1, 2, 3] None\n',
  'branch-boundaries': 'adult\n', 'branch-priority-and-caps': '140\n',
  'methods-in-conditions': 'True\n', 'range-order-and-stop': '0\n1\n2\n',
  'range-direction-and-step': '[7, 4, 1]\n', 'loop-accumulation-and-traversal': '6\n',
  'list-value-traversal': '13\n', 'index-based-mutation': '[6, 15]\n',
  'parallel-list-search': 'B 5\n', 'removal-during-traversal': '[12, 18, 15]\n',
  'slices-and-references': '[9, 4] [3, 4]\n', 'exam-repair-synthesis': 'JIM\nPAM\n',
};

describe('source-aligned learning path', () => {
  it('has granular ordered concepts, in the Weeks 1–7 first-test boundary', () => {
    expect(learningUnits.length).toBeGreaterThanOrEqual(16);
    expect(learningUnits.length).toBeLessThanOrEqual(24);
    expect(learningUnits.map(u => u.week)).toEqual([...learningUnits.map(u => u.week)].sort((a, b) => a - b));
    expect(new Set(learningUnits.map(u => u.id)).size).toBe(learningUnits.length);
    expect(new Set(learningUnits.map(u => u.week))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
    for (const unit of learningUnits) {
      expect(unit.exerciseIds.length).toBeGreaterThan(0);
      for (const id of unit.exerciseIds) expect(exercises.find(e => e.id === id)?.week).toBe(unit.week);
      expect(unit.objective.length).toBeGreaterThan(20);
      expect(unit.explanation.length).toBeGreaterThan(90);
      expect(unit.example.length).toBeGreaterThan(0);
    }
  });

  it('assigns every existing exercise ID once and only once', () => {
    expect(exercises).toHaveLength(52);
    const assigned = learningUnits.flatMap(unit => unit.exerciseIds);
    expect(assigned).toHaveLength(exercises.length);
    expect(new Set(assigned).size).toBe(assigned.length);
    expect([...assigned].sort()).toEqual(exercises.map(e => e.id).sort());
  });

  it('introduces prerequisites before later applications and repairs', () => {
    const path = learningUnits.flatMap(unit => unit.exerciseIds);
    const position = (id: string) => path.indexOf(id);
    const before = (intro: string, application: string) => expect(position(intro)).toBeLessThan(position(application));
    before('w1-error-categories', 'w1-runtime-diagnosis');
    before('w2-assignment-update', 'w2-numeric-update');
    before('w4-list-operations', 'trap-w4-append-returns-none');
    before('w6-range-endpoint', 'w6-loop-accumulator');
    before('trap-w7-loop-variable-rebinding', 'trap-w7-double-slots');
    before('trap-w7-remove-while-walking', 'trap-w7-remove-on-copy');
    before('w7-parallel-list-indices', 'w7-room-matching');
    before('w7-correcting-guest-list', 'w7-exam-repair-analysis');
  });

  it('labels reference identity as enrichment, without suggesting an assessed topic', () => {
    const unit = learningUnits.find(u => u.exerciseIds.includes('trap-w7-alias-vs-slice-copy'))!;
    expect(unit.week).toBe(7);
    expect(unit.explanation).toMatch(/enrichment/i);
    expect(unit.explanation).toMatch(/not confirmed assessed/i);
    expect(unit.explanation).toMatch(/slice/i);
    expect(learningUnits.flatMap(u => u.exerciseIds).some(id => /(?:while-loop|list-comprehension)/.test(id))).toBe(false);
  });

  it('runs every complete lesson example with the declared CPython output', () => {
    expect(learningUnits.map(u => u.id).sort()).toEqual(Object.keys(expectedExamples).sort());
    for (const unit of learningUnits) expect(output(unit.example), unit.id).toBe(expectedExamples[unit.id]);
  });

  it('keeps optional visual steps static, cumulative, and consistent with Python', () => {
    for (const id of ['range-order-and-stop', 'slices-and-references']) {
      const unit = learningUnits.find(u => u.id === id)!;
      expect(unit.teachingSteps?.length).toBeGreaterThanOrEqual(3);
      for (const step of unit.teachingSteps!) {
        expect(step.caption.length).toBeGreaterThan(15);
        output(step.code);
        expect(new Set(step.bindings.map(b => b.name)).size).toBe(step.bindings.length);
        const names = step.bindings.map(b => b.name);
        const probe = `import contextlib, io, json\nns = {}\nwith contextlib.redirect_stdout(io.StringIO()):\n    exec(${JSON.stringify(step.code)}, ns)\nprint(json.dumps({name: {'value': repr(ns[name]), 'identity': id(ns[name])} for name in ${JSON.stringify(names)}}))`;
        const actual = JSON.parse(output(probe)) as Record<string, { value: string; identity: number }>;
        for (const binding of step.bindings) expect(actual[binding.name].value).toBe(binding.value);
        for (const a of step.bindings) for (const b of step.bindings) {
          expect(actual[a.name].identity === actual[b.name].identity).toBe(a.objectId === b.objectId);
        }
      }
    }
    const alias = learningUnits.find(u => u.id === 'slices-and-references')!.teachingSteps!;
    expect(alias.at(-1)?.bindings.find(b => b.name === 'original')?.objectId)
      .toBe(alias.at(-1)?.bindings.find(b => b.name === 'alias')?.objectId);
    expect(alias.at(-1)?.bindings.find(b => b.name === 'copy')?.objectId)
      .not.toBe(alias.at(-1)?.bindings.find(b => b.name === 'original')?.objectId);
    expect(output(alias.at(-1)!.code)).toBe('[9, 4] [3, 4]\n');
    const loop = learningUnits.find(u => u.id === 'range-order-and-stop')!.teachingSteps!;
    expect(loop.map(s => s.bindings.find(b => b.name === 'i')?.value)).toEqual(['0', '1', '2']);
    expect(loop.map(s => output(s.code))).toEqual(['0\n', '0\n1\n', '0\n1\n2\n']);
  });
});
