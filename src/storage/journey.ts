import type { LearnerState, LearningUnit } from '../contracts';

// Journey completion is navigation history, not a substitute for independent mastery.
// Only applyAttempt may award XP or add independently completed exercise IDs.
export function isUnitComplete(state: LearnerState, unit: LearningUnit): boolean {
  return state.journey.completedUnits.includes(unit.id);
}

export function beginUnit(state: LearnerState, unit: LearningUnit, at = Date.now()): LearnerState {
  if (state.journey.active?.unitId === unit.id && !isUnitComplete(state, unit)) return state;
  if (!unit.id || !unit.exerciseIds.length || !Number.isFinite(at) || at < 0) throw new Error('Invalid unit or start time');
  return { ...state, journey: { ...state.journey, active: { unitId: unit.id, screenIndex: 0, startedAt: at, missed: [], recovered: [] } } };
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

export function completeUnit(state: LearnerState, unit: LearningUnit): LearnerState {
  if (isUnitComplete(state, unit)) return state;
  const active = state.journey.active;
  if (!active || active.unitId !== unit.id || active.screenIndex !== unit.exerciseIds.length + 1 || !unit.exerciseIds.length ||
      !unit.exerciseIds.every(id => state.completed.includes(id) || state.attempts.some(a => a.exerciseId === id && a.correct && a.at >= active.startedAt))) {
    throw new Error('Complete every question before finishing the unit');
  }
  return { ...state, journey: { ...state.journey, completedUnits: [...state.journey.completedUnits, unit.id] } };
}

export function getResumeUnit(state: LearnerState, units: readonly LearningUnit[]): LearningUnit | undefined {
  const active = units.find(unit => unit.id === state.journey.active?.unitId && !isUnitComplete(state, unit));
  return active ?? units.find(unit => !isUnitComplete(state, unit));
}
