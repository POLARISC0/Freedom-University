import type { District } from "@/content/world";

/**
 * The flat graphic collage around the 3D world, in the Y2K tech-collage manner: sky panels, black bars,
 * barcodes, small text blocks, ruled lines and registration marks. The back half sits under the
 * (transparent) WebGL canvas and the front half over it. Each district swaps in its own pieces when
 * the camera flies in. Purely decorative, so hidden from assistive tech.
 */

/** What the world stands for, set small in the collage. */
export const MANIFESTO = ["Learn how money moves.", "Ask why before you act.", "Nobody here sells you anything.", "Mentors teach. They never trade.", "Pick a district. Take your time."];

const layer = (on: boolean) => `absolute inset-0 transition-opacity duration-700 ${on ? "opacity-100" : "opacity-0"}`;

function Lines({ lines, className = "" }: { lines: string[]; className?: string }) {
  return (
    <div className={`absolute font-mono text-[9px] leading-[1.5] tracking-wider uppercase ${className}`}>
      {lines.map((l, i) => (
        <p key={i}>{l}</p>
      ))}
    </div>
  );
}

function Bars({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute flex items-center gap-2 ${className}`}>
      <span className="h-2.5 w-44 bg-[#0B0B0C]" />
      <span className="h-2.5 w-12 bg-[#0B0B0C]" />
      <span className="fu-barcode h-4 w-28" />
    </div>
  );
}

/** A hairline rule across the frame with a small mono label sitting on it. */
function Rule({ className, label, labelClass = "left-[4%]" }: { className: string; label?: string; labelClass?: string }) {
  return (
    <div className={`absolute h-px bg-black/20 ${className}`}>
      {label && <span className={`absolute -top-4 font-mono text-[9px] tracking-[0.2em] text-black/60 uppercase ${labelClass}`}>{label}</span>}
    </div>
  );
}

function Triangles({ className = "", color = "#2D6AE0" }: { className?: string; color?: string }) {
  return (
    <div className={`absolute flex gap-1.5 ${className}`}>
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className="h-0 w-0 border-x-[5px] border-t-[8px] border-x-transparent" style={{ borderTopColor: color }} />
      ))}
    </div>
  );
}

const REGISTRATION = ["left-[3%] top-[7%]", "right-[3%] top-[7%]", "left-[3%] bottom-[9%]", "right-[3%] bottom-[9%]"];

export function CollageBack({ focused }: { focused: string | null }) {
  const on = (id: string | null) => focused === id;
  return (
    <div className="fu-par-back pointer-events-none absolute -inset-6" aria-hidden>
      <div className="fu-dots absolute inset-0 opacity-60" />

      <div className={layer(on(null))}>
        <div className="fu-sky-panel absolute top-[15%] right-[7%] h-[36%] w-[29%]" />
        <div className="absolute top-[11%] right-[4%] h-[44%] w-[35%] border border-black/15" />
        <div className="fu-sky-panel absolute bottom-[11%] left-[24%] h-[15%] w-[13%] opacity-90" />
        <div className="absolute top-[44%] left-[4%] h-[20%] w-[17%] bg-black/[0.035]" />
      </div>

      <div className={layer(on("nova"))}>
        <div className="fu-sky-panel absolute top-[12%] left-[5%] h-[58%] w-[52%]" />
        <div className="absolute top-[9%] left-[3%] h-[64%] w-[57%] border border-black/15" />
        <div className="fu-sky-panel absolute bottom-[7%] left-[38%] h-[19%] w-[17%]" />
      </div>

      <div className={layer(on("atlas"))}>
        <div className="absolute top-[14%] left-[5%] h-[40%] w-[30%] bg-[#1FB6FF]/10" />
        <div className="absolute top-[10%] left-[3%] h-[48%] w-[34%] border border-[#1FB6FF]/40" />
      </div>

      <div className={layer(on("sterling"))}>
        <div className="fu-streaks absolute inset-0" />
      </div>

      <div className={layer(on("sage"))}>
        <div className="absolute top-[22%] left-[4%] aspect-square h-[44%] rounded-full bg-[#2D6AE0]" />
        <div className="absolute top-[8%] left-[44%] flex h-[17%] w-[12%] items-center justify-center bg-[#3E8EF0]">
          <span className="fu-moon block h-12 w-12" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[12%]">
          <div className="h-1/3 bg-[#BFE3F7]/85" />
          <div className="h-1/3 bg-[#B9765E]/85" />
          <div className="h-1/3 bg-[#F6E7A6]/85" />
        </div>
      </div>

      <div className={layer(on("floor"))}>
        <div className="absolute top-[16%] left-[6%] h-[56%] w-[40%] bg-[#AAB6FF]/20" />
        <div className="absolute top-[12%] left-[4%] h-[64%] w-[44%] border border-[#5E6CF0]/30" />
      </div>

      <div className={layer(on("square"))}>
        <div className="rainbow-ring absolute top-[18%] left-[8%] aspect-square h-[56%] rounded-full opacity-25 blur-sm" />
      </div>

      <div className={layer(on("shop"))}>
        <div className="absolute top-[14%] left-[6%] h-[52%] w-[38%] bg-[#FF3D8B]/10" />
      </div>
    </div>
  );
}

export function CollageFront({ focused, districts }: { focused: string | null; districts: District[] }) {
  const on = (id: string | null) => focused === id;
  return (
    <div className="fu-par-front pointer-events-none absolute -inset-6 text-[#0B0B0C]" aria-hidden>
      {REGISTRATION.map((p) => (
        <span key={p} className={`fu-reg ${p}`} />
      ))}

      <div className={layer(on(null))}>
        <p className="font-wide absolute top-[17%] right-[25%] text-5xl font-black tracking-tight lowercase">learn.</p>
        <Bars className="top-[285px] left-14" />
        <Rule className="inset-x-0 top-[61%]" label="FU://sector map · scale 1:2500 →" />
        <div className="absolute inset-y-[8%] left-[63%] w-px bg-black/10" />
        <Lines className="top-[57%] right-[4%] w-56 text-right text-black/70" lines={MANIFESTO} />
        <div className="absolute right-14 bottom-[12%] w-52 bg-white/90 ring-1 ring-black/10">
          <p className="bg-[#1366D6] px-2 py-1 font-mono text-[9px] tracking-[0.2em] text-white uppercase">Index · {String(districts.length).padStart(2, "0")} districts</p>
          <div className="px-2 py-1.5">
            {districts.map((d) => (
              <p key={d.id} className="flex justify-between font-mono text-[9px] leading-[1.6] tracking-wider uppercase">
                <span className="text-black/50">{d.code}</span>
                <span>{d.name}</span>
              </p>
            ))}
          </div>
        </div>
        <Triangles className="bottom-[8%] left-[42%]" />
      </div>

      <div className={layer(on("nova"))}>
        <p className="font-wide absolute top-[16%] left-[8%] text-7xl font-black tracking-tight lowercase">ledger.</p>
        <Bars className="top-[74%] left-[8%]" />
        <Lines
          className="top-[78%] left-[8%] text-black/75"
          lines={["A public ledger anyone can read.", "Keys you hold yourself.", "Volatility belongs to the asset,", "not to your future.", "Learn it before you touch it."]}
        />
        <Rule className="inset-x-0 top-[9%]" label="D-01/NVA · crypto · open ledger" />
      </div>

      <div className={layer(on("atlas"))}>
        <div className="absolute bottom-[12%] left-[6%] w-72 bg-white ring-1 ring-black/10">
          <p className="bg-[#1FB6FF] px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] text-white uppercase">D-02/ATL · Banking & the system</p>
          <div className="space-y-0.5 px-3 py-2 font-mono text-[10px] tracking-wider uppercase">
            {["Central banks", "The Treasury", "Inflation as a hidden tax", "How banks profit from debt", "Tokenised assets"].map((t, i) => (
              <p key={t}>
                <span className="text-black/40">{String(i + 1).padStart(2, "0")}</span> {t}
              </p>
            ))}
            <p className="pt-1 text-black/50">35.6895N 139.6917E · scale 1:500</p>
          </div>
        </div>
        <Rule className="inset-x-0 top-[9%]" label="D-02/ATL · the system, from above" />
      </div>

      <div className={layer(on("sterling"))}>
        <Rule className="inset-x-0 top-[16%]" label="Read the terms before you sign →" />
        <Rule className="inset-x-0 top-[68%]" label="Transit · D-03/STR · credit line" labelClass="left-[38%]" />
        <Rule className="inset-x-0 top-[86%]" />
        <Lines className="top-[71%] left-[4%] text-black/70" lines={["Credit first.", "Corporation second.", "Funding third."]} />
        <Bars className="top-[89%] left-[4%]" />
      </div>

      <div className={layer(on("sage"))}>
        <p className="font-wide absolute top-[52%] left-[7%] text-xl leading-tight font-black text-white uppercase">
          Field notes
          <br />
          Ownership
        </p>
        <Lines className="top-[16%] left-[60%] text-[11px] font-bold text-[#2D6AE0]" lines={["Habits", "Habits", "Habits"]} />
        <Triangles className="top-[40%] left-[38%]" />
        <Lines className="bottom-[14%] left-[30%] text-black/70" lines={["From paycheck to assets,", "one habit at a time."]} />
      </div>

      <div className={layer(on("floor"))}>
        <p className="absolute top-[15%] left-[6%] bg-[#E0202E] px-3 py-1 font-mono text-sm font-bold tracking-[0.3em] text-white uppercase">Live</p>
        <Lines className="top-[21%] left-[6%] text-black/70" lines={["4 mentors on the floor", "News feed live", "Education only"]} />
        <Bars className="bottom-[12%] left-[6%]" />
        <Rule className="inset-x-0 top-[9%]" label="D-00/LIVE · downtown" />
      </div>

      <div className={layer(on("square"))}>
        <p className="font-wide fu-outline-type absolute bottom-[14%] left-[6%] text-7xl font-black uppercase">Opening soon</p>
        <Rule className="inset-x-0 top-[9%]" label="D-05/SQR · meet up" />
      </div>

      <div className={layer(on("shop"))}>
        <p className="font-wide absolute bottom-[14%] left-[6%] text-8xl font-black tracking-tight lowercase">go beyond.</p>
        <Bars className="top-[14%] left-[6%]" />
        <Rule className="inset-x-0 top-[9%]" label="D-06/SHP · opening soon" />
      </div>
    </div>
  );
}
