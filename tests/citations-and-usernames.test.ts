import { describe, expect, it } from "vitest";
import { linkHeadlineCitations, linkSourceCitations } from "@/lib/citations";
import { normalizeUsername } from "@/lib/username";

const sources = [
  { title: "Whitepaper", publisher: "Satoshi", url: "https://bitcoin.org/bitcoin.pdf" },
  { title: "No link", publisher: "Court" },
];

describe("citation links", () => {
  it("links reading-list citations that have a URL", () => {
    expect(linkSourceCitations("Fixed supply [S1].", sources)).toBe(
      'Fixed supply [[S1]](https://bitcoin.org/bitcoin.pdf "Whitepaper").',
    );
  });
  it("leaves citations without URLs or out of range untouched", () => {
    expect(linkSourceCitations("See [S2] and [S9].", sources)).toBe("See [S2] and [S9].");
  });
  it("links headline numbers in the briefing", () => {
    expect(linkHeadlineCitations("Rates held [2].", ["https://a", "https://b"])).toBe("Rates held [[2]](https://b).");
  });
});

describe("usernames", () => {
  it("normalises case and whitespace", () => {
    expect(normalizeUsername("  Satoshi_99 ")).toBe("satoshi_99");
  });
  it("rejects invalid usernames", () => {
    expect(normalizeUsername("ab")).toBeNull();
    expect(normalizeUsername("has space")).toBeNull();
    expect(normalizeUsername("x".repeat(25))).toBeNull();
    expect(normalizeUsername("<script>")).toBeNull();
  });
});
