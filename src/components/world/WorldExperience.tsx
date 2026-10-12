"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { District } from "@/content/world";
import { openHeadmaster } from "./OpenHeadmasterButton";
import type { WorldScene } from "./scene";
import { WorldHeadline } from "./WorldHeadline";

export interface WorldHeadmasterView {
  id: string;
  name: string;
  title: string;
  color: string;
  space: { x: number; y: number; z: number };
}

const DESKTOP_3D = "(min-width: 900px) and (pointer: fine)";
const REDUCED = "(prefers-reduced-motion: reduce)";

// Probed once: React calls canRun3D on every render, and each probe would cost a WebGL context.
let webgl2: boolean | undefined;

function canRun3D(): boolean {
  if (!window.matchMedia(DESKTOP_3D).matches || window.matchMedia(REDUCED).matches) return false;
  if (webgl2 === undefined) {
    try {
      webgl2 = Boolean(document.createElement("canvas").getContext("webgl2"));
    } catch {
      webgl2 = false;
    }
  }
  return webgl2;
}

function subscribe(onChange: () => void) {
  const queries = [window.matchMedia(DESKTOP_3D), window.matchMedia(REDUCED)];
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}

/**
 * The home-page world. Renders the static world (children) everywhere, and upgrades to
 * the 3D scene on laptops and desktops that support WebGL and haven't asked for less motion.
 */
