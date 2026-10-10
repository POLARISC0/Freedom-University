"use client";

import Link from "next/link";
import { useCallback, useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { advanceLesson } from "@/app/walk/actions";
import { getCharacter, getLesson, type Appearance } from "@/walk/content";
import type { CheckInView as CheckIn, JournalEntryView, LessonProgressView, ProgressMap } from "@/walk/progress";
import { timeOfDayLabel, dayPhase } from "@/walk/world/clock";
import { buildCapernaum } from "@/walk/world/maps/capernaum";
import { lessonAwaitingArrival, storyState } from "@/walk/world/story";
import { World, type Interactable } from "@/walk/world/world";
import { CheckInView, localDay } from "../CheckInView";
import { GameCanvas } from "../GameCanvas";
import { HelpCard } from "../HelpCard";
import { JournalView } from "../JournalView";
import { LessonPlayer } from "../LessonPlayer";
import { PathsView } from "../PathsView";
import { safely } from "../safe-action";
import { CharacterPanel } from "./CharacterPanel";
import { PlacesPanel } from "./PlacesPanel";
import { DEFAULT_APPEARANCE, WelcomePanel } from "./WelcomePanel";

type Panel =
  | { type: "character"; id: string }
  | { type: "lesson"; slug: string }
  | { type: "journal" }
  | { type: "checkin" }
  | { type: "paths" }
  | { type: "places" }
  | { type: "help" }
  | { type: "welcome"; first: boolean };

function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or storage disabled: the game still works, it just won't remember where you were.
  }
}

