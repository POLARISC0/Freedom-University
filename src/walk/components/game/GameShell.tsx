"use client";

import Link from "next/link";
import { useCallback, useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { advanceLesson, saveLife } from "@/app/walk/actions";
import { getCharacter, getLesson, type Appearance } from "@/walk/content";
import {
  applyActivity,
  awardBadges,
  cleanAppearance,
  cleanName,
  DEFAULT_APPEARANCE,
  friendship,
  getActivity,
  needNudge,
  newLife,
  recordCheckIn,
  recordGreeting,
  recordJournal,
  recordLessonComplete,
  recordMessage,
  tickLife,
  type ActivityDef,
  type BadgeContext,
  type LifeState,
  type Need,
} from "@/walk/life";
import type { CheckInView as CheckIn, JournalEntryView, LessonProgressView, ProgressMap } from "@/walk/progress";
import { DAY_MINUTES, dayPhase, timeOfDayLabel } from "@/walk/world/clock";
import { buildCapernaum } from "@/walk/world/maps/capernaum";
import { lessonAwaitingArrival, storyState } from "@/walk/world/story";
import type { WeatherKind } from "@/walk/world/types";
import { weatherAt } from "@/walk/world/weather";
import { World, type Interactable, type SavedState } from "@/walk/world/world";
import { CheckInView, localDay } from "../CheckInView";
import { GameCanvas } from "../GameCanvas";
import { HelpCard } from "../HelpCard";
import { JournalView } from "../JournalView";
import { LessonPlayer } from "../LessonPlayer";
import { PathsView } from "../PathsView";
import { Portrait } from "../Portrait";
import { safely } from "../safe-action";
import { WalkSummary } from "../YourWalk";
import { ActivityBar } from "./ActivityBar";
import { CharacterCreator } from "./CharacterCreator";
import { CharacterPanel } from "./CharacterPanel";
import { NeedsMeters, NudgeLine } from "./NeedsHud";
import { PlacesPanel } from "./PlacesPanel";
import { routineLine } from "./routine";
import { ToastStack, useToasts } from "./Toasts";
import { useAutosave } from "./useAutosave";
import { WelcomePanel } from "./WelcomePanel";

type Panel =
  | { type: "character"; id: string }
  | { type: "lesson"; slug: string }
  | { type: "journal" }
  | { type: "checkin" }
  | { type: "paths" }
  | { type: "places" }
  | { type: "help" }
  | { type: "walk" }
  | { type: "welcome" }
  | { type: "creator"; first: boolean };

type BadgeData = Omit<BadgeContext, "life">;

const WEATHER_ICONS: Record<WeatherKind, string> = { clear: "🌤️", cloudy: "☁️", mist: "🌫️", rain: "🌧️", windy: "💨" };

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

function removeStored(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to tidy up.
  }
}

/**
 * The game: the world canvas, the HUD over it, and the panels that open as you talk and learn. The player's life
 * (character, needs, friendships, badges) lives here and is saved a few seconds after it changes.
 */
