import { Suspense, lazy } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import type { Exercise } from '../../contracts';
import type { Answer } from '../../assessment/grade';

const Editor = lazy(() => import('../../CodeEditor'));

export type ExerciseInputProps = {
  exercise: Exercise;
  value: Answer;
  onChange: (v: Answer) => void;
  code: string;
  onCode: (v: string) => void;
  disabled: boolean;
};

/** Shared input used by lessons, practice and exams; grading stays with the caller. */
export function ExerciseInput({ exercise: e, value, onChange, code, onCode, disabled }: ExerciseInputProps) {
  if (['fix', 'complete', 'program'].includes(e.type)) return <div>
    {disabled ? <pre className="code" aria-label="Submitted Python code"><code>{code}</code></pre>
      : <Suspense fallback={<p>Loading editor…</p>}><Editor value={code} onChange={onCode}/></Suspense>}
    <p className="source-note">Your code is checked against multiple input/output cases in real Python.</p>
  </div>;

  if (e.type === 'choice' || e.type === 'misconception') {
    const multi = Array.isArray(e.answer);
    const selected = Array.isArray(value) ? value.map(String) : [];
    return <div className="options" role="group" aria-label="Answer options">{e.options?.map((option, i) => {
      const id = String(i);
      const checked = multi ? selected.includes(id) : value === id;
      return <label className={`option ${checked ? 'selected' : ''}`} key={id}>
        <input type={multi ? 'checkbox' : 'radio'} name={e.id} disabled={disabled} checked={checked}
          onChange={() => onChange(multi ? (checked ? selected.filter(x => x !== id) : [...selected, id]) : id)}/>
        <span>{option}</span>
      </label>;
    })}</div>;
  }

  if (e.type === 'bug') {
    const selected = Array.isArray(value) ? value.map(Number) : [];
    return <div className="bug-lines" role="group" aria-label="Select lines containing bugs">{(e.code ?? '').split('\n').map((line, i) => {
      const number = i + 1;
      return <label className="bug-line" key={number}>
        <input type="checkbox" disabled={disabled} checked={selected.includes(number)} onChange={() => onChange(selected.includes(number) ? selected.filter(x => x !== number) : [...selected, number])}/>
        <code>{String(number).padStart(2, '0')} {line}</code>
      </label>;
    })}</div>;
  }

  if (e.type === 'order') {
    const lines = Array.isArray(value) && value.length ? value as string[] : e.options ?? [];
    const move = (from: number, to: number) => {
      const next = [...lines];
      [next[from], next[to]] = [next[to], next[from]];
      onChange(next);
    };
    return <div className="order-lines" role="group" aria-label="Reorder lines">{lines.map((line, i) => <div key={`${line}-${i}`}>
      <code>{line}</code>
      <button type="button" aria-label={`Move line ${i + 1} up`} disabled={disabled || i === 0} onClick={() => move(i, i - 1)}><CaretUp size={18}/></button>
      <button type="button" aria-label={`Move line ${i + 1} down`} disabled={disabled || i === lines.length - 1} onClick={() => move(i, i + 1)}><CaretDown size={18}/></button>
    </div>)}</div>;
  }

  if (e.type === 'multipart') return <div className="multipart">{e.parts?.map((part, i) => <label key={i}>
    {part.prompt}<input disabled={disabled} value={Array.isArray(value) ? String(value[i] ?? '') : ''}
      onChange={event => { const answers = Array.isArray(value) ? [...value].map(String) : []; answers[i] = event.target.value; onChange(answers); }}/>
  </label>)}</div>;

  return <label className="answer-label">Your answer
    {e.type === 'predict'
      ? <textarea rows={4} disabled={disabled} value={String(value)} onChange={event => onChange(event.target.value)} placeholder="Write the exact printed output"/>
      : <input disabled={disabled} value={String(value)} onChange={event => onChange(event.target.value)} placeholder="Type your answer"/>}
  </label>;
}

export default ExerciseInput;
