import type { Exercise, LearnerState } from '../contracts';
export type MasteryEstimate = { level:'not started'|'emerging'|'developing'|'strong evidence'; independent:number; total:number };
export function estimateMastery(state:LearnerState,exercises:Exercise[]):Record<string,MasteryEstimate>{
 const topics:Record<string,MasteryEstimate>={};
 for(const e of exercises){const row=topics[e.topic]??{level:'not started',independent:0,total:0};row.total++;topics[e.topic]=row}
 for(const e of exercises){const attempts=state.attempts.filter(a=>a.exerciseId===e.id);if(attempts.some(a=>a.correct&&!a.hintUsed&&a.attempts===1))topics[e.topic].independent++}
 for(const row of Object.values(topics))row.level=row.independent>=3?'strong evidence':row.independent>=2?'developing':row.independent>=1?'emerging':'not started';
 return topics;
}
export function studyStreak(state:LearnerState,now=Date.now()):number{
 const dates=new Set(state.attempts.map(a=>new Date(a.at).toISOString().slice(0,10)));
 const day=86_400_000;let anchor=Math.floor(now/day)*day;
 if(!dates.has(new Date(anchor).toISOString().slice(0,10)))anchor-=day;
 let count=0;while(dates.has(new Date(anchor).toISOString().slice(0,10))){count++;anchor-=day}return count;
}
export function earnedAchievements(state:LearnerState):string[]{
 const badges:string[]=[];
 if(state.completed.length>=1)badges.push('First step');
 if(state.completed.length>=7)badges.push('Seven strong');
 if(state.completed.length>=20)badges.push('Practice regular');
 if(state.attempts.some(a=>!a.correct)&&state.attempts.some(a=>a.correct&&a.attempts>1))badges.push('Kept trying');
 if(state.exams.last)badges.push('Paper practised');
 return badges;
}