export function GameShell({
  userId,
  username,
  initialLife,
  initialProgress,
  initialJournal,
  initialCheckIns,
}: {
  userId: string;
  /** The account's username, offered as the character's name. */
  username?: string;
  /** The saved life, or null before the player has made their character. */
  initialLife: LifeState | null;
  initialProgress: ProgressMap;
  initialJournal: JournalEntryView[];
  initialCheckIns: CheckIn[];
}) {
  const [world, setWorld] = useState<World | null>(null);
  const [life, setLife] = useState(initialLife);
  const [progress, setProgress] = useState(initialProgress);
  const [journal, setJournal] = useState(initialJournal);
  const [checkIns, setCheckIns] = useState(initialCheckIns);
  const [panel, setPanel] = useState<Panel | null>(initialLife ? null : { type: "welcome" });
  const [nearby, setNearby] = useState<Interactable | null>(null);
  const [region, setRegion] = useState("");
  const [minutes, setMinutes] = useState(7 * 60);
  const [day, setDay] = useState(0);
  const [activity, setActivity] = useState<ActivityDef | null>(null);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  /** How the player looked before characters were saved with their life: offered once, in the creator. */
  const [oldLook, setOldLook] = useState<Appearance | null>(null);
  /** The creator's choices, shown on the player in the world while they decide. */
  const [draftLook, setDraftLook] = useState<Appearance | null>(null);
  const [dismissedNudge, setDismissedNudge] = useState<{ need: Need; day: number } | null>(null);
  const [, startTransition] = useTransition();
  const { toasts, show, dismiss } = useToasts();
  const storageKey = `walk:${userId}`;
  const panelRef = useRef<HTMLDivElement>(null);

  // The newest life, so several changes in one moment (an hour passing as an activity ends) build on each other.
  const lifeRef = useRef(initialLife);
  const badgeData = useRef<BadgeData>({ progress: initialProgress, journal: initialJournal, checkIns: initialCheckIns });
  const lastTickHour = useRef(-1);
  useEffect(() => {
    badgeData.current = { progress, journal, checkIns };
  }, [progress, journal, checkIns]);

  const showToast = useCallback((text: string) => show({ kind: "text", text }), [show]);

  /** Change the life, then award any badge that change has earned. `data` overrides what badges are judged on. */
  const updateLife = useCallback(
    (change: (life: LifeState) => LifeState, data?: Partial<BadgeData>) => {
      const current = lifeRef.current;
      if (!current) return;
      const { life: next, earned } = awardBadges(change(current), { ...badgeData.current, ...data }, new Date().toISOString());
      if (next === current) return;
      lifeRef.current = next;
      setLife(next);
      for (const badge of earned) show({ kind: "badge", badge });
    },
    [show],
  );

  const onSaveTrouble = useCallback(
    (error: string) =>
      showToast(error.startsWith("Please sign in") ? error : "Your walk couldn't be saved just now. Keep going: it will try again shortly."),
    [showToast],
  );
  const { saveNow } = useAutosave(life, saveLife, onSaveTrouble);

  // The world lives only in the browser; restore where the player was. On a new device it starts at the day and
  // hour their life was last at.
  useEffect(() => {
    const saved = readStored<Partial<SavedState>>(`${storageKey}:state`);
    const start = lifeRef.current;
    const w = new World(
      buildCapernaum(),
      saved ?? (start ? { minutes: start.clock % DAY_MINUTES, day: Math.floor(start.clock / DAY_MINUTES) } : undefined),
    );
    if (!start) setOldLook(readStored<Appearance>(`${storageKey}:look`));
    setWorld(w);
    setMinutes(w.clock.minutes);
    setDay(w.clock.day);
    setRegion(w.regionAt(w.player.pos));
    // Needs catch up with the time that has passed in the world since the life was last brought up to date.
    lastTickHour.current = Math.floor(w.clock.total / 60);
    updateLife((l) => tickLife(l, w.clock.total));
  }, [storageKey, updateLife]);

  const updateProgress = useCallback(
    (view: LessonProgressView) => {
      setProgress((p) => ({ ...p, [view.lessonSlug]: view }));
      // Finishing a lesson (accepting its challenge), the first time or walking it again, grows the life.
      const lesson = getLesson(view.lessonSlug);
      const before = progress[view.lessonSlug];
      if (lesson && view.stepIndex >= lesson.steps.length && !(before && before.stepIndex >= lesson.steps.length)) {
        updateLife((l) => recordLessonComplete(l, lesson), { progress: { ...progress, [view.lessonSlug]: view } });
      }
    },
    [progress, updateLife],
  );

  const addJournalEntry = useCallback(
    (entry: JournalEntryView) => {
      setJournal((j) => [entry, ...j]);
      updateLife((l) => recordJournal(l, entry.kind), { journal: [entry, ...journal] });
      showToast("Saved to your Walk Journal");
    },
    [journal, showToast, updateLife],
  );

  const messageSent = useCallback(
    (characterId: string) => {
      if (world) updateLife((l) => recordMessage(l, characterId, world.clock.day));
    },
    [world, updateLife],
  );

  const openLesson = useCallback((slug: string) => {
    setActiveLesson(slug);
    setPanel({ type: "lesson", slug });
  }, []);

  const onInteract = useEffectEvent((item: Interactable) => {
    if (panel || !world) return;
    if (item.kind === "signpost") return setPanel({ type: "places" });
    if (item.kind === "activity") {
      // Walked up to something that can't be done now (or it stopped being possible): say why, kindly.
      const reason = item.reason ?? (world.startActivity(item.id) ? null : (world.activityReason(item.id) ?? "Step a little closer."));
      if (reason) showToast(reason);
      return;
    }
    setPanel({ type: "character", id: item.id });
    updateLife((l) => recordGreeting(l, item.id, world.clock.day));
  });

  const onClock = useEffectEvent((m: number) => {
    if (!world) return;
    setMinutes(m);
    setDay(world.clock.day);
    // Needs fade as game time passes, brought up to date once a game hour.
    const hour = Math.floor(world.clock.total / 60);
    if (hour === lastTickHour.current) return;
    lastTickHour.current = hour;
    updateLife((l) => tickLife(l, world.clock.total));
  });

  const onActivityDone = useEffectEvent((activityId: string, company: string[]) => {
    setActivity(null);
    const def = getActivity(activityId);
    if (!def || !world) return;
    show({ kind: "activity", def, company });
    updateLife((l) => applyActivity(l, def, company, world.clock.total));
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
      world.events.on("clock", (m) => onClock(m)),
      world.events.on("interact", (item) => onInteract(item)),
      world.events.on("arrive", (spot) => onArrive(spot)),
      world.events.on("activityStart", (e) => setActivity(getActivity(e.activity) ?? null)),
      world.events.on("activityCancel", () => setActivity(null)),
      world.events.on("activityDone", (e) => onActivityDone(e.activity, e.nearby)),
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

  // A panel opens at its top, with focus inside it.
  useEffect(() => {
    if (!panel) return;
    panelRef.current?.scrollTo({ top: 0 });
    panelRef.current?.focus();
  }, [panel]);

  // Escape closes panels, but not the welcome, which ends by making a character. Until there is a character,
  // closing any panel goes back to the welcome.
  const firstVisit = panel?.type === "welcome" || (panel?.type === "creator" && panel.first);
  const hasLife = life !== null;
  const closePanel = useCallback(() => setPanel(hasLife ? null : { type: "welcome" }), [hasLife]);
  useEffect(() => {
    if (!panel || firstVisit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, firstVisit, closePanel]);

  const quest = world ? storyState(progress, activeLesson).quest : null;
  const checkedInToday = checkIns.some((c) => c.day === localDay());
  const phase = dayPhase(minutes);
  const weather = weatherAt(day, minutes);
  const weatherIcon = weather.kind === "clear" && phase === "night" ? "✨" : WEATHER_ICONS[weather.kind];
  const nudge = life ? needNudge(life.needs) : null;
  const showNudge = nudge && !(dismissedNudge?.need === nudge.need && dismissedNudge.day === day) && !panel && !activity;
  const appearance =
    (panel?.type === "creator" ? draftLook : null) ?? life?.appearance ?? oldLook ?? DEFAULT_APPEARANCE;

  function openCreator(first: boolean) {
    // Going back to the welcome and on again keeps the look chosen so far.
    if (!first) setDraftLook(null);
    setPanel({ type: "creator", first });
  }

  function walkToMentor(slug: string) {
    const lesson = getLesson(slug);
    if (!world || !lesson) return;
    setPanel(null);
    world.setInputEnabled(true);
    world.approach(lesson.mentorId);
    showToast(`Walking to ${getCharacter(lesson.mentorId)?.shortName}…`);
  }

  function createCharacter(name: string, look: Appearance) {
    if (!world) return;
    const created = newLife(name, look, world.clock.total);
    lifeRef.current = created;
    lastTickHour.current = Math.floor(world.clock.total / 60);
    setLife(created);
    // Lessons walked before characters existed still count toward their badges.
    updateLife((l) => l);
    saveNow(lifeRef.current ?? created);
    removeStored(`${storageKey}:look`);
    setPanel(null);
    showToast(`Welcome to Capernaum, ${created.name}.`);
  }

  function updateCharacter(name: string, look: Appearance) {
    updateLife((l) => ({ ...l, name: cleanName(name) ?? l.name, appearance: cleanAppearance(look) }));
    setPanel(null);
  }

  let panelBody: React.ReactNode = null;
  let panelLabel = "";
  if (panel) {
    switch (panel.type) {
      case "character": {
        const npc = world?.npc(panel.id);
        const id = panel.id;
        panelLabel = getCharacter(id)?.name ?? "Conversation";
        panelBody = (
          <CharacterPanel
            id={id}
            progress={progress}
            friendship={life && getCharacter(id) ? friendship(life.relationships, id) : undefined}
            doing={npc?.doing}
            routine={world && npc ? routineLine(npc.def.schedule, world.map.spots) : null}
            onOpenLesson={openLesson}
            onMessageSent={() => messageSent(id)}
          />
        );
        break;
      }
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
            onMessageSent={() => messageSent(lesson.mentorId)}
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
            <JournalView
              entries={journal}
              onEntriesChange={setJournal}
              onEntryAdded={(entry) => updateLife((l) => recordJournal(l, entry.kind))}
            />
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
              onCheckIn={(c) => {
                const isNew = !checkIns.some((x) => x.day === c.day);
                const list = [c, ...checkIns.filter((x) => x.day !== c.day)];
                setCheckIns(list);
                if (isNew) updateLife(recordCheckIn, { checkIns: list });
              }}
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
      case "walk":
        panelLabel = "Your walk";
        panelBody = life && (
          <>
            <header className="mb-5 flex items-center gap-3">
              <Portrait appearance={life.appearance} size={64} className="shrink-0" />
              <div>
                <p className="text-xs font-semibold tracking-wider text-gold uppercase">Your walk</p>
                <h2 className="font-serif text-2xl font-semibold">{life.name}</h2>
              </div>
            </header>
            <WalkSummary life={life} />
          </>
        );
        break;
      case "welcome":
        panelLabel = "Welcome";
        panelBody = <WelcomePanel onContinue={() => openCreator(true)} />;
        break;
      case "creator":
        panelLabel = panel.first ? "Create your character" : "Your character";
        panelBody = (
          <CharacterCreator
            first={panel.first}
            initialName={life?.name ?? username ?? ""}
            initialAppearance={cleanAppearance((panel.first ? draftLook : null) ?? life?.appearance ?? oldLook ?? DEFAULT_APPEARANCE)}
            onPreview={setDraftLook}
            onDone={panel.first ? createCharacter : updateCharacter}
            onBack={() => (panel.first ? setPanel({ type: "welcome" }) : closePanel())}
          />
        );
        break;
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#22607f] text-ink select-none">
      {world && <GameCanvas world={world} appearance={appearance} insets={insets} showControls={!panel} />}
      {/* Everything below depends on the browser (time zone, saved state), so it appears once the world is ready. */}
      {world && (
        <>
          {/* Top: where and when, the menu, the five needs, and the active quest, stacked so nothing overlaps. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:p-3 sm:pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="flex items-start justify-between gap-2">
              <div className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-2xl bg-black/45 px-3 py-1.5 text-white shadow backdrop-blur">
                <Link href="/walk" className="text-sm opacity-80 hover:opacity-100" aria-label="Leave the game">
                  ←
                </Link>
                <div className="min-w-0 leading-tight">
                  <p className="truncate font-serif text-sm font-semibold">{region || "Capernaum"}</p>
                  <p className="text-[11px] opacity-85 sm:flex sm:gap-1">
                    <span className="block truncate">
                      <span aria-hidden>
                        {phase === "night" ? "🌙" : phase === "dawn" ? "🌅" : phase === "evening" ? "🌇" : "☀️"}
                      </span>{" "}
                      {timeOfDayLabel(minutes)}
                    </span>
                    <span aria-hidden className="hidden sm:inline">
                      ·
                    </span>
                    <span className="block truncate">
                      <span aria-hidden>{weatherIcon}</span> {weather.label}
                    </span>
                  </p>
                </div>
              </div>
              {life && (
                <nav className="pointer-events-auto flex max-w-[45vw] flex-wrap justify-end gap-1.5 sm:max-w-none" aria-label="Game menu">
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
                  <button className="hud-button" onClick={() => openCreator(false)} aria-label="Your character" title="Your character">
                    🧍
                  </button>
                </nav>
              )}
            </div>

            {life && (
              <div className="flex flex-col items-start gap-2">
                <NeedsMeters needs={life.needs} onOpen={() => setPanel({ type: "walk" })} />
                {showNudge && <NudgeLine nudge={nudge} onDismiss={() => setDismissedNudge({ need: nudge.need, day })} />}
              </div>
            )}

            {quest && !panel && (
              <div className="flex justify-center px-1">
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
          </div>

          {/* What the player can do right here (talk, pray, read...), or what they're in the middle of. Raised on
              phones so it clears the help button and the camera controls. */}
          {!panel && (activity || nearby) && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[calc(6.25rem+env(safe-area-inset-bottom,0px))] flex justify-center px-3 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
              {activity ? (
                <ActivityBar world={world} def={activity} onCancel={() => world.cancelActivity()} />
              ) : (
                nearby && (
                  <button
                    className="pointer-events-auto rounded-full border-2 border-amber-200 bg-[#275f6c] px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
                    onClick={() => world.interactNearby()}
                  >
                    {nearby.kind === "character" ? `Talk to ${nearby.label}` : nearby.label}
                    <kbd className="ml-2 hidden rounded bg-white/20 px-1.5 text-xs sm:inline">E</kbd>
                  </button>
                )
              )}
            </div>
          )}

          <button
            className="hud-button absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-3 !bg-[#7a1f18]/80"
            onClick={() => setPanel({ type: "help" })}
          >
            ♥ Need help now?
          </button>

          {/* Panels: a side sheet on wide screens, a bottom sheet on phones. */}
          {panel && (
            <div
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="false"
              aria-label={panelLabel}
              className="absolute inset-x-0 bottom-0 max-h-[70dvh] overflow-y-auto rounded-t-2xl border border-line bg-bg p-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] shadow-2xl outline-none select-text sm:inset-x-auto sm:top-3 sm:right-3 sm:bottom-3 sm:max-h-none sm:w-[460px] sm:rounded-2xl sm:p-5"
            >
              {!firstVisit && (
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

          <ToastStack
            toasts={toasts}
            onDismiss={dismiss}
            className="absolute inset-x-0 bottom-[calc(10rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
          />
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
