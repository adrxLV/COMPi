export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'exam';
export type ExerciseType = 'choice' | 'predict' | 'bug' | 'fix' | 'complete' | 'program' | 'order' | 'trace' | 'error' | 'multipart' | 'misconception' | 'memory';
export type Provenance = { kind: 'source-derived' | 'adapted' | 'newly-authored'; reference: string };
export type TestCase = { input: string[]; expectedOutput: string; description: string };
export type Exercise = {
  id: string; week: number; topic: string; subtopic: string; prerequisites: string[];
  objectives: string[]; difficulty: Difficulty; type: ExerciseType; statement: string;
  code?: string; referenceInput?: string[]; options?: string[]; answer?: string | string[] | number[];
  tests?: TestCase[]; starter?: string; hints: string[]; explanation: string;
  misconceptions: string[]; provenance: Provenance; reviewDays: number;
  parts?: { prompt: string; answer: string }[];
};
export type Lesson = { id: string; week: number; title: string; concept: string; explanation: string; example: string; exerciseIds: string[]; prerequisites: string[] };
export type TraceBinding = { name: string; objectId: number; type: string; repr: string };
export type TraceFrame = { line: number; source: string; bindings: TraceBinding[]; output: string };
export type RuntimeRequest = { id: string; mode: 'run' | 'grade' | 'trace'; code: string; inputs: string[]; tests?: TestCase[]; maxSteps?: number };
export type RuntimeResponse = { id: string; ok: boolean; stdout: string; stderr: string; error?: string; timedOut?: boolean; cases?: { description: string; passed: boolean; expected: string; actual: string; error?: string }[]; frames?: TraceFrame[] };
export type Attempt = { exerciseId: string; at: number; correct: boolean; attempts: number; difficulty: Difficulty; hintUsed: boolean };
export type LearnerState = { version: 1; nickname: string; confidence: Difficulty; xp: number; completed: string[]; attempts: Attempt[]; drafts: Record<string,string>; exams: Record<string,unknown>; preferences: { reducedMotion: boolean } };
