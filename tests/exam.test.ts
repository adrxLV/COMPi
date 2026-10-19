import { expect, it } from 'vitest';
import { exercises } from '../src/content';
import { selectPracticePaper } from '../src/assessment/exam';
it('selects 3 comprehension, 2 debugging, 1 completion and 3 open/multipart tasks',()=>{
 const selected=selectPracticePaper(exercises);
 expect(selected).toHaveLength(9);
 expect(new Set(selected.map(e=>e.id)).size).toBe(9);
 expect(selected.slice(0,3).every(e=>['choice','predict','error','trace'].includes(e.type))).toBe(true);
 expect(selected.slice(3,5).every(e=>['bug','fix'].includes(e.type))).toBe(true);
 expect(selected[5].type).toBe('complete');
 expect(selected.slice(6).every(e=>['program','multipart'].includes(e.type))).toBe(true);
 expect(selected.some(e=>e.week===7)).toBe(true);
});
