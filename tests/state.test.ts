import { describe, it, expect } from 'vitest';
import { defaultState, applyAttempt, dueExerciseIds, exportState, importState } from '../src/storage/state';
import type { Exercise, LearningUnit } from '../src/contracts';
import { learningUnits } from '../src/content/learning';
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

const unit: LearningUnit = { id: 'unit-alias', week: 7, title: 'Aliases', objective: '', explanation: '', example: '', exerciseIds: ['w7-alias', 'w7-copy'] };
const legacy = {
  version: 1, nickname: 'Ada', confidence: 'intermediate', xp: 45,
  completed: ['w7-alias', 'w7-copy'],
  attempts: [{ exerciseId: 'w7-alias', at: 1000, correct: true, attempts: 1, difficulty: 'exam', hintUsed: false }],
  drafts: { 'w7-copy': 'print(42)' }, exams: { active: { mode: 'timed', ids: ['w7-alias'], answers: { 'w7-alias': '0' } } },
  preferences: { reducedMotion: true },
};

describe('backup migration and validation', () => {
  it('maps real legacy exercise IDs to the current ordered learning units', () => {
    const real = learningUnits[0];
    const result = importState(JSON.stringify({ ...legacy, completed: [...real.exerciseIds], xp: 45 }));
    expect(result.journey.completedUnits).toContain(real.id);
    expect(result.completed).toEqual(real.exerciseIds);
    expect(result.xp).toBe(45);
  });
  it('migrates all v1 data and only marks fully completed units', () => {
    const result = importState(JSON.stringify(legacy), [unit, { ...unit, id: 'partial', exerciseIds: ['w7-alias', 'missing'] }]);
    expect(result).toMatchObject({ ...legacy, version: 2, journey: { completedUnits: ['unit-alias'] } });
    expect(result.journey.active).toBeUndefined();
    expect(importState(exportState(result), [unit])).toEqual(result);
  });
  it('does not count a merely corrected answer as independent mastery during migration', () => {
    const result = importState(JSON.stringify({ ...legacy, completed: ['w7-alias'], attempts: [{ ...legacy.attempts[0], correct: true, attempts: 2 }] }), [unit]);
    expect(result.completed).toEqual(['w7-alias']);
    expect(result.journey.completedUnits).toEqual([]);
  });
  it('round-trips an active screen and unchanged user data through v2 backups', () => {
    const state = importState(JSON.stringify(legacy), [unit]);
    state.journey.active = { unitId: 'unit-alias', screenIndex: 2, startedAt: 1500, missed: ['w7-copy'], recovered: [] };
    expect(importState(exportState(state), [unit])).toEqual(state);
  });
  it.each([
    { ...legacy, drafts: [] },
    { ...legacy, drafts: { x: 42 } },
    { ...legacy, exams: null },
    { ...legacy, attempts: [{ ...legacy.attempts[0], at: NaN }] },
    { ...legacy, attempts: [{ ...legacy.attempts[0], attempts: -1 }] },
    { ...legacy, completed: ['w7-alias', 2] },
    { ...legacy, xp: -1 },
    { ...legacy, preferences: { reducedMotion: 'yes' } },
    { ...legacy, version: 2 },
    { ...legacy, version: 2, journey: { completedUnits: ['unit-alias'], active: { unitId: 'unit-alias', screenIndex: -1, startedAt: 0, missed: [], recovered: [] } } },
  ])('rejects malformed backups instead of silently losing data (%#)', bad => {
    expect(() => importState(JSON.stringify(bad), [unit])).toThrow('corrupt');
  });
});
