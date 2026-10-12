import Link from "next/link";
import { signOut } from "@/app/actions";
import { HEADMASTERS } from "@/lib/agents/registry";
import { getCurrentUser } from "@/lib/auth";
import { HeadmasterDock } from "./HeadmasterDock";

export async function NavBar() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/85 text-[#0B0B0C] backdrop-blur">
      <nav className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
        <Link href="/" className="font-wide text-sm font-black tracking-tight uppercase sm:text-base">
          Freedom University
        </Link>
        {user && (
          <div className="flex items-center gap-4 font-mono text-xs tracking-wider text-black/60 uppercase">
            <Link href="/floor" className="hover:text-black">Trading Floor</Link>
            <Link href="/dashboard" className="hover:text-black">Dashboard</Link>
            <Link href="/news" className="hover:text-black">Briefing</Link>
          </div>
        )}
        <div className="ml-auto flex items-center gap-3 text-sm">
          <HeadmasterDock headmasters={HEADMASTERS.map(({ id, name, title, color }) => ({ id, name, title, color }))} signedIn={Boolean(user)} />
          {user ? (
            <>
              <span className="hidden font-mono text-xs text-black/55 sm:inline">@{user.username}</span>
              <form action={signOut}>
                <button className="rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide uppercase ring-1 ring-black/20 hover:bg-black hover:text-white">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="rounded-full bg-[#0B0B0C] px-4 py-1.5 text-xs font-bold tracking-wide text-white uppercase hover:bg-black/80">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
