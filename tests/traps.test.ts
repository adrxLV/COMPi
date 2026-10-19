import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { exercises } from '../src/content';
import { trapExercises } from '../src/content/traps';

const python = (code: string, inputs: string[] = []) => execFileSync('python3', ['-c', code], {
  input: inputs.join('\n') + (inputs.length ? '\n' : ''), encoding: 'utf8', timeout: 3000,
});

describe('source-aligned traps', () => {
  it('begins with an input-type trap on lecture 4 page 8, confirmed by CPython', () => {
    const item = trapExercises.find(e => e.id === 'trap-w4-input-is-text');
    expect(item?.week).toBe(4);
    expect(item?.provenance.reference).toContain('Lecture 04, p. 8');
    expect(item?.answer).toBe('77 14');
    expect(python(item!.code!, ['7']).trimEnd()).toBe(item!.answer);
    expect(exercises.some(e => e.id === item!.id)).toBe(true);
  });

  it('covers 17 distinct traps with traceable PDF pages and valid answer shapes', () => {
    expect(trapExercises).toHaveLength(17);
    const ids = trapExercises.map(e => e.id);
    const prompts = trapExercises.map(e => e.statement.trim().toLowerCase());
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(prompts).size).toBe(prompts.length);
    expect(ids.every(id => exercises.some(e => e.id === id))).toBe(true);
    expect(prompts.every(prompt => exercises.some(e => e.statement.trim().toLowerCase() === prompt))).toBe(true);
    for (const e of trapExercises) {
      expect(e.week).toBeGreaterThanOrEqual(4);
      expect(e.week).toBeLessThanOrEqual(7);
      expect(e.provenance.reference).toMatch(/Lecture 0[4-7], p\. \d+/);
      expect(e.prerequisites).toContain(`lesson-w${e.week - 1}`);
      expect(e.hints.length).toBeGreaterThan(0);
      expect(e.misconceptions.length).toBeGreaterThan(0);
      if (e.type === 'choice') {
        expect(e.answer).toMatch(/^\d+$/);
        expect(Number(e.answer)).toBeLessThan(e.options!.length);
      } else if (e.type === 'bug') {
        expect(Array.isArray(e.answer)).toBe(true);
        for (const line of e.answer as number[]) expect(line).toBeLessThanOrEqual(e.code!.split('\n').length);
      } else if (e.type === 'predict') expect(typeof e.answer).toBe('string');
    }
  });

  it('checks every fixed output against actual CPython, including slice and list traps', () => {
    const inputById: Record<string, string[]> = { 'trap-w4-input-is-text': ['7'] };
    for (const e of trapExercises.filter(e => e.type === 'predict' || e.type === 'choice')) {
      expect(e.code, `${e.id} needs executable Python`).toBeTruthy();
      const result = python(e.code!, inputById[e.id] || []).trimEnd();
      const expected = e.type === 'choice' ? e.options![Number(e.answer)] : e.answer;
      expect(result, `${e.id} CPython mismatch`).toBe(expected);
    }
  });

  it('describes all three lines in the rebinding trace', () => {
    const e = trapExercises.find(item => item.id === 'trap-w7-loop-variable-rebinding')!;
    expect(e.statement).toContain('three lines');
    expect((e.answer as string).split('\n')).toHaveLength(3);
  });

  it('distinguishes a silently ineffective expression from index assignment', () => {
    const e = trapExercises.find(item => item.id === 'trap-w7-unassigned-expression')!;
    expect(e.type).toBe('bug');
    expect(e.answer).toEqual([3]);
    expect(python(e.code!).trimEnd()).toBe('[6, 7]');
  });

  it('uses only taught loop syntax in both coding starters', () => {
    for (const e of trapExercises.filter(item => item.type === 'fix')) {
      expect(e.starter).not.toMatch(/\[int\(x\) for x in/);
    }
  });

  it('executes several cases for each coding exercise, including adjacent removals', () => {
    const solutions: Record<string, string> = {
      'trap-w7-double-slots': 'values = [int(x) for x in input().split(",")]\nfor i in range(len(values)):\n    values[i] *= 2\nprint(values)',
      'trap-w7-remove-on-copy': 'values = [int(x) for x in input().split(",")]\nfor value in values[:]:\n    if value < 10:\n        values.remove(value)\nprint(values)',
    };
    for (const e of trapExercises.filter(item => ['fix', 'complete', 'program'].includes(item.type))) {
      expect(e.tests!.length, `${e.id} needs multiple tests`).toBeGreaterThanOrEqual(3);
      const solution = solutions[e.id];
      expect(solution, `${e.id} needs an executable witness`).toBeTruthy();
      for (const test of e.tests!) {
        expect(python(solution, test.input), `${e.id}: ${test.description}`).toBe(test.expectedOutput);
      }
    }
    expect(Object.keys(solutions).sort()).toEqual(trapExercises.filter(e => ['fix', 'complete', 'program'].includes(e.type)).map(e => e.id).sort());
  });

  it('calls verbatim lecture removal examples source-derived rather than adapted', () => {
    for (const id of ['trap-w7-remove-while-walking', 'trap-w7-remove-from-copy']) {
      expect(trapExercises.find(e => e.id === id)?.provenance.kind).toBe('source-derived');
    }
  });

  it('labels reference-identity enrichment without claiming assessed status', () => {
    const e = trapExercises.find(item => item.id === 'trap-w7-alias-vs-slice-copy')!;
    expect(e.subtopic).toContain('Enrichment (not confirmed assessed)');
    expect(e.provenance.reference).toContain('Enrichment (not confirmed assessed)');
    expect(e.provenance.kind).toBe('newly-authored');
  });
});
