import { describe, expect, it } from 'vitest';
import type { Exercise, LearnerState } from '../src/contracts';
import { filterPracticeExercises } from '../src/features/practice/filter';
import { defaultState } from '../src/storage/state';

const items = [
  { id: 'one', week: 1, type: 'error', topic: 'Errors', subtopic: 'Syntax', statement: 'Name the error' },
  { id: 'two', week: 2, type: 'choice', topic: 'Numbers', subtopic: 'Division', statement: 'Find the quotient' },
  { id: 'three', week: 1, type: 'error', topic: 'Errors', subtopic: 'Runtime', statement: 'Name the exception' },
] as Exercise[];
const state: LearnerState = { ...defaultState(), completed: [], attempts: [{ exerciseId: 'one', at: 100, correct: false, attempts: 1, difficulty: 'beginner', hintUsed: false }] };

describe('practice filters', () => {
  it('treats even an incorrect attempt as attempted, independently of mastery', () => {
    expect(filterPracticeExercises(items, state, { search: '', week: 'all', type: 'all', status: 'unattempted' }).map(e => e.id)).toEqual(['two', 'three']);
  });
  it('combines not-attempted with week, type and text filters', () => {
    expect(filterPracticeExercises(items, state, { search: 'runtime', week: '1', type: 'error', status: 'unattempted' }).map(e => e.id)).toEqual(['three']);
    expect(filterPracticeExercises(items, state, { search: '', week: 'all', type: 'all', status: 'all' })).toHaveLength(3);
  });
});
