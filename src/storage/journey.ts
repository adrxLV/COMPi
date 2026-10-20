import type { LearnerState, LearningUnit } from '../contracts';

// Journey completion is navigation history, not a substitute for independent mastery.
// Only applyAttempt may award XP or add independently completed exercise IDs.
export function isUnitComplete(state: LearnerState, unit: LearningUnit): boolean {
  return state.journey.completedUnits.includes(unit.id);
}

export function beginUnit(state: LearnerState, unit: LearningUnit, at = Date.now()): LearnerState {
  if (state.journey.active?.unitId === unit.id && !isUnitComplete(state, unit)) return state;
  if (!unit.id || !unit.exerciseIds.length || !Number.isFinite(at) || at < 0) throw new Error('Invalid unit or start time');
  return { ...state, journey: { ...state.journey, active: { unitId: unit.id, screenIndex: 0, startedAt: at, missed: [], recovered: [], revealed: [] } } };
}

export function currentUnitStep(state: LearnerState, unit: LearningUnit) {
  const active = state.journey.active;
  if (!active || active.unitId !== unit.id) throw new Error('No active unit');
  const total = unit.exerciseIds.length;
  const index = active.screenIndex;
  if (index === 0) return { phase: 'teach' as const, exerciseId: '', reviewIndex: 0, reviewTotal: active.missed.length };
  if (index <= total) return { phase: 'question' as const, exerciseId: unit.exerciseIds[index - 1], reviewIndex: 0, reviewTotal: active.missed.length };
  if (index <= total + active.missed.length) return { phase: 'review' as const, exerciseId: active.missed[index - total - 1], reviewIndex: index - total, reviewTotal: active.missed.length };
  if (index === total + active.missed.length + 1) return { phase: 'complete' as const, exerciseId: '', reviewIndex: 0, reviewTotal: active.missed.length };
  throw new Error('Invalid journey screen');
}

export function setUnitScreen(state: LearnerState, unitId: string, screenIndex: number): LearnerState {
  const active = state.journey.active;
  if (!active || active.unitId !== unitId || !Number.isSafeInteger(screenIndex) || screenIndex < 0 || screenIndex > active.screenIndex + 1) throw new Error('Invalid journey screen');
  if (screenIndex === active.screenIndex) return state;
  return { ...state, journey: { ...state.journey, active: { ...active, screenIndex } } };
}

export function recordUnitMistake(state: LearnerState, exerciseId: string): LearnerState {
  const active = state.journey.active;
  if (!active || !exerciseId) throw new Error('No active unit or exercise');
  if (active.missed.includes(exerciseId)) return state;
  return { ...state, journey: { ...state.journey, active: { ...active, missed: [...active.missed, exerciseId] } } };
}

export function recordUnitRecovery(state: LearnerState, exerciseId: string): LearnerState {
  const active = state.journey.active;
  if (!active) throw new Error('No active unit');
  if (!active.missed.includes(exerciseId) || active.recovered.includes(exerciseId)) return state;
  return { ...state, journey: { ...state.journey, active: { ...active, recovered: [...active.recovered, exerciseId] } } };
}

export function recordUnitReveal(state: LearnerState, exerciseId: string): LearnerState {
  const active = state.journey.active;
  if (!active || !active.missed.includes(exerciseId)) throw new Error('No missed question to reveal');
  if (active.revealed.includes(exerciseId)) return state;
  return { ...state, journey: { ...state.journey, active: { ...active, revealed: [...active.revealed, exerciseId] } } };
}

export function advanceUnit(state: LearnerState, unit: LearningUnit): LearnerState {
  const active = state.journey.active;
  const step = currentUnitStep(state, unit);
  if (!active) throw new Error('No active unit');
  if (step.phase === 'complete') return state;
  if (step.phase === 'question' && !state.attempts.some(a => a.exerciseId === step.exerciseId && a.at >= active.startedAt)) {
    throw new Error('Answer the question before advancing');
  }
  if (step.phase === 'review' && !active.recovered.includes(step.exerciseId) && !active.revealed.includes(step.exerciseId)) {
    throw new Error('Try the missed question or view its answer');
  }
  const moved = setUnitScreen(state, unit.id, active.screenIndex + 1);
  return currentUnitStep(moved, unit).phase === 'complete' ? completeUnit(moved, unit) : moved;
}

export function completeUnit(state: LearnerState, unit: LearningUnit): LearnerState {
  if (isUnitComplete(state, unit)) return state;
  const active = state.journey.active;
  if (!active || active.unitId !== unit.id || active.screenIndex !== unit.exerciseIds.length + active.missed.length + 1 || !unit.exerciseIds.length ||
      !unit.exerciseIds.every(id => state.attempts.some(a => a.exerciseId === id && a.at >= active.startedAt)) ||
      !active.missed.every(id => active.recovered.includes(id) || active.revealed.includes(id))) {
    throw new Error('Complete every question before finishing the unit');
  }
  return { ...state, journey: { ...state.journey, completedUnits: [...state.journey.completedUnits, unit.id] } };
}

export function earnedUnitXp(state: LearnerState, unit: LearningUnit): number {
  const active = state.journey.active;
  if (!active || active.unitId !== unit.id) return 0;
  const points = { beginner: 10, intermediate: 15, advanced: 20, exam: 25 };
  return unit.exerciseIds.reduce((total, id) => {
    const earned = state.attempts.find(a => a.exerciseId === id && a.at >= active.startedAt && a.correct && a.attempts === 1 && !a.hintUsed);
    return total + (earned && state.completed.includes(id) ? points[earned.difficulty] : 0);
  }, 0);
}

export function getResumeUnit(state: LearnerState, units: readonly LearningUnit[]): LearningUnit | undefined {
  const active = units.find(unit => unit.id === state.journey.active?.unitId && !isUnitComplete(state, unit));
  return active ?? units.find(unit => !isUnitComplete(state, unit));
}
