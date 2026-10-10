// Mouse and touch on the game canvas: a tap walks or talks, a drag (or right-drag, or a two-finger twist) turns
// the camera, and the wheel or a pinch zooms. Taps and drags are told apart by how far the pointer moved.

const TAP_SLOP = { mouse: 6, touch: 12 };
const TAP_MS = 650;
/** Radians of turn per pixel dragged across. */
const TWIST_PER_PX = 0.008;

export interface PointerHandlers {
  tap(x: number, y: number, touch: boolean): void;
  twist(radians: number): void;
  endTwist(): void;
  zoomBy(amount: number): void;
}

interface Tracked {
  x: number;
  y: number;
  startX: number;
  startY: number;
  time: number;
  touch: boolean;
}

/** Listen on `element`; returns a function that stops listening. */
export function attachPointer(element: HTMLElement, handlers: PointerHandlers): () => void {
  const pointers = new Map<number, Tracked>();
  let dragging = false;
  let gesture: { distance: number; angle: number } | null = null;

  const local = (e: PointerEvent | WheelEvent) => {
    const rect = element.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const pair = () => {
    const [a, b] = [...pointers.values()];
    return { distance: Math.hypot(b.x - a.x, b.y - a.y), angle: Math.atan2(b.y - a.y, b.x - a.x) };
  };

  const down = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2) return;
    const p = local(e);
    pointers.set(e.pointerId, { ...p, startX: p.x, startY: p.y, time: performance.now(), touch: e.pointerType !== "mouse" });
    element.setPointerCapture?.(e.pointerId);
    if (pointers.size === 2) {
      gesture = pair();
      dragging = true;
    }
  };

  const move = (e: PointerEvent) => {
    const t = pointers.get(e.pointerId);
    if (!t) return;
    const p = local(e);
    const dx = p.x - t.x;
    t.x = p.x;
    t.y = p.y;
    if (pointers.size >= 2 && gesture) {
      // Two fingers: pinch to zoom, twist to turn.
      const now = pair();
      if (gesture.distance > 0 && now.distance > 0) handlers.zoomBy(-Math.log(now.distance / gesture.distance) * 0.9);
      let turn = now.angle - gesture.angle;
      if (turn > Math.PI) turn -= Math.PI * 2;
      if (turn < -Math.PI) turn += Math.PI * 2;
      handlers.twist(-turn);
      gesture = now;
      return;
    }
    const slop = t.touch ? TAP_SLOP.touch : TAP_SLOP.mouse;
    if (!dragging && Math.hypot(p.x - t.startX, p.y - t.startY) > slop) dragging = true;
    if (dragging) handlers.twist(-dx * TWIST_PER_PX);
  };

  const up = (e: PointerEvent) => {
    const t = pointers.get(e.pointerId);
    if (!t) return;
    pointers.delete(e.pointerId);
    const wasDragging = dragging;
    if (pointers.size === 0) {
      dragging = false;
      gesture = null;
      if (wasDragging) handlers.endTwist();
      else if (e.type === "pointerup" && performance.now() - t.time < TAP_MS && (e.pointerType !== "mouse" || e.button === 0)) {
        handlers.tap(t.x, t.y, t.touch);
      }
    } else if (pointers.size === 1) {
      // One finger lifted from a two-finger gesture: keep turning with the other, but never tap.
      gesture = null;
    }
  };

  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    const lines = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    handlers.zoomBy(Math.max(-0.2, Math.min(0.2, lines * 0.0012)));
  };
  const menu = (e: Event) => e.preventDefault();

  element.addEventListener("pointerdown", down);
  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", up);
  element.addEventListener("pointercancel", up);
  element.addEventListener("wheel", wheel, { passive: false });
  element.addEventListener("contextmenu", menu);
  return () => {
    element.removeEventListener("pointerdown", down);
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", up);
    element.removeEventListener("pointercancel", up);
    element.removeEventListener("wheel", wheel);
    element.removeEventListener("contextmenu", menu);
  };
}
