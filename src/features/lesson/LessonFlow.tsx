import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, ArrowCounterClockwise } from '@phosphor-icons/react';
import type { Answer } from '../../assessment/grade';
import type { Exercise, LearningUnit, RuntimeResponse, TeachingStep } from '../../contracts';
import { ExerciseInput } from './ExerciseInput';
import './lesson.css';

export type LessonFlowProps = {
  unit: LearningUnit;
  exercise?: Exercise;
  screenIndex: number;
  answer: Answer;
  code: string;
  feedback: 'correct' | 'incorrect' | null;
  hint: boolean;
  running: boolean;
  runtime: RuntimeResponse | null;
  xpEarned: number;
  answerXpEarned: number;
  onAnswer(v: Answer): void;
  onCode(v: string): void;
  onHint(): void;
  onSubmit(): void;
  onAdvance(): void;
  onBack(): void;
  onExit(): void;
  onRetry(): void;
};

function IdentityDiagram({ step }: { step: TeachingStep }) {
  const objects = [...new Set(step.bindings.map(binding => binding.objectId))];
  return <div className="lesson-diagram" aria-label="Names and object identity">
    <div className="lesson-diagram-names"><strong>Names</strong>{step.bindings.map(binding =>
      <div className="lesson-binding" key={binding.name}><code>{binding.name}</code><span aria-hidden="true">→</span><span>object {binding.objectId}</span></div>
    )}</div>
    <div className="lesson-diagram-objects"><strong>Objects</strong>{objects.map(id => {
      const value = step.bindings.find(binding => binding.objectId === id)?.value;
      return <div className="lesson-object" key={id}><small>object {id}</small><code>{value}</code></div>;
    })}</div>
    <p className="lesson-diagram-note">Names with the same object label refer to the same object.</p>
  </div>;
}

