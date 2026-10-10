import { describe, expect, it } from "vitest";
import { gradeQuiz, toPublicQuiz, validateQuiz, type GeneratedQuiz } from "@/lib/quiz";

const quiz: GeneratedQuiz = {
  questions: Array.from({ length: 5 }, (_, i) => ({
    question: `Q${i + 1}`,
    options: ["a", "b", "c", "d"],
    correctIndex: i % 4,
    explanation: `because ${i}`,
  })),
  shortAnswer: { question: "Explain", rubric: "2 if good", sampleAnswer: "model" },
};

describe("quiz validation", () => {
  it("accepts a well-formed quiz", () => {
    expect(validateQuiz(quiz)).toBeNull();
  });
  it("rejects wrong question counts, option counts and answer keys", () => {
    expect(validateQuiz({ ...quiz, questions: quiz.questions.slice(1) })).toMatch(/5 questions/);
    expect(validateQuiz({ ...quiz, questions: [{ ...quiz.questions[0], options: ["a"] }, ...quiz.questions.slice(1)] })).toMatch(/options/);
    expect(validateQuiz({ ...quiz, questions: [{ ...quiz.questions[0], correctIndex: 4 }, ...quiz.questions.slice(1)] })).toMatch(/answer key/);
  });
});

describe("public quiz", () => {
  it("never leaks the answer key, explanations or rubric", () => {
    const pub = toPublicQuiz("a1", quiz);
    const json = JSON.stringify(pub);
    expect(json).not.toContain("correctIndex");
    expect(json).not.toContain("because");
    expect(json).not.toContain("rubric");
    expect(json).not.toContain("model");
  });
});

describe("grading", () => {
  const key = quiz.questions.map((q) => q.correctIndex);

  it("gives 100% for a perfect quiz", () => {
    const r = gradeQuiz(quiz, key, { points: 2, feedback: "great" });
    expect(r.score).toBe(100);
    expect(r.passed).toBe(true);
  });

  it("passes at 5/7 (71%) and fails at 4/7 (57%)", () => {
    expect(gradeQuiz(quiz, key, { points: 0, feedback: "" }).score).toBe(71);
    const oneWrong = [...key.slice(0, 4), (key[4] + 1) % 4];
    const r = gradeQuiz(quiz, oneWrong, { points: 0, feedback: "" });
    expect(r.score).toBe(57);
    expect(r.passed).toBe(false);
  });

  it("counts unanswered questions as wrong and clamps short-answer points", () => {
    const r = gradeQuiz(quiz, [null, null, null, null, null], { points: 99, feedback: "" });
    expect(r.mcqCorrect).toBe(0);
    expect(r.shortAnswer.points).toBe(2);
    expect(gradeQuiz(quiz, key, { points: -3, feedback: "" }).shortAnswer.points).toBe(0);
  });
});
