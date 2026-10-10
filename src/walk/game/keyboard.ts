import type { World } from "@/walk/world/world";

const MOVE_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};
const INTERACT_KEYS = new Set(["e", " ", "Enter"]);

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** Space and Enter on a focused button or link belong to that control, not to the game. */
function isControl(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ["BUTTON", "A", "SUMMARY"].includes(target.tagName);
}

/** Arrow keys or WASD to walk, E / Space / Enter to talk. Ignored while typing in a form. */
export function attachKeyboard(world: World): () => void {
  const held = new Set<string>();
  const apply = () => {
    let x = 0;
    let y = 0;
    for (const key of held) {
      const dir = MOVE_KEYS[key];
      if (dir) {
        x += dir[0];
        y += dir[1];
      }
    }
    world.setInput(Math.sign(x), Math.sign(y));
  };
  const normalize = (key: string) => (key.length === 1 ? key.toLowerCase() : key);
  const down = (e: KeyboardEvent) => {
    if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    const key = normalize(e.key);
    if (MOVE_KEYS[key]) {
      e.preventDefault();
      held.add(key);
      apply();
    } else if (INTERACT_KEYS.has(key) && !e.repeat && !(key !== "e" && isControl(e.target))) {
      e.preventDefault();
      world.interactNearby();
    }
  };
  const up = (e: KeyboardEvent) => {
    const key = normalize(e.key);
    if (held.delete(key)) apply();
  };
  const blur = () => {
    held.clear();
    apply();
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
  };
}
