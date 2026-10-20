import type { Exercise } from '../../contracts';

/** Render the stored key, not a guessed semantic answer. */
export function modelAnswer(exercise: Exercise): string {
  if (['fix', 'complete', 'program'].includes(exercise.type)) return exercise.solution ?? exercise.explanation;
  if (exercise.type === 'multipart') return (exercise.parts ?? []).map(part => `${part.prompt}: ${part.answer}`).join('\n');
  const answer = exercise.answer;
  if (exercise.type === 'bug' && Array.isArray(answer)) return `Line${answer.length === 1 ? '' : 's'} ${answer.join(', ')}`;
  if ((exercise.type === 'choice' || exercise.type === 'misconception') && answer !== undefined) {
    return (Array.isArray(answer) ? answer : [answer]).map(index => exercise.options?.[Number(index)] ?? String(index)).join('\n');
  }
  return Array.isArray(answer) ? answer.join('\n') : String(answer ?? '');
}
