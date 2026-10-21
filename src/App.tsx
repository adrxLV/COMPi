import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Path, Code, Target, Warning, Clock, ChartBar, Gear, Play, ArrowRight, ArrowLeft, Check, Download, Upload, ArrowCounterClockwise, Flag, Eye, Pause, DotsThreeOutline } from '@phosphor-icons/react';
import { exercises } from './content';
import { learningUnits } from './content/learning';
import { filterPracticeExercises } from './features/practice/filter';
import { LessonFlow } from './features/lesson/LessonFlow';
import { ExerciseInput } from './features/lesson/ExerciseInput';
import type { Exercise, LearnerState, RuntimeResponse, TraceFrame } from './contracts';
import { defaultState, loadState, saveState, applyAttempt, dueExerciseIds, exportState, importState, beginUnit, setUnitScreen, recordUnitMistake, recordUnitRecovery, recordUnitReveal, advanceUnit, currentUnitStep, earnedUnitXp, isUnitComplete } from './storage/state';
import { gradeFixed, type Answer } from './assessment/grade';
import { selectPracticePaper } from './assessment/exam';
import { estimateMastery, earnedAchievements, studyStreak } from './assessment/progression';
import { runPython, cancelPython } from './runtime/client';
const Editor = lazy(() => import('./CodeEditor'));
type View = 'path' | 'lesson' | 'practice' | 'traps' | 'playground' | 'settings';
const nav: { view: View; label: string; icon: typeof Path }[] = [
  { view:'path',label:'Learning path',icon:Path },
  { view:'practice',label:'Simulation & Practice',icon:Target },
  { view:'traps',label:'Python traps',icon:Warning },
  { view:'playground',label:'Playground',icon:Code },
  { view:'settings',label:'Settings',icon:Gear }
];
const findExercise = (id: string) => exercises.find(e => e.id === id);
const defaultCode = 'values = [1, 2, 3]\nalias = values\nalias.append(4)\nprint(values)';
function formatTime(s: number) { return `${Math.floor(Math.max(0,s)/60)}:${String(Math.max(0,s)%60).padStart(2,'0')}`; }
const computeSimuladoScore = (ids: string[], grades: Record<string, boolean>) => {
  let pts = 0;
  ids.forEach((id, idx) => {
    if (!grades[id]) return;
    if (idx < 3) pts += 1;
    else if (idx < 5) pts += 2.5;
    else if (idx < 6) pts += 2;
    else if (idx === 6) pts += 4;
    else pts += 3;
  });
  return pts;
};
const groupMeta = (index: number) => {
  if (index < 3) return { group: 1, name: 'Trace & Comprehension', points: '1 point', max: '3 points' };
  if (index < 5) return { group: 2, name: 'Find and Fix Bugs', points: '2.5 points', max: '5 points' };
  if (index < 6) return { group: 3, name: 'Complete the Program', points: '2 points', max: '2 points' };
  const g4Part = ['(a) Data Processing (4 pts)', '(b) Band Statistics (3 pts)', '(c) Tag Synthesis (3 pts)'][index - 6] || '';
  const g4Pts = ['4 points', '3 points', '3 points'][index - 6] || '3 points';
  return { group: 4, name: `Write the Program ${g4Part}`.trim(), points: g4Pts, max: '10 points' };
};
export default function App() {
 const [state,setState] = useState<LearnerState>(defaultState()); const [ready,setReady]=useState(false); const [saved,setSaved]=useState(true); const [loadError,setLoadError]=useState('');
 const [view,setView]=useState<View>('path'); const [lessonId,setLessonId]=useState<string>(''); const [exerciseId,setExerciseId]=useState('');
 const [origin,setOrigin]=useState<View>('practice');
 const [practiceTab,setPracticeTab]=useState<'simulation'|'unlimited'>('simulation');
 const [answer,setAnswer]=useState<Answer>(''); const [hint,setHint]=useState(false); const [feedback,setFeedback]=useState<'correct'|'incorrect'|null>(null); const [answerXp,setAnswerXp]=useState(0);
 const [filter,setFilter]=useState(''); const [weekFilter,setWeekFilter]=useState('all'); const [typeFilter,setTypeFilter]=useState('all'); const [statusFilter,setStatusFilter]=useState<'all'|'unattempted'>('all');
 const [code,setCode]=useState(defaultCode); const [inputs,setInputs]=useState(''); const [runtime,setRuntime]=useState<RuntimeResponse|null>(null); const [running,setRunning]=useState(false);
 const [frames,setFrames]=useState<TraceFrame[]>([]); const [frame,setFrame]=useState(0); const [playing,setPlaying]=useState(false); const [speed,setSpeed]=useState(900);
 const [examMode,setExamMode]=useState<'timed'|'untimed'|null>(null); const [examIds,setExamIds]=useState<string[]>([]); const [examIndex,setExamIndex]=useState(0); const [examAnswers,setExamAnswers]=useState<Record<string,Answer>>({}); const [examFlags,setExamFlags]=useState<string[]>([]); const [examDeadline,setExamDeadline]=useState(0); const [seconds,setSeconds]=useState(5400); const [examResult,setExamResult]=useState<number|null>(null); const [examGrades,setExamGrades]=useState<Record<string,boolean>>({}); const [marking,setMarking]=useState(false);
 const latest=useRef(state); latest.current=state;
 const pendingSave=useRef<Promise<unknown>>(Promise.resolve());
 useEffect(()=>{loadState().then(s=>{setState(s);latest.current=s;setReady(true);if(location.hash==='#lesson'&&s.journey.active){const active=s.journey.active;const unit=learningUnits.find(u=>u.id===active.unitId);if(unit){setLessonId(unit.id);setView('lesson');const id=currentUnitStep(s,unit).exerciseId;setExerciseId(id);if(id){const e=findExercise(id);setCode(s.drafts[id]??e?.starter??e?.code??'')}}}const draft=s.exams.active as {mode:'timed'|'untimed';ids:string[];answers:Record<string,Answer>;flags:string[];deadline:number}|undefined;if(draft?.ids?.length){setExamMode(draft.mode);setExamIds(draft.ids);setExamAnswers(draft.answers||{});setExamFlags(draft.flags||[]);setExamDeadline(draft.deadline||0)}}).catch(error=>{console.error('Could not load saved progress',error);setLoadError(String(error));setReady(true)})},[]);
 const update=(fn:(old:LearnerState)=>LearnerState)=>{const next=fn(latest.current);latest.current=next;setState(next);pendingSave.current=pendingSave.current.catch(()=>{}).then(()=>saveState(next)).then(setSaved)};
 const go=(v:View,tab?:'simulation'|'unlimited')=>{setView(v);if(v==='practice'&&tab)setPracticeTab(tab);location.hash=v==='practice'&&tab==='simulation'?'exam':v;setFeedback(null);setHint(false);};
 useEffect(()=>{const hash=()=>{const v=location.hash.slice(1);if(v==='exam'){setView('practice');setPracticeTab('simulation');return}if(v==='practice'){setView('practice');setPracticeTab('unlimited');return}if(v==='progress'){setView('settings');return}if(v==='mistakes'){setView('practice');setPracticeTab('unlimited');return}if(nav.some(n=>n.view===v as View)) setView(v as View);};hash();window.addEventListener('hashchange',hash);return()=>window.removeEventListener('hashchange',hash);},[]);
 const openExercise=(id:string)=>{setExerciseId(id);setLessonId('');setOrigin(view);setAnswer('');setFeedback(null);setHint(false);setAnswerXp(0);setRuntime(null);setView('lesson');location.hash='lesson';const e=findExercise(id);if(e?.starter||e?.code) setCode(latest.current.drafts[id] ?? e.starter ?? e.code ?? '')};
 const openUnit=(id:string)=>{const unit=learningUnits.find(u=>u.id===id);if(!unit)return;setOrigin('path');setLessonId(id);setAnswerXp(0);setAnswer('');setFeedback(null);setHint(false);setRuntime(null);update(s=>beginUnit(s,unit));const item=currentUnitStep(latest.current,unit).exerciseId;setExerciseId(item??'');if(item){const e=findExercise(item);setCode(latest.current.drafts[item]??e?.starter??e?.code??'')}setView('lesson');location.hash='lesson'};
 const moveUnit=(index:number)=>{const unit=learningUnits.find(u=>u.id===lessonId);if(!unit)return;const before=latest.current.journey.active?.screenIndex??0;update(s=>index>before?advanceUnit(s,unit):setUnitScreen(s,unit.id,index));const id=currentUnitStep(latest.current,unit).exerciseId;setExerciseId(id);setAnswer('');setFeedback(null);setHint(false);setAnswerXp(0);setRuntime(null);if(id){const e=findExercise(id);setCode(latest.current.drafts[id]??e?.starter??e?.code??'')}};
 const activeUnit=learningUnits.find(u=>u.id===lessonId);const screenIndex=activeUnit&&state.journey.active?.unitId===activeUnit.id?state.journey.active.screenIndex:0;const activeStep=activeUnit&&state.journey.active?.unitId===activeUnit.id?currentUnitStep(state,activeUnit):undefined;const current=findExercise(exerciseId);
 const submit=async(e:Exercise,response:Answer,exam=false)=>{
  if(exam){setExamAnswers(a=>({...a,[e.id]:response}));return}
  if(feedback==='correct') return;
  let correct=false;
  if(['fix','complete','program'].includes(e.type)) {
   if(!e.tests?.length) {setRuntime({id:'',ok:false,stdout:'',stderr:'',error:'No executable tests are available for this exercise.'});return}
   setRunning(true);try {const result=await runPython({id:crypto.randomUUID(),mode:'grade',code:String(response),inputs:[],tests:e.tests});setRuntime(result);correct=!!result.cases?.length&&result.cases.every(c=>c.passed)}catch(err){setRuntime({id:'',ok:false,stdout:'',stderr:'',error:String(err)});setRunning(false);return}setRunning(false)
  } else correct=gradeFixed(e,response);
  const previous=latest.current.attempts.filter(a=>a.exerciseId===e.id);const before=latest.current.xp;
  setFeedback(correct?'correct':'incorrect');update(s=>{let next=applyAttempt(s,e,correct,hint||previous.some(a=>a.hintUsed),previous.length+1);if(lessonId&&learningUnits.some(u=>u.id===lessonId))next=correct?recordUnitRecovery(next,e.id):recordUnitMistake(next,e.id);return next});const earned=latest.current.xp-before;setAnswerXp(earned);
 };
 const run=async(mode:'run'|'trace')=>{setRunning(true);setRuntime(null);setPlaying(false);try{const res=await runPython({id:crypto.randomUUID(),mode,code,inputs:inputs.split(/\r?\n/),maxSteps:200});setRuntime(res);if(res.frames?.length){setFrames(res.frames);setFrame(0)}}catch(err){setRuntime({id:'',ok:false,stdout:'',stderr:'',error:String(err)})}finally{setRunning(false)}};
 useEffect(()=>{if(!playing||frames.length<2)return;const timer=setInterval(()=>setFrame(i=>{if(i>=frames.length-1){setPlaying(false);return i}return i+1}),speed);return()=>clearInterval(timer)},[playing,frames,speed]);
 const examPool=useMemo(()=>selectPracticePaper(exercises).map(e=>e.id),[]);
 const startExam=(mode:'timed'|'untimed')=>{const ids=examPool;const deadline=mode==='timed'?Date.now()+90*60*1000:0;setExamMode(mode);setExamIds(ids);setExamIndex(0);setExamAnswers({});setExamFlags([]);setExamResult(null);setExamDeadline(deadline);update(s=>({...s,exams:{...s.exams,active:{mode,ids,answers:{},flags:[],deadline}}}))};
 useEffect(()=>{if(!examMode)return;const data={mode:examMode,ids:examIds,answers:examAnswers,flags:examFlags,deadline:examDeadline};if(examIds.length) update(s=>({...s,exams:{...s.exams,active:data}}))},[examAnswers,examFlags,examIndex]);
 const finishExam=async()=>{if(marking)return;setMarking(true);const grades:Record<string,boolean>={};for(const id of examIds){const ex=findExercise(id);if(!ex)continue;const answer=examAnswers[id];if(['fix','complete','program'].includes(ex.type)){if(typeof answer==='string'&&answer.trim()&&ex.tests?.length){try{const result=await runPython({id:crypto.randomUUID(),mode:'grade',code:answer,inputs:[],tests:ex.tests});grades[id]=!!result.cases?.length&&result.cases.every(c=>c.passed)}catch{grades[id]=false}}else grades[id]=false}else grades[id]=gradeFixed(ex,answer??'')}const correct=Object.values(grades).filter(Boolean).length;setExamGrades(grades);setExamResult(correct);setExamMode(null);setMarking(false);update(s=>({...s,exams:{...s.exams,active:null,last:{ids:examIds,answers:examAnswers,grades,correct,at:Date.now()}}}))};
 useEffect(()=>{if(examMode!=='timed')return;const t=setInterval(()=>{const left=Math.max(0,Math.ceil((examDeadline-Date.now())/1000));setSeconds(left);if(left===0&&examDeadline)finishExam()},1000);return()=>clearInterval(t)},[examMode,examDeadline,examIds,examAnswers]);
 const due=dueExerciseIds(state);const nextUnit=learningUnits.find(u=>!isUnitComplete(state,u))??learningUnits[0];
 const mastery=estimateMastery(state,exercises);
 const filtered=filterPracticeExercises(exercises,state,{search:filter,week:weekFilter,type:typeFilter,status:view==='practice'?statusFilter:'all'});
 const download=()=>{const blob=new Blob([exportState(state)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='compi-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const upload=async(file:File)=>{try{const incoming=importState(await file.text());if(!confirm('Replace this device’s current progress with the imported backup? Export your current progress first if you need it.'))return;latest.current=incoming;setState(incoming);setSaved(await saveState(incoming));alert('Progress imported.')}catch(e){alert(`Could not import: ${String(e)}`)}};
 if(!ready)return <div className="loading">Opening your learning path…</div>;
 if(loadError)return <main className="main"><div className="panel" role="alert"><h1>Progress could not be opened</h1><p>The saved data may be damaged. Nothing has been overwritten. Keep this browser profile and contact support before clearing storage.</p><pre className="code">{loadError}</pre></div></main>;
 return <div className={`app ${view==='lesson'?'lesson-mode':''} ${state.preferences.reducedMotion?'reduce-motion':''}`}><a className="skip-link" href="#main-content">Skip to content</a><aside className="sidebar"><button className="brand" onClick={()=>go('path')} aria-label="COMPi home"><img src={`${import.meta.env.BASE_URL}compi-symbol-primary.svg`} alt=""/><span>COMPi</span></button><span className="brand-caption">COMPUTATION I</span><nav aria-label="Main navigation">{nav.map(({view:v,label,icon:Icon})=><button key={v} className={`nav-link ${view===v?'active':''}`} aria-current={view===v?'page':undefined} onClick={()=>go(v)}><Icon size={22}/><span>{label}</span></button>)}</nav><div className="sidebar-bottom"><span>{state.nickname||'Learner'}</span><strong>{state.xp} XP</strong></div></aside>
 <div className="workspace"><header className="topbar"><button className="mobile-brand" onClick={()=>go('path')} aria-label="COMPi home"><img src={`${import.meta.env.BASE_URL}compi-symbol-primary.svg`} alt=""/>COMPi</button><span className="top-title">{view==='lesson'?activeUnit?.title??'Practice':nav.find(n=>n.view===view)?.label}</span><span className="top-stats" aria-label={`${state.xp} experience points`}>✦ {state.xp} XP</span></header><main className="main" id="main-content" tabIndex={-1}>
 {view==='path'&&<><section className="hero"><div><span className="eyebrow">YOUR PYTHON JOURNEY</span><h1>Master Python,<br/><span className="hero-accent">one step at a time.</span></h1><p>Learn the concepts. Test your reasoning. Be ready when the paper is in front of you.</p><button className="button button-primary" onClick={()=>nextUnit&&openUnit(nextUnit.id)}>Continue learning <ArrowRight size={18}/></button></div><div className="hero-visual" aria-hidden="true"><img className="hero-symbol" src={`${import.meta.env.BASE_URL}compi-symbol-primary.svg`} alt=""/><div className="orb orb-one">{`print('hi')`}</div><div className="orb orb-two">[1, 2, 3]</div><div className="orb orb-three">for x in…</div></div></section><div className="section-heading"><div><h2>Your learning path</h2><p>Focused concepts, real Python, no guesswork.</p></div><span>{learningUnits.filter(u=>isUnitComplete(state,u)).length} / {learningUnits.length} lessons completed</span></div><div className="path-recommendation"><span>Up next: <strong>{nextUnit?.title}</strong></span>{due.length>0&&<button type="button" onClick={()=>{setView('practice');setPracticeTab('unlimited');location.hash='practice'}}>Review {due.length} due {due.length===1?'question':'questions'} <ArrowRight size={16}/></button>}</div><div className="path">{learningUnits.map((u,i)=>{const done=isUnitComplete(state,u);const count=u.exerciseIds.filter(id=>state.completed.includes(id)).length;const available=i===0||isUnitComplete(state,learningUnits[i-1]);const resumed=state.journey.active?.unitId===u.id;return <button key={u.id} className={`node ${done?'done':count||resumed?'in-progress':''} ${!available?'future':''}`} disabled={!available} aria-disabled={!available} aria-current={!done&&available?'step':undefined} onClick={()=>openUnit(u.id)}><span className="node-index">{done?<Check size={20}/>:String(i+1).padStart(2,'0')}</span><span className="node-copy"><small>WEEK {u.week} · {u.exerciseIds.length} QUESTIONS</small><strong>{u.title}</strong><span>{done?'Completed':resumed?'Continue lesson':`${count}/${u.exerciseIds.length} activities completed`}</span></span><ArrowRight size={20}/></button>})}</div></>}
 {view==='lesson'&&activeUnit&&<LessonFlow unit={activeUnit} exercise={current} screenIndex={screenIndex} answer={answer} code={code} feedback={feedback} hint={hint} running={running} runtime={runtime} xpEarned={earnedUnitXp(state,activeUnit)} answerXpEarned={answerXp}
   reviewIndex={activeStep?.reviewIndex??0} reviewTotal={activeStep?.reviewTotal??0} revealed={!!current&&!!state.journey.active?.revealed.includes(current.id)} revealedCount={state.journey.active?.revealed.length??0}
   onAnswer={v=>{if(feedback!=='correct'){setAnswer(v);setFeedback(null)}}} onCode={v=>{if(feedback!=='correct'){setCode(v);if(current)update(s=>({...s,drafts:{...s.drafts,[current.id]:v}}));setFeedback(null)}}}
   onHint={()=>setHint(true)} onSubmit={()=>current&&submit(current,['fix','complete','program'].includes(current.type)?code:answer)}
   onAdvance={()=>{if(activeStep?.phase==='complete'){go('path')}else if(activeStep?.phase==='teach'||(activeStep?.phase==='question'&&feedback!==null)||(activeStep?.phase==='review'&&(feedback==='correct'||!!state.journey.active?.revealed.includes(current?.id??'')))){moveUnit(screenIndex+1)}}}
   onBack={()=>screenIndex===0?go('path'):moveUnit(screenIndex-1)} onExit={()=>go('path')} onRetry={()=>setFeedback(null)}
   onReveal={()=>{if(current&&activeStep?.phase==='review'){update(s=>recordUnitReveal(s,current.id));setFeedback(null)}}}/>}
 {view==='lesson'&&!activeUnit&&current&&<div className="lesson-layout"><div className="lesson-main"><button className="text-button" onClick={()=>go(origin)}><ArrowLeft size={17}/> Back to {origin}</button><div className="question"><div className="question-head"><span className="eyebrow">{current.type.toUpperCase()} · {current.difficulty.toUpperCase()}</span><span>Activity {current.id}</span></div><h2>{current.statement}</h2>{current.code&&<pre className="code">{current.code}</pre>}<ExerciseInput exercise={current} value={answer} onChange={a=>{if(feedback!=='correct'){setAnswer(a);setFeedback(null)}}} code={code} onCode={v=>{setCode(v);update(s=>({...s,drafts:{...s.drafts,[current.id]:v}}))}} disabled={feedback==='correct'}/>{!feedback&&<div className="actions"><button className="button button-ghost" onClick={()=>setHint(true)}>Show a hint</button><button disabled={running} className="button button-primary" onClick={()=>submit(current,['fix','complete','program'].includes(current.type)?code:answer)}>{running?'Checking…':'Check answer'} <ArrowRight size={17}/></button></div>}{hint&&!feedback&&<p className="hint">Hint: {current.hints[0]}</p>}{feedback&&<div className={`feedback ${feedback}`} role="status"><strong>{feedback==='correct'?'Well reasoned.':'Not quite. Try again.'}</strong><p>{current.explanation}</p>{runtime?.cases&&<CaseResults result={runtime}/>}<div className="actions">{feedback==='incorrect'?<button className="button button-primary" onClick={()=>setFeedback(null)}>Try again</button>:<button className="button button-primary" onClick={()=>go(origin)}>Return to {origin} <ArrowRight size={17}/></button>}</div></div>}</div></div><aside className="lesson-side"><h3>{current.subtopic}</h3><p>{current.objectives.join(' ')}</p><p className="source-note">{current.provenance.kind} · {current.provenance.reference}</p></aside></div>}
  {view==='practice'&&<div className="view-container">
  <div className="page-heading">
    <h1>Simulation & Unlimited Practice</h1>
    <p>Prepare for the NOVA IMS Computation I Mini Test I (90m simulation), or train freely across all topics.</p>
  </div>
  <div className="segmented-control" role="tablist" aria-label="Practice mode">
    <button role="tab" aria-selected={practiceTab==='simulation'} className={`segmented-button ${practiceTab==='simulation'?'active':''}`} onClick={()=>setPracticeTab('simulation')}>Simulation test</button>
    <button role="tab" aria-selected={practiceTab==='unlimited'} className={`segmented-button ${practiceTab==='unlimited'?'active':''}`} onClick={()=>setPracticeTab('unlimited')}>Unlimited practice</button>
  </div>
  {practiceTab==='simulation'&&(
    examResult!==null?<div className="panel simulado-card">
      <h2>Simulation complete</h2>
      <p><strong>Score: {computeSimuladoScore(examIds,examGrades).toFixed(1)} / 20.0 points</strong> ({examResult} of {examIds.length} tasks passed).</p>
      <p className="source-note">Modelled on NOVA IMS Mini Test I (Weeks 1–7) & Preparation Test. Unofficial practice paper.</p>
      <div className="exercise-list">
        {examIds.map((id,idx)=>{
          const e=findExercise(id)!;
          const meta=groupMeta(idx);
          return <div className="practice-row" key={id}>
            <span>
              <small>{meta.name} · {meta.points}</small>
              <strong>{examGrades[id]?'✓ Passed':'✗ Needs review'} · {e.subtopic}</strong>
              <span>Your answer: {String(examAnswers[id]??'Not answered')}</span>
              <span>{e.explanation}</span>
            </span>
          </div>;
        })}
      </div>
      <div className="actions">
        <button className="button button-primary" onClick={()=>{setExamResult(null);startExam('timed')}}>Retake timed simulation (90 min)</button>
        <button className="button button-ghost" onClick={()=>{setExamResult(null);setPracticeTab('unlimited')}}>Go to unlimited practice</button>
      </div>
    </div>
    :examMode&&examIds.length?<div className="exam-layout">
      <div className="panel">
        <div className="exam-bar">
          <strong>{groupMeta(examIndex).name}</strong>
          <span>{examMode==='timed'?formatTime(seconds):'Untimed'} · {groupMeta(examIndex).points}</span>
        </div>
        {(()=>{
          const e=findExercise(examIds[examIndex]);
          if(!e)return null;
          return <>
            <small>TASK {examIndex+1} OF {examIds.length} · {e.type.toUpperCase()}</small>
            <h2>{e.statement}</h2>
            {e.code&&<pre className="code">{e.code}</pre>}
            <ExerciseInput exercise={e} value={examAnswers[e.id]??''} onChange={a=>setExamAnswers(prev=>({...prev,[e.id]:a}))} code={String(examAnswers[e.id]??e.starter??'')} onCode={v=>setExamAnswers(prev=>({...prev,[e.id]:v}))} disabled={false}/>
          </>;
        })()}
        <div className="actions">
          <button className="button button-ghost" disabled={examIndex===0} onClick={()=>setExamIndex(i=>i-1)}>Previous</button>
          <button className="button button-ghost" onClick={()=>setExamFlags(a=>a.includes(examIds[examIndex])?a.filter(x=>x!==examIds[examIndex]):[...a,examIds[examIndex]])}><Flag size={17}/> {examFlags.includes(examIds[examIndex])?'Unflag':'Flag for review'}</button>
          {examIndex<examIds.length-1?<button className="button button-primary" onClick={()=>setExamIndex(i=>i+1)}>Next</button>:<button className="button button-primary" onClick={finishExam} disabled={marking}>{marking?'Grading…':'Finish simulation'}</button>}
        </div>
      </div>
      <aside className="panel">
        <div className="panel-head"><strong>Tasks navigation</strong><span>{Object.keys(examAnswers).filter(k=>String(examAnswers[k]).trim()).length}/{examIds.length} answered</span></div>
        <div className="exam-dots">
          {examIds.map((id,i)=>{
            const answered=String(examAnswers[id]??'').trim().length>0;
            const flagged=examFlags.includes(id);
            return <button key={id} className={`${i===examIndex?'active':''} ${answered?'answered':''} ${flagged?'flagged':''}`} onClick={()=>setExamIndex(i)}>{i+1}</button>;
          })}
        </div>
        <p className="source-note">20 points total · Weeks 1–7. Submit when all tasks are complete.</p>
        <button className="button button-ghost" style={{width:'100%',marginTop:'1rem'}} onClick={finishExam} disabled={marking}>{marking?'Grading…':'Submit & finish'}</button>
      </aside>
    </div>
    :<div className="simulado-card">
      <div className="panel-head">
        <div>
          <h2>Mini Test I — Practice Simulation</h2>
          <p>Unofficial, original practice paper · 90 minutes · 20 points (practice weighting)</p>
        </div>
        <span className="badge badge-success">Weeks 1–7</span>
      </div>
      <p>Scope: up to <code>for</code> and list/string operations taught through Lecture 07. Condition: solve independently without checking solutions.</p>
      <div className="simulado-groups">
        <div className="simulado-group-item">
          <span>Group 1 · 3 points (1 pt each)</span>
          <strong>Trace the code</strong>
          <small>Comprehension, input conversion, slicing, and string/list traversal.</small>
        </div>
        <div className="simulado-group-item">
          <span>Group 2 · 5 points (2.5 pts each)</span>
          <strong>Find and fix the bugs</strong>
          <small>Diagnosis and correction of faulty lines without replacing the program.</small>
        </div>
        <div className="simulado-group-item">
          <span>Group 3 · 2 points</span>
          <strong>Complete the program</strong>
          <small>Multi-part code completion for username generation and lists.</small>
        </div>
        <div className="simulado-group-item">
          <span>Group 4 · 10 points (4 + 3 + 3)</span>
          <strong>Write the program</strong>
          <small>Continuing program: data validation, band summary, and tag synthesis.</small>
        </div>
      </div>
      <div className="actions">
        <button className="button button-primary" onClick={()=>startExam('timed')}><Play size={18}/> Start timed simulation (90 min)</button>
        <button className="button button-ghost" onClick={()=>startExam('untimed')}>Untimed practice</button>
      </div>
    </div>
  )}
  {practiceTab==='unlimited'&&(
    <>
      <div className="filters">
        <label>Search <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Topic or question"/></label>
        <label>Week <select value={weekFilter} onChange={e=>setWeekFilter(e.target.value)}><option value="all">All weeks</option>{[1,2,3,4,5,6,7].map(n=><option key={n}>{n}</option>)}</select></label>
        <label>Type <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="all">All formats</option>{[...new Set(exercises.map(e=>e.type))].map(t=><option key={t}>{t}</option>)}</select></label>
        <label>Progress <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as 'all'|'unattempted')}><option value="all">All exercises</option><option value="unattempted">Not attempted</option></select></label>
      </div>
      <div className="exercise-list">
        {filtered.map(e=><button className="practice-row" key={e.id} onClick={()=>openExercise(e.id)}>
          <span className="practice-icon">{state.completed.includes(e.id)?<Check size={19}/>:<BookOpen size={19}/>}</span>
          <span>
            <small>WEEK {e.week} / {e.type.toUpperCase()} / {e.difficulty.toUpperCase()}</small>
            <strong>{e.subtopic}</strong>
            <span>{e.statement.slice(0,105)}{e.statement.length>105?'…':''}</span>
          </span>
          <ArrowRight size={18}/>
        </button>)}
      </div>
      {!filtered.length&&<div className="empty">No exercises match these filters. Change Progress, Week, Type or Search to see more.</div>}
    </>
  )}
</div>}
 {view==='traps'&&<div className="view-container">
  <div className="page-heading">
    <h1>Python traps</h1>
    <p>Untangle the small Python details that change everything: slices, append returns, methods in conditions, and iteration changes.</p>
  </div>
  <div className="exercise-list">
    {exercises.filter(e=>e.misconceptions.length>0&&(e.week>=4||e.topic.toLowerCase().includes('trap'))).map(e=><button className="practice-row" key={e.id} onClick={()=>openExercise(e.id)}>
      <span className="practice-icon">{state.completed.includes(e.id)?<Check size={19}/>:<Warning size={19}/>}</span>
      <span>
        <small>WEEK {e.week} / {e.type.toUpperCase()} / {e.difficulty.toUpperCase()}</small>
        <strong>{e.subtopic}</strong>
        <span>{e.statement.slice(0,105)}{e.statement.length>105?'…':''}</span>
      </span>
      <ArrowRight size={18}/>
    </button>)}
  </div>
</div>}
 {view==='playground'&&<div className="view-container">
  <div className="page-heading">
    <h1>Your Python playground</h1>
    <p>Experiment with real Python 3. Runs privately in this browser with Pyodide.</p>
  </div>
  <div className="lab-grid">
    <div className="panel">
      <div className="panel-head"><strong>main.py</strong><span>Python 3 · on this device</span></div>
      <Suspense fallback={<div className="loading">Loading editor…</div>}><Editor value={code} onChange={setCode}/></Suspense>
      <label className="input-label">Input values, one per line <textarea rows={3} value={inputs} onChange={e=>setInputs(e.target.value)} placeholder="One input() response per line"/></label>
      <div className="actions">
        <button className="button button-ghost" onClick={()=>{setCode(defaultCode);setRuntime(null);setFrames([])}}>Reset</button>
        <button className="button button-ghost" onClick={()=>{cancelPython();setRunning(false);setRuntime(null)}} disabled={!running}>Cancel</button>
        <button className="button button-primary" onClick={()=>run('run')} disabled={running}><Play size={18}/>{running?'Running…':'Run code'}</button>
      </div>
    </div>
    <div className="panel output-panel">
      <div className="panel-head"><strong>Output</strong><span>{runtime?.ok?'Finished':runtime?.error?'Error':'Ready'}</span></div>
      <div className="console">{runtime?.stdout||(runtime?.error?<span className="error-message">{runtime.error}</span>:'Run code to see Python console output here.')}</div>
    </div>
  </div>
</div>}
 {view==='settings'&&<div className="view-container">
  <div className="page-heading">
    <h1>Settings & Progress</h1>
    <p>Customise your space and review your earned progress and achievements.</p>
  </div>
  <div className="stat-grid">
    <div className="stat"><strong>{state.xp}</strong><span>XP earned</span></div>
    <div className="stat"><strong>{state.completed.length}</strong><span>First-try completions</span></div>
    <div className="stat"><strong>{state.attempts.length}</strong><span>Attempts recorded</span></div>
    <div className="stat"><strong>{studyStreak(state)}</strong><span>Study-day streak (UTC)</span></div>
  </div>
  <div className="panel settings">
    <h2>Learner preferences</h2>
    <label>Nickname <input value={state.nickname} onChange={e=>update(s=>({...s,nickname:e.target.value.slice(0,32)}))} maxLength={32}/></label>
    <label>Starting confidence <select value={state.confidence} onChange={e=>update(s=>({...s,confidence:e.target.value as LearnerState['confidence']}))}>{['beginner','intermediate','advanced','exam'].map(d=><option key={d}>{d}</option>)}</select></label>
    <label className="check"><input type="checkbox" checked={state.preferences.reducedMotion} onChange={e=>update(s=>({...s,preferences:{...s.preferences,reducedMotion:e.target.checked}}))}/> Reduce motion</label>
    <p>Storage: {saved?'Saved on this device':'Saving failed. Export a backup now.'}</p>
    <p>Offline assets: <OfflineStatus/></p>
    <div className="actions">
      <button className="button button-ghost" onClick={download}><Download size={17}/> Export progress</button>
      <label className="button button-ghost upload"><Upload size={17}/> Import backup<input type="file" accept="application/json,.json" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0])}/></label>
    </div>
    <p className="source-note">Browser storage may be cleared by the browser or user. Export before switching devices.</p>
  </div>
  <div className="panel">
    <h2>Mastery by concept</h2>
    <p className="source-note">Based on independent first-try answers across Weeks 1–7.</p>
    {Object.entries(mastery).map(([topic,row])=><div className="progress-row" key={topic}><strong>{topic}</strong><span>{row.level} ({row.independent}/{row.total})</span></div>)}
  </div>
  <div className="panel">
    <h2>Achievements earned</h2>
    <p>{earnedAchievements(state).join(', ')||'None yet. Complete exercises on the path to earn achievements.'}</p>
  </div>
  <div className="panel">
    <h2>Completions by week</h2>
    {[1,2,3,4,5,6,7].map(w=>{const week=exercises.filter(e=>e.week===w);return <div className="progress-row" key={w}><strong>Week {w}</strong><span>{week.filter(e=>state.completed.includes(e.id)).length} of {week.length} completed</span></div>})}
  </div>
