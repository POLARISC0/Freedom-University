import type { Source } from "@/content/types";

export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <ol className="space-y-2 text-sm">
      {sources.map((s, i) => (
        <li key={s.title} className="flex gap-2">
          <span className="shrink-0 font-mono text-xs leading-5 text-muted">S{i + 1}</span>
          <span>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                {s.title}
              </a>
            ) : (
              s.title
            )}
            <span className="block text-xs text-muted">{s.publisher}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
