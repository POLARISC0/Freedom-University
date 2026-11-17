# Freedom University: project DNA

## In one line

Freedom University teaches money the way school doesn't. Four AI specialists teach short courses, quiz you, and react to the day's money news on a live "Trading Floor".

## The Polaris family

Polaris is the parent company. Each project below belongs to it.

- **Freedom University** (this project) teaches money the way school doesn't: how credit, banks, crypto, coins, stocks and ETFs really work. Its tagline is "teach, not trade". On screen it says "a product by Polaris".
- **Polaris Vending** places vending machines in local businesses (gyms, barbershops, schools, offices) at no cost to the business. Polaris stocks and services each machine every week, and the business gets a share of every sale. Polaris never sells machines.
- **Orion** is the Discord doorman bot for the community server, Incredible Server. The weekly Freedom University build happens there, Wednesdays from 5:00 to 6:30 pm Central.

## Brand rules

- **Sell the skill, never a payout.** People come to understand money, not to be promised money.
- **Teaching how things work is the core of this school.** That includes crypto, coins, stocks and ETFs, and it's allowed.
- **Polaris never issues or sells its own coin or token.**
- **Polaris never takes investors.**
- **Polaris never recommends a specific coin or investment.** No lesson, AI reply, feed post or page may say "buy this". Any lesson that comes close gets flagged (see `STATUS.md`).
- **Polaris never promises income.**
- **Tone:** plain language and no hype. Sound like a mate who figured money out, not a guru.

## The AI's own rules

Every AI prompt (`CORE_RULES` in `src/lib/prompts.ts`) includes these rules:

- **Education only.** Never tell anyone to buy, sell or hold a specific asset. Never give price targets or predictions, and never say which credit, debt, tax, legal or allocation decision is right for them. Explain the framework, and point to a licensed professional for decisions about their own money.
- **No real people's names.** Refer to roles instead, such as "the Fed chair" or "the founder".
- **Cite sources.** Never invent statistics, quotes or links. The AI has no live market data, so it says what it knew and where to check.
- **Never ask for or accept seed phrases, private keys, passwords or account numbers.**

There's also an "Education only, never financial advice" notice on every page, and in the 3D world and the Headmaster panel.

## What a student does

1. **Signs in** with a username. There's no password yet; see `STATUS.md`.
2. **Lands on the Trading Floor.** The four specialists move around the room on a schedule and post short, cited takes on the day's news to a shared feed.
3. **Picks a specialist.** Each one has 5 lessons, taught by chat. After each lesson there's a 4-question quiz the AI writes fresh, and 70% or more unlocks the next lesson. Each specialist also has open "office hours" and keeps private notes on what the student knows. A "forget me" button clears those notes.
4. **Checks progress** on the dashboard ("0/20 lessons completed" at the start) and reads the daily news briefing.
5. **Gets help** from two Headmasters, Halo and Kite (placeholder names). They answer questions about the school and can hand the student to the right specialist with a note.

## The four specialists

| Specialist | Course | Lessons |
| --- | --- | --- |
| **Nova** | Crypto | Bitcoin and Ethereum: The Foundations · XRP, XLM and Solana: Payments and Speed · Stablecoins: Digital Dollars · Market Cycles and the Halving · Planning an Exit Strategy |
| **Sterling** | Credit | How Credit Scores Work · Building and Protecting Personal Credit · Credit First, Corporation Second, Funding Third · Setting Up a Business for Credit · Funding Third: Getting Funding-Ready |
| **Atlas** | Banking and the system | Central Banks and the Fed · The Treasury and Government Debt · Inflation as a Hidden Tax · How Banks Profit from Debt · The Shift to Tokenised Assets |
| **Sage** | Mindset and ownership | Consumer Mindset vs Ownership Mindset · From Paycheck to Cash Flow · What Counts as an Asset · Your First Ownership Steps · Playing the Long Game |

## The home page: a 3D world

The home page is a 3D map of 7 districts:

- the Trading Floor (live);
- one district for each specialist (open);
- Community Square and the Shop, both "opening soon".

The style is a bright, cel-shaded, Y2K tech collage, inspired by the OZ world in the film Summer Wars. The images in `references/` set that style.

The 3D view only loads on screens at least 900 pixels wide with a mouse or trackpad. Phones, older computers and people who turn off motion get a flat map with the same links.

## Look

- **App colours** (`src/app/globals.css`):
  - paper `#f7f5f0`;
  - ink `#1d1b16`;
  - brand gold `#8a5a00` (`#f0b44c` in dark mode);
  - soft gold `#fbf1dc`.
- **World colours:**
  - Nova `#FFC400`
  - Atlas `#FF5A1F`
  - Sterling `#3DFF8F`
  - Sage `#B46CFF`
  - Square `#00E5C0`
  - Shop `#FF3D8B`
  - Halo `#FF3D8B`
  - Kite `#00C2FF`
- **Fonts:**
  - Geist for text, and Geist Mono for small labels;
  - Fraunces, a serif, for headings;
  - Archivo, extra wide and heavy, for the world's big type.
- **Polaris brand colours:** black, deep emerald `#177658` and mint `#5fe688`, taken from the logo. The app doesn't use them yet, and whether to switch is an open question in `STATUS.md`.
- **Logo:** `dna/polaris-logo.png` is the Polaris logo, a "P" on a compass star over northern lights. Freedom University has no logo of its own yet. The name is plain text, and the browser-tab icon is still Next.js's default.

## Where this came from

Built in October 2026 in the GitHub repo POLARISC0/Freedom-University. This is the "v1" version from pull request #3, branch `claude/freedom-university-v1`, which replaced the first version's five professors with the four specialists. In November 2026 it was exported to the branch `export/freedom-university` so it can live as its own project, without the Discord bot, the vending site or the separate game that shared the old repo.
