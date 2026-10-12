import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, fallbackParams, MODEL } from "../anthropic";
import { buildHeadmasterPrompt, cleanHeadmasterReply, HeadmasterReplySchema, type HeadmasterReply } from "./headmaster-rules";
import type { Headmaster } from "./registry";

export class HeadmasterRefusal extends Error {}

export async function askHeadmaster(opts: {
  headmaster: Headmaster;
  context: Omit<Parameters<typeof buildHeadmasterPrompt>[0], "headmaster">;
  history: Anthropic.Beta.BetaMessageParam[];
  message: string;
}): Promise<HeadmasterReply> {
  const response = await anthropic.beta.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "low", format: zodOutputFormat(HeadmasterReplySchema) },
    system: buildHeadmasterPrompt({ headmaster: opts.headmaster, ...opts.context }),
    messages: [...opts.history, { role: "user", content: opts.message }],
    ...fallbackParams(),
  });
  if (response.stop_reason === "refusal") throw new HeadmasterRefusal("I can't help with that one. Try asking another way.");
  if (!response.parsed_output) throw new Error("Headmaster reply could not be parsed.");
  return cleanHeadmasterReply(response.parsed_output);
}
