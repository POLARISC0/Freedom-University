import { StrictMode, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { GameShell } from "@/walk/components/game/GameShell";
import { installChatRoute } from "./chat";
import { startSession } from "./session";
import { openStore } from "./store";

// The static preview: the real game, with saving and conversations handled in the page (see local-actions.ts and
// chat.ts) so it runs without the Next.js server.

installChatRoute();

let savedIn: "account" | "browser" = "browser";
const listeners = new Set<() => void>();
function setSavedIn(where: typeof savedIn) {
  savedIn = where;
  listeners.forEach((l) => l());
}

function PreviewChip() {
  const where = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => savedIn,
  );
  return (
    <p className="pointer-events-none fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-3 hidden rounded-full bg-black/45 px-3 py-1 text-[11px] text-white/90 backdrop-blur sm:block">
      Preview · {where === "account" ? "saved privately to your claude.ai account" : "saved in this browser"}
    </p>
  );
}

function Loading() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-[#22607f] text-white">
      <p className="font-serif text-lg opacity-90">Walking into Galilee…</p>
    </div>
  );
}

async function boot() {
  const root = createRoot(document.getElementById("root")!);
  root.render(<Loading />);
  const store = await openStore(() => setSavedIn("browser"));
  const data = await store.load();
  startSession(store, data);
  setSavedIn(store.where);
  root.render(
    <StrictMode>
      <GameShell userId="preview" initialProgress={data.progress} initialJournal={data.journal} initialCheckIns={data.checkIns} />
      <PreviewChip />
    </StrictMode>,
  );
}

void boot();
