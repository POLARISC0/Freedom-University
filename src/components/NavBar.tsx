import Link from "next/link";
import { signOut } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";

export async function NavBar() {
  const user = await getCurrentUser();
  return (
    <header className="bg-[#0B0B0C] text-[#F5F5F0]">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="font-wide text-sm font-black tracking-tight uppercase sm:text-base">
          Freedom University
        </Link>
        {user && (
          <div className="flex items-center gap-4 font-mono text-xs tracking-wider text-white/60 uppercase">
            <Link href="/floor" className="hover:text-white">Trading Floor</Link>
            <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
            <Link href="/news" className="hover:text-white">Briefing</Link>
          </div>
        )}
        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="font-mono text-xs text-white/60">@{user.username}</span>
              <form action={signOut}>
                <button className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold tracking-wide uppercase hover:bg-white hover:text-black">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="rounded-full bg-[#FFC400] px-4 py-1.5 text-xs font-bold tracking-wide text-black uppercase hover:bg-white">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
