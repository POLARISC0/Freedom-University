"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActionResult } from "@/app/walk/actions";
import { safely } from "../safe-action";

/** Wait this long after the last change before saving, so a burst of changes is one save. */
const SAVE_AFTER_MS = 4000;
/** After a failed save, try again after these waits (the last one repeats). */
const RETRY_AFTER_MS = [15_000, 30_000, 60_000, 120_000];

type Save<T> = (value: T) => Promise<ActionResult<unknown>>;

/** Sends the newest value, one save at a time, and keeps trying (more and more patiently) when a save fails. */
export class Autosaver<T> {
  private latest: T | null;
  private saved: T | null;
  private busy = false;
  private failures = 0;
  private timer: number | null = null;
  private save: Save<T> | null = null;
  private onTrouble: (error: string) => void = () => {};

  constructor(initial: T | null) {
    // What the game starts with came from the save, so it counts as saved.
    this.latest = initial;
    this.saved = initial;
  }

  use(save: Save<T>, onTrouble: (error: string) => void) {
    this.save = save;
    this.onTrouble = onTrouble;
  }

  /** A new value to save soon. While saves are failing, the retry already waiting carries it. */
  changed(value: T | null) {
    this.latest = value;
    if (value !== this.saved && this.failures === 0) this.schedule(SAVE_AFTER_MS);
  }

  /** Save now, if there is anything new and no save is already on its way (that one picks it up when done). */
  run = () => {
    this.clearTimer();
    const value = this.latest;
    const save = this.save;
    if (value === null || value === this.saved || this.busy || !save) return;
    this.busy = true;
    void safely(() => save(value)).then((result) => {
      this.busy = false;
      if (result.ok) {
        this.saved = value;
        this.failures = 0;
        if (this.latest !== value) this.schedule(SAVE_AFTER_MS);
      } else {
        this.failures++;
        if (this.failures === 1) this.onTrouble(result.error);
        this.schedule(RETRY_AFTER_MS[Math.min(this.failures, RETRY_AFTER_MS.length) - 1]);
      }
    });
  };

  private schedule(ms: number) {
    this.clearTimer();
    this.timer = window.setTimeout(this.run, ms);
  }

  private clearTimer() {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }
}

/**
 * Keep a value saved: a few seconds after it last changed, straight away when the page is hidden, and again later
 * if a save fails. Only the newest value is sent, one save at a time, and the value it starts with counts as saved.
 * `onTrouble` is called once when saving starts to fail (not on every retry), so the player hears about it once and
 * keeps playing. `saveNow` saves without waiting, e.g. right after the player makes their character: pass the new
 * value when it was set in the same event, before React has rendered it.
 */
export function useAutosave<T>(
  value: T | null,
  save: Save<T>,
  onTrouble: (error: string) => void,
): { saveNow: (value?: T) => void } {
  const [saver] = useState(() => new Autosaver(value));

  useEffect(() => {
    saver.use(save, onTrouble);
  }, [saver, save, onTrouble]);

  useEffect(() => {
    saver.changed(value);
  }, [saver, value]);

  // Save at once when the player switches away or closes the page, and when the game unmounts.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") saver.run();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", saver.run);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", saver.run);
      saver.run();
    };
  }, [saver]);

  const saveNow = useCallback(
    (next?: T) => {
      if (next !== undefined) saver.changed(next);
      saver.run();
    },
    [saver],
  );
  return { saveNow };
}
