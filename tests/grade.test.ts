import { describe, it, expect } from 'vitest';
import { gradeFixed } from '../src/assessment/grade';
import type { Exercise } from '../src/contracts';
const item = (type: Exercise['type'], answer: Exercise['answer']) => ({ type, answer } as Exercise);
describe('fixed grading', () => {
 it('grades single and multiple choice without order dependence', () => {
  expect(gradeFixed(item('choice', '1'), '1')).toBe(true);
  expect(gradeFixed(item('choice', ['0','2']), ['2','0'])).toBe(true);
  expect(gradeFixed(item('choice', ['0','2']), ['0'])).toBe(false);
 });
 it('normalises line endings but preserves meaningful output whitespace', () => {
  expect(gradeFixed(item('predict', 'hello\nworld'), 'hello\r\nworld\n')).toBe(true);
  expect(gradeFixed(item('predict', 'hello world'), 'hello  world')).toBe(false);
 });
 it('checks ordered lines, faulty lines and multipart answers', () => {
  expect(gradeFixed(item('order', ['a','b']), ['a','b'])).toBe(true);
  expect(gradeFixed(item('order', ['a','b']), ['b','a'])).toBe(false);
  expect(gradeFixed(item('bug', [2,4]), [4,2])).toBe(true);
  const multi = { type:'multipart', parts:[{prompt:'a',answer:'7'},{prompt:'b',answer:'x'}] } as Exercise;
  expect(gradeFixed(multi, ['7','x'])).toBe(true);
 });
 it('accepts equivalent names for Python error classes without relaxing printed output', () => {
  const syntax = item('error', 'SyntaxError');
  for (const answer of ['syntax error', 'SyntaxError', 'a syntax error', 'It is a syntax error.', '  SYNTAX ERROR  ']) {
   expect(gradeFixed(syntax, answer)).toBe(true);
  }
  expect(gradeFixed(syntax, 'runtime error')).toBe(false);
  expect(gradeFixed(item('error', 'IndexError'), 'index error')).toBe(true);
  expect(gradeFixed(item('predict', 'SyntaxError'), 'syntax error')).toBe(false);
 });
 it('accepts authored alternative expressions in multipart repairs, not arbitrary expressions', () => {
  const exercise = { ...item('multipart', undefined), parts: [
   { prompt: 'Append', answer: 'names.append("Michael")', acceptedAnswers: ["names.append('Michael')"] },
   { prompt: 'Last', answer: 'names[-1]', acceptedAnswers: ['names[len(names) - 1]'] },
  ] } as unknown as Exercise;
  expect(gradeFixed(exercise, ["names.append('Michael')", 'names[len(names) - 1]'])).toBe(true);
  expect(gradeFixed(exercise, ["names.append('Michael')", 'names[0]'])).toBe(false);
 });
});
