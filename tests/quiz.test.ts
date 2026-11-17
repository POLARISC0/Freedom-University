import { describe, expect, it } from "vitest";
import { gradeQuiz, MCQ_COUNT, toPublicQuiz, validateQuiz, type GeneratedQuiz } from "@/lib/quiz";

const quiz: GeneratedQuiz = {
  questions: Array.from({ length: MCQ_COUNT }, (_, i) => ({
    question: `Q${i + 1}`,
    options: ["a", "b", "c", "d"],
    correctIndex: i % 4,
    explanation: `because ${i}`,
  })),
};
const key = quiz.questions.map((q) => q.correctIndex);

describe("quiz validation", () => {
  it("accepts a well-formed four-question quiz", () => {
    expect(MCQ_COUNT).toBe(4);
    expect(validateQuiz(quiz)).toBeNull();
  });
  it("rejects wrong question counts, option counts and answer keys", () => {
    expect(validateQuiz({ questions: quiz.questions.slice(1) })).toMatch(/4 questions/);
    expect(validateQuiz({ questions: [{ ...quiz.questions[0], options: ["a"] }, ...quiz.questions.slice(1)] })).toMatch(/options/);
    expect(validateQuiz({ questions: [{ ...quiz.questions[0], correctIndex: 4 }, ...quiz.questions.slice(1)] })).toMatch(/answer key/);
  });
});

describe("public quiz", () => {
  it("never leaks the answer key or explanations", () => {
    const json = JSON.stringify(toPublicQuiz("a1", quiz));
    expect(json).not.toContain("correctIndex");
    expect(json).not.toContain("because");
  });
});

describe("grading", () => {
  it("gives 100% for a perfect quiz", () => {
    expect(gradeQuiz(quiz, key)).toMatchObject({ score: 100, passed: true, correct: 4 });
  });
  it("passes at 3/4 and fails at 2/4", () => {
    const oneWrong = [...key.slice(0, 3), (key[3] + 1) % 4];
    expect(gradeQuiz(quiz, oneWrong)).toMatchObject({ score: 75, passed: true });
    const twoWrong = [...key.slice(0, 2), (key[2] + 1) % 4, (key[3] + 1) % 4];
    expect(gradeQuiz(quiz, twoWrong)).toMatchObject({ score: 50, passed: false });
  });
  it("counts unanswered questions as wrong", () => {
    const r = gradeQuiz(quiz, [null, null, null, null]);
    expect(r.correct).toBe(0);
    expect(r.questions[0]).toMatchObject({ correct: false, chosenIndex: null, correctIndex: 0 });
  });
});
