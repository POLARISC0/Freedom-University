"use client";

import Link from "next/link";

export default function WalkError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
      <h1 className="font-serif text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted">
        Your journal and progress are saved on the server. Try again, or come back in a moment.
      </p>
      <div className="flex justify-center gap-2">
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/walk" className="btn-secondary">
          Walk With Him home
        </Link>
      </div>
    </div>
  );
}
