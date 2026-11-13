import { describe, expect, it } from "vitest";
import { autoOrder, parseImport, mergeShare, type Question, type AppState } from "./store";

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
