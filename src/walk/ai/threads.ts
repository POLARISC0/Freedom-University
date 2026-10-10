import { getCharacter, getLesson } from "@/walk/content";

/** Lesson conversations live in a thread named after the lesson; everything else is "talk". */
export function resolveThread(characterId: string, lessonSlug: string | undefined) {
  const character = getCharacter(characterId);
  if (!character) return { error: "Unknown character." } as const;
  if (lessonSlug) {
    const lesson = getLesson(lessonSlug);
    if (!lesson || lesson.mentorId !== character.id) return { error: "Unknown lesson." } as const;
    return { character, lesson, thread: lesson.slug } as const;
  }
  if (!character.conversational) {
    return { error: `Conversations with ${character.shortName} open in a later chapter.` } as const;
  }
  return { character, lesson: undefined, thread: "talk" } as const;
}

/** How many earlier messages are sent back to the model each turn. */
export const HISTORY_LIMIT = 30;

/** Shown when a reply ends in a refusal. */
export function refusalNote(shortName: string): string {
  return `${shortName} can't continue with that. Try asking another way.`;
}
