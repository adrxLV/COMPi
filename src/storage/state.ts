import Dexie, { type Table } from 'dexie';
import type { Exercise, LearnerState, Attempt } from '../contracts';

class LearningDatabase extends Dexie {
  profiles!: Table<{ id: string; state: LearnerState }, string>;
  constructor() { super('python-pathway'); this.version(1).stores({ profiles: 'id' }); }
}
const db = new LearningDatabase();
export const defaultState = (): LearnerState => ({ version: 1, nickname: '', confidence: 'beginner', xp: 0, completed: [], attempts: [], drafts: {}, exams: {}, preferences: { reducedMotion: false } });
export async function loadState(): Promise<LearnerState> {
  try { return (await db.profiles.get('learner'))?.state ?? defaultState(); }
  catch (error) { console.warn('IndexedDB unavailable', error); return defaultState(); }
}
export async function saveState(state: LearnerState): Promise<boolean> {
  try { await db.profiles.put({ id: 'learner', state }); return true; }
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
export function importState(text: string): LearnerState {
  const x: unknown = JSON.parse(text);
  if (!x || typeof x !== 'object') throw new Error('Not a progress backup');
  const value = x as Record<string, unknown>;
  if (value.version !== 1 || typeof value.xp !== 'number' || !Number.isFinite(value.xp) || value.xp < 0 || !Array.isArray(value.completed) || !value.completed.every(v => typeof v === 'string') || !Array.isArray(value.attempts) || !value.attempts.every(a => a && typeof a.exerciseId === 'string' && typeof a.correct === 'boolean' && typeof a.at === 'number') || !value.drafts || typeof value.drafts !== 'object' || !value.exams || typeof value.exams !== 'object' || !value.preferences || typeof value.preferences !== 'object' || typeof value.nickname !== 'string') throw new Error('Unsupported or corrupt progress backup');
  return value as unknown as LearnerState;
}
