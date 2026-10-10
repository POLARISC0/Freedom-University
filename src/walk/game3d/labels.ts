// Name tags and the quest arrow are HTML over the canvas, so they stay sharp at any zoom and can be styled with CSS.
// The renderer projects each character into screen space every frame and hands the positions over.

export interface LabelInput {
  id: string;
  text: string;
  /** Screen position (CSS pixels, relative to the canvas) of the point above the character's head. */
  x: number;
  y: number;
  visible: boolean;
  badge?: boolean;
  highlight?: boolean;
}

export class LabelLayer {
  readonly root: HTMLDivElement;
  private labels = new Map<string, HTMLDivElement>();
  private arrow: HTMLDivElement;
  private placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
  private boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
  private seen = new Set<string>();
  private shown: LabelInput[] = [];

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "walk-labels";
    this.root.setAttribute("aria-hidden", "true");
    parent.appendChild(this.root);
    this.arrow = document.createElement("div");
    this.arrow.className = "walk-quest-arrow";
    this.arrow.textContent = "➤";
    this.root.appendChild(this.arrow);
  }

  /**
   * Place the labels. Where two would overlap, the more important one wins: the person you're next to, then
   * mentors with a lesson waiting, then whoever is nearer the camera (lower on the screen).
   */
  update(labels: LabelInput[], viewWidth = Infinity) {
    const seen = this.seen;
    const shown = this.shown;
    seen.clear();
    shown.length = 0;
    for (const l of labels) {
      seen.add(l.id);
      let el = this.labels.get(l.id);
      if (!el) {
        el = document.createElement("div");
        el.className = "walk-label";
        this.root.appendChild(el);
        this.labels.set(l.id, el);
      }
      const text = l.badge ? `✦ ${l.text}` : l.text;
      if (el.textContent !== text) el.textContent = text;
      el.classList.toggle("is-badge", Boolean(l.badge));
      el.classList.toggle("is-near", Boolean(l.highlight));
      if (l.visible) shown.push(l);
      else el.style.display = "none";
    }
    const rank = (l: LabelInput) => (l.highlight ? 2e4 : 0) + (l.badge ? 1e4 : 0) + l.y;
    shown.sort((a, b) => rank(b) - rank(a));
    this.placed.length = 0;
    for (const l of shown) {
      const el = this.labels.get(l.id)!;
      // Estimated from the text, so placing labels never forces the browser to measure the page.
      const half = ((l.badge ? l.text.length + 2 : l.text.length) * 6.4 + 12) / 2;
      // Keep tags whole at the screen's edges.
      const x = Math.max(half + 4, Math.min(viewWidth - half - 4, l.x));
      const box = (this.boxes[this.placed.length] ??= { x0: 0, x1: 0, y0: 0, y1: 0 });
      box.x0 = x - half;
      box.x1 = x + half;
      box.y0 = l.y - 17;
      box.y1 = l.y;
      const clash = this.placed.some((p) => box.x0 < p.x1 + 2 && box.x1 > p.x0 - 2 && box.y0 < p.y1 + 1 && box.y1 > p.y0 - 1);
      if (clash && !l.highlight) {
        el.style.display = "none";
        continue;
      }
      this.placed.push(box);
      el.style.display = "";
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(l.y)}px) translate(-50%, -100%)`;
    }
    for (const [id, el] of this.labels) {
      if (!seen.has(id)) el.style.display = "none";
    }
  }

  /** Point an arrow at an off-screen quest target, or hide it. Angle in radians, position in CSS pixels. */
  setArrow(arrow: { x: number; y: number; angle: number } | null) {
    if (!arrow) {
      this.arrow.style.display = "none";
      return;
    }
    this.arrow.style.display = "block";
    this.arrow.style.transform = `translate(${Math.round(arrow.x)}px, ${Math.round(arrow.y)}px) translate(-50%, -50%) rotate(${arrow.angle}rad)`;
  }

  destroy() {
    this.root.remove();
  }
}
