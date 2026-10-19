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
});
