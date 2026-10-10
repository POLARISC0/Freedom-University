"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { acceptChallenge, advanceLesson, submitReflection } from "@/app/walk/actions";
import { getCharacter, getPath, speakerName, TOWNSFOLK, type DialogueLine, type Lesson, type LessonStep } from "@/walk/content";
import type { JournalEntryView, LessonProgressView } from "@/walk/progress";
import { detectConcerns } from "@/walk/safety/concern";
import type { ConcernKind } from "@/walk/safety/resources";
import { ChatPanel } from "./ChatPanel";
import { HelpCard } from "./HelpCard";
import { Portrait } from "./Portrait";
import { PassageBlock, RefChips, TextWithRefs } from "./Scripture";

export interface LessonPlayerProps {
  lesson: Lesson;
  progress: LessonProgressView | undefined;
  /** "world": quests are walked in the game. "standalone": quests are described and skipped. */
  mode: "world" | "standalone";
  onProgress: (view: LessonProgressView) => void;
  onJournalEntry?: (entry: JournalEntryView) => void;
  /** World mode: close the panel so the player can walk to the quest target. */
  onSetOut?: () => void;
  /** World mode: walk the player to a spot automatically. */
  onTakeMeThere?: (spotId: string) => void;
  /** The name of a spot, for standalone quest descriptions. */
  spotLabel?: (spotId: string) => string;
  onClose?: () => void;
}

const STEP_ICONS: Record<LessonStep["kind"], string> = {
  dialogue: "💬",
  quest: "👣",
  scene: "📜",
  choice: "🤲",
  conversation: "🗣️",
  reflection: "✍️",
  challenge: "🌱",
};

