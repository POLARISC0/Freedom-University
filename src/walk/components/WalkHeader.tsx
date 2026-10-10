import Link from "next/link";
import { signOutOfWalk } from "@/app/walk/actions";
import { getCurrentUser } from "@/lib/auth";

export function WalkMark({ className = "h-7 w-7" }: { className?: string }) {
  // A path winding toward the sunrise over the water.
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="13" r="6" fill="#e2a83a" />
      <path d="M2 17h28" stroke="#275f6c" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M5 21.5h22M9 25.5h14" stroke="#4f8f9b" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 31c-3-3 4-4 0-7" stroke="#8a5a1f" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export async function WalkHeader() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/walk" className="flex items-center gap-2 font-serif text-lg font-semibold tracking-tight">
          <WalkMark />
          Walk With Him
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
          <Link href="/walk/play" className="font-medium text-brand hover:underline">
            Enter Galilee
          </Link>
          <Link href="/walk/me" className="hover:text-ink">
            Your walk
          </Link>
          <Link href="/walk/paths" className="hover:text-ink">
            Growth paths
          </Link>
          <Link href="/walk/journal" className="hover:text-ink">
            Walk Journal
          </Link>
          <Link href="/walk/mentors" className="hover:text-ink">
            Mentors
          </Link>
          <Link href="/walk/help" className="hover:text-ink">
            Need help?
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-muted">@{user.username}</span>
              <form action={signOutOfWalk}>
                <button className="rounded-md border border-line px-3 py-1.5 hover:bg-surface-2">Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/walk/begin" className="rounded-md bg-brand px-3 py-1.5 font-medium text-brand-ink">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export function WalkFooter() {
  return (
    <footer className="border-t border-line px-4 py-6 text-center text-xs leading-relaxed text-muted">
      <p className="mx-auto max-w-3xl">
        Walk With Him is a companion to your Bible, your prayers and your local church, not a replacement for them.
        The characters are AI portrayals and can make mistakes: check what they say against Scripture. Scripture
        quotations are from the World English Bible (public domain).{" "}
        <Link href="/walk/help" className="font-medium text-brand underline">
          Need help right now?
        </Link>
      </p>
    </footer>
  );
}
