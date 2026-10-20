import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LessonFlow from '../src/features/lesson/LessonFlow';
import { ExerciseInput } from '../src/features/lesson/ExerciseInput';
import type { Exercise, LearningUnit } from '../src/contracts';

const unit: LearningUnit = {
  id: 'names', week: 3, title: 'Names and objects', objective: 'Trace aliases',
  explanation: 'A name refers to an object.', example: 'a = [1]', exerciseIds: ['q1', 'q2'],
  teachingSteps: [
    { caption: 'Create a list', code: 'a = [1]', bindings: [{ name: 'a', objectId: 'list-1', value: '[1]' }] },
    { caption: 'Add an alias', code: 'b = a', bindings: [{ name: 'a', objectId: 'list-1', value: '[1]' }, { name: 'b', objectId: 'list-1', value: '[1]' }] },
  ],
};
const exercise: Exercise = {
  id: 'q1', week: 3, topic: 'Names', subtopic: 'Aliasing', prerequisites: [], objectives: [],
  difficulty: 'beginner', type: 'choice', statement: 'Which names refer to the same list?',
  options: ['a and b', 'neither'], answer: '0', hints: ['Look at the arrows.'],
  explanation: 'Both names point to one list.', misconceptions: [],
  provenance: { kind: 'newly-authored', reference: 'test' }, reviewDays: 1,
};
const callbacks = {
  onAnswer: vi.fn(), onCode: vi.fn(), onHint: vi.fn(), onSubmit: vi.fn(),
  onAdvance: vi.fn(), onBack: vi.fn(), onExit: vi.fn(), onRetry: vi.fn(), onReveal: vi.fn(),
};
function screen(screenIndex: number, overrides: Record<string, unknown> = {}) {
  return renderToStaticMarkup(<LessonFlow unit={unit} exercise={exercise} screenIndex={screenIndex}
    answer="" code="" feedback={null} hint={false} running={false} runtime={null}
    xpEarned={0} answerXpEarned={0} reviewIndex={0} reviewTotal={0} revealed={false} revealedCount={0} {...callbacks} {...overrides}/>);
}

describe('LessonFlow', () => {
  it('separates teaching from questions and shows the first diagram step', () => {
    const html = screen(0);
    expect(html).toContain('Trace aliases');
    expect(html).toContain('Create a list');
    expect(html).toContain('list-1');
    expect(html).not.toContain(exercise.statement);
    expect(html).toContain('Continue to question 1');
  });
  it('renders one question with persistent progress and no teaching copy', () => {
    const html = screen(1);
    expect(html).toContain(exercise.statement);
    expect(html).toContain('Question 1 of 2');
    expect(html).toContain('progress');
    expect(html).not.toContain(unit.explanation);
    expect(html).not.toContain('Continue to question 2');
  });
  it('explains a first-pass mistake and lets the learner continue to later questions', () => {
    const html = screen(1, { feedback: 'incorrect', runtime: { id: 'r', ok: false, stdout: '', stderr: '', cases: [{ description: 'sample', passed: false, expected: 'a', actual: 'b' }] } });
    expect(html).toContain('Try again');
    expect(html).toContain('Review teaching');
    expect(html).toContain(exercise.explanation);
    expect(html).toContain('sample');
    expect(html).toContain('Continue to question 2');
  });
  it('replays a missed question at the end with a way to reveal the answer', () => {
    const html = screen(3, { reviewIndex: 1, reviewTotal: 1, feedback: 'incorrect' });
    expect(html).toContain('Review 1 of 1');
    expect(html).toContain('Show answer');
    expect(html).not.toContain('Continue to question 4');
  });
  it('shows the real answer after giving up on review, then allows completion', () => {
    const html = screen(3, { reviewIndex: 1, reviewTotal: 1, revealed: true });
    expect(html).toContain('a and b');
    expect(html).toContain('Finish lesson');
  });
  it('advances after correct feedback and only shows real earned XP', () => {
    expect(screen(1, { feedback: 'correct', xpEarned: 0 })).not.toContain('XP earned');
    const html = screen(1, { feedback: 'correct', answerXpEarned: 12 });
    expect(html).toContain('Continue to question 2');
    expect(html).toContain('12 XP earned');
  });
  it('shows completion without a question, with no invented mastery or rewards', () => {
    const html = screen(3);
    expect(html).toContain('Lesson complete');
    expect(html).not.toContain(exercise.statement);
    expect(html).not.toContain('XP earned');
  });
  it('renders submitted code read-only instead of leaving the editor editable', () => {
    const html = renderToStaticMarkup(<ExerciseInput exercise={{ ...exercise, type: 'program' }} value="" onChange={vi.fn()} code="print('hello')" onCode={vi.fn()} disabled={true}/>);
    expect(html).toContain('print(&#x27;hello&#x27;)');
    expect(html).not.toContain('Loading editor');
  });
});
