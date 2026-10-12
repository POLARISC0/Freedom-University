/** The collage headline shared by the 3D and static worlds. */
export function WorldHeadline({ compact = false }: { compact?: boolean }) {
  return (
    <div className="fu-flicker pointer-events-none select-none">
      <p className="font-mono text-[10px] tracking-[0.3em] text-black/55 uppercase">FU://WORLD/01 · Polaris · sys.online</p>
      <h1
        className={`fu-glitch font-wide mt-2 leading-[0.88] font-black tracking-tight text-[#0B0B0C] uppercase ${
          compact ? "text-[clamp(2rem,3.6vw,3.4rem)]" : "text-[clamp(2.4rem,6.2vw,5.6rem)]"
        }`}
        data-text={compact ? "Freedom\nUniversity" : "Freedom University"}
      >
        {compact ? (
          <>
            Freedom
            <br />
            University
          </>
        ) : (
          "Freedom University"
        )}
      </h1>
      <p className="mt-3 max-w-md font-mono text-[11px] leading-relaxed tracking-wider text-black/65 uppercase">
        A floating world of AI mentors who teach, never trade. Education only. Pick a district or ask a Headmaster.
      </p>
    </div>
  );
}
