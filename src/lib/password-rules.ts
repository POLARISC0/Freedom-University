// Client-safe password rules. Hashing lives in ./password, which needs node:crypto.
export const PASSWORD_RULES = "At least 8 characters.";

export function isAcceptablePassword(password: string): boolean {
  return password.length >= 8 && password.length <= 200;
}
