import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContent } from '../../scripts/validate-content.mjs';

const exercise = (overrides = {}) => ({
  id: 'w1-a', week: 1, topic: 'Programs', subtopic: 'errors', prerequisites: [],
  objectives: ['Distinguish an error'], difficulty: 'beginner', type: 'choice',
  statement: 'Which kind?', options: ['syntax', 'runtime'], answer: '0',
  hints: ['Check the parser'], explanation: 'The parser rejects it.', misconceptions: ['All errors happen at runtime'],
  provenance: { kind: 'newly-authored', reference: 'Course Guide, p. 5, week 1' }, reviewDays: 1,
  ...overrides,
});
const lesson = (overrides = {}) => ({ id: 'l1', week: 1, title: 'Errors', concept: 'Errors', explanation: 'Three kinds.', example: 'print(1)', exerciseIds: ['w1-a'], prerequisites: [], ...overrides });

test('valid linked lesson and indexed choice passes', () => {
  assert.deepEqual(validateContent([lesson()], [exercise()]), []);
});
test('rejects a duplicate ID and broken lesson link', () => {
  const errors = validateContent([lesson({ exerciseIds: ['missing'] })], [exercise(), exercise()]);
  assert.match(errors.join('\n'), /duplicate.*w1-a/i);
  assert.match(errors.join('\n'), /missing/);
});
test('rejects malformed indexed answers and wrong-type answers', () => {
  const errors = validateContent([lesson()], [exercise({ answer: '2' }), exercise({ id: 'w1-b', type: 'bug', options: undefined, code: 'print(1)', answer: '1' })]);
  assert.match(errors.join('\n'), /index/i);
  assert.match(errors.join('\n'), /number\[\]/i);
});
test('requires runnable code tests and nonempty provenance reference', () => {
  const errors = validateContent([lesson()], [exercise({ type: 'program', options: undefined, answer: undefined, tests: undefined, provenance: { kind: 'adapted', reference: '' } })]);
  assert.match(errors.join('\n'), /tests/i);
  assert.match(errors.join('\n'), /reference/i);
});
test('adapted and source-derived items need a precise source location', () => {
  const errors = validateContent([lesson()], [exercise({ provenance: { kind: 'adapted', reference: 'Exercises Book' } })]);
  assert.match(errors.join('\n'), /source location/i);
});
test('rejects duplicate prompts and out-of-range weeks', () => {
  const errors = validateContent([lesson()], [exercise({ week: 8 }), exercise({ id: 'w2-b', statement: 'Which kind?' })]);
  assert.match(errors.join('\n'), /week/i);
  assert.match(errors.join('\n'), /duplicate statement/i);
});
