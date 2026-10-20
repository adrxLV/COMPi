import type { Exercise, LearnerState } from '../../contracts';

export type PracticeFilters = { search: string; week: string; type: string; status: 'all' | 'unattempted' };

/** An incorrect or hinted try still counts as attempted; this is not a mastery filter. */
export function filterPracticeExercises(exercises: readonly Exercise[], state: LearnerState, filters: PracticeFilters): Exercise[] {
  const attempted = new Set(state.attempts.map(a => a.exerciseId));
  const search = filters.search.trim().toLocaleLowerCase('en-GB');
  return exercises.filter(e =>
    (filters.week === 'all' || String(e.week) === filters.week) &&
    (filters.type === 'all' || e.type === filters.type) &&
    (filters.status === 'all' || !attempted.has(e.id)) &&
    `${e.statement} ${e.topic} ${e.subtopic}`.toLocaleLowerCase('en-GB').includes(search));
}
