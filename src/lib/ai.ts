import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { CourseModule, Professor } from "@/content/types";
import { anthropic, fallbackParams, MODEL } from "./anthropic";
import type { Headline } from "./news";
import {
  buildNewsBriefingPrompt,
  buildQuizPrompt,
  buildShortAnswerGradingPrompt,
} from "./prompts";
import {
  GeneratedQuizSchema,
  ShortAnswerGradeSchema,
  validateQuiz,
  type GeneratedQuiz,
  type ShortAnswerGrade,
} from "./quiz";

export class AiRefusalError extends Error {}

function professorSystem(professor: Professor): string {
  return `You are ${professor.name}, who teaches "${professor.course}" at Freedom University. ${professor.persona} You provide education only, never personalised financial, tax or legal advice.`;
}

/** Ask the professor to write a fresh quiz. Retries once if the quiz breaks the format rules. */
export async function generateQuiz(opts: {
  professor: Professor;
  module: CourseModule;
  previousQuestions: string[];
}): Promise<GeneratedQuiz> {
  let lastProblem = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await anthropic.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: zodOutputFormat(GeneratedQuizSchema) },
      system: professorSystem(opts.professor),
      messages: [{ role: "user", content: buildQuizPrompt(opts) }],
      ...fallbackParams(),
    });
    if (response.stop_reason === "refusal") throw new AiRefusalError("The professor declined to write this quiz.");
    const quiz = response.parsed_output;
    if (!quiz) {
      lastProblem = "unparseable output";
      continue;
    }
    const problem = validateQuiz(quiz);
    if (!problem) return quiz;
    lastProblem = problem;
  }
  throw new Error(`Quiz generation failed: ${lastProblem}`);
}

export async function gradeShortAnswer(opts: {
  professor: Professor;
  module: CourseModule;
  question: string;
  rubric: string;
  sampleAnswer: string;
  studentAnswer: string;
}): Promise<ShortAnswerGrade> {
  // Nothing to grade: skip the API call.
  if (!opts.studentAnswer.trim()) {
    return { points: 0, feedback: "No answer was given for this question." };
  }
  const response = await anthropic.beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(ShortAnswerGradeSchema) },
    system: professorSystem(opts.professor),
    messages: [{ role: "user", content: buildShortAnswerGradingPrompt(opts) }],
    ...fallbackParams(),
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return { points: 0, feedback: "The professor could not grade this answer automatically." };
  }
  return response.parsed_output;
}

export async function writeNewsBriefing(opts: {
  professor: Professor;
  today: string;
  headlines: Headline[];
}): Promise<string> {
  const stream = anthropic.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    system: professorSystem(opts.professor),
    messages: [{ role: "user", content: buildNewsBriefingPrompt(opts) }],
    ...fallbackParams(),
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new AiRefusalError("The professor declined to write today's briefing.");
  return message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
}
