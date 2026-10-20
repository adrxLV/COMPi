export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'exam';
export type ExerciseType = 'choice' | 'predict' | 'bug' | 'fix' | 'complete' | 'program' | 'order' | 'trace' | 'error' | 'multipart' | 'misconception' | 'memory';
export type Provenance = { kind: 'source-derived' | 'adapted' | 'newly-authored'; reference: string };
export type TestCase = { input: string[]; expectedOutput: string; description: string };
export type Exercise = {
  id: string; week: number; topic: string; subtopic: string; prerequisites: string[];
  objectives: string[]; difficulty: Difficulty; type: ExerciseType; statement: string;
  code?: string; referenceInput?: string[]; options?: string[]; answer?: string | string[] | number[];
  tests?: TestCase[]; starter?: string; solution?: string; hints: string[]; explanation: string;
  misconceptions: string[]; provenance: Provenance; reviewDays: number;
  parts?: { prompt: string; answer: string; acceptedAnswers?: string[] }[];
};
export type Lesson = { id: string; week: number; title: string; concept: string; explanation: string; example: string; exerciseIds: string[]; prerequisites: string[] };
// Learning-path units are independent of weekly source groupings. Existing
// exercise IDs remain stable so attempts and XP survive the redesign.
export type TeachingStep = {
  caption: string; code: string;
  bindings: { name: string; objectId: string; value: string }[];
};
export type LearningUnit = {
  id: string; week: number; title: string; objective: string;
  explanation: string; example: string; exerciseIds: string[];
  teachingSteps?: TeachingStep[];
};
export type JourneyProgress = {
  active?: { unitId: string; screenIndex: number; startedAt: number; missed: string[]; recovered: string[]; revealed: string[] };
  completedUnits: string[];
};
export type TraceBinding = { name: string; objectId: number; type: string; repr: string };
export type TraceFrame = { line: number; source: string; bindings: TraceBinding[]; output: string };
export type RuntimeRequest = { id: string; mode: 'run' | 'grade' | 'trace'; code: string; inputs: string[]; tests?: TestCase[]; maxSteps?: number };
export type RuntimeResponse = { id: string; ok: boolean; stdout: string; stderr: string; error?: string; timedOut?: boolean; cases?: { description: string; passed: boolean; expected: string; actual: string; error?: string }[]; frames?: TraceFrame[] };
export type Attempt = { exerciseId: string; at: number; correct: boolean; attempts: number; difficulty: Difficulty; hintUsed: boolean };
export type LearnerState = { version: 2; nickname: string; confidence: Difficulty; xp: number; completed: string[]; attempts: Attempt[]; drafts: Record<string,string>; exams: Record<string,unknown>; preferences: { reducedMotion: boolean }; journey: JourneyProgress };
