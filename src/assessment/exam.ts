import type { Exercise } from '../contracts';
/** Deterministic practice simulation based on the example paper's response modes. */
export function selectPracticePaper(exercises: Exercise[]): Exercise[] {
 const used = new Set<string>();
 const take = (types: Exercise['type'][], count: number, minWeek = 1) => {
  const candidates = exercises.filter(e => types.includes(e.type) && e.week >= minWeek && !used.has(e.id));
  const chosen = candidates.sort((a,b) => b.week-a.week).slice(0,count);
  chosen.forEach(e=>used.add(e.id)); return chosen;
 };
 return [...take(['choice','predict','error','trace'],3,4),...take(['bug','fix'],2,4),...take(['complete'],1,2),...take(['program','multipart'],3,4)];
}
