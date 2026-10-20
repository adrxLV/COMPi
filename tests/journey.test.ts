import { describe, it, expect } from 'vitest';
import type { LearningUnit } from '../src/contracts';
import { defaultState, applyAttempt } from '../src/storage/state';
import { beginUnit, setUnitScreen, recordUnitMistake, recordUnitRecovery, completeUnit, isUnitComplete, getResumeUnit } from '../src/storage/journey';
import type { Exercise } from '../src/contracts';

const first: LearningUnit = { id: 'unit-one', week: 1, title: 'One', objective: '', explanation: '', example: '', exerciseIds: ['w1-a', 'w1-b'] };
const second: LearningUnit = { ...first, id: 'unit-two', exerciseIds: ['w1-c'] };
const question = (id: string) => ({ id, difficulty: 'beginner' } as Exercise);

describe('journey helpers', () => {
  it('resumes the same screen without restarting or losing other progress', () => {
    const initial = { ...defaultState(), xp: 20, drafts: { 'w1-a': 'answer' } };
    const begun = beginUnit(initial, first, 100);
    const onQuestion = setUnitScreen(begun, first.id, 1);
    expect(beginUnit(onQuestion, first, 200)).toEqual(onQuestion);
    expect(getResumeUnit(onQuestion, [first, second])).toEqual(first);
    expect(onQuestion.journey.active).toMatchObject({ unitId: first.id, screenIndex: 1, startedAt: 100 });
    expect(onQuestion.xp).toBe(20);
    expect(onQuestion.drafts).toEqual(initial.drafts);
  });
  it('does not permit jumping screens or completing without correct evidence', () => {
    const begun = beginUnit(defaultState(), first, 100);
    expect(() => setUnitScreen(begun, first.id, 3)).toThrow();
    const onFirst = setUnitScreen(begun, first.id, 1);
    const onSecond = setUnitScreen(onFirst, first.id, 2);
    expect(() => completeUnit(onSecond, first)).toThrow();
    const wrong = applyAttempt(onFirst, question('w1-a'), false, false, 1, 110);
    expect(() => completeUnit(wrong, first)).toThrow();
    const corrected = applyAttempt(wrong, question('w1-a'), true, false, 2, 120);
    expect(setUnitScreen(corrected, first.id, 2).journey.active?.screenIndex).toBe(2);
    expect(corrected.completed).not.toContain('w1-a');
  });
  it('tracks mistake and recovery without granting XP or mastery', () => {
    const begun = beginUnit(defaultState(), first, 100);
    const missed = recordUnitMistake(begun, 'w1-a');
    expect(recordUnitMistake(missed, 'w1-a')).toEqual(missed);
    expect(missed.journey.active?.missed).toEqual(['w1-a']);
    const recovered = recordUnitRecovery(missed, 'w1-a');
    expect(recovered.journey.active?.recovered).toEqual(['w1-a']);
    expect(recovered.xp).toBe(0);
    expect(recovered.completed).toEqual([]);
    expect(recordUnitRecovery(begun, 'w1-a')).toEqual(begun);
  });
  it('completes once after all questions have successful evidence and preserves retry status', () => {
    let progress = beginUnit(defaultState(), first, 100);
    progress = setUnitScreen(progress, first.id, 1);
    progress = applyAttempt(progress, question('w1-a'), false, false, 1, 110);
    progress = applyAttempt(progress, question('w1-a'), true, false, 2, 120);
    progress = setUnitScreen(progress, first.id, 2);
    progress = applyAttempt(progress, question('w1-b'), true, false, 1, 130);
    progress = setUnitScreen(progress, first.id, 3);
    const done = completeUnit(progress, first);
    expect(isUnitComplete(done, first)).toBe(true);
    expect(completeUnit(done, first)).toEqual(done);
    expect(done.journey.active).toMatchObject({ unitId: 'unit-one', screenIndex: 3 });
    expect(done.completed).toEqual(['w1-b']);
    expect(done.journey.completedUnits).toEqual(['unit-one']);
    expect(getResumeUnit(done, [first, second])).toEqual(second);
    const revisited = beginUnit(done, first, 200);
    expect(revisited.journey.active).toMatchObject({ unitId: first.id, screenIndex: 0, startedAt: 200 });
    expect(revisited.journey.completedUnits).toEqual(['unit-one']);
  });
  it('cannot complete with merely skipped questions or stale attempts', () => {
    const stale = applyAttempt(defaultState(), question('w1-a'), true, false, 1, 50);
    const begun = beginUnit(stale, first, 100);
    expect(() => completeUnit(begun, first)).toThrow();
    expect(getResumeUnit({ ...begun, journey: { ...begun.journey, active: { ...begun.journey.active!, unitId: 'unknown' } } }, [first, second])).toEqual(first);
  });
});
