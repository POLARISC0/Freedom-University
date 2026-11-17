import { LOCATIONS } from "@/walk/content";
import { RefChips } from "../Scripture";

/** The signpost: where you are, and the places that open in later chapters. */
export function PlacesPanel() {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold tracking-wider text-gold uppercase">The signpost</p>
        <h2 className="font-serif text-2xl font-semibold">Places in the land</h2>
      </header>
      <ul className="space-y-3">
        {LOCATIONS.map((l) => (
          <li key={l.id} className={`rounded-xl border p-3 ${l.available ? "border-brand bg-brand-soft" : "border-dashed border-line"}`}>
            <p className="font-semibold">
              {l.name} <span className="text-xs font-normal text-muted">· {l.region}</span>
            </p>
            <p className="text-sm">{l.summary}</p>
            <p className="mt-1 text-xs font-semibold text-muted">{l.available ? "📍 You are here" : "Opens in a later chapter"}</p>
            <RefChips refs={l.refs} label="" />
          </li>
        ))}
      </ul>
    </div>
  );
}
