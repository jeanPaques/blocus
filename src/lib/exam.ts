import type { AppState, Question, Result } from "./store";

export interface ExamAttempt {
  sessionId: string;
  subject?: string;
  ids: string[];
  responses: Record<string, string>;
  results: Record<string, Result>;
  startedAt: number;
  deadline: number | null;
  finishedAt?: number;
  saved?: boolean;
}

export function chooseExamQuestions(questions: Question[], count: number, random = Math.random): string[] {
  const pool = [...questions];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = pool[i]; const b = pool[j];
    if (a && b) { pool[i] = b; pool[j] = a; }
  }
  return pool.slice(0, Math.max(0, Math.min(count, pool.length))).map((q) => q.id);
}

export function examRemaining(attempt: ExamAttempt, now: number): number | null {
  return attempt.deadline === null ? null : Math.max(0, attempt.deadline - now);
}

export function examScore(attempt: ExamAttempt): number {
  return attempt.ids.length ? 20 * attempt.ids.filter((id) => attempt.results[id] === "right").length / attempt.ids.length : 0;
}

export function finishExam(attempt: ExamAttempt, now: number): ExamAttempt {
  return { ...attempt, finishedAt: attempt.finishedAt ?? Math.min(now, attempt.deadline ?? now) };
}

export function saveExamResults(state: AppState, attempt: ExamAttempt): AppState {
  if (attempt.saved || attempt.finishedAt === undefined) return state;
  return {
    ...state,
    examAttempt: { ...attempt, saved: true },
    questions: state.questions.map((q) => {
      if (!attempt.ids.includes(q.id)) return q;
      const result = attempt.results[q.id] ?? "wrong";
      return { ...q, seen: q.seen + 1, last: result, right: q.right + (result === "right" ? 1 : 0), wrong: q.wrong + (result === "wrong" ? 1 : 0) };
    }),
  };
}