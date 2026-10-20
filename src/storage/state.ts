import Dexie, { type Table } from 'dexie';
import type { Exercise, LearnerState, Attempt, LearningUnit, Difficulty } from '../contracts';
import { learningUnits } from '../content/learning';

class LearningDatabase extends Dexie {
  profiles!: Table<{ id: string; state: unknown }, string>;
  constructor() { super('python-pathway'); this.version(1).stores({ profiles: 'id' }); }
}
const db = new LearningDatabase();
export const defaultState = (): LearnerState => ({ version: 2, nickname: '', confidence: 'beginner', xp: 0, completed: [], attempts: [], drafts: {}, exams: {}, preferences: { reducedMotion: false }, journey: { completedUnits: [] } });

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');
const finiteNonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const integerNonnegative = (value: unknown): value is number => finiteNonnegative(value) && Number.isSafeInteger(value);
const difficulties: readonly Difficulty[] = ['beginner', 'intermediate', 'advanced', 'exam'];
const difficulty = (value: unknown): value is Difficulty => difficulties.includes(value as Difficulty);
const stringRecord = (value: unknown): value is Record<string, string> => record(value) && Object.values(value).every(item => typeof item === 'string');
const validAttempt = (value: unknown): value is Attempt => record(value) && typeof value.exerciseId === 'string' && integerNonnegative(value.at) && typeof value.correct === 'boolean' && Number.isSafeInteger(value.attempts) && (value.attempts as number) >= 1 && difficulty(value.difficulty) && typeof value.hintUsed === 'boolean';

function validCommon(value: Record<string, unknown>): boolean {
  return typeof value.nickname === 'string' && difficulty(value.confidence) && finiteNonnegative(value.xp) &&
    strings(value.completed) && Array.isArray(value.attempts) && value.attempts.every(validAttempt) &&
    stringRecord(value.drafts) && record(value.exams) && record(value.preferences) &&
    typeof value.preferences.reducedMotion === 'boolean';
}

function validJourney(value: unknown, units: readonly LearningUnit[]): boolean {
  if (!record(value) || !strings(value.completedUnits)) return false;
  if (value.active === undefined) return true;
  const active = value.active;
  if (!record(active) || typeof active.unitId !== 'string' || !active.unitId || !integerNonnegative(active.screenIndex) ||
    !integerNonnegative(active.startedAt) || !strings(active.missed) || !strings(active.recovered)) return false;
  const missed = active.missed as string[];
  if (!active.recovered.every(id => missed.includes(id))) return false;
  const unit = units.find(u => u.id === active.unitId);
  return !unit || (active.screenIndex as number) <= unit.exerciseIds.length + 1;
}

/** Validate before copying any backup or stored profile into live state. */
export function migrateState(value: unknown, units: readonly LearningUnit[] = learningUnits): LearnerState {
  if (!record(value) || (value.version !== 1 && value.version !== 2) || !validCommon(value) ||
    (value.version === 2 && !validJourney(value.journey, units))) throw new Error('Unsupported or corrupt progress backup');
  if (value.version === 2) return value as LearnerState;
  const completed = new Set(value.completed as string[]);
  return { ...value, version: 2, journey: {
    completedUnits: units.filter(unit => unit.exerciseIds.length > 0 && unit.exerciseIds.every(id => completed.has(id))).map(unit => unit.id),
  } } as LearnerState;
}

export async function loadState(): Promise<LearnerState> {
  let stored: unknown;
  try { stored = (await db.profiles.get('learner'))?.state; }
  catch (error) { console.warn('IndexedDB unavailable', error); return defaultState(); }
  if (stored === undefined) return defaultState();
  const migrated = migrateState(stored); // Corrupt stored progress must not be silently reset and overwritten.
  if ((stored as { version?: unknown }).version === 1) await saveState(migrated);
  return migrated;
}
export async function saveState(state: LearnerState): Promise<boolean> {
  try { migrateState(state); await db.profiles.put({ id: 'learner', state }); return true; }
  catch (error) { console.warn('Progress could not be saved', error); return false; }
}
export function applyAttempt(state: LearnerState, exercise: Exercise, correct: boolean, hintUsed: boolean, attempts: number, at = Date.now()): LearnerState {
  const independent = correct && !hintUsed && attempts === 1;
  const earned = independent && !state.completed.includes(exercise.id) ? ({ beginner: 10, intermediate: 15, advanced: 20, exam: 25 }[exercise.difficulty]) : 0;
  const attempt: Attempt = { exerciseId: exercise.id, at, correct, attempts, difficulty: exercise.difficulty, hintUsed };
  return { ...state, xp: state.xp + earned, completed: earned ? [...state.completed, exercise.id] : state.completed, attempts: [...state.attempts, attempt] };
}
export function dueExerciseIds(state: LearnerState, now = Date.now()): string[] {
  const last = new Map<string, Attempt>(); for (const attempt of state.attempts) last.set(attempt.exerciseId, attempt);
  return [...last.values()].filter(a => !a.correct || a.hintUsed || a.attempts > 1 || (now - a.at >= 86_400_000 * (a.difficulty === 'exam' ? 2 : 3))).map(a => a.exerciseId);
}
export function exportState(state: LearnerState): string { return JSON.stringify(state, null, 2); }
export function importState(text: string, units: readonly LearningUnit[] = learningUnits): LearnerState {
  return migrateState(JSON.parse(text) as unknown, units);
}
export { beginUnit, setUnitScreen, recordUnitMistake, recordUnitRecovery, completeUnit, isUnitComplete, getResumeUnit } from './journey';
