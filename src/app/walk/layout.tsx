import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Walk With Him", template: "%s · Walk With Him" },
  description:
    "Walk through first-century Galilee and learn from the people who walked with Jesus: prayer, faith, generosity and more, grounded in Scripture.",
};

export const viewport: Viewport = {
  themeColor: "#275f6c",
};

export default function WalkLayout({ children }: { children: React.ReactNode }) {
  return <div className="walk-theme flex min-h-full flex-1 flex-col bg-bg text-ink">{children}</div>;
}
