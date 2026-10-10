# Freedom University

A crypto and finance classroom taught by AI professors. Students pick a classroom, learn through a structured
beginner → advanced lesson path by chatting with that professor, pass an AI-written quiz at the end of each module
to unlock the next, and read a daily news briefing written by Professor 3.

**Education only.** Every professor is instructed never to give personalised trading, investment, tax or legal
advice, and to say so when asked.

## The faculty

| # | Professor | Course |
|---|-----------|--------|
| 1 | Ada Ledger 🔐 | Bitcoin & Ethereum Fundamentals: how they work, wallets, self-custody, security |
| 2 | Marcus Cycle 📈 | Altcoins & Market Cycles: bull/bear cycles, halving, risk tiers, exit planning |
| 3 | Eleanor Reserve 🏛️ | Banking & the Financial System: the Fed, Treasury, stablecoins, CBDCs, Ripple/XRP, tokenization |
| 4 | Rosa Budget 💳 | Credit & Personal Finance: credit scores, debt payoff, budgeting, LLC business credit |
| 5 | Theo Compound 🌱 | Investing Basics: allocation, dollar-cost averaging, crypto taxes |

Each course has six modules (two Beginner, two Intermediate, two Advanced) with learning objectives, key terms and a
curated reading list that the professor cites as `[S1]`, `[S2]`, …

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- SQLite via Prisma 7 (`@prisma/adapter-better-sqlite3`)
- Anthropic API (`@anthropic-ai/sdk`) for the professors, defaulting to `claude-opus-5-5`
- GNews.io for headlines
- Vitest for unit tests

## Getting started

```bash
npm install            # also runs `prisma generate`
cp .env.example .env   # then fill in the keys
npx prisma migrate dev # creates dev.db
npm run dev            # http://localhost:3000
```

### Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite file, default `file:./dev.db` |
| `ANTHROPIC_API_KEY` | Powers lessons, quizzes and the briefing |
| `ANTHROPIC_MODEL` | Defaults to `claude-opus-5-5`; set `claude-sonnet-5-5` for lower cost |
| `GNEWS_API_KEY` | Daily briefing headlines ([gnews.io](https://gnews.io), free tier: 100 requests/day) |
| `NEWS_MOCK` | Set to `1` to use fake headlines while developing without a GNews key |

## How it works

```
src/
├── content/professors/   # the curriculum: personas, modules, objectives, reading lists (typed code)
├── lib/
│   ├── prompts.ts        # shared "education only" + citation rules, per-module system prompts
│   ├── ai.ts             # quiz writing, short-answer grading, news briefing (structured outputs)
│   ├── progress.ts       # unlock rules (pass threshold 70%)
│   ├── quiz.ts           # quiz schema, validation, grading
│   ├── auth.ts           # username-only sessions (hashed token in SQLite, httpOnly cookie)
│   └── news.ts           # GNews client
├── app/
│   ├── classrooms/…      # catalog → syllabus → chat room → quiz
│   ├── dashboard/        # completed modules, scores, continue-learning
│   ├── news/             # daily briefing
│   └── api/              # /chat (streaming), /quiz/generate, /quiz/submit
└── proxy.ts              # sends signed-out visitors to /login
```

- **Lessons** stream from `/api/chat`. Each student's conversation per module is stored in `ChatMessage`, and the
  last 40 messages are sent back as context with prompt caching.
- **Quizzes** are written fresh for each attempt: five multiple-choice questions, graded on the server against an
  answer key the browser never sees, plus one short answer graded by the professor (0–2 points). Passing at 70% or
  more marks the module `COMPLETED` in `ModuleProgress` and unlocks the next one. An unfinished quiz is reused for
  an hour, so reloading can't re-roll questions.
- **Citations**: the professors cite their reading list inline, and `[S#]` markers become links. They have no live
  market data and are told to say so for time-sensitive facts.
- **Daily briefing**: fetches crypto and macro headlines from GNews and has Professor 3 summarise them with `[n]`
  citations back to each headline. It's cached per day in `NewsBriefing` and can be refreshed at most once an hour.
- **Refusals**: on supported models, requests use the server-side refusal fallback (`fallbacks: "default"`).

## Scripts

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run db:migrate`

## Known limitations

- **Login has no password.** Anyone who knows a username can sign in as that student. This is fine for personal or
  classroom use. Add passwords or OAuth before deploying publicly.
- The curriculum states facts as of late 2025 (e.g. the GENIUS Act, SEC v. Ripple, Form 1099-DA). Review the
  modules periodically as laws and markets change.
- The GNews integration follows GNews's documented v4 API but was built without live access to it. Run one
  briefing with your key to confirm.
