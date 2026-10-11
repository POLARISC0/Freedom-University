import { z } from "zod";
import { PASS_THRESHOLD } from "./progress";

export const MCQ_COUNT = 4;
export const OPTION_COUNT = 4;

// Shape Claude must produce when writing a quiz. Lengths are checked in
// validateQuiz because structured outputs don't enforce array bounds.
export const GeneratedQuizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number().int(),
      explanation: z.string(),
    }),
  ),
});

export type GeneratedQuiz = z.infer<typeof GeneratedQuizSchema>;

export function validateQuiz(quiz: GeneratedQuiz): string | null {
  if (quiz.questions.length !== MCQ_COUNT) {
    return `expected ${MCQ_COUNT} questions, got ${quiz.questions.length}`;
  }
  for (const [i, q] of quiz.questions.entries()) {
    if (q.options.length !== OPTION_COUNT) return `question ${i + 1} needs ${OPTION_COUNT} options`;
    if (q.correctIndex < 0 || q.correctIndex >= OPTION_COUNT) {
      return `question ${i + 1} has an out-of-range answer key`;
    }
  }
  return null;
}

/** What the browser receives: no answer key or explanations. */
export interface PublicQuiz {
  attemptId: string;
  questions: { question: string; options: string[] }[];
}

export function toPublicQuiz(attemptId: string, quiz: GeneratedQuiz): PublicQuiz {
  return {
    attemptId,
    questions: quiz.questions.map(({ question, options }) => ({ question, options })),
  };
}

export interface QuizResult {
  score: number;
  passed: boolean;
  correct: number;
  questions: { correct: boolean; chosenIndex: number | null; correctIndex: number; explanation: string }[];
}

export function gradeQuiz(quiz: GeneratedQuiz, answers: (number | null)[]): QuizResult {
  const questions = quiz.questions.map((q, i) => {
    const chosenIndex = answers[i] ?? null;
    return { correct: chosenIndex === q.correctIndex, chosenIndex, correctIndex: q.correctIndex, explanation: q.explanation };
  });
  const correct = questions.filter((q) => q.correct).length;
  const score = Math.round((correct / quiz.questions.length) * 100);
  return { score, passed: score >= PASS_THRESHOLD, correct, questions };
}
