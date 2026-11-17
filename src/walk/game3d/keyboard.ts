import type { World } from "@/walk/world/world";
import { screenToWorld } from "./camera";

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
const ROTATE_KEYS: Record<string, 1 | -1> = { "[": -1, ",": -1, "]": 1, ".": 1 };
const ZOOM_KEYS: Record<string, 1 | -1> = { "+": 1, "=": 1, "-": -1, _: -1 };

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** Space and Enter on a focused button or link belong to that control, not to the game. */
function isControl(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ["BUTTON", "A", "SUMMARY"].includes(target.tagName);
}

export interface KeyboardControls {
  /** Re-aim held movement keys after the camera turns. Call every frame. */
  update(): void;
  detach(): void;
}

/**
 * Arrow keys or WASD to walk (relative to the camera: up walks into the screen), E / Space / Enter to talk,
 * [ and ] (or , and .) to turn the camera, + and - to zoom. Ignored while typing in a form.
 */
export function attachKeyboard(
  world: World,
  camera: { yaw: number; rotate(direction: 1 | -1): void; zoomBy(amount: number): void },
): KeyboardControls {
  const held = new Set<string>();
  let sent = { x: 0, y: 0 };
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
    x = Math.sign(x);
    y = Math.sign(y);
    const move = x === 0 && y === 0 ? { x: 0, y: 0 } : screenToWorld(x, y, camera.yaw);
    // Only tell the world when something changed, so a tap-to-move route isn't cancelled by an idle keyboard.
    if (Math.abs(move.x - sent.x) > 1e-3 || Math.abs(move.y - sent.y) > 1e-3) {
      sent = move;
      world.setInput(move.x, move.y);
    }
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
    } else if (ROTATE_KEYS[key] && !e.repeat) {
      e.preventDefault();
      camera.rotate(ROTATE_KEYS[key]);
    } else if (ZOOM_KEYS[key]) {
      e.preventDefault();
      camera.zoomBy(ZOOM_KEYS[key] * -0.12);
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
  return {
    update() {
      if (held.size > 0) apply();
    },
    detach() {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    },
  };
}
