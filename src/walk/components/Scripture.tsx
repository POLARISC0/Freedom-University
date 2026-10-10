import { Fragment } from "react";
import type { Passage } from "@/walk/content";
import { bibleGatewayUrl, findReferences, formatReference, parseReference } from "@/walk/scripture/references";

/** A link to read a passage in the World English Bible. */
export function RefLink({ refText, className = "" }: { refText: string; className?: string }) {
  const parsed = parseReference(refText);
  const label = parsed ? formatReference(parsed) : refText;
  return (
    <a
      href={bibleGatewayUrl(refText)}
      target="_blank"
      rel="noopener noreferrer"
      className={`whitespace-nowrap text-brand underline decoration-brand/40 underline-offset-2 hover:decoration-brand ${className}`}
    >
      {label}
    </a>
  );
}

/** A row of "read it yourself" chips. */
export function RefChips({ refs, label = "Read it yourself:" }: { refs: string[]; label?: string }) {
  if (refs.length === 0) return null;
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
      <span>📖 {label}</span>
      {refs.map((r) => (
        <a
          key={r}
          href={bibleGatewayUrl(r)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-line bg-surface px-2 py-0.5 font-medium text-brand hover:bg-brand-soft"
        >
          {formatReference(parseReference(r) ?? { book: r, chapter: 0 })}
        </a>
      ))}
    </p>
  );
}

/** Plain text with any Scripture references turned into links. */
export function TextWithRefs({ text }: { text: string }) {
  const found = findReferences(text).filter((f) => f.valid);
  if (found.length === 0) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let last = 0;
  found.forEach((f, i) => {
    parts.push(<Fragment key={`t${i}`}>{text.slice(last, f.index)}</Fragment>);
    parts.push(<RefLink key={`r${i}`} refText={f.raw} />);
    last = f.index + f.raw.length;
  });
  parts.push(<Fragment key="end">{text.slice(last)}</Fragment>);
  return <>{parts}</>;
}

/** A quoted passage with its reference. */
export function PassageBlock({ passage }: { passage: Passage }) {
  return (
    <figure className="rounded-lg border-l-4 border-gold bg-surface-2/60 px-4 py-3">
      <blockquote className="scripture text-[1.02rem] leading-relaxed">{passage.text}</blockquote>
      <figcaption className="mt-1.5 text-right text-sm font-medium">
        <RefLink refText={passage.ref} /> <span className="text-xs text-muted">WEB</span>
      </figcaption>
    </figure>
  );
}
