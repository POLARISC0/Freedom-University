import { WalkFooter, WalkHeader } from "@/walk/components/WalkHeader";

export default function WalkSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WalkHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <WalkFooter />
    </>
  );
}
