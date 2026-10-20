import { describe, expect, it } from 'vitest';
import type { Exercise } from '../src/contracts';
import { modelAnswer } from '../src/features/lesson/reveal';

const item = (properties: Partial<Exercise>) => properties as Exercise;

describe('guided-review answer reveal', () => {
  it('shows the actual choice text rather than an internal index', () => {
    expect(modelAnswer(item({ type: 'choice', options: ['Runtime error', 'Syntax error'], answer: '1' }))).toBe('Syntax error');
  });
  it('formats multi-part, bug-line and exact output keys without inventing an answer', () => {
    expect(modelAnswer(item({ type: 'bug', answer: [2, 4] }))).toBe('Lines 2, 4');
    expect(modelAnswer(item({ type: 'multipart', parts: [{ prompt: 'Name', answer: 'Ada' }] }))).toBe('Name: Ada');
    expect(modelAnswer(item({ type: 'predict', answer: '1\n2' }))).toBe('1\n2');
  });
  it('uses verified model code for programming tasks', () => {
    expect(modelAnswer(item({ type: 'program', solution: 'print(42)' }))).toBe('print(42)');
  });
});
