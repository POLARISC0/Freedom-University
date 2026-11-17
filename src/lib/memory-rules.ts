/** Rewrite a specialist's notes about a student after this many new student messages. */
export const MEMORY_REFRESH_EVERY = 4;

export function shouldRefreshMemory(studentMessages: number, messagesAtUpdate: number): boolean {
  return studentMessages - messagesAtUpdate >= MEMORY_REFRESH_EVERY;
}
