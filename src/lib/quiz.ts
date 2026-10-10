import { z } from "zod";
import { PASS_THRESHOLD } from "./progress";

export const MCQ_COUNT = 5;
export const OPTION_COUNT = 4;
/** The short-answer question is graded 0, 1 or 2 points. */
export const SHORT_ANSWER_MAX = 2;

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
  shortAnswer: z.object({
    question: z.string(),
    rubric: z.string(),
    sampleAnswer: z.string(),
  }),
});

export type GeneratedQuiz = z.infer<typeof GeneratedQuizSchema>;

export const ShortAnswerGradeSchema = z.object({
  points: z.number().int(),
  feedback: z.string(),
});

export type ShortAnswerGrade = z.infer<typeof ShortAnswerGradeSchema>;

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

/** What the browser receives: no answer key, explanations or rubric. */
export interface PublicQuiz {
  attemptId: string;
  questions: { question: string; options: string[] }[];
  shortAnswer: { question: string };
}

export function toPublicQuiz(attemptId: string, quiz: GeneratedQuiz): PublicQuiz {
  return {
    attemptId,
    questions: quiz.questions.map(({ question, options }) => ({ question, options })),
    shortAnswer: { question: quiz.shortAnswer.question },
  };
}

export interface QuizResult {
  score: number;
  passed: boolean;
  mcqCorrect: number;
  questions: { correct: boolean; chosenIndex: number | null; correctIndex: number; explanation: string }[];
  shortAnswer: { points: number; maxPoints: number; feedback: string; sampleAnswer: string };
}

export function clampShortAnswerPoints(points: number): number {
  return Math.max(0, Math.min(SHORT_ANSWER_MAX, Math.round(points)));
}

/** Combine the multiple-choice key with the professor's short-answer grade into a percentage. */
export function gradeQuiz(
  quiz: GeneratedQuiz,
  answers: (number | null)[],
  shortGrade: ShortAnswerGrade,
): QuizResult {
  const questions = quiz.questions.map((q, i) => {
    const chosenIndex = answers[i] ?? null;
    return {
      correct: chosenIndex === q.correctIndex,
      chosenIndex,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    };
  });
  const mcqCorrect = questions.filter((q) => q.correct).length;
  const shortPoints = clampShortAnswerPoints(shortGrade.points);
  const maxPoints = quiz.questions.length + SHORT_ANSWER_MAX;
  const score = Math.round(((mcqCorrect + shortPoints) / maxPoints) * 100);
  return {
    score,
    passed: score >= PASS_THRESHOLD,
    mcqCorrect,
    questions,
    shortAnswer: {
      points: shortPoints,
      maxPoints: SHORT_ANSWER_MAX,
      feedback: shortGrade.feedback,
      sampleAnswer: quiz.shortAnswer.sampleAnswer,
    },
  };
}
