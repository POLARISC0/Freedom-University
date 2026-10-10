import Phaser from "phaser";
import type { Appearance } from "@/walk/content";
import type { World } from "@/walk/world/world";
import { attachKeyboard } from "./keyboard";
import { LabelLayer } from "./LabelLayer";
import { WorldScene } from "./WorldScene";

export interface GameHandle {
  setPlayerAppearance(appearance: Appearance): void;
  setViewInsets(right: number, bottom: number): void;
  destroy(): void;
}

/**
 * Start the 2D renderer for a world inside `parent`. The world model owns all state, so a different renderer
 * (a 3D one, say) could be swapped in here without touching the simulation or the UI.
 */
export function createGame(parent: HTMLElement, world: World, playerAppearance: Appearance, onReady: () => void): GameHandle {
  const labels = new LabelLayer(parent);
  const scene = new WorldScene({ world, labels, playerAppearance, onReady });
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#22607f",
    banner: false,
    render: { pixelArt: true },
    input: { keyboard: false },
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth || 800, height: parent.clientHeight || 600 },
    scene: [scene],
  });
  const detachKeyboard = attachKeyboard(world);
  return {
    setPlayerAppearance: (appearance) => scene.setPlayerAppearance(appearance),
    setViewInsets: (right, bottom) => scene.setViewInsets(right, bottom),
    destroy() {
      detachKeyboard();
      game.destroy(true);
      labels.destroy();
    },
  };
}