export function WorldExperience({
  districts,
  headmasters,
  gatekeepers,
  children,
}: {
  districts: District[];
  headmasters: WorldHeadmasterView[];
  gatekeepers: Record<string, string>;
  children: React.ReactNode;
}) {
  const use3D = useSyncExternalStore(subscribe, canRun3D, () => false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelEls = useRef(new Map<string, HTMLElement>());
  const sceneRef = useRef<WorldScene | null>(null);
  const coordsRef = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [clock, setClock] = useState("");

  const select = useCallback((id: string) => {
    if (id.startsWith("hm:")) return openHeadmaster(id.slice(3));
    setFocused(id);
    sceneRef.current?.focus(id);
  }, []);

  const back = useCallback(() => {
    setFocused(null);
    sceneRef.current?.unfocus();
  }, []);

  useEffect(() => {
    if (!use3D || !canvasRef.current) return;
    let scene: WorldScene | null = null;
    let cancelled = false;
    import("./scene").then(({ WorldScene }) => {
      if (cancelled || !canvasRef.current) return;
      scene = new WorldScene(
        canvasRef.current,
        labelEls.current,
        districts.map(({ id, code, kicker, color, status, space, theme }) => ({ id, code, kicker, color, status, space, theme })),
        headmasters.map(({ id, color, space }) => ({ id, color, space })),
        { onHover: setHovered, onSelect: select },
      );
      sceneRef.current = scene;
      setReady(true);
    });
    return () => {
      cancelled = true;
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [use3D, districts, headmasters, select]);

  useEffect(() => {
    if (!use3D) return;
    const tick = () => setClock(new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC");
    tick();
    const id = setInterval(tick, 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") back();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [use3D, back]);

  if (!use3D) return <>{children}</>;

  const active = districts.find((d) => d.id === focused);

  return (
    <section
      className="relative h-[calc(100svh-3.5rem)] min-h-[600px] overflow-clip bg-[#F6F7FA] text-[#0B0B0C]"
      onPointerMove={(e) => {
        if (!coordsRef.current) return;
        const r = e.currentTarget.getBoundingClientRect();
        coordsRef.current.textContent = `X ${((e.clientX - r.left) / r.width - 0.5).toFixed(3)}  Y ${(0.5 - (e.clientY - r.top) / r.height).toFixed(3)}`;
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label="Freedom University world. Use the district buttons to explore." />
      <div className="fu-scanlines absolute inset-0" />

      {/* Collage HUD */}
      <div className={`pointer-events-none absolute top-8 left-8 transition-opacity duration-500 ${focused ? "opacity-0" : "opacity-100"}`}>
        <WorldHeadline compact />
      </div>
      <div className="pointer-events-none absolute top-8 right-8 text-right font-mono text-[10px] leading-5 tracking-widest uppercase text-black/55">
        <p>{clock}</p>
        <p>World 01 · 7 districts · 2 headmasters</p>
        <p className="inline-block -rotate-2 bg-[#FFC400] px-1.5 text-black">No financial advice</p>
      </div>
      <div className="pointer-events-none absolute bottom-6 left-8 font-mono text-[10px] tracking-widest uppercase text-black/55">
        <span ref={coordsRef}>X 0.000  Y 0.000</span>
        <span className="ml-4">Cam {focused ? `→ ${active?.code}` : "orbit"}</span>
      </div>
      <p className="pointer-events-none absolute right-8 bottom-6 font-mono text-[10px] tracking-widest uppercase text-black/55">
        {focused ? "Esc or Back to return" : "Move to look around · Click a district to fly in"}
      </p>
      {!ready && <p className="absolute inset-0 m-auto h-4 w-48 text-center font-mono text-[10px] tracking-widest text-black/60 uppercase">Loading world…</p>}

      {/* Labels pinned to islands by the scene */}
      {districts.map((d) => (
        <button
          key={d.id}
          ref={(el) => {
            if (el) labelEls.current.set(d.id, el);
            else labelEls.current.delete(d.id);
          }}
          type="button"
          // While flown in, the other districts' labels are hidden, so keep them out of the tab order too.
          tabIndex={focused && focused !== d.id ? -1 : undefined}
          aria-hidden={focused && focused !== d.id ? true : undefined}
          onClick={() => select(d.id)}
          onMouseEnter={() => setHovered(d.id)}
          onMouseLeave={() => setHovered(null)}
          className={`absolute top-0 left-0 z-10 rounded-md px-2 py-1 text-left opacity-0 ring-1 transition-[background-color,color] duration-150 will-change-transform ${
            hovered === d.id ? "bg-[#0B0B0C] text-white ring-black" : "bg-white/90 text-black ring-black/15"
          }`}
          aria-label={`Fly to ${d.name}, ${d.kicker}`}
        >
          <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-widest uppercase opacity-70">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.color }} />
            {d.code}
            {d.status === "live" && <span className="rounded-sm bg-[#E0202E] px-1 text-white">Live</span>}
            {d.status === "soon" && <span className="text-[#D6246E]">Soon</span>}
          </span>
          <span className="font-wide block text-sm font-black tracking-tight uppercase">{d.name}</span>
        </button>
      ))}
      {headmasters.map((h) => (
        <button
          key={h.id}
          ref={(el) => {
            if (el) labelEls.current.set(`hm:${h.id}`, el);
            else labelEls.current.delete(`hm:${h.id}`);
          }}
          type="button"
          onClick={() => openHeadmaster(h.id)}
          className={`absolute top-0 left-0 z-10 rounded-full px-3 py-1 opacity-0 ring-1 will-change-transform ${
            hovered === `hm:${h.id}` ? "bg-[#0B0B0C] text-white ring-black" : "bg-white text-black ring-black/20"
          }`}
          aria-label={`Talk to ${h.name}, ${h.title}`}
        >
          <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-widest uppercase opacity-70">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: h.color }} />
            Headmaster
          </span>
          <span className="font-wide block text-sm font-black uppercase">{h.name}</span>
        </button>
      ))}

      {/* Fly-in panel */}
      {active && (
        <div className="absolute top-1/2 right-8 z-20 w-[min(380px,calc(100%-4rem))] -translate-y-1/2" role="dialog" aria-label={active.name}>
          <div className="relative rounded-2xl bg-white p-6 text-[#0B0B0C] shadow-[8px_8px_0_#0B0B0C] ring-2 ring-[#0B0B0C]">
            <p className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase">
              <span className="h-2 w-2 rounded-full" style={{ background: active.color }} />
              {active.code} · {active.kicker}
              {active.status === "live" && <span className="rounded-sm bg-[#E0202E] px-1 text-white">Live</span>}
            </p>
            <h2 className="font-wide mt-3 text-4xl leading-none font-black tracking-tight uppercase">{active.name}</h2>
            {active.tagline && <p className="font-wide mt-2 text-xl font-black text-[#FF3D8B] uppercase">{active.tagline}</p>}
            <p className="mt-3 text-base leading-relaxed text-black/70">{active.blurb}</p>
            {gatekeepers[active.id] && (
              <p className="mt-3 font-mono text-[11px] tracking-wider text-black/60 uppercase">Gatekeeper and teacher: {gatekeepers[active.id]}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={active.href}
                className="rounded-full bg-[#0B0B0C] px-5 py-2.5 text-sm font-black tracking-wide text-white uppercase transition-transform duration-150 hover:-translate-y-px active:translate-y-px"
              >
                {active.status === "soon" ? "Take a look →" : `Enter ${active.id === "floor" ? "the floor" : "district"} →`}
              </Link>
              <button type="button" onClick={back} className="rounded-full px-4 py-2.5 text-sm font-bold tracking-wide uppercase ring-1 ring-black/25 hover:ring-black">
                ← Back to world
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
