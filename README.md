# Freedom University

**A product by Polaris.** A live trading floor of AI specialists who teach, not trade.

Students watch four specialists walk around a 2D floor and post short, cited takes on the day's news to a shared feed, sometimes talking to each other. Click any specialist to chat in their office, take their five-lesson beginner course, and pass a short AI-written quiz at the end of each lesson. Each specialist remembers past conversations with the student.

**Education only.** Specialists never give personalised financial, credit, tax or legal advice, cite their sources, and never name real people.

## The specialists

| | Name | Topic | Lessons |
|---|---|---|---|
| 🪙 | Nova | Crypto | Bitcoin & Ethereum · XRP, XLM & Solana · Stablecoins · Market cycles · Exit strategy |
| 💳 | Sterling | Credit | Credit scores · Building personal credit · Credit first, corporation second, funding third · Business credit · Funding readiness |
| 🏛️ | Atlas | Banking & the System | Central banks · The Treasury · Inflation as a hidden tax · How banks profit from debt · Tokenised assets |
| 🌱 | Sage | Mindset & Ownership | Consumer vs owner · Paycheck to cash flow · What counts as an asset · First ownership steps · The long game |

Atlas also writes the daily news briefing.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 · SQLite via Prisma 7 · Anthropic API (`@anthropic-ai/sdk`, default `claude-opus-5-5`) · GNews.io headlines · Vitest

## Getting started

```bash
npm install            # also runs `prisma generate`
cp .env.example .env   # then fill in the keys
npx prisma migrate dev # creates dev.db
npm run dev            # http://localhost:3000
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite file, default `file:./dev.db` |
| `ANTHROPIC_API_KEY` | Powers chat, quizzes, memory, the feed and the briefing |
| `ANTHROPIC_MODEL` | Defaults to `claude-opus-5-5`; `claude-sonnet-5-5` is cheaper |
| `GNEWS_API_KEY` | Daily news headlines ([gnews.io](https://gnews.io), free tier: 100 requests/day) |
| `FEED_INTERVAL_MINUTES` | Minutes between feed updates while someone is watching (default 4) |
| `NEWS_MOCK` | `1` uses fake headlines for local development |

## How it works

```
src/
├── content/
│   ├── specialists/   # Nova, Sterling, Atlas, Sage: personality, schedule, 5 lessons, reading list
│   └── floor.ts       # floor zones and the clock-based movement schedule
├── lib/
│   ├── prompts.ts     # shared rules (education only, citations, no real names) and all prompts
│   ├── ai.ts          # quiz, memory notes, news briefing and feed calls (structured outputs)
│   ├── feed.ts        # generates the next feed update when due
│   ├── memory.ts      # per-student, per-specialist notes
│   ├── briefing.ts    # daily news briefing from GNews headlines
│   ├── progress.ts    # lesson unlocking (pass mark 70%)
│   └── quiz.ts        # quiz schema, validation and grading
├── components/TradingFloor.tsx  # the 2D floor + live feed
└── app/
    ├── floor/                         # the trading floor
    ├── specialists/[specialist]/      # office: office-hours chat, lessons, memory
    ├── specialists/[s]/[lesson]/quiz  # lesson chat and quiz
    ├── dashboard/  news/  login/
    └── api/        # /chat (streaming), /quiz/generate, /quiz/submit, /feed
```

- **Floor:** positions come from the clock (40-second slots), so every viewer sees the same floor without a server loop.
- **Feed:** the floor polls `/api/feed` every 20 seconds. When the last post is older than `FEED_INTERVAL_MINUTES`, the server writes the next update in the background from today's briefing (writing the briefing first if needed): a post by the specialist who posted least recently, and 40% of the time a reply from another specialist. Posts cite the headlines they use. Nobody watching means no API calls.
- **Memory:** after every 4 student messages to a specialist, their notes about the student are rewritten from the recent conversation and fed into future chats. Students can see the notes and clear them.
- **Lessons and quizzes:** each lesson is a chat with fixed objectives. Its quiz is four new multiple-choice questions per attempt, graded on the server; passing (70%+) saves progress and unlocks the next lesson.
- **Refusals:** requests use the server-side refusal fallback (`fallbacks: "default"`) on supported models.

## Scripts

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run db:migrate`

## Known limitations

- **Login has no password**: anyone who knows a username can sign in as that student. Add passwords or OAuth before a public launch.
- The feed's scheduling lock is per server process; running several instances could post more often.
- Lesson content states facts as of late 2025 (e.g. the GENIUS Act). Review it periodically.
