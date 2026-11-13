import { useSyncExternalStore } from "react";
import type { ExamAttempt } from "./exam";

export type Result = "right" | "wrong";
export interface Question {
  id: string;
  sessionId: string;
  subject: string;
  question: string;
  answer: string;
  seen: number;
  right: number;
  wrong: number;
  last?: Result;
}
export interface Session {
  id: string;
  name: string;
  subjects: string[];
  createdAt: number;
}
export interface AppState {
  sessions: Session[];
  questions: Question[];
  onboarded: boolean;
  examAttempt?: ExamAttempt;
}
export interface Backup {
  at: number;
  state: AppState;
}

const KEY = "blocus-data-v1";
const BACKUP_KEY = "blocus-backups-v1";
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function demo(): AppState {
  const sid = "demo-session";
  const q = (subject: string, question: string, answer: string): Question => ({
    id: uid(), sessionId: sid, subject, question, answer, seen: 0, right: 0, wrong: 0,
  });
  return {
    onboarded: false,
    sessions: [{ id: sid, name: "Session d'essai - Janvier 2024", subjects: ["Algorithmique", "Mathématiques", "Systèmes"], createdAt: Date.now() }],
    questions: [
      q("Algorithmique", "Quelle est la complexité temporelle de la recherche dichotomique dans un tableau trié de taille $n$ ?", "La recherche dichotomique divise l'intervalle de recherche par deux à chaque étape. Le nombre d'étapes est donc :\n\n$$T(n) = T(n/2) + O(1) \\Rightarrow T(n) = O(\\log n)$$"),
      q("Algorithmique", "Que renvoie cette fonction Python pour `f(5)` ?\n\n```python\ndef f(n):\n    if n <= 1:\n        return 1\n    return n * f(n - 1)\n```", "Il s'agit de la factorielle récursive : $5! = 5 \\times 4 \\times 3 \\times 2 \\times 1 = 120$.\n\nLa fonction renvoie donc **120**."),
      q("Mathématiques", "Calculer la somme $\\sum_{k=1}^{n} k$.", "Par la formule de Gauss :\n\n$$\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}$$\n\nPreuve : on écrit la somme dans les deux sens et on additionne terme à terme, on obtient $n$ fois $(n+1)$."),
      q("Mathématiques", "Montrer que $\\sqrt{2}$ est irrationnel.", "Par l'absurde : supposons $\\sqrt{2} = \\frac{p}{q}$ avec $p, q$ premiers entre eux. Alors $p^2 = 2q^2$, donc $p$ est pair, $p = 2r$. Il vient $q^2 = 2r^2$, donc $q$ est pair aussi : contradiction avec $p, q$ premiers entre eux."),
      q("Systèmes", "Quelle est la différence entre un processus et un thread ?", "Un **processus** possède son propre espace mémoire, ses ressources et au moins un thread.\n\nUn **thread** est un fil d'exécution à l'intérieur d'un processus : les threads d'un même processus partagent la mémoire (tas, variables globales) mais ont chacun leur pile et leurs registres."),
    ],
  };
}

let state: AppState = demo();
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch {
    /* keep demo */
  }
}

export function getBackups(): Backup[] {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]");
  } catch {
    return [];
  }
}

function persist(prev: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state));
  const backups = getBackups();
  // Keep at most one restore point every 2 minutes, last 3 kept.
  if (!backups[0] || Date.now() - backups[0].at > 2 * 60 * 1000) {
    localStorage.setItem(BACKUP_KEY, JSON.stringify([{ at: Date.now(), state: prev }, ...backups].slice(0, 3)));
  }
}

export function setState(fn: (s: AppState) => AppState) {
  load();
  const prev = state;
  state = fn(state);
  persist(prev);
  listeners.forEach((l) => l());
}

export function restoreBackup(b: Backup) {
  setState(() => b.state);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const serverSnap = demo();

export function useApp(): AppState {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => serverSnap,
  );
}

/** Order for the automatic session: never seen, then failed (most failed first), then mastered. */
export function autoOrder(qs: Question[]): Question[] {
  const unseen = qs.filter((q) => q.seen === 0);
  const failed = qs.filter((q) => q.seen > 0 && q.last === "wrong").sort((a, b) => b.wrong - a.wrong);
  const mastered = qs.filter((q) => q.seen > 0 && q.last !== "wrong");
  return [...unseen, ...failed, ...mastered];
}

export interface QuestionFilter {
  sessionId?: string | undefined;
  subject?: string | undefined;
  errorsOnly?: boolean;
}

/** A view of the original questions, never a separate error collection. */
export function selectQuestions(s: AppState, filter: QuestionFilter = {}): Question[] {
  return s.questions.filter((q) =>
    (!filter.sessionId || q.sessionId === filter.sessionId) &&
    (!filter.subject || q.subject === filter.subject) &&
    (!filter.errorsOnly || q.wrong > 0),
  );
}

