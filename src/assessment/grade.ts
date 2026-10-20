import type { Exercise } from '../contracts';
export type Answer = string | string[] | number[];
const text = (s: string) => s.replace(/\r\n/g, '\n').replace(/\n$/, '');
// Error-class questions ask for a concept, unlike exact-output predictions.
const errorName = (s: string) => s.trim().toLowerCase().replace(/[.!?]+$/, '').trim()
  .replace(/^(?:(?:it is|it's|this is|an?|the)\s+)+/, '').replace(/[\s_-]+/g, '');
export function gradeFixed(exercise: Exercise, answer: Answer): boolean {
  if (exercise.type === 'multipart') return Array.isArray(answer) && !!exercise.parts && answer.length === exercise.parts.length && exercise.parts.every((part,i) => [part.answer, ...(part.acceptedAnswers ?? [])].some(key => text(String(answer[i]).trim()) === text(key.trim())));
  const expected = exercise.answer;
  if (expected === undefined) return false;
  if (Array.isArray(expected)) {
    if (!Array.isArray(answer) || expected.length !== answer.length) return false;
    if (exercise.type === 'order') return expected.every((v,i) => v === answer[i]);
    return [...expected].map(String).sort().join('\u0000') === [...answer].map(String).sort().join('\u0000');
  }
  return typeof answer === 'string' && (exercise.type === 'error'
    ? errorName(answer) === errorName(String(expected))
    : text(answer) === text(expected));
}
