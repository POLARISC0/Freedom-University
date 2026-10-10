// Name tags and the quest arrow are HTML over the canvas, so they stay sharp at any zoom and can be styled with CSS.

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

  update(labels: LabelInput[]) {
    const seen = new Set<string>();
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
      el.style.display = l.visible ? "" : "none";
      if (l.visible) el.style.transform = `translate(${Math.round(l.x)}px, ${Math.round(l.y)}px) translate(-50%, -100%)`;
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
    this.arrow.style.display = "";
    this.arrow.style.transform = `translate(${Math.round(arrow.x)}px, ${Math.round(arrow.y)}px) translate(-50%, -50%) rotate(${arrow.angle}rad)`;
  }

  destroy() {
    this.root.remove();
  }
}
