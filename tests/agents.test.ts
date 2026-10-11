import { describe, expect, it } from "vitest";
import { SPECIALISTS } from "@/content";
import { DISTRICTS } from "@/content/world";
import { HEADMASTERS, MENTORS, getHeadmaster, getMentor } from "@/lib/agents/registry";
import { buildHeadmasterPrompt, cleanHeadmasterReply } from "@/lib/agents/headmaster-rules";

describe("agent registry", () => {
  it("has two distinct top-level Headmasters", () => {
    expect(HEADMASTERS).toHaveLength(2);
    expect(new Set(HEADMASTERS.map((h) => h.name)).size).toBe(2);
    expect(HEADMASTERS[0].personality).not.toBe(HEADMASTERS[1].personality);
    for (const h of HEADMASTERS) expect(h.layer).toBe("headmaster");
  });

  it("has one Mentor per specialist, each the gatekeeper of a district on the map", () => {
    expect(MENTORS.map((m) => m.id)).toEqual(SPECIALISTS.map((s) => s.slug));
    for (const m of MENTORS) {
      expect(m.layer).toBe("mentor");
      expect(DISTRICTS.find((d) => d.id === m.districtId)?.href).toBe(m.href);
    }
  });

  it("looks agents up by id", () => {
    expect(getMentor("sterling")?.topic).toBe("Credit");
    expect(getHeadmaster(HEADMASTERS[1].id)?.name).toBe(HEADMASTERS[1].name);
    expect(getMentor("nobody")).toBeUndefined();
  });
});

describe("headmaster replies", () => {
  it("keeps a valid handoff and district suggestion", () => {
    const out = cleanHeadmasterReply({ reply: " Let's get you to Sterling. ", handoff: { mentor: "sterling", note: "Wants to build credit." }, suggestDistrict: "sterling" });
    expect(out).toEqual({ reply: "Let's get you to Sterling.", handoff: { mentor: "sterling", note: "Wants to build credit." }, suggestDistrict: "sterling" });
  });

  it("drops handoffs to unknown mentors and unknown districts", () => {
    const out = cleanHeadmasterReply({ reply: "Hi", handoff: { mentor: "ghost", note: "x" }, suggestDistrict: "moon" });
    expect(out.handoff).toBeNull();
    expect(out.suggestDistrict).toBeNull();
  });

  it("never hands off with an empty reply", () => {
    expect(cleanHeadmasterReply({ reply: "  ", handoff: null, suggestDistrict: null }).reply).toMatch(/\S/);
  });
});

describe("headmaster prompt", () => {
  const [halo, other] = HEADMASTERS;
  const prompt = buildHeadmasterPrompt({
    headmaster: halo,
    username: "student_1",
    today: "2026-10-11",
    reports: [{ mentorId: "sterling", completedLessons: 2, totalLessons: 5, notes: "- Goal: build credit for an LLC" }],
    recentMentorThread: { mentorId: "nova", messages: [{ role: "user", content: "What is a stablecoin?" }] },
  });

  it("knows the whole roster: the other Headmaster, every mentor and district", () => {
    expect(prompt).toContain(other.name);
    for (const m of MENTORS) expect(prompt).toContain(m.name);
    for (const d of DISTRICTS) expect(prompt).toContain(d.name);
  });

  it("carries the house rules, the help centre, mentor reports and the conversation it can pull back", () => {
    expect(prompt).toMatch(/Education only/);
    expect(prompt).toMatch(/Help centre/i);
    expect(prompt).toContain("Goal: build credit for an LLC");
    expect(prompt).toContain("What is a stablecoin?");
  });
});
