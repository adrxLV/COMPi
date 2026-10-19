import { pathToFileURL } from 'node:url';

const types = new Set(['choice', 'predict', 'bug', 'fix', 'complete', 'program', 'order', 'trace', 'error', 'multipart', 'misconception', 'memory']);
const difficulties = new Set(['beginner', 'intermediate', 'advanced', 'exam']);
const text = value => typeof value === 'string' && value.trim().length > 0;
const strings = value => Array.isArray(value) && value.every(text);
const testsValid = value => Array.isArray(value) && value.length > 0 && value.every(t => t && strings(t.input) && typeof t.expectedOutput === 'string' && text(t.description));

export function validateContent(lessons, exercises) {
  const errors = [];
  const ids = new Set();
  const lessonIds = new Set();
  const statements = new Set();
  if (!Array.isArray(lessons) || !Array.isArray(exercises)) return ['lessons and exercises must be arrays'];
  for (const [kind, collection] of [['lesson', lessons], ['exercise', exercises]]) {
    for (const item of collection) {
      if (!item || !text(item.id)) { errors.push(`${kind} requires an id`); continue; }
      if (ids.has(item.id)) errors.push(`duplicate id ${item.id}`);
      ids.add(item.id);
      if (!Number.isInteger(item.week) || item.week < 1 || item.week > 7) errors.push(`${item.id}: week must be 1–7`);
      if (!strings(item.prerequisites)) errors.push(`${item.id}: prerequisites must be strings`);
      if (kind === 'lesson') {
        lessonIds.add(item.id);
        for (const field of ['title', 'concept', 'explanation', 'example']) if (!text(item[field])) errors.push(`${item.id}: missing ${field}`);
        if (!strings(item.exerciseIds) || item.exerciseIds.length === 0) errors.push(`${item.id}: exerciseIds required`);
      } else {
        for (const field of ['topic', 'subtopic', 'statement', 'explanation']) if (!text(item[field])) errors.push(`${item.id}: missing ${field}`);
        if (text(item.statement)) {
          const key = item.statement.trim().toLowerCase();
          if (statements.has(key)) errors.push(`${item.id}: duplicate statement`);
          statements.add(key);
        }
        if (!types.has(item.type)) errors.push(`${item.id}: invalid type`);
        if (!difficulties.has(item.difficulty)) errors.push(`${item.id}: invalid difficulty`);
        if (!strings(item.objectives) || !item.objectives.length) errors.push(`${item.id}: objectives required`);
        if (!strings(item.hints) || !item.hints.length) errors.push(`${item.id}: hints required`);
        if (!strings(item.misconceptions) || !item.misconceptions.length) errors.push(`${item.id}: misconceptions required`);
        if (!Number.isInteger(item.reviewDays) || item.reviewDays < 1) errors.push(`${item.id}: positive reviewDays required`);
        if (!item.provenance || !['source-derived', 'adapted', 'newly-authored'].includes(item.provenance.kind) || !text(item.provenance.reference)) errors.push(`${item.id}: provenance kind and reference required`);
        else if (item.provenance.kind !== 'newly-authored' && !/(?:p\.\s*\d+|§\s*\d+)/.test(item.provenance.reference)) errors.push(`${item.id}: source location (page or section) required`);
        if (item.referenceInput !== undefined && (!Array.isArray(item.referenceInput) || !item.referenceInput.every(value => typeof value === 'string'))) errors.push(`${item.id}: referenceInput must be a string array`);
        if (['choice', 'misconception'].includes(item.type)) {
          if (!strings(item.options) || item.options.length < 2 || !/^(0|[1-9]\d*)$/.test(item.answer) || Number(item.answer) >= item.options.length) errors.push(`${item.id}: answer must be a valid options index string`);
        } else if (item.type === 'bug') {
          if (!text(item.code) || !Array.isArray(item.answer) || !item.answer.length || !item.answer.every(n => Number.isInteger(n) && n >= 1 && n <= item.code.split('\n').length)) errors.push(`${item.id}: bug answer must be in-range number[] line numbers`);
        } else if (item.type === 'order') {
          if (!strings(item.options) || !Array.isArray(item.answer) || item.answer.length !== item.options.length || new Set(item.answer).size !== item.options.length || item.answer.some(a => !item.options.includes(a))) errors.push(`${item.id}: order answer must be a permutation of options (string[])`);
        } else if (item.type === 'multipart') {
          if (!Array.isArray(item.parts) || !item.parts.length || item.parts.some(p => !p || !text(p.prompt) || !text(p.answer))) errors.push(`${item.id}: multipart requires answered parts`);
        } else if (['fix', 'complete', 'program'].includes(item.type)) {
          if (!text(item.starter) || !testsValid(item.tests)) errors.push(`${item.id}: runnable code requires starter and tests`);
        } else if (['predict', 'error', 'trace', 'memory'].includes(item.type) && !text(item.answer)) errors.push(`${item.id}: answer must be a string`);
      }
    }
  }
  const exercisesById = new Map(exercises.filter(e => e?.id).map(e => [e.id, e]));
  const covered = new Set();
  for (const lesson of lessons) {
    for (const id of lesson.exerciseIds ?? []) {
      if (!exercisesById.has(id)) errors.push(`${lesson.id}: missing exercise ${id}`);
      else if (exercisesById.get(id).week !== lesson.week) errors.push(`${lesson.id}: exercise ${id} has mismatched week`);
      if (covered.has(id)) errors.push(`${lesson.id}: exercise ${id} linked twice`);
      covered.add(id);
    }
    for (const id of lesson.prerequisites ?? []) if (!lessonIds.has(id)) errors.push(`${lesson.id}: unknown lesson prerequisite ${id}`);
  }
  for (const exercise of exercises) {
    if (!covered.has(exercise.id)) errors.push(`${exercise.id}: unlinked exercise`);
    for (const id of exercise.prerequisites ?? []) if (!lessonIds.has(id)) errors.push(`${exercise.id}: unknown lesson prerequisite ${id}`);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { lessons, exercises } = await import('../src/content/index.ts');
    const errors = validateContent(lessons, exercises);
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
    else console.log(`Validated ${lessons.length} lessons, ${exercises.length} exercises, weeks ${[...new Set(exercises.map(e => e.week))].sort().join(', ')}.`);
  } catch (error) { console.error(error); process.exitCode = 1; }
}
