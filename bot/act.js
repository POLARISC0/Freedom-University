import { DRY_RUN } from "./env.js";

/** Every change Orion makes on the server goes through here, so a dry run only describes it. */
export async function act(what, change) {
  console.log(DRY_RUN ? `[dry run] would ${what}` : what);
  return DRY_RUN ? null : change();
}
