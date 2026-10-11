import Link from "next/link";
import { signOut } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";

export async function NavBar() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-line bg-surface">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="font-serif text-lg font-semibold tracking-tight">
          🎓 Freedom University
        </Link>
        {user && (
          <div className="flex items-center gap-4 text-sm text-muted">
            <Link href="/floor" className="hover:text-ink">Trading Floor</Link>
            <Link href="/dashboard" className="hover:text-ink">Dashboard</Link>
            <Link href="/news" className="hover:text-ink">Daily Briefing</Link>
          </div>
        )}
        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-muted">@{user.username}</span>
              <form action={signOut}>
                <button className="rounded-md border border-line px-3 py-1.5 hover:bg-surface-2">Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="rounded-md bg-brand px-3 py-1.5 font-medium text-brand-ink">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
