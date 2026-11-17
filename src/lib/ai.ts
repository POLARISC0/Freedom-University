import "server-only";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Lesson, Specialist } from "@/content/types";
import { anthropic, fallbackParams, MODEL } from "./anthropic";
import { FeedBatchSchema, type FeedBatch } from "./feed-rules";
import type { Headline } from "./news";
import { buildFeedPrompt, buildMemoryPrompt, buildNewsBriefingPrompt, buildQuizPrompt } from "./prompts";
import { GeneratedQuizSchema, validateQuiz, type GeneratedQuiz } from "./quiz";

export class AiRefusalError extends Error {}

function specialistSystem(specialist: Specialist): string {
  return `You are ${specialist.name}, the ${specialist.role} at Freedom University. ${specialist.personality} You provide education only, never personalised financial, tax or legal advice, and you never name real people.`;
}

function textOf(message: { content: { type: string; text?: string }[] }): string {
  return message.content
    .flatMap((b) => (b.type === "text" && b.text ? [b.text] : []))
    .join("")
    .trim();
}

/** Ask the specialist to write a fresh quiz. Retries once if it breaks the format rules. */
export async function generateQuiz(opts: {
  specialist: Specialist;
  lesson: Lesson;
  previousQuestions: string[];
}): Promise<GeneratedQuiz> {
  let lastProblem = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await anthropic.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: zodOutputFormat(GeneratedQuizSchema) },
      system: specialistSystem(opts.specialist),
      messages: [{ role: "user", content: buildQuizPrompt(opts) }],
      ...fallbackParams(),
    });
    if (response.stop_reason === "refusal") throw new AiRefusalError("The specialist declined to write this quiz.");
    const quiz = response.parsed_output;
    lastProblem = quiz ? (validateQuiz(quiz) ?? "") : "unparseable output";
    if (quiz && !lastProblem) return quiz;
  }
  throw new Error(`Quiz generation failed: ${lastProblem}`);
}

export async function writeMemoryNotes(opts: {
  specialist: Specialist;
  notes: string | null;
  transcript: string;
}): Promise<string | null> {
  const response = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low" },
    system: specialistSystem(opts.specialist),
    messages: [{ role: "user", content: buildMemoryPrompt(opts) }],
    ...fallbackParams(),
  });
  if (response.stop_reason === "refusal") return null;
  return textOf(response) || null;
}

export async function writeNewsBriefing(opts: {
  specialist: Specialist;
  today: string;
  headlines: Headline[];
}): Promise<string> {
  const stream = anthropic.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    system: specialistSystem(opts.specialist),
    messages: [{ role: "user", content: buildNewsBriefingPrompt(opts) }],
    ...fallbackParams(),
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new AiRefusalError("The specialist declined to write today's briefing.");
  return textOf(message);
}

export async function writeFeedBatch(opts: {
  today: string;
  poster: Specialist;
  replier: Specialist | null;
  headlines: Headline[];
  recentPosts: string[];
}): Promise<FeedBatch | null> {
  const response = await anthropic.beta.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "low", format: zodOutputFormat(FeedBatchSchema) },
    messages: [{ role: "user", content: buildFeedPrompt(opts) }],
    ...fallbackParams(),
  });
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output;
}
