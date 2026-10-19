import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons, exercises } from './index.ts';
import { validateContent } from '../../scripts/validate-content.mjs';

test('the initial course covers each of weeks 1–7 with a non-padding exercise bank', () => {
  assert.deepEqual([...new Set(lessons.map(l => l.week))].sort(), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(exercises.length, 52);
  assert.deepEqual([...new Set(exercises.map(e => e.type))].sort(), ['bug', 'choice', 'complete', 'error', 'fix', 'memory', 'misconception', 'multipart', 'order', 'predict', 'program', 'trace']);
});
test('lessons and exercise records pass the real validator', () => {
  assert.deepEqual(validateContent(lessons, exercises), []);
});
test('every adapted or derived item has a located primary course source', () => {
  for (const e of exercises) {
    assert.match(e.provenance.reference, /(?:Course Guide|Exercises Book|Preparation Test|Lecture 0[4-7]), (?:p\.|§)/);
  }
});