export function LessonPlayer(props: LessonPlayerProps) {
  const { lesson, progress } = props;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [care, setCare] = useState<ConcernKind[]>([]);
  const mentor = getCharacter(lesson.mentorId)!;
  const stepIndex = progress?.stepIndex ?? -1;
  const finished = progress && stepIndex >= lesson.steps.length;

  function run<T>(action: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>, done: (data: T) => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) done(result.data);
      else setError(result.error);
    });
  }
  const goTo = (toStep: number, choice?: { stepIndex: number; optionId: string }) =>
    run(() => advanceLesson({ lessonSlug: lesson.slug, toStep, choice }), props.onProgress);

  let body: React.ReactNode;
  if (!progress) {
    body = <LessonIntro lesson={lesson} pending={pending} onBegin={() => goTo(0)} />;
  } else if (finished) {
    body = <LessonComplete lesson={lesson} progress={progress} pending={pending} onReplay={() => goTo(0)} onClose={props.onClose} />;
  } else {
    const step = lesson.steps[stepIndex];
    const next = () => goTo(stepIndex + 1);
    switch (step.kind) {
      case "dialogue":
        body = <DialogueStep key={stepIndex} lines={step.lines} pending={pending} onDone={next} />;
        break;
      case "quest":
        body =
          props.mode === "world" ? (
            <div className="space-y-4">
              <Lines lines={step.lines} />
              <Objective text={step.objective} />
              <div className="flex flex-wrap gap-2">
                <button onClick={props.onSetOut} className="btn-primary">
                  Set out
                </button>
                <button onClick={() => props.onTakeMeThere?.(step.target)} className="btn-secondary">
                  Show me the way
                </button>
              </div>
              <p className="text-xs text-muted">Walk to the glowing marker. The lesson continues when you arrive.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Lines lines={step.lines} />
              <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
                👣 In the game world you&apos;d walk to <strong>{(props.spotLabel?.(step.target) ?? "the next place").replace(/^The\b/, "the")}</strong> now.
              </p>
              <ContinueButton pending={pending} onClick={next} />
            </div>
          );
        break;
      case "scene":
        body = (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold tracking-wider text-gold uppercase">{step.setting}</p>
              <h3 className="font-serif text-xl font-semibold">{step.title}</h3>
            </div>
            {step.narration.map((n, i) => (
              <p key={i} className="leading-relaxed text-ink/90">
                {n}
              </p>
            ))}
            {step.passages.map((p) => (
              <PassageBlock key={p.ref} passage={p} />
            ))}
            <ContinueButton pending={pending} onClick={next} />
          </div>
        );
        break;
      case "choice":
        body = (
          <ChoiceStep
            key={stepIndex}
            step={step}
            chosen={progress.choices[String(stepIndex)]}
            pending={pending}
            onChoose={(optionId) => goTo(stepIndex + 1, { stepIndex, optionId })}
          />
        );
        break;
      case "conversation":
        body = (
          <div className="space-y-4">
            <ChatPanel character={mentor} lessonSlug={lesson.slug} intro={step.intro} suggestions={step.suggestions} />
            <div className="border-t border-line pt-3">
              <ContinueButton pending={pending} onClick={next} label="Continue the lesson" />
            </div>
          </div>
        );
        break;
      case "reflection":
        body = (
          <ReflectionStep
            key={stepIndex}
            question={step.question}
            guidance={step.guidance}
            pending={pending}
            onSubmit={(text) => {
              const concerns = detectConcerns(text);
              run(() => submitReflection({ lessonSlug: lesson.slug, stepIndex, text }), (data) => {
                if (data.entry) props.onJournalEntry?.(data.entry);
                setCare(concerns);
                props.onProgress(data.progress);
              });
            }}
          />
        );
        break;
      case "challenge":
        body = (
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-wider text-gold uppercase">Your challenge for this week</p>
            <h3 className="font-serif text-xl font-semibold">{step.title}</h3>
            <p className="leading-relaxed">{step.description}</p>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              {step.steps.map((s) => (
                <li key={s}>
                  <TextWithRefs text={s} />
                </li>
              ))}
            </ol>
            <RefChips refs={step.refs} />
            <button
              disabled={pending}
              onClick={() => run(() => acceptChallenge(lesson.slug), props.onProgress)}
              className="btn-primary"
            >
              {pending ? "Saving…" : "I'll take this challenge"}
            </button>
          </div>
        );
        break;
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <Portrait appearance={mentor.appearance} size={48} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted">
            {getPath(lesson.pathSlug)?.icon} {getPath(lesson.pathSlug)?.title} · with {mentor.shortName}
          </p>
          <h2 className="font-serif text-2xl leading-tight font-semibold">{lesson.title}</h2>
          {progress && !finished && <StepDots lesson={lesson} current={stepIndex} />}
        </div>
      </header>
      {care.length > 0 && <HelpCard concerns={care} compact />}
      {body}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function StepDots({ lesson, current }: { lesson: Lesson; current: number }) {
  return (
    <ol className="mt-1.5 flex flex-wrap items-center gap-1" aria-label={`Step ${current + 1} of ${lesson.steps.length}`}>
      {lesson.steps.map((s, i) => (
        <li
          key={i}
          title={s.kind}
          className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${
            i < current ? "bg-brand-soft" : i === current ? "bg-brand text-brand-ink ring-2 ring-gold/60" : "bg-surface-2 opacity-60"
          }`}
        >
          <span aria-hidden>{STEP_ICONS[s.kind]}</span>
        </li>
      ))}
    </ol>
  );
}

function LessonIntro({ lesson, pending, onBegin }: { lesson: Lesson; pending: boolean; onBegin: () => void }) {
  return (
    <div className="space-y-4">
      <p className="leading-relaxed">{lesson.summary}</p>
      <p className="text-sm text-muted">About {lesson.minutes} minutes · a story, a conversation, a reflection and a challenge for your week.</p>
      <RefChips refs={lesson.keyRefs} label="Passages:" />
      <button disabled={pending} onClick={onBegin} className="btn-primary">
        {pending ? "Starting…" : "Begin the lesson"}
      </button>
    </div>
  );
}

function LessonComplete({
  lesson,
  progress,
  pending,
  onReplay,
  onClose,
}: {
  lesson: Lesson;
  progress: LessonProgressView;
  pending: boolean;
  onReplay: () => void;
  onClose?: () => void;
}) {
  const challenge = lesson.steps.find((s) => s.kind === "challenge");
  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-success">✓ You&apos;ve walked this lesson.</p>
      <PassageBlock passage={lesson.blessing} />
      {challenge?.kind === "challenge" && (
        <p className="text-sm">
          Your challenge this week: <strong>{challenge.title}</strong>.{" "}
          {progress.challengeDoneAt ? "You've marked it done. Well done." : "Mark it done on your Growth paths page when you have."}
        </p>
      )}
      <p className="text-sm text-muted">
        Keep going with your own Bible, your prayers, and your church family. That&apos;s where this lesson really
        comes to life.
      </p>
      <div className="flex flex-wrap gap-2">
        {onClose && (
          <button onClick={onClose} className="btn-primary">
            Back to the world
          </button>
        )}
        <Link href="/walk/paths" className="btn-secondary">
          Growth paths
        </Link>
        <button disabled={pending} onClick={onReplay} className="btn-secondary">
          Walk it again
        </button>
      </div>
    </div>
  );
}

function Objective({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 text-sm font-medium">
      <span aria-hidden>✦</span>
      {text}
    </p>
  );
}

function ContinueButton({ pending, onClick, label = "Continue" }: { pending: boolean; onClick: () => void; label?: string }) {
  return (
    <button disabled={pending} onClick={onClick} className="btn-primary">
      {pending ? "…" : label}
    </button>
  );
}

/** One scripted line: who is speaking, what they say, and the passages it comes from. */
function Line({ line }: { line: DialogueLine }) {
  if (line.speaker === "narrator") {
    return (
      <div>
        <p className="leading-relaxed text-muted italic">{line.text}</p>
        <RefChips refs={line.refs ?? []} label="" />
      </div>
    );
  }
  const character = getCharacter(line.speaker);
  const appearance = character?.appearance ?? TOWNSFOLK[line.speaker]?.appearance;
  const quoted = line.text.startsWith('"');
  return (
    <div className="flex gap-2.5">
      {appearance && <Portrait appearance={appearance} size={36} className="mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-muted">{speakerName(line.speaker)}</p>
        <p className={`leading-relaxed ${quoted ? "scripture text-[1.05rem]" : ""}`}>{line.text}</p>
        <RefChips refs={line.refs ?? []} label="" />
      </div>
    </div>
  );
}

function Lines({ lines }: { lines: DialogueLine[] }) {
  return (
    <div className="space-y-3">
      {lines.map((l, i) => (
        <Line key={i} line={l} />
      ))}
    </div>
  );
}

function DialogueStep({ lines, pending, onDone }: { lines: DialogueLine[]; pending: boolean; onDone: () => void }) {
  const [shown, setShown] = useState(1);
  const all = shown >= lines.length;
  return (
    <div className="space-y-4">
      <Lines lines={lines.slice(0, shown)} />
      <div className="flex flex-wrap items-center gap-2">
        {all ? (
          <ContinueButton pending={pending} onClick={onDone} />
        ) : (
          <>
            <button autoFocus onClick={() => setShown((n) => n + 1)} className="btn-primary">
              Next
            </button>
            <button onClick={() => setShown(lines.length)} className="text-xs text-muted underline">
              Show all
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ChoiceStep({
  step,
  chosen,
  pending,
  onChoose,
}: {
  step: Extract<LessonStep, { kind: "choice" }>;
  chosen: string | undefined;
  pending: boolean;
  onChoose: (optionId: string) => void;
}) {
  const [picked, setPicked] = useState<string | undefined>(chosen);
  const option = step.options.find((o) => o.id === picked);
  return (
    <div className="space-y-4">
      <p className="font-medium">{step.prompt}</p>
      {!option ? (
        <div className="grid gap-2">
          {step.options.map((o) => (
            <button key={o.id} onClick={() => setPicked(o.id)} className="btn-choice">
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">You chose: {option.label}</p>
          <Lines lines={option.response} />
          <div className="flex flex-wrap gap-2">
            <ContinueButton pending={pending} onClick={() => onChoose(option.id)} />
            {!chosen && (
              <button onClick={() => setPicked(undefined)} className="text-xs text-muted underline">
                Choose again
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ReflectionStep({
  question,
  guidance,
  pending,
  onSubmit,
}: {
  question: string;
  guidance: string;
  pending: boolean;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(text);
      }}
    >
      <p className="text-xs font-semibold tracking-wider text-gold uppercase">Reflect</p>
      <p className="font-serif text-lg leading-snug">{question}</p>
      <p className="text-sm text-muted">{guidance}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        maxLength={10_000}
        aria-label="Your reflection"
        placeholder="Write freely…"
        className="w-full rounded-lg border border-line bg-bg px-3 py-2 leading-relaxed outline-none focus:border-brand"
      />
      <p className="text-xs text-muted">🔒 Saved privately to your Walk Journal. Only you can read it.</p>
      <div className="flex flex-wrap gap-2">
        <button disabled={pending || !text.trim()} className="btn-primary">
          {pending ? "Saving…" : "Save to my journal"}
        </button>
        <button type="button" disabled={pending} onClick={() => onSubmit("")} className="btn-secondary">
          Skip for now
        </button>
      </div>
    </form>
  );
}