/** The game: the world canvas, the HUD over it, and the panels that open as you talk and learn. */
export function GameShell({
  userId,
  initialProgress,
  initialJournal,
  initialCheckIns,
}: {
  userId: string;
  initialProgress: ProgressMap;
  initialJournal: JournalEntryView[];
  initialCheckIns: CheckIn[];
}) {
  const [world, setWorld] = useState<World | null>(null);
  const [progress, setProgress] = useState(initialProgress);
  const [journal, setJournal] = useState(initialJournal);
  const [checkIns, setCheckIns] = useState(initialCheckIns);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [nearby, setNearby] = useState<Interactable | null>(null);
  const [region, setRegion] = useState("");
  const [minutes, setMinutes] = useState(7 * 60);
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const storageKey = `walk:${userId}`;
  const panelRef = useRef<HTMLDivElement>(null);

  // The world lives only in the browser; restore where the player was and how they look.
  useEffect(() => {
    const look = readStored<Appearance>(`${storageKey}:look`);
    const w = new World(buildCapernaum(), readStored(`${storageKey}:state`) ?? undefined);
    /* eslint-disable react-hooks/set-state-in-effect -- one-time setup from browser-only storage */
    if (look) setAppearance(look);
    else setPanel({ type: "welcome", first: true });
    setWorld(w);
    setMinutes(w.clock.minutes);
    setRegion(w.regionAt(w.player.pos));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [storageKey]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((t) => (t === message ? null : t)), 3200);
  }, []);

  const updateProgress = useCallback((view: LessonProgressView) => {
    setProgress((p) => ({ ...p, [view.lessonSlug]: view }));
  }, []);

  const addJournalEntry = useCallback(
    (entry: JournalEntryView) => {
      setJournal((j) => [entry, ...j]);
      showToast("Saved to your Walk Journal");
    },
    [showToast],
  );

  const openLesson = useCallback((slug: string) => {
    setActiveLesson(slug);
    setPanel({ type: "lesson", slug });
  }, []);

  const onInteract = useEffectEvent((item: Interactable) => {
    if (panel) return;
    if (item.kind === "signpost") setPanel({ type: "places" });
    else setPanel({ type: "character", id: item.id });
  });

  // Reaching a quest target moves the lesson on and opens it again.
  const onArrive = useEffectEvent((spotId: string) => {
    const lesson = lessonAwaitingArrival(progress, spotId, activeLesson);
    if (!lesson) return;
    const step = progress[lesson.slug].stepIndex;
    startTransition(async () => {
      const result = await safely(() => advanceLesson({ lessonSlug: lesson.slug, toStep: step + 1 }));
      if (!result.ok) return showToast(`${result.error} Step away and back to try again.`);
      // Bring the mentor to where the scene needs them before the panel opens.
      world?.setStory(storyState({ ...progress, [lesson.slug]: result.data }, lesson.slug));
      world?.settle(lesson.mentorId);
      updateProgress(result.data);
      openLesson(lesson.slug);
    });
  });

  useEffect(() => {
    if (!world) return;
    const offs = [
      world.events.on("nearby", setNearby),
      world.events.on("region", setRegion),
      world.events.on("clock", setMinutes),
      world.events.on("interact", (item) => onInteract(item)),
      world.events.on("arrive", (spot) => onArrive(spot)),
    ];
    return () => offs.forEach((off) => off());
  }, [world]);

  useEffect(() => {
    world?.setStory(storyState(progress, activeLesson));
  }, [world, progress, activeLesson]);

  // While a panel is open the player stands still, and the person they're talking to faces them.
  useEffect(() => {
    if (!world) return;
    world.setInputEnabled(!panel);
    const talkingTo =
      panel?.type === "character" ? panel.id : panel?.type === "lesson" ? getLesson(panel.slug)?.mentorId : null;
    world.setTalkingTo(talkingTo ?? null);
  }, [world, panel]);

  // Remember position and time of day between visits.
  useEffect(() => {
    if (!world) return;
    const save = () => writeStored(`${storageKey}:state`, world.save());
    const timer = window.setInterval(save, 5000);
    window.addEventListener("pagehide", save);
    return () => {
      save();
      window.clearInterval(timer);
      window.removeEventListener("pagehide", save);
    };
  }, [world, storageKey]);

  // Keep the player visible beside (or above) an open panel.
  const [insets, setInsets] = useState({ right: 0, bottom: 0 });
  useEffect(() => {
    const el = panelRef.current;
    const measure = () => {
      if (!el) return setInsets({ right: 0, bottom: 0 });
      const rect = el.getBoundingClientRect();
      setInsets(
        window.innerWidth >= 640
          ? { right: window.innerWidth - rect.left, bottom: 0 }
          : { right: 0, bottom: window.innerHeight - rect.top },
      );
    };
    measure();
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [panel]);

  // Escape closes panels; move focus into a panel when it opens.
  useEffect(() => {
    if (!panel) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panel.type !== "welcome") setPanel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  const quest = world ? storyState(progress, activeLesson).quest : null;
  const checkedInToday = checkIns.some((c) => c.day === localDay());
  const phase = dayPhase(minutes);

  function closePanel() {
    setPanel(null);
  }

  function walkToMentor(slug: string) {
    const lesson = getLesson(slug);
    if (!world || !lesson) return;
    setPanel(null);
    world.setInputEnabled(true);
    world.approach(lesson.mentorId);
    showToast(`Walking to ${getCharacter(lesson.mentorId)?.shortName}…`);
  }

  let panelBody: React.ReactNode = null;
  let panelLabel = "";
  if (panel) {
    switch (panel.type) {
      case "character":
        panelLabel = getCharacter(panel.id)?.name ?? "Conversation";
        panelBody = <CharacterPanel id={panel.id} progress={progress} onOpenLesson={openLesson} />;
        break;
      case "lesson": {
        const lesson = getLesson(panel.slug)!;
        panelLabel = lesson.title;
        panelBody = (
          <LessonPlayer
            lesson={lesson}
            progress={progress[lesson.slug]}
            mode="world"
            onProgress={updateProgress}
            onJournalEntry={addJournalEntry}
            onSetOut={closePanel}
            onTakeMeThere={(spot) => {
              setPanel(null);
              world?.setInputEnabled(true);
              world?.walkToSpot(spot);
            }}
            onClose={closePanel}
          />
        );
        break;
      }
      case "journal":
        panelLabel = "Walk Journal";
        panelBody = (
          <>
            <PanelTitle eyebrow="Private to you" title="Walk Journal" />
            <JournalView entries={journal} onEntriesChange={setJournal} />
          </>
        );
        break;
      case "checkin":
        panelLabel = "Daily check-in";
        panelBody = (
          <>
            <PanelTitle
              eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              title="Daily check-in"
            />
            <CheckInView
              checkIns={checkIns}
              onCheckIn={(c) => setCheckIns((list) => [c, ...list.filter((x) => x.day !== c.day)])}
              onJournalEntry={addJournalEntry}
            />
          </>
        );
        break;
      case "paths":
        panelLabel = "Growth paths";
        panelBody = (
          <>
            <PanelTitle eyebrow="Your walk" title="Growth paths" />
            <PathsView
              compact
              progress={progress}
              onProgress={updateProgress}
              onOpenLesson={(slug) => (progress[slug] ? openLesson(slug) : walkToMentor(slug))}
            />
          </>
        );
        break;
      case "places":
        panelLabel = "Places";
        panelBody = <PlacesPanel />;
        break;
      case "help":
        panelLabel = "Need help now?";
        panelBody = (
          <>
            <PanelTitle eyebrow="You're not alone" title="Need help now?" />
            <HelpCard compact={false} />
          </>
        );
        break;
      case "welcome":
        panelLabel = "Welcome";
        panelBody = (
          <WelcomePanel
            appearance={appearance}
            firstVisit={panel.first}
            onDone={(look) => {
              setAppearance(look);
              writeStored(`${storageKey}:look`, look);
              setPanel(null);
            }}
          />
        );
        break;
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#22607f] text-ink select-none">
      {world && <GameCanvas world={world} appearance={appearance} insets={insets} />}
      {/* Everything below depends on the browser (time zone, saved state), so it appears once the world is ready. */}
      {world && (
        <>
          {/* Top bar: where and when, and the journal, check-in and paths. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2 sm:p-3">
            <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-black/45 px-3 py-1.5 text-white shadow backdrop-blur">
              <Link href="/walk" className="text-sm opacity-80 hover:opacity-100" aria-label="Leave the game">
                ←
              </Link>
              <div className="leading-tight">
                <p className="font-serif text-sm font-semibold">{region || "Capernaum"}</p>
                <p className="max-w-[46vw] truncate text-[11px] opacity-85 sm:max-w-none">
                  <span aria-hidden>
                    {phase === "night" ? "🌙" : phase === "dawn" ? "🌅" : phase === "evening" ? "🌇" : "☀️"}
                  </span>{" "}
                  {timeOfDayLabel(minutes)}
                </p>
              </div>
            </div>
            <nav className="pointer-events-auto flex flex-wrap justify-end gap-1.5" aria-label="Game menu">
              <button className="hud-button relative" onClick={() => setPanel({ type: "checkin" })}>
                📖 <span className="hidden sm:inline">Today</span>
                {!checkedInToday && (
                  <span
                    className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-400"
                    aria-label="Not checked in today"
                  />
                )}
              </button>
              <button className="hud-button" onClick={() => setPanel({ type: "journal" })}>
                ✍️ <span className="hidden sm:inline">Journal</span>
              </button>
              <button className="hud-button" onClick={() => setPanel({ type: "paths" })}>
                🌱 <span className="hidden sm:inline">Paths</span>
              </button>
              <button className="hud-button" onClick={() => setPanel({ type: "places" })}>
                🗺️ <span className="hidden sm:inline">Places</span>
              </button>
              <button
                className="hud-button"
                onClick={() => setPanel({ type: "welcome", first: false })}
                aria-label="Change how you look"
              >
                🧍
              </button>
            </nav>
          </div>

          {/* The active quest. */}
          {quest && !panel && (
            <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center px-3 sm:top-4">
              <div className="pointer-events-auto flex max-w-md items-center gap-2 rounded-xl border border-amber-300/50 bg-black/55 px-3 py-2 text-sm text-white shadow backdrop-blur">
                <span aria-hidden className="text-amber-300">
                  ✦
                </span>
                <span className="flex-1">{quest.objective}</span>
                <button
                  className="shrink-0 rounded-md bg-amber-300/90 px-2 py-1 text-xs font-semibold text-black"
                  onClick={() => world?.walkToSpot(quest.target)}
                >
                  Show me
                </button>
              </div>
            </div>
          )}

          {/* Talk to whoever is close by. */}
          {nearby && !panel && (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
              <button
                className="pointer-events-auto rounded-full border-2 border-amber-200 bg-[#275f6c] px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
                onClick={() => world?.interactNearby()}
              >
                {nearby.kind === "signpost" ? "Read the signpost" : `Talk to ${nearby.label}`}
                <kbd className="ml-2 hidden rounded bg-white/20 px-1.5 text-xs sm:inline">E</kbd>
              </button>
            </div>
          )}

          <button
            className="hud-button absolute bottom-3 left-3 !bg-[#7a1f18]/80"
            onClick={() => setPanel({ type: "help" })}
          >
            ♥ Need help now?
          </button>

          {toast && (
            <div role="status" className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center">
              <p className="rounded-full bg-black/70 px-4 py-2 text-sm text-white shadow">{toast}</p>
            </div>
          )}

          {/* Panels: a side sheet on wide screens, a bottom sheet on phones. */}
          {panel && (
            <div
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="false"
              aria-label={panelLabel}
              className="absolute inset-x-0 bottom-0 max-h-[70dvh] overflow-y-auto rounded-t-2xl border border-line bg-bg p-4 pb-8 shadow-2xl outline-none select-text sm:inset-x-auto sm:top-3 sm:right-3 sm:bottom-3 sm:max-h-none sm:w-[460px] sm:rounded-2xl sm:p-5"
            >
              {panel.type !== "welcome" && (
                <button
                  onClick={closePanel}
                  className="sticky top-0 float-right -mt-1 -mr-1 ml-2 grid h-8 w-8 place-items-center rounded-full border border-line bg-surface text-lg leading-none hover:bg-surface-2"
                  aria-label="Close"
                >
                  ×
                </button>
              )}
              {panelBody}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PanelTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="mb-4">
      <p className="text-xs font-semibold tracking-wider text-gold uppercase">{eyebrow}</p>
      <h2 className="font-serif text-2xl font-semibold">{title}</h2>
    </header>
  );
}