export function sessionSubjects(s: AppState, sessionId: string): string[] {
  const session = s.sessions.find((x) => x.id === sessionId);
  if (!session) return [];
  return Array.from(new Set([...session.subjects, ...selectQuestions(s, { sessionId }).map((q) => q.subject)]));
}

/** A chosen subject overrides text labels; omitted subject preserves multi-subject imports. */
export function importQuestions(s: AppState, sessionId: string, parsed: ParsedQ[], subject?: string): AppState {
  if (!s.sessions.some((x) => x.id === sessionId)) return s;
  const questions = parsed.map((q) => ({
    ...q, subject: subject?.trim() || q.subject, sessionId, id: uid(), seen: 0, right: 0, wrong: 0,
  }));
  return {
    ...s,
    sessions: s.sessions.map((x) => x.id === sessionId
      ? { ...x, subjects: Array.from(new Set([...x.subjects, ...questions.map((q) => q.subject)])) }
      : x),
    questions: [...s.questions, ...questions],
  };
}

export function grade(id: string, r: Result) {
  setState((s) => ({
    ...s,
    questions: s.questions.map((q) =>
      q.id === id ? { ...q, seen: q.seen + 1, last: r, right: q.right + (r === "right" ? 1 : 0), wrong: q.wrong + (r === "wrong" ? 1 : 0) } : q,
    ),
  }));
}

export function mastery(qs: Question[]) {
  const right = qs.filter((q) => q.last === "right").length;
  const wrong = qs.filter((q) => q.last === "wrong").length;
  return { total: qs.length, right, wrong, unseen: qs.length - right - wrong, percent: qs.length ? Math.round(right / qs.length * 100) : 0 };
}

export function editQuestion(s: AppState, id: string, question: string, answer: string): AppState {
  if (!question.trim() || !answer.trim()) return s;
  return { ...s, questions: s.questions.map((q) => q.id === id ? { ...q, question: question.trim(), answer: answer.trim() } : q) };
}

export interface ParsedQ {
  subject: string;
  question: string;
  answer: string;
}

/** Parses the "### Matière / ### Question / ### Réponse" format produced by the AI prompt. */
export function parseImport(text: string): ParsedQ[] {
  const out: ParsedQ[] = [];
  let subject = "Général";
  const parts = text.replace(/\r/g, "").split(/^###\s*/m);
  let cur: Partial<ParsedQ> | null = null;
  for (const part of parts) {
    const nl = part.indexOf("\n");
    const head = (nl === -1 ? part : part.slice(0, nl)).trim();
    const body = (nl === -1 ? "" : part.slice(nl + 1)).replace(/^\s*-{3,}\s*$/gm, "").trim();
    const h = head.toLowerCase();
    if (h.startsWith("mati")) {
      subject = head.split(":").slice(1).join(":").trim().replace(/^\[|\]$/g, "") || body.split("\n")[0] || subject;
    } else if (h.startsWith("question")) {
      cur = { subject, question: body };
    } else if (h.startsWith("r") && cur?.question) {
      out.push({ subject: cur.subject ?? subject, question: cur.question, answer: body });
      cur = null;
    }
  }
  return out.filter((q) => q.question && q.answer);
}

export interface ShareFile {
  kind: "blocus-share";
  version: 1;
  sessions: { name: string; subjects: string[]; questions: ParsedQ[] }[];
}

export function buildShare(s: AppState): ShareFile {
  return {
    kind: "blocus-share",
    version: 1,
    sessions: s.sessions.map((se) => ({
      name: se.name,
      subjects: se.subjects,
      questions: s.questions.filter((q) => q.sessionId === se.id).map(({ subject, question, answer }) => ({ subject, question, answer })),
    })),
  };
}

/** Merges a friend's file: same-name sessions are reused, duplicate questions skipped, progress untouched. */
export function mergeShare(s: AppState, f: ShareFile): { state: AppState; added: number } {
  let added = 0;
  const sessions = s.sessions.map((se) => ({ ...se, subjects: [...se.subjects] }));
  const questions = [...s.questions];
  for (const fs of f.sessions) {
    let se = sessions.find((x) => x.name === fs.name);
    if (!se) {
      se = { id: uid(), name: fs.name, subjects: [], createdAt: Date.now() };
      sessions.push(se);
    }
    const target = se;
    target.subjects = Array.from(new Set([...target.subjects, ...fs.subjects, ...fs.questions.map((q) => q.subject)]));
    for (const q of fs.questions) {
      if (questions.some((x) => x.sessionId === target.id && x.subject === q.subject && x.question === q.question)) continue;
      questions.push({ ...q, id: uid(), sessionId: target.id, seen: 0, right: 0, wrong: 0 });
      added++;
    }
  }
  return { state: { ...s, sessions, questions }, added };
}

export function download(name: string, content: string, type = "application/json") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
