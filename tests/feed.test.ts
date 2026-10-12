import { describe, expect, it } from "vitest";
import { cleanFeedBatch, FEED_POST_MAX } from "@/lib/feed-rules";

const headlines = [
  { title: "A", url: "https://a.example", source: "Wire A" },
  { title: "B", url: "https://b.example", source: "Wire B" },
];
const slugs = ["nova", "atlas"];

describe("cleaning a generated feed batch", () => {
  it("keeps valid posts and turns headline numbers into citations", () => {
    const out = cleanFeedBatch(
      { posts: [{ speaker: "nova", text: "Stablecoin news [1]", headlines: [1] }, { speaker: "atlas", text: "Reply", headlines: [2] }] },
      slugs,
      headlines,
    );
    expect(out).toEqual([
      { speaker: "nova", text: "Stablecoin news", citations: [{ label: "Wire A", url: "https://a.example" }] },
      { speaker: "atlas", text: "Reply", citations: [{ label: "Wire B", url: "https://b.example" }] },
    ]);
  });

  it("drops unknown speakers, empty text and bad headline numbers, and caps length", () => {
    const out = cleanFeedBatch(
      {
        posts: [
          { speaker: "ghost", text: "hi", headlines: [] },
          { speaker: "nova", text: "   ", headlines: [] },
          { speaker: "atlas", text: "x".repeat(500), headlines: [0, 3, 2, 2] },
        ],
      },
      slugs,
      headlines,
    );
    expect(out).toHaveLength(1);
    expect(out[0].text.length).toBeLessThanOrEqual(FEED_POST_MAX);
    expect(out[0].citations).toEqual([{ label: "Wire B", url: "https://b.example" }]);
  });

  it("strips inline headline markers, since sources are listed under each post", () => {
    const out = cleanFeedBatch({ posts: [{ speaker: "nova", text: "Rates held [1][2]. Ask why [ 2 ] .", headlines: [1] }] }, slugs, headlines);
    expect(out[0].text).toBe("Rates held. Ask why.");
  });

  it("allows at most three posts in a batch", () => {
    const posts = Array.from({ length: 6 }, () => ({ speaker: "nova", text: "t", headlines: [] }));
    expect(cleanFeedBatch({ posts }, slugs, headlines)).toHaveLength(3);
  });
});
