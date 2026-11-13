import { describe, expect, it } from "vitest";
import { chooseExamQuestions, examRemaining, examScore, finishExam, saveExamResults, type ExamAttempt } from "./exam";
import { editQuestion, mastery, selectQuestions, type AppState } from "./store";

const state: AppState = {
  onboarded: true,
  sessions: [{ id: "janvier", name: "Janvier", subjects: ["Maths", "Physique"], createdAt: 0 }, { id: "juin", name: "Juin", subjects: ["Maths"], createdAt: 0 }],
  questions: [
    { id: "a", sessionId: "janvier", subject: "Maths", question: "Q", answer: "R", seen: 2, right: 1, wrong: 1, last: "right" },
    { id: "b", sessionId: "janvier", subject: "Physique", question: "Q2", answer: "R2", seen: 1, right: 0, wrong: 1, last: "wrong" },
    { id: "c", sessionId: "juin", subject: "Maths", question: "Q3", answer: "R3", seen: 0, right: 0, wrong: 0 },
  ],
};
const attempt: ExamAttempt = { sessionId: "janvier", ids: ["a", "b"], responses: {}, results: { a: "right", b: "wrong" }, startedAt: 1000, deadline: 901000 };

describe("examen blanc", () => {
  it("selects only the chosen session and subject", () => {
    expect(chooseExamQuestions(selectQuestions(state, { sessionId: "janvier", subject: "Maths" }), 5)).toEqual(["a"]);
  });
  it("supports 5, 10, 20 or all questions without duplicates", () => {
    const first = state.questions[0];
    if (!first) throw new Error("Missing test question");
    const qs = Array.from({ length: 25 }, (_, i) => ({ ...first, id: String(i) }));
    for (const count of [5, 10, 20, 25]) {
      const ids = chooseExamQuestions(qs, count);
      expect(ids).toHaveLength(count); expect(new Set(ids).size).toBe(count);
    }
  });
  it("uses absolute deadlines for 15, 30 and 60 minutes", () => {
    for (const minutes of [15, 30, 60]) expect(examRemaining({ ...attempt, deadline: 1000 + minutes * 60000 }, 61000)).toBe((minutes - 1) * 60000);
    expect(examRemaining(attempt, 1000000)).toBe(0);
  });
  it("supports no time limit", () => {
    expect(examRemaining({ ...attempt, deadline: null }, 99999999)).toBeNull();
  });
  it("finishes at the deadline even after a suspended tab or reload", () => {
    expect(finishExam(attempt, 1000000).finishedAt).toBe(901000);
  });
  it("calculates an indicative score on 20", () => {
    expect(examScore(attempt)).toBe(10);
    expect(examScore({ ...attempt, results: { a: "right", b: "right" } })).toBe(20);
  });
  it("does not alter progress during the exam", () => {
    expect(saveExamResults(state, attempt)).toBe(state);
  });
  it("records grades once and adds mistakes without duplicating questions", () => {
    const updated = saveExamResults(state, finishExam(attempt, 5000));
    expect(updated.questions).toHaveLength(3);
    expect(updated.questions[0]).toMatchObject({ seen: 3, right: 2, wrong: 1 });
    expect(updated.questions[1]).toMatchObject({ seen: 2, wrong: 2, last: "wrong" });
    expect(updated.questions[2]).toBe(state.questions[2]);
    expect(selectQuestions(updated, { errorsOnly: true }).map((q) => q.id)).toEqual(["a", "b"]);
    expect(saveExamResults(updated, updated.examAttempt ?? attempt)).toBe(updated);
  });
});

describe("maîtrise et retouche", () => {
  it("counts latest correct, latest wrong and unseen separately", () => {
    expect(mastery(state.questions)).toEqual({ total: 3, right: 1, wrong: 1, unseen: 1, percent: 33 });
    expect(mastery([])).toEqual({ total: 0, right: 0, wrong: 0, unseen: 0, percent: 0 });
  });
  it("edits text without changing session, subject, identity or progress", () => {
    const updated = editQuestion(state, "a", " Nouvelle question ", " Nouvelle réponse ");
    expect(updated.questions[0]).toEqual({ ...state.questions[0], question: "Nouvelle question", answer: "Nouvelle réponse" });
    expect(updated.questions[1]).toBe(state.questions[1]);
    expect(state.questions[0]?.question).toBe("Q");
  });
  it("rejects blank edits", () => {
    expect(editQuestion(state, "a", " ", "R")).toBe(state);
    expect(editQuestion(state, "a", "Q", " ")).toBe(state);
  });
});