export function LessonFlow({ unit, exercise, screenIndex, answer, code, feedback, hint, running, runtime, xpEarned, answerXpEarned,
  onAnswer, onCode, onHint, onSubmit, onAdvance, onBack, onExit, onRetry }: LessonFlowProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  useEffect(() => { setStepIndex(0); setReviewing(false); }, [unit.id, screenIndex]);
  const questionCount = unit.exerciseIds.length;
  const complete = screenIndex === questionCount + 1 && !reviewing;
  const teaching = screenIndex === 0 || reviewing;
  const stepCount = unit.teachingSteps?.length ?? 0;
  const currentStep = unit.teachingSteps?.[Math.min(stepIndex, stepCount - 1)];
  const progress = Math.max(0, Math.min(screenIndex, questionCount + 1));

  return <section className="lesson-flow" aria-label={`${unit.title} lesson`}>
    <header className="lesson-flow-header">
      <button type="button" className="text-button" onClick={onExit}><ArrowLeft size={18}/> Back to path</button>
      <div className="lesson-progress-label"><span>Week {unit.week} · {unit.title}</span><strong>{reviewing ? 'Review' : teaching ? 'Learn' : complete ? 'Complete' : `Question ${screenIndex} of ${questionCount}`}</strong></div>
      <progress className="progress lesson-progress" max={questionCount + 1} value={progress} aria-label="Lesson progress"/>
      <span className="sr-only">{progress} of {questionCount + 1} screens completed</span>
    </header>

    {teaching && <article className="lesson-screen lesson-teaching">
      <span className="eyebrow">Learn the idea</span>
      <h1>{unit.title}</h1><p className="lesson-objective">Goal: {unit.objective}</p>
      <div className="lesson-copy"><p>{unit.explanation}</p><pre className="code"><code>{unit.example}</code></pre></div>
      {currentStep && <section className="lesson-step" aria-label="Interactive example">
        <div className="lesson-step-heading"><h2>See what changes</h2><span>Step {stepIndex + 1} of {stepCount}</span></div>
        <p aria-live="polite">{currentStep.caption}</p>
        <pre className="code"><code>{currentStep.code}</code></pre>
        <IdentityDiagram step={currentStep}/>
        <div className="lesson-step-controls">
          <button type="button" className="button button-ghost" disabled={stepIndex === 0} onClick={() => setStepIndex(i => i - 1)}>Previous step</button>
          <button type="button" className="button button-ghost" disabled={stepIndex >= stepCount - 1} onClick={() => setStepIndex(i => i + 1)}>Next step <ArrowRight size={17}/></button>
        </div>
      </section>}
      <div className="lesson-actions"><button type="button" className="button button-primary" onClick={reviewing ? () => setReviewing(false) : onAdvance}>{reviewing ? 'Return to question' : 'Continue to question 1'} <ArrowRight size={18}/></button></div>
    </article>}

    {!teaching && !complete && exercise && <article className="lesson-screen lesson-question" key={exercise.id}>
      <span className="eyebrow">{exercise.type.replace('-', ' ')} · {exercise.difficulty}</span>
      <h1>{exercise.statement}</h1>
      {exercise.code && exercise.type !== 'bug' && <pre className="code"><code>{exercise.code}</code></pre>}
      <ExerciseInput exercise={exercise} value={answer} onChange={onAnswer} code={code} onCode={onCode} disabled={feedback === 'correct' || running}/>
      {hint && feedback === null && <p className="hint" role="status">Hint: {exercise.hints[0] ?? 'Review the teaching example and try again.'}</p>}
      {feedback === null && <div className="lesson-actions">
        <button type="button" className="button button-ghost" onClick={onBack}>Back</button>
        <button type="button" className="button button-ghost" onClick={() => setReviewing(true)}>Review teaching</button>
        <button type="button" className="button button-ghost" onClick={onHint} disabled={hint || running}>Show a hint</button>
        <button type="button" className="button button-primary" onClick={onSubmit} disabled={running}>{running ? 'Checking…' : 'Check answer'} <ArrowRight size={18}/></button>
      </div>}
      {feedback && <section className={`lesson-feedback ${feedback}`} role="status" aria-live="polite">
        <h2>{feedback === 'correct' ? 'That’s right.' : 'Not quite. Try again.'}</h2>
        <p>{exercise.explanation}</p>
        {runtime?.error && <p className="lesson-runtime-error">{runtime.error}</p>}
        {runtime?.cases?.length ? <div className="lesson-case-results"><strong>Test cases</strong><ul>{runtime.cases.map((result, i) =>
          <li key={i}>{result.passed ? '✓' : '✗'} {result.description}: expected {result.expected}, got {result.actual}{result.error ? ` (${result.error})` : ''}</li>
        )}</ul></div> : null}
        {feedback === 'correct' && answerXpEarned > 0 && <p className="lesson-reward">+{answerXpEarned} XP earned</p>}
        <div className="lesson-actions">
          <button type="button" className="button button-ghost" onClick={() => setReviewing(true)}>Review teaching</button>
          {feedback === 'incorrect'
            ? <button type="button" className="button button-primary" onClick={onRetry}><ArrowCounterClockwise size={18}/> Try again</button>
            : <button type="button" className="button button-primary" onClick={onAdvance}>{screenIndex === questionCount ? 'Finish lesson' : `Continue to question ${screenIndex + 1}`} <ArrowRight size={18}/></button>}
        </div>
      </section>}
    </article>}

    {!teaching && !complete && !exercise && <div className="lesson-screen" role="alert"><p>This question is unavailable. Return to the path and try again.</p><button type="button" className="button" onClick={onExit}>Back to path</button></div>}

    {complete && <article className="lesson-screen lesson-complete">
      <CheckCircle size={48} weight="duotone" aria-hidden="true"/>
      <span className="eyebrow">Lesson finished</span>
      <h1>Lesson complete</h1>
      <p>You have worked through {unit.title}. Return to the path to choose what to practise next.</p>
      {xpEarned > 0 && <p className="lesson-reward">+{xpEarned} XP earned</p>}
      <div className="lesson-actions"><button type="button" className="button button-ghost" onClick={() => setReviewing(true)}>Review teaching</button><button type="button" className="button button-primary" onClick={onExit}>Back to path <ArrowRight size={18}/></button></div>
    </article>}
  </section>;
}

export default LessonFlow;
