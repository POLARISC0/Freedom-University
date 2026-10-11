import Link from "next/link";
import { DISTRICTS } from "@/content/world";
import { WorldMap } from "@/components/WorldMap";
import { getCurrentUser } from "@/lib/auth";

const MARQUEE = ["Teach, not trade", "Education only", "No financial advice", "Cited sources", "Four mentors", "One world"];

export default async function HomePage() {
  const user = await getCurrentUser();
  const [floor, ...rest] = DISTRICTS;

  return (
    <div className="full-bleed -mt-8 -mb-8 bg-[#0B0B0C] text-[#F5F5F0]">
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-20">
        <p className="font-mono text-xs tracking-[0.25em] text-white/50 uppercase">Polaris presents · Freedom University</p>
        <h1 className="font-wide mt-4 text-[clamp(2.75rem,9vw,7.5rem)] leading-[0.92] font-black tracking-tight uppercase">
          The world
          <br />
          <span className="text-[#FFC400]">is open.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
          Four AI mentors and one live trading floor, laid out like a city. Walk into any district and start learning.
          They teach. They never trade.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={user ? "/floor" : "/login"}
            className="rounded-full bg-[#FFC400] px-6 py-3 text-sm font-black tracking-wide text-black uppercase transition-colors duration-200 hover:bg-white active:translate-y-px"
          >
            {user ? "Go downtown →" : "Enter the world →"}
          </Link>
          <Link
            href={user ? "/news" : "/login?next=/news"}
            className="rounded-full border border-white/25 px-6 py-3 text-sm font-bold tracking-wide uppercase transition-colors duration-200 hover:border-white active:translate-y-px"
          >
            Today&apos;s briefing
          </Link>
        </div>
      </section>

      <div className="overflow-hidden bg-[#FFC400] py-2.5 text-black" aria-label="Freedom University principles">
        <div className="fu-marquee flex w-max">
          {[0, 1].map((copy) => (
            <p key={copy} className="font-wide flex shrink-0 items-center text-sm font-black tracking-tight uppercase" aria-hidden={copy === 1}>
              {[...MARQUEE, ...MARQUEE].map((m, i) => (
                <span key={i} className="flex items-center">
                  <span className="px-5">{m}</span>
                  <span aria-hidden>✦</span>
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="map-heading">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <h2 id="map-heading" className="font-wide text-3xl font-black tracking-tight uppercase sm:text-5xl">
            Pick a district
          </h2>
          <p className="font-mono text-xs tracking-widest text-white/50 uppercase">Downtown is live now</p>
        </div>
        <WorldMap />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6" aria-labelledby="districts-heading">
        <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
          <h2 id="districts-heading" className="font-wide text-3xl font-black tracking-tight uppercase sm:text-5xl">
            The districts
          </h2>
          <span className="font-mono text-sm text-white/50 tabular-nums">{String(DISTRICTS.length).padStart(2, "0")}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href={floor.href}
            className="group relative flex min-h-64 flex-col justify-between overflow-hidden rounded-2xl bg-[#F5F5F0] p-6 text-black sm:col-span-2"
          >
            <span className="flex items-center gap-2 font-mono text-xs tracking-widest uppercase">
              <span className="fu-pulse h-2 w-2 rounded-full bg-[#E0202E]" aria-hidden /> Live · {floor.kicker}
            </span>
            <span aria-hidden className="pointer-events-none absolute -right-4 -bottom-10 text-[11rem] leading-none font-black text-black/[0.07]">
              {floor.glyph}
            </span>
            <span>
              <span className="font-wide block text-4xl leading-none font-black tracking-tight uppercase sm:text-6xl">{floor.name}</span>
              <span className="mt-3 block max-w-md text-base text-black/70">{floor.blurb}</span>
              <span className="mt-5 inline-block border-b-2 border-black pb-0.5 text-sm font-black tracking-wide uppercase transition-[padding] duration-200 group-hover:pr-3">
                Go downtown →
              </span>
            </span>
          </Link>

          {rest.map((d) =>
            d.status === "soon" ? (
              <Link
                key={d.id}
                href={d.href}
                className={`group flex min-h-64 flex-col justify-between rounded-2xl border border-dashed border-white/20 p-6 transition-colors duration-200 hover:border-white/50 ${
                  d.id === "square" ? "lg:col-span-2" : ""
                }`}
              >
                <span className="flex items-center justify-between font-mono text-xs tracking-widest text-white/50 uppercase">
                  <span>{d.kicker}</span>
                  <span className="rounded-full border px-2 py-0.5" style={{ borderColor: d.color, color: d.color }}>
                    Opening soon
                  </span>
                </span>
                <span>
                  <span className="text-4xl" style={{ color: d.color }} aria-hidden>{d.glyph}</span>
                  <span className="font-wide mt-2 block text-3xl leading-none font-black tracking-tight uppercase">{d.name}</span>
                  <span className="mt-2 block text-base text-white/60">{d.blurb}</span>
                </span>
              </Link>
            ) : (
              <Link
                key={d.id}
                href={d.href}
                className="group flex min-h-64 flex-col overflow-hidden rounded-2xl bg-[#141416] ring-1 ring-white/10 transition-transform duration-200 ease-out hover:-translate-y-1"
              >
                <span className="relative flex h-32 items-center justify-center" style={{ background: d.color }}>
                  <span className="text-6xl font-black" style={{ color: d.ink }} aria-hidden>{d.glyph}</span>
                  <span className="absolute top-3 left-3 rounded-full bg-black px-2 py-0.5 font-mono text-[10px] tracking-widest text-white uppercase">
                    {d.kicker}
                  </span>
                </span>
                <span className="flex flex-1 flex-col gap-2 p-5">
                  <span className="font-wide text-3xl leading-none font-black tracking-tight uppercase">{d.name}</span>
                  <span className="text-base text-white/60">{d.blurb}</span>
                  <span className="mt-auto flex items-center justify-between pt-3 font-mono text-xs tracking-widest text-white/50 uppercase">
                    <span>{d.meta}</span>
                    <span className="text-white transition-transform duration-200 group-hover:translate-x-1">Enter →</span>
                  </span>
                </span>
              </Link>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
