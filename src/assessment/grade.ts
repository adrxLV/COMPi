import type { Exercise } from '../contracts';
export type Answer = string | string[] | number[];
const text = (s: string) => s.replace(/\r\n/g, '\n').replace(/\n$/, '');
export function gradeFixed(exercise: Exercise, answer: Answer): boolean {
  if (exercise.type === 'multipart') return Array.isArray(answer) && !!exercise.parts && answer.length === exercise.parts.length && exercise.parts.every((part,i) => text(String(answer[i]).trim()) === text(part.answer.trim()));
  const expected = exercise.answer;
  if (expected === undefined) return false;
  if (Array.isArray(expected)) {
    if (!Array.isArray(answer) || expected.length !== answer.length) return false;
    if (exercise.type === 'order') return expected.every((v,i) => v === answer[i]);
    return [...expected].map(String).sort().join('\u0000') === [...answer].map(String).sort().join('\u0000');
  }
  return typeof answer === 'string' && text(answer) === text(expected);
}
