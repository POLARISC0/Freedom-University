"use client";

/** Opens the Headmaster panel (mounted in the nav) on a given Headmaster. */
export function openHeadmaster(id: string) {
  window.dispatchEvent(new CustomEvent("fu:headmaster", { detail: id }));
}

export function OpenHeadmasterButton({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => openHeadmaster(id)} className={className}>
      {children}
    </button>
  );
}