</div>}
 </main><footer className="footer">COMPi · Original practice for Computation I · Not an official university assessment</footer></div>
 <nav className="mobile-nav" aria-label="Mobile navigation">{nav.map(({view:v,label,icon:Icon})=><button key={v} onClick={()=>go(v)} className={view===v?'active':''} aria-label={label}><Icon size={23}/><span>{v==='practice'?'Practice':label.split(' ')[0]}</span></button>)}</nav></div>;
}
function OfflineStatus(){const [status,setStatus]=useState('Checking…');useEffect(()=>{const check=async()=>{if(!('serviceWorker'in navigator)){setStatus('Not supported in this browser');return}const reg=import.meta.env.PROD?await navigator.serviceWorker.ready:await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);if(!reg?.active){setStatus('Initial download or installation in progress');return}const channel=new MessageChannel();const response=new Promise<{ready:boolean;cached:number;total:number}>(resolve=>{channel.port1.onmessage=event=>resolve(event.data);setTimeout(()=>resolve({ready:false,cached:0,total:0}),5000)});reg.active.postMessage({type:'CACHE_STATUS'},[channel.port2]);const result=await response;setStatus(result.ready?`Complete: ${result.total} assets cached for offline use`:`Incomplete: ${result.cached}/${result.total} assets cached`)};check().catch(()=>setStatus('Unavailable'))},[]);return <>{status}</>}
function CaseResults({result}:{result:RuntimeResponse}){return <div>{result.cases?.map((c,i)=><p key={i}>{c.passed?'✓':'✗'} {c.description}: expected {c.expected}, got {c.actual}{c.error?` (${c.error})`:''}</p>)}</div>}
