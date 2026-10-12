import Link from "next/link";
import type { District } from "@/content/world";

/** A district that's on the map but not open yet. */
export function ComingSoonDistrict({ district, body }: { district: District; body: string }) {
  return (
    <div className="full-bleed -mt-8 -mb-8 bg-[#0B0B0C] text-[#F5F5F0]">
      <section className="mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-center px-4 py-16 sm:px-6">
        <p className="font-mono text-xs tracking-[0.25em] uppercase" style={{ color: district.color }}>
          {district.kicker} · Opening soon
        </p>
        <h1 className="font-wide mt-4 text-[clamp(2.5rem,8vw,6.5rem)] leading-[0.92] font-black tracking-tight uppercase">
          {district.name}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">{body}</p>
        <Link
          href="/"
          className="mt-10 self-start rounded-full border border-white/25 px-6 py-3 text-sm font-bold tracking-wide uppercase transition-colors duration-200 hover:border-white"
        >
          ← Back to the map
        </Link>
      </section>
    </div>
  );
}
