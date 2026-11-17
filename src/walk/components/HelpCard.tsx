import { EMERGENCY_NOTE, HELP_LINES, helpLinesFor, isUrgent, type ConcernKind } from "@/walk/safety/resources";

const INTRO: Record<ConcernKind, string> = {
  suicide: "You matter, and you don't have to carry this alone. Please reach out to someone right now.",
  "self-harm": "You deserve care and safety. Talking to someone can help right now.",
  abuse: "What's happening to you is not your fault, and you deserve to be safe. These people can help.",
  violence: "If you're thinking about hurting someone, please talk to someone right now. You can get help.",
  grief: "Grief is heavy. Jesus wept with His friends (John 11:35). You don't have to grieve alone.",
  substance: "Freedom is possible, and you don't have to fight this alone. These people can help.",
};

/**
 * Real-world help. Shown when a player shares something serious, when a check-in says they're struggling,
 * and on the help page. `concerns` narrows the list; leave it empty to show everything.
 */
export function HelpCard({ concerns = [], compact = false }: { concerns?: ConcernKind[]; compact?: boolean }) {
  const lines = concerns.length ? helpLinesFor(concerns) : HELP_LINES;
  const urgent = isUrgent(concerns);
  const intro = concerns.length ? INTRO[concerns[0]] : "If you're hurting, in danger, or grieving, please talk to a real person.";
  return (
    <aside
      role="note"
      aria-label="Where to find help"
      className={`rounded-xl border-2 ${urgent ? "border-danger/60" : "border-gold/50"} bg-surface p-4 text-sm`}
    >
      <p className="font-semibold">{intro}</p>
      {(urgent || !concerns.length) && <p className="mt-1 font-medium text-danger">{EMERGENCY_NOTE}</p>}
      <ul className={`mt-3 grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
        {lines.slice(0, compact ? 4 : lines.length).map((l) => (
          <li key={l.id} className="rounded-lg bg-surface-2/70 px-3 py-2">
            <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">
              {l.name}
            </a>
            <span className="text-xs text-muted"> · {l.region}</span>
            <p className="mt-0.5">{l.contact}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        The characters in this game are AI and can&apos;t be there for you the way a person can. Please also tell
        someone you trust: a friend, a family member, a pastor or a counselor.
      </p>
    </aside>
  );
}
