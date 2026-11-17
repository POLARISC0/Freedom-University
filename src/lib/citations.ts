import type { Source } from "@/content/types";

/**
 * Turn [S3]-style reading-list citations into markdown links to the source.
 * Citations without a URL (or out of range) are left as plain text.
 */
export function linkSourceCitations(markdown: string, sources: Source[]): string {
  return markdown.replace(/\[S(\d+)\](?!\()/g, (match, n: string) => {
    const source = sources[Number(n) - 1];
    if (!source?.url) return match;
    return `[[S${n}]](${source.url} "${source.title.replace(/"/g, "'")}")`;
  });
}

/** Turn [3]-style headline citations in the news briefing into links. */
export function linkHeadlineCitations(markdown: string, urls: string[]): string {
  return markdown.replace(/\[(\d+)\](?!\()/g, (match, n: string) => {
    const url = urls[Number(n) - 1];
    return url ? `[[${n}]](${url})` : match;
  });
}
