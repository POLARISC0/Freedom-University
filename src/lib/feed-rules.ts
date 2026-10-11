import { z } from "zod";

export const FEED_POST_MAX = 280;
const MAX_POSTS = 3;

// What Claude writes for one feed update: a post, optionally followed by replies
// from other specialists. `headlines` are 1-based numbers into the headline list.
export const FeedBatchSchema = z.object({
  posts: z.array(
    z.object({
      speaker: z.string(),
      text: z.string(),
      headlines: z.array(z.number().int()),
    }),
  ),
});

export type FeedBatch = z.infer<typeof FeedBatchSchema>;

export interface Citation {
  label: string;
  url: string;
}

export interface CleanPost {
  speaker: string;
  text: string;
  citations: Citation[];
}

/** Remove inline [n] headline markers and the space they leave before punctuation. */
function stripMarkers(text: string): string {
  return text.replace(/\s*\[\s*\d+\s*\]/g, "").replace(/\s+([.,!?;:])/g, "$1").trim();
}

/** Drop invalid posts, cap length, and turn headline numbers into citations. */
export function cleanFeedBatch(
  batch: FeedBatch,
  speakers: string[],
  headlines: { url: string; source: string }[],
): CleanPost[] {
  return batch.posts
    .filter((p) => speakers.includes(p.speaker) && stripMarkers(p.text))
    .slice(0, MAX_POSTS)
    .map((p) => ({
      speaker: p.speaker,
      text: stripMarkers(p.text).slice(0, FEED_POST_MAX),
      citations: [...new Set(p.headlines)]
        .filter((n) => n >= 1 && n <= headlines.length)
        .map((n) => ({ label: headlines[n - 1].source, url: headlines[n - 1].url })),
    }));
}
