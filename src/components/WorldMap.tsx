import Link from "next/link";
import type { CSSProperties } from "react";
import { DISTRICTS, type District } from "@/content/world";

const downtown = DISTRICTS.find((d) => d.id === "floor")!;

/** Transit lines from downtown to every district, in map-percent coordinates. */
function Lines({ layout, className }: { layout: "desktop" | "phone"; className: string }) {
  const from = downtown[layout];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={`absolute inset-0 h-full w-full ${className}`} aria-hidden>
      {DISTRICTS.filter((d) => d !== downtown).map((d) => (
        <line
          key={d.id}
          x1={from.x}
          y1={from.y}
          x2={d[layout].x}
          y2={d[layout].y}
          stroke={d.color}
          strokeOpacity={0.55}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          className="fu-dash"
        />
      ))}
    </svg>
  );
}

function Island({ d, index }: { d: District; index: number }) {
  const lg = d.size === "lg";
  const position = {
    "--px": `${d.phone.x}%`,
    "--py": `${d.phone.y}%`,
    "--dx": `${d.desktop.x}%`,
    "--dy": `${d.desktop.y}%`,
  } as CSSProperties;
  return (
    <Link
      href={d.href}
      aria-label={`${d.name}, ${d.kicker}. ${d.status === "soon" ? "Opening soon." : "Enter."}`}
      className="group absolute top-[var(--py)] left-[var(--px)] z-10 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:top-[var(--dy)] sm:left-[var(--dx)]"
      style={position}
    >
      <span className="fu-float flex flex-col items-center" style={{ animationDelay: `${index * -0.9}s` }}>
        <span
          className={`relative flex items-center justify-center rounded-full font-black transition-transform duration-200 ease-out group-hover:scale-110 ${
            lg ? "h-24 w-24 text-4xl sm:h-36 sm:w-36 sm:text-6xl" : "h-16 w-16 text-2xl sm:h-24 sm:w-24 sm:text-4xl"
          } ${d.status === "soon" ? "border-2 border-dashed" : ""}`}
          style={
            d.status === "soon"
              ? { borderColor: d.color, color: d.color, background: "#0B0B0C" }
              : { background: d.color, color: d.ink, boxShadow: `0 0 64px ${d.color}55` }
          }
        >
          {d.glyph}
          {d.status === "live" && (
            <span className="fu-pulse absolute -top-1 -right-1 rounded-full bg-[#E0202E] px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-white">
              LIVE
            </span>
          )}
        </span>
        <span className="mt-2 rounded-full bg-[#0B0B0C] px-3 py-1 text-center ring-1 ring-white/15">
          <span className="font-wide block text-[10px] leading-tight font-black tracking-tight text-white uppercase sm:text-sm">
            {d.name}
          </span>
          <span className="hidden font-mono text-[10px] tracking-widest text-white/55 uppercase sm:block">
            {d.status === "soon" ? "Opening soon" : d.kicker}
          </span>
        </span>
      </span>
    </Link>
  );
}

export function WorldMap() {
  return (
    <div className="world-grid relative aspect-[3/4] w-full overflow-hidden rounded-[28px] ring-1 ring-white/10 sm:aspect-[16/9]">
      <Lines layout="phone" className="sm:hidden" />
      <Lines layout="desktop" className="hidden sm:block" />
      {DISTRICTS.map((d, i) => (
        <Island key={d.id} d={d} index={i} />
      ))}
      <p className="absolute bottom-3 left-4 hidden font-mono sm:block text-[10px] tracking-widest text-white/55 uppercase">
        Freedom University · World map
      </p>
    </div>
  );
}
