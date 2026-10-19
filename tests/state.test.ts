import { describe, it, expect } from 'vitest';
import { defaultState, applyAttempt, dueExerciseIds, exportState, importState } from '../src/storage/state';
import type { Exercise } from '../src/contracts';
const item = { id:'w7-alias', difficulty:'exam', topic:'Aliases', reviewDays:1 } as Exercise;
describe('learner progression', () => {
 it('awards XP once per independent correct answer and records attempts', () => {
  const first = applyAttempt(defaultState(), item, true, false, 1, 1000);
  const retry = applyAttempt(first, item, true, false, 2, 2000);
  expect(first.xp).toBeGreaterThan(0); expect(retry.xp).toBe(first.xp);
  expect(retry.attempts).toHaveLength(2);
 });
 it('queues errors for revision and does not master repeated guesses', () => {
  const failed = applyAttempt(defaultState(), item, false, false, 1, 1000);
  expect(dueExerciseIds(failed, 1000)).toContain(item.id);
  const guessed = applyAttempt(failed, item, true, true, 3, 2000);
  expect(guessed.completed).not.toContain(item.id);
 });
 it('validates imported backups without silently overwriting invalid data', () => {
  const state = applyAttempt(defaultState(), item, true, false, 1, 1000);
  expect(importState(exportState(state))).toEqual(state);
  expect(() => importState('{"version":999}')).toThrow();
 });
});
