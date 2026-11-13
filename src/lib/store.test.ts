import { describe, expect, it } from "vitest";
import { autoOrder, parseImport, mergeShare, selectQuestions, sessionSubjects, importQuestions, buildShare, type Question, type AppState } from "./store";

const base = { sessionId: "s", subject: "A", question: "", answer: "", right: 0, wrong: 0 };
describe("révision", () => {
  it("orders unseen, then failed, then mastered", () => {
    const qs: Question[] = [
      { ...base, id: "m", seen: 2, last: "right" },
      { ...base, id: "f", seen: 1, wrong: 1, last: "wrong" },
      { ...base, id: "u", seen: 0 },
    ];
    expect(autoOrder(qs).map((q) => q.id)).toEqual(["u", "f", "m"]);
  });
  it("parses the AI prompt format", () => {
    const t = "---\n### Matière : Algo\n### Question\nQ1 ?\n### Réponse\nR1\n---\n### Question\nQ2\n### Réponse\nR2\n---";
    expect(parseImport(t)).toEqual([
      { subject: "Algo", question: "Q1 ?", answer: "R1" },
      { subject: "Algo", question: "Q2", answer: "R2" },
    ]);
  });
  it("merging a friend's file keeps existing progress", () => {
    const s: AppState = { onboarded: true, sessions: [{ id: "s", name: "J24", subjects: ["A"], createdAt: 0 }], questions: [{ ...base, id: "x", question: "Q", seen: 3, last: "right" }] };
    const { state, added } = mergeShare(s, { kind: "blocus-share", version: 1, sessions: [{ name: "J24", subjects: ["A"], questions: [{ subject: "A", question: "Q", answer: "" }, { subject: "A", question: "Q2", answer: "R" }] }] });
    expect(added).toBe(1);
    expect(state.questions.find((q) => q.id === "x")?.seen).toBe(3);
  });
});

const exams: AppState = {
  onboarded: true,
  sessions: [
    { id: "janvier", name: "Janvier", subjects: ["Maths", "Physique", "Chimie"], createdAt: 0 },
    { id: "juin", name: "Juin", subjects: ["Maths", "Informatique"], createdAt: 0 },
  ],
  questions: [
    { ...base, id: "jm", sessionId: "janvier", subject: "Maths", question: "Calculer", answer: "2", seen: 2, wrong: 1, last: "right" },
    { ...base, id: "jp", sessionId: "janvier", subject: "Physique", question: "Force ?", answer: "ma", seen: 1, wrong: 1, last: "wrong" },
    { ...base, id: "jc", sessionId: "janvier", subject: "Chimie", seen: 0 },
    { ...base, id: "um", sessionId: "juin", subject: "Maths", question: "Calculer", answer: "2", seen: 3, wrong: 2, last: "wrong" },
    { ...base, id: "ui", sessionId: "juin", subject: "Informatique", seen: 0 },
  ],
};

describe("sessions indépendantes et carnet centralisé", () => {
  it("keeps every session's subjects independent", () => {
    expect(sessionSubjects(exams, "janvier")).toEqual(["Maths", "Physique", "Chimie"]);
    expect(sessionSubjects(exams, "juin")).toEqual(["Maths", "Informatique"]);
  });
  it("reviews all subjects in January without June questions", () => {
    expect(selectQuestions(exams, { sessionId: "janvier" }).map((q) => q.id)).toEqual(["jm", "jp", "jc"]);
  });
  it("reviews Maths in January without Maths in June", () => {
    expect(selectQuestions(exams, { sessionId: "janvier", subject: "Maths" }).map((q) => q.id)).toEqual(["jm"]);
  });
  it("imports only into the chosen session and subject", () => {
    const state = importQuestions(exams, "juin", [{ subject: "Physique", question: "Q", answer: "R" }], "Maths");
    expect(state.questions.at(-1)).toMatchObject({ sessionId: "juin", subject: "Maths", seen: 0, right: 0, wrong: 0 });
    expect(selectQuestions(state, { sessionId: "janvier" })).toEqual(selectQuestions(exams, { sessionId: "janvier" }));
    expect(state.sessions[0]).toBe(exams.sessions[0]);
    expect(sessionSubjects(state, "juin")).toEqual(["Maths", "Informatique"]);
  });
  it("new empty sessions do not acquire questions from shared subjects", () => {
    const state = { ...exams, sessions: [...exams.sessions, { id: "septembre", name: "Septembre", subjects: ["Maths"], createdAt: 0 }] };
    expect(selectQuestions(state, { sessionId: "septembre" })).toEqual([]);
  });
  it("global errors include all previously wrong questions, even now correct, without copying", () => {
    const errors = selectQuestions(exams, { errorsOnly: true });
    expect(errors.map((q) => q.id)).toEqual(["jm", "jp", "um"]);
    expect(errors[0]).toBe(exams.questions[0]);
    expect(exams.questions).toHaveLength(5);
  });
  it("filters errors by January", () => {
    expect(selectQuestions(exams, { errorsOnly: true, sessionId: "janvier" }).map((q) => q.id)).toEqual(["jm", "jp"]);
  });
  it("filters errors by Maths in January", () => {
    expect(selectQuestions(exams, { errorsOnly: true, sessionId: "janvier", subject: "Maths" }).map((q) => q.id)).toEqual(["jm"]);
  });
  it("preserves legacy multi-subject text imports when no override is chosen", () => {
    const state = importQuestions(exams, "juin", [{ subject: "Physique", question: "Q", answer: "R" }]);
    expect(state.questions.at(-1)?.subject).toBe("Physique");
    expect(sessionSubjects(state, "janvier")).toEqual(["Maths", "Physique", "Chimie"]);
  });
  it("sharing preserves session associations and existing progress without mutating restore points", () => {
    const previous = JSON.stringify(exams);
    const { state, added } = mergeShare(exams, buildShare(exams));
    expect(added).toBe(0);
    expect(state.questions.find((q) => q.id === "um")?.wrong).toBe(2);
    expect(JSON.stringify(exams)).toBe(previous);
  });
  it("sharing does not collapse the same prompt from different subjects", () => {
    const { state, added } = mergeShare(exams, { kind: "blocus-share", version: 1, sessions: [{ name: "Janvier", subjects: ["Chimie"], questions: [{ subject: "Chimie", question: "Calculer", answer: "3" }] }] });
    expect(added).toBe(1);
    expect(state.questions.at(-1)).toMatchObject({ sessionId: "janvier", subject: "Chimie", question: "Calculer" });
  });
});
