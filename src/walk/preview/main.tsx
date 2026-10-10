import { StrictMode, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { GameShell } from "@/walk/components/game/GameShell";
import { installChatRoute } from "./chat";
import { startSession } from "./session";
import { openStore, type FallbackStore, type WalkData } from "./store";

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
  // Bottom left, above "Need help now?". Only from 1024px: narrower, the centred "Talk to…" button and activity
  // bar, and an open side panel, reach this corner.
  return (
    <p className="pointer-events-none fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-3 hidden rounded-full bg-black/45 px-3 py-1 text-[11px] text-white/90 backdrop-blur lg:block">
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

/**
 * The saved walk couldn't be read. The game doesn't start, so nothing is saved over what is stored; trying again
 * reads it afresh.
 */
function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="fixed inset-0 grid place-items-center bg-[#22607f] p-6 text-center text-white">
      <div className="max-w-sm space-y-3">
        <p className="font-serif text-lg font-semibold">Your walk couldn&apos;t be loaded just now.</p>
        <p className="text-sm opacity-90">What you&apos;ve saved is safe. Wait a moment, then try again.</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#22607f] shadow hover:bg-white/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);

async function boot() {
  root.render(<Loading />);
  let store: FallbackStore;
  let data: WalkData;
  try {
    store = await openStore(() => setSavedIn("browser"));
    data = await store.load();
  } catch (error) {
    console.error("walk preview: couldn't load the walk", error);
    root.render(<LoadFailed onRetry={() => void boot()} />);
    return;
  }
  startSession(store, data);
  setSavedIn(store.where);
  root.render(
    <StrictMode>
      <GameShell
        userId="preview"
        initialLife={data.life}
        initialProgress={data.progress}
        initialJournal={data.journal}
        initialCheckIns={data.checkIns}
      />
      <PreviewChip />
    </StrictMode>,
  );
}

void boot();
