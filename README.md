# Freedom University

A crypto and finance classroom taught by AI professors. Students pick a classroom, learn through a structured
beginner → advanced lesson path by chatting with that professor, pass an AI-written quiz at the end of each module
to unlock the next, and read a daily news briefing written by Professor 3.

**Education only.** Every professor is instructed never to give personalised trading, investment, tax or legal
advice, and to say so when asked.

The same app also hosts **[Walk With Him](#walk-with-him)** at `/walk`: an explorable 2D world of first-century
Galilee where biblical characters mentor players through Scripture. Both share one account system and database.

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
- Anthropic API (`@anthropic-ai/sdk`) for the professors and Walk With Him characters, defaulting to `claude-opus-5-5`
- Phaser 4 for the Walk With Him game world
- GNews.io for headlines
- Vitest for unit tests

## Getting started

```bash
npm install            # also runs `prisma generate`
cp .env.example .env   # then fill in the keys
npx prisma migrate dev # creates dev.db
npm run dev            # http://localhost:3000 (Walk With Him: http://localhost:3000/walk)
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
│   ├── auth.ts           # username + password sign-in, sessions (hashed token in SQLite, httpOnly cookie)
│   ├── password.ts       # scrypt password hashing
│   └── news.ts           # GNews client
├── app/
│   ├── (university)/     # Freedom University pages and their layout (nav bar, footer)
│   │   ├── classrooms/…  # catalog → syllabus → chat room → quiz
│   │   ├── dashboard/    # completed modules, scores, continue-learning
│   │   └── news/         # daily briefing
│   ├── walk/             # Walk With Him (see below)
│   └── api/              # /chat (streaming), /quiz/generate, /quiz/submit, /walk/chat
├── walk/                 # Walk With Him content, world simulation, renderer and UI
└── proxy.ts              # sends signed-out visitors to /login (or /walk/begin for the game)
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

- **Passwords, but no recovery.** Sign-in takes a username and password (scrypt-hashed), with a cool-down after
  repeated failures and a cap on new accounts per address. Those limits live in server memory
  (`src/lib/rate-limit.ts`), so they suit a single instance; use a shared store if you run several. There is no
  password reset or email verification yet. Accounts created before passwords were added have no hash: the first
  password used to sign in to one becomes its password, and all of that account's older sessions are signed out.
- The curriculum states facts as of late 2025 (e.g. the GENIUS Act, SEC v. Ripple, Form 1099-DA). Review the
  modules periodically as laws and markets change.
- The GNews integration follows GNews's documented v4 API but was built without live access to it. Run one
  briefing with your key to confirm.

---

# Walk With Him

An explorable, browser-based version of first-century Galilee that helps people grow in their relationship with
God. Many people never had a father or mentor to teach them how to live; Scripture can. Players walk the shore of
the Sea of Galilee, meet the people who walked with Jesus, and learn from them through stories, conversations,
small quests, reflections and a real-life challenge for each week.

Play at **`/walk`** (landing page) → **`/walk/play`** (the game). Walk with the arrow keys or WASD, or tap where you
want to go; press E or tap someone to talk.

## What's in the first milestone

| | |
|---|---|
| **World** | Capernaum on the north shore of the Sea of Galilee: basalt houses, the synagogue, a market with stalls and a well, Matthew's tax booth on the shore road, fishing boats, a jetty, a fire of coals on the beach, an olive grove, wheat fields, and a quiet place on the hillside. |
| **Life** | A 12-minute day/night cycle with first-century time-keeping ("the sixth hour", "the fourth watch of the night"), lamps and fires that glow at night, fishermen, merchants, villagers, children, travellers on the Via Maris, a crowd listening to Jesus, sheep, gulls and fireflies. |
| **AI mentors** | Jesus, Peter and Matthew hold AI conversations, both inside lessons and freely. The other nine disciples walk the world with scripted greetings and are fully defined for later chapters. |
| **Lessons** | *Teach Us to Pray* (Prayer, with Jesus), *Out of the Boat* (Faith, with Peter), *The Widow's Two Coins* (Tithing & Generosity, with Matthew). Each has a story scene, scripted teaching, a small quest in the world, an AI conversation, a reflection saved to the journal, and a challenge for the week. |
| **Walk Journal** | Private reflections, prayers, gratitude and notes: write, filter, edit, delete. Lesson reflections land here automatically. |
| **Progress** | Growth paths with gentle encouragement and "I practised this week's challenge" check-offs. No points, streaks or leaderboards. |
| **Daily** | A verse of the day (74 verses) and a daily check-in ("How is your walk with God today?") that can save a prayer to the journal. |
| **Other pages** | `/walk/paths`, `/walk/journal`, `/walk/mentors` (all twelve mentors), `/walk/help` (crisis resources), and `/walk/lessons/[slug]`, which plays any lesson without the game world for people who prefer reading or use assistive technology. |

## Guardrails

- **Scripture first, checked by tests.** Every quotation in the content (lesson scenes, scripted lines, path
  passages, daily verses) is from the World English Bible (public domain). `tests/walk-scripture.test.ts` checks every
  quoted phrase word for word against the WEB text of its reference, and checks that every reference exists down to
  the verse. The WEB text of the quoted verses lives in `tests/fixtures/web-verses.json`.
- **References are shown and linked.** Lines carry chapter-and-verse chips; AI replies have their references turned
  into Bible Gateway (WEB) links, with a "Read it yourself" list under each reply. References that don't exist in
  Scripture (`John 22:5`) are flagged as "reference not found" instead of linked.
- **Character system prompts** (`src/walk/ai/prompts.ts`) require a cited passage for every teaching point and forbid
  new doctrine, prophecies, visions, personal revelations, predictions and promises God hasn't made. They require
  disputed questions to be presented fairly and handed to the player's pastor, tell characters to say plainly that
  they are AI portrayals, and point players to their Bible, prayer and a local church. Jesus has stricter rules:
  He speaks primarily in His own recorded words from the Gospels, never in new teachings, and steps out of the scene
  if a player prays to Him or treats the game as the real Jesus. Matthew has money rules: no amounts, no
  solicitation, no prosperity teaching.
- **Care in a crisis.** A deterministic detector (`src/walk/safety/concern.ts`) spots first-person mentions of
  suicide, self-harm, abuse, violence, grief and addiction in chat, reflections and journal entries, without firing
  on ordinary Bible talk such as "die to self" or "they plotted to kill him". When it fires, the player sees real
  help lines straight away (988, Crisis Text Line, the National Domestic Violence Hotline, Childhelp, RAINN, SAMHSA,
  GriefShare, Samaritans, Find A Helpline), and the character's prompt gets a "care needed now" note so it responds
  with compassion first. A "Need help now?" button is always on screen.

## How it's built

```
src/walk/
├── content/        # characters, growth paths, lessons, daily verses, places: plain typed data
├── scripture/      # reference parsing, verse-level validation, WEB verse counts, linking
├── safety/         # crisis detection and help lines
├── ai/prompts.ts   # per-character system prompts with shared guardrails
├── world/          # renderer-independent simulation: map, collision, A* pathfinding, NPC schedules,
│                   #   day/night clock, quest arrival, and story state derived from lesson progress
├── game/           # the Phaser 4 renderer: procedural pixel art, lighting, camera, input, name labels
├── components/     # React UI: lesson player, AI chat, journal, check-in, paths, HUD (game/GameShell.tsx)
├── server/data.ts  # database reads
└── progress.ts     # progress types and rules shared by client and server
src/app/walk/       # pages, layouts and server actions (actions.ts)
src/app/api/walk/chat/route.ts   # streaming character conversations
```

- **Ready for 3D.** The world model in `src/walk/world` knows nothing about Phaser: it owns positions, schedules, time
  and events, and the renderer only draws it. A 3D renderer (Three.js, say) would implement the same job as
  `src/walk/game/createGame.ts` against the same `World`, with no changes to the simulation, content or UI.
- **No image assets.** All art is generated on canvas at load time (`src/walk/game/art`): terrain with organic
  shorelines from a distance field, basalt houses, market stalls, boats, trees, and character sprites built from
  each character's appearance data. Players choose their own skin tone, hair, robe and head covering.
- **Data.** Prisma models `WalkLessonProgress`, `WalkJournalEntry`, `WalkMessage` and `WalkCheckIn` (migration
  `walk_with_him`). Player position, time of day and appearance are kept in the browser's local storage.
- **AI.** `/api/walk/chat` streams replies from `claude-opus-5-5` (or `ANTHROPIC_MODEL`) at medium effort, with the
  last 30 messages of the thread, prompt caching, the server-side refusal fallback, and a limit of 60 messages per
  player per hour. Without `ANTHROPIC_API_KEY` every lesson still works; only the conversation step says that
  conversations need a key.

## Extending it

- **A new character** (Moses, David, Mary, Paul, Ruth…): add an entry to `src/walk/content/characters.ts` with
  personality, voice, Scripture-grounded backstory, key passages, honest limits and appearance, then give them a
  home spot in a map (`characterHomes` in `src/walk/world/maps/capernaum.ts`). Set `conversational: true` to enable
  AI conversations.
- **A new lesson:** add it to `src/walk/content/lessons.ts` as a list of steps (`dialogue`, `quest`, `scene`,
  `choice`, `conversation`, `reflection`, `challenge`, ending with the challenge) and list its slug on its path in
  `paths.ts`. Quest targets are spot ids in the map.
- **New quotations:** copy them exactly from the WEB, then rebuild the verse fixture so the tests can check them:
  `npm pack world-english-bible && tar xzf world-english-bible-*.tgz` (into a scratch folder), then
  `npx tsx scripts/build-web-fixture.ts <that folder>/package/json`, and run `npm test`.
- **A new place** (Nazareth, Jerusalem, Gethsemane, the wilderness): they're listed in `content/locations.ts` and on
  the in-game signpost. Each needs its own map builder like `buildCapernaum()`.

## Limitations of this milestone

- The AI conversations were built against the documented API but not exercised live in development (no API key was
  available). Try a few conversations with your key, including the guardrail cases, before sharing it widely.
- The crisis detector is keyword-based and English-only. It errs towards showing help, but it will miss some
  phrasings; the prompt instructions are the second line of defence.
- Help lines are mostly for the US, with Canada, the UK and Ireland, and a worldwide directory. Review the numbers in
  `src/walk/safety/resources.ts` at least yearly.
- Only the Sea of Galilee and Capernaum is explorable; the other places and the other nine mentors' lessons are
  listed as coming in later chapters.
- No sound yet.
