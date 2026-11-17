import Link from "next/link";
import { NavBar } from "@/components/NavBar";

export default function UniversityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        Freedom University provides education only. Nothing here is financial, investment, tax or legal advice.
        <span className="mt-1 block">
          Also here:{" "}
          <Link href="/walk" className="underline hover:text-ink">
            Walk With Him
          </Link>
          , a walk through the world of the Gospels.
        </span>
      </footer>
    </>
  );
}
