import "server-only";
import { z } from "zod";

export interface Headline {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  category: "crypto" | "macro";
}

const GNEWS_SEARCH = "https://gnews.io/api/v4/search";

// GNews query syntax: uppercase OR, quoted phrases.
const QUERIES: { category: Headline["category"]; q: string }[] = [
  { category: "crypto", q: 'bitcoin OR ethereum OR crypto OR stablecoin OR XRP OR "tokenization"' },
  { category: "macro", q: '"Federal Reserve" OR inflation OR "Treasury yields" OR "interest rates" OR "central bank"' },
];

// Parsed leniently: one malformed article shouldn't sink the briefing.
const ArticleSchema = z.object({
  title: z.string(),
  description: z.string().nullish(),
  url: z.string().url(),
  publishedAt: z.string(),
  source: z.object({ name: z.string() }).partial().nullish(),
});

const ResponseSchema = z.object({ articles: z.array(z.unknown()) });

export class NewsConfigError extends Error {}

export function hasNewsKey(): boolean {
  return Boolean(process.env.GNEWS_API_KEY) || process.env.NEWS_MOCK === "1";
}

async function search(category: Headline["category"], q: string, apiKey: string): Promise<Headline[]> {
  const params = new URLSearchParams({
    q,
    lang: "en",
    max: "10", // the free plan's per-request maximum
    sortby: "publishedAt",
    apikey: apiKey,
  });
  const res = await fetch(`${GNEWS_SEARCH}?${params}`, { cache: "no-store" });
  if (res.status === 401 || res.status === 403) {
    throw new NewsConfigError("GNews rejected the API key (check GNEWS_API_KEY).");
  }
  if (res.status === 429) {
    throw new Error("GNews daily request limit reached. Try again tomorrow or upgrade the plan.");
  }
  if (!res.ok) throw new Error(`GNews request failed with status ${res.status}.`);

  const body = ResponseSchema.parse(await res.json());
  return body.articles.flatMap((raw) => {
    const parsed = ArticleSchema.safeParse(raw);
    if (!parsed.success) return [];
    const a = parsed.data;
    return [
      {
        title: a.title,
        description: a.description ?? "",
        url: a.url,
        source: a.source?.name ?? new URL(a.url).hostname,
        publishedAt: a.publishedAt,
        category,
      },
    ];
  });
}

/** Latest crypto and macro headlines, newest first, deduplicated by URL and title. */
export async function fetchHeadlines(): Promise<Headline[]> {
  if (process.env.NEWS_MOCK === "1") return mockHeadlines();
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) throw new NewsConfigError("GNEWS_API_KEY is not set.");

  const batches = await Promise.all(QUERIES.map(({ category, q }) => search(category, q, apiKey)));
  const seen = new Set<string>();
  return batches
    .flat()
    .filter((h) => {
      const key = h.title.toLowerCase().trim();
      if (seen.has(h.url) || seen.has(key)) return false;
      seen.add(h.url);
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** Clearly fake headlines for developing the page without a GNews key (NEWS_MOCK=1). */
function mockHeadlines(): Headline[] {
  const now = new Date().toISOString();
  return [
    { title: "[MOCK] Bitcoin network hash rate reaches new high", description: "Sample headline for local development.", url: "https://example.com/mock-1", source: "Mock Wire", publishedAt: now, category: "crypto" },
    { title: "[MOCK] Stablecoin issuers publish monthly reserve attestations", description: "Sample headline for local development.", url: "https://example.com/mock-2", source: "Mock Wire", publishedAt: now, category: "crypto" },
    { title: "[MOCK] Federal Reserve holds rates steady, signals patience", description: "Sample headline for local development.", url: "https://example.com/mock-3", source: "Mock Daily", publishedAt: now, category: "macro" },
    { title: "[MOCK] Treasury yields edge higher after inflation report", description: "Sample headline for local development.", url: "https://example.com/mock-4", source: "Mock Daily", publishedAt: now, category: "macro" },
  ];
}
