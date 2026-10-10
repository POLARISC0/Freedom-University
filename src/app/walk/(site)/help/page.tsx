import type { Metadata } from "next";
import { HelpCard } from "@/walk/components/HelpCard";
import { RefChips } from "@/walk/components/Scripture";

export const metadata: Metadata = { title: "Need help now?" };

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold tracking-wider text-gold uppercase">You are not alone</p>
        <h1 className="font-serif text-3xl font-semibold">Need help right now?</h1>
        <p className="text-muted">
          If you&apos;re thinking about suicide, being hurt, grieving, or struggling with something heavy, please
          reach out to a real person today. These services are free and confidential.
        </p>
      </header>
      <HelpCard />
      <section className="space-y-2 rounded-xl bg-surface-2/70 p-5 text-sm leading-relaxed">
        <h2 className="font-serif text-xl font-semibold">How the characters handle hard things</h2>
        <p>
          When you share something serious with a character, the game shows you these resources straight away, and
          the character is instructed to respond with compassion first, to take you seriously, never to tell you
          to stay somewhere unsafe, and to encourage you to talk to someone you trust. They are AI characters, so
          they will also tell you honestly that they can&apos;t be there for you the way a person can.
        </p>
        <p>
          Please also talk to a pastor, a counselor, or a trusted friend at your church. God often carries us
          through other people.
        </p>
        <RefChips refs={["Psalm 34:18", "Matthew 11:28-30", "Galatians 6:2", "John 11:35"]} label="For the hard days:" />
      </section>
    </div>
  );
}
