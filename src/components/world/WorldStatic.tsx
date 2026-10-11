import Link from "next/link";
import { DISTRICTS, type District } from "@/content/world";
import { HEADMASTERS, MENTORS } from "@/lib/agents/registry";
import { OpenHeadmasterButton } from "./OpenHeadmasterButton";
import { WorldHeadline } from "./WorldHeadline";

/** Layered translucent blocks: a still version of a floating island. */
function IslandArt({ d, size }: { d: District; size: number }) {
  return (
    <span className="relative block" style={{ width: size, height: size }} aria-hidden>
      {d.status === "live" && <span className="rainbow-ring absolute -inset-2 rounded-full p-[3px] [mask:radial-gradient(circle,transparent_62%,#000_63%)]" />}
      <span className="absolute inset-[18%] rounded-xl opacity-55" style={{ background: d.theme.skyTop, transform: "translate(-10%, 12%) rotate(-8deg)" }} />
      <span className="absolute inset-[18%] rounded-xl opacity-70 ring-1 ring-black/15" style={{ background: d.color, transform: "rotate(6deg)" }} />
      <span className="absolute inset-[24%] flex items-center justify-center rounded-xl bg-white/70 text-xl font-black text-black ring-1 ring-black/20 backdrop-blur-sm" style={{ transform: "translate(10%, -14%)" }}>
        {d.glyph}
      </span>
      <span className="absolute -bottom-3 left-1/2 h-2 w-3/4 -translate-x-1/2 rounded-full bg-black/10 blur-sm" />
    </span>
  );
}

function DistrictTag({ d }: { d: District }) {
  const mentor = MENTORS.find((m) => m.districtId === d.id);
  return (
    <span className="mt-3 block rounded-md bg-white/90 px-2 py-1 text-center ring-1 ring-black/15">
      <span className="block font-mono text-[9px] tracking-widest text-black/60 uppercase">{d.code}</span>
      <span className="font-wide block text-xs font-black tracking-tight text-black uppercase">{d.name}</span>
      <span className="block font-mono text-[9px] tracking-widest uppercase" style={{ color: d.status === "soon" ? "#D6246E" : "#0B0B0C99" }}>
        {d.status === "soon" ? "Opening soon" : d.status === "live" ? "Live" : mentor ? `${d.kicker}` : d.kicker}
      </span>
    </span>
  );
}

/** Server-rendered world for phones, reduced motion and no-JS visitors. */
export function WorldStatic() {
  return (
    <section className="bp-grid relative overflow-hidden px-4 pt-10 pb-16 sm:px-8">
      <div className="fu-scanlines absolute inset-0" />
      <div className="relative mx-auto max-w-6xl">
        <WorldHeadline />

        <div className="mt-8 flex flex-wrap gap-3" aria-label="Headmasters">
          {HEADMASTERS.map((h) => (
            <OpenHeadmasterButton
              key={h.id}
              id={h.id}
              className="group flex items-center gap-3 rounded-full bg-white py-1.5 pr-4 pl-1.5 text-left ring-1 ring-black/15 hover:ring-black/40"
            >
              <span className="h-8 w-8 rounded-full ring-2 ring-white" style={{ background: h.color, boxShadow: `0 0 0 3px ${h.color}33` }} />
              <span>
                <span className="block font-mono text-[9px] tracking-widest text-black/60 uppercase">Headmaster · {h.title.replace("Headmaster of ", "")}</span>
                <span className="font-wide block text-sm font-black text-black uppercase">Talk to {h.name}</span>
              </span>
            </OpenHeadmasterButton>
          ))}
        </div>

        {/* Map on tablets and up */}
        <div className="relative mt-10 hidden aspect-[16/9] sm:block">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
            {[30, 40].map((r) => (
              <ellipse key={r} cx="50" cy="52" rx={r} ry={r * 0.72} fill="none" stroke="#1b1e28" strokeOpacity="0.18" strokeDasharray="1 1.4" vectorEffect="non-scaling-stroke" />
            ))}
            {DISTRICTS.filter((d) => d.status !== "live").map((d) => (
              <path key={d.id} d={`M50 52 Q ${(50 + d.desktop.x) / 2} ${Math.min(52, d.desktop.y) - 18} ${d.desktop.x} ${d.desktop.y}`} fill="none" stroke={d.color} strokeOpacity="0.7" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          {DISTRICTS.map((d) => (
            <Link
              key={d.id}
              href={d.href}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-transform duration-200 hover:scale-105"
              style={{ left: `${d.desktop.x}%`, top: `${d.desktop.y}%` }}
            >
              <IslandArt d={d} size={d.size === "lg" ? 120 : 88} />
              <DistrictTag d={d} />
            </Link>
          ))}
        </div>

        {/* Phones: the same districts as a collage grid */}
        <div className="mt-10 grid grid-cols-2 gap-4 sm:hidden">
          {DISTRICTS.map((d) => (
            <Link key={d.id} href={d.href} className={`flex flex-col items-center rounded-2xl bg-white/70 p-4 ring-1 ring-black/10 ${d.size === "lg" ? "col-span-2" : ""}`}>
              <IslandArt d={d} size={d.size === "lg" ? 96 : 72} />
              <DistrictTag d={d} />
              {d.tagline && <span className="mt-1 font-mono text-[10px] tracking-widest text-black/60 uppercase">{d.tagline}</span>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
