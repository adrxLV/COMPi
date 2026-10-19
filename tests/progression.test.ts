import { it,expect } from 'vitest';
import { defaultState, applyAttempt } from '../src/storage/state';
import { estimateMastery, earnedAchievements, studyStreak } from '../src/assessment/progression';
import type { Exercise } from '../src/contracts';
const e=(id:string,topic:string)=>({id,topic,difficulty:'beginner',reviewDays:1} as Exercise);
it('separates estimated mastery from XP and repeated guesses',()=>{
 const a=e('one','Strings'),b=e('two','Strings');let s=defaultState();s=applyAttempt(s,a,true,false,1,Date.UTC(2026,0,1));
 expect(estimateMastery(s,[a,b]).Strings.level).toBe('emerging');
 s=applyAttempt(s,b,true,true,3,Date.UTC(2026,0,2));
 expect(estimateMastery(s,[a,b]).Strings.level).toBe('emerging');
});
it('counts only consecutive actual study days and awards real milestones',()=>{
 const a=e('one','Strings');let s=applyAttempt(defaultState(),a,true,false,1,Date.UTC(2026,0,1));s=applyAttempt(s,a,false,false,1,Date.UTC(2026,0,2));
 expect(studyStreak(s,Date.UTC(2026,0,2))).toBe(2);
 expect(earnedAchievements(s)).toContain('First step');
 expect(studyStreak(s,Date.UTC(2026,0,5))).toBe(0);
});
