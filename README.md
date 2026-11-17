# Freedom University

A crypto and finance classroom taught by AI professors. Students pick a classroom, learn through a structured
beginner → advanced lesson path by chatting with that professor, pass an AI-written quiz at the end of each module
to unlock the next, and read a daily news briefing written by Professor 3.

**Education only.** Every professor is instructed never to give personalised trading, investment, tax or legal
advice, and to say so when asked.

The same app also hosts **[Walk With Him](#walk-with-him)** at `/walk`: an explorable 3D world of first-century
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
- Three.js for the Walk With Him 3D world
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
God. Many people never had a father or mentor to teach them how to live; Scripture can. Players make their own
character, live by the Sea of Galilee alongside the people who walked with Jesus, and learn from them through
stories, conversations, small quests, reflections and a real-life challenge for each week.

Play at **`/walk`** (landing page) → **`/walk/play`** (the game). Walk with WASD or the arrow keys (relative to the
camera: up walks into the view), or tap where you want to go. Turn the view with `[` `]`, the on-screen buttons or a
drag, and zoom with `+` `−`, the wheel or a pinch. Press E or tap someone to talk, or walk up to a place to pray,
read, share a meal, help or rest.

## What's in the first milestone

| | |
|---|---|
| **World** | Capernaum on the north shore of the Sea of Galilee in 3D, seen from a Sims-style overhead camera you can turn and zoom: basalt houses (one of them yours), the synagogue with Peter's house and courtyard beside it, a market with stalls and a well, Matthew's tax booth on the shore road, fishing boats, a jetty, a fire of coals on the beach, an olive grove, wheat fields, and a quiet place on the hillside. |
| **Life** | A 12-minute day/night cycle with first-century time-keeping ("the sixth hour", "the fourth watch of the night"), weather (clear days, clouds rising from the west, morning mist over the lake, passing showers, a contrary wind), lamps and fires that glow at night, and a town that keeps its own routines: fishermen at the nets from dawn, merchants and villagers in the market, children on the beach, travellers on the Via Maris, a crowd listening to Jesus, sheep on the hillside. |
| **Your character** | A Sims-style creator on your first visit: your name, skin tone, hair, beard, robe, mantle, sash and head covering, with a live 3D preview. Change it any time from the 🧍 button. The characters call you by your name. |
| **Spiritual needs** | Five meters over the world (Prayer, Word, Fellowship, Service, Rest) that grow when you do those things and fade gently with game time, with a kind, dismissible suggestion and a verse when one runs low. Never a score. |
| **Activities** | Pray in the quiet place, read the scroll at the synagogue, sit and listen while Jesus teaches, share the evening meal in Peter's courtyard, help with the nets, carry water, rest under the fig tree, and sleep at your house until morning. Each takes a few seconds, shows the Scripture behind it, and grows your needs and your friendships with whoever is there. |
| **AI mentors** | Jesus, Peter and Matthew hold AI conversations, both inside lessons and freely, and keep daily routines drawn from the Gospels (Jesus praying before dawn and teaching by the shore, Peter at his boat and nets, Matthew at the market and his old tax booth, all of them at Peter's table for supper). Their tone is the fruit of the Spirit (Galatians 5:22-23). The other nine disciples walk the world with routines and scripted greetings and are fully defined for later chapters. |
| **Friendships & badges** | Each character's friendship grows with greetings, conversations, lessons and time spent together (Newly met → Acquaintance → Friend → Close friend → Like family). Fourteen gentle growth badges, each with its verse, mark moments in the walk. Shown in the game's "Your walk" panel and on `/walk/me`. |
| **Lessons** | *Teach Us to Pray* (Prayer, with Jesus), *Out of the Boat* (Faith, with Peter), *The Widow's Two Coins* (Tithing & Generosity, with Matthew). Each has a story scene, scripted teaching, a small quest in the world, an AI conversation, a reflection saved to the journal, and a challenge for the week. |
| **Walk Journal** | Private reflections, prayers, gratitude and notes: write, filter, edit, delete. Lesson reflections land here automatically. |
| **Progress** | Growth paths with gentle encouragement and "I practised this week's challenge" check-offs. No points, streaks or leaderboards. |
| **Daily** | A verse of the day (74 verses) and a daily check-in ("How is your walk with God today?") that can save a prayer to the journal. |
| **Other pages** | `/walk/me` (your needs, friendships and badges), `/walk/paths`, `/walk/journal`, `/walk/mentors` (all twelve mentors and their days in Capernaum), `/walk/help` (crisis resources), and `/walk/lessons/[slug]`, which plays any lesson without the game world for people who prefer reading or use assistive technology. |

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
├── world/          # renderer-independent simulation: map, collision, A* pathfinding, daily routines,
│                   #   day/night clock, weather, activities, quest arrival, story state from lesson progress
├── life/           # the player's life: needs, activities, friendships, badges, and the saved LifeState
├── game3d/         # the Three.js renderer: terrain, water, sky and weather, buildings, characters, camera, input
├── game/art/       # 2D character portraits for panels and lists
├── components/     # React UI: character creator, needs HUD, lesson player, AI chat, journal, check-in,
│                   #   paths, "Your walk" (game/GameShell.tsx is the in-game shell)
├── preview/        # in-browser stand-ins for the server actions and chat route (npm run preview:build)
├── server/data.ts  # database reads
├── action-rules.ts # input rules shared by the server actions and the preview
└── progress.ts     # progress types and rules shared by client and server
src/app/walk/       # pages, layouts and server actions (actions.ts)
src/app/api/walk/chat/route.ts   # streaming character conversations
```

- **The world doesn't know how it's drawn.** The simulation in `src/walk/world` owns positions, routines, time,
  weather, activities and events; the Three.js renderer in `src/walk/game3d` only reads it each frame and turns taps
  and keys into world calls. The life systems in `src/walk/life` are pure data and functions, so the game, the
  website and the tests all share them.
- **No image assets.** The world and everyone in it are built from code at load time, and each character is drawn
  from their appearance data, the player's included.
- **Data.** Prisma models `WalkLessonProgress`, `WalkJournalEntry`, `WalkMessage`, `WalkCheckIn` (migration
  `walk_with_him`) and `WalkLife` (migration `walk_life`). The player's position and the time of day are kept in the
  browser's local storage.
- **How saves work.** The player's life (name, appearance, needs, friendships, badges and a few counters) is one
  JSON document in `WalkLife`, written by the `saveLife` server action. The game sends it a few seconds after it
  changes and straight away when the page is hidden, one save at a time; if a save fails the player keeps playing,
  hears about it once, and it is retried later. Everything coming in, and everything read back, goes through
  `parseLife` (`src/walk/life/state.ts`), which clamps numbers, checks colours and choices, cleans the name and drops
  anything unknown, and the action refuses anything that isn't a life. Lessons, journal entries and check-ins keep
  their own tables; the life only records what they mean for needs, friendships and badges. Needs fade with game
  time, not real time, so nothing is lost by being away. On a new device the world starts at the day and hour the
  life was last at.
- **Static preview.** `npm run preview:build` bundles the game alone into `preview-dist/` (a page, `app.js` and
  `app.css`) to run without the Next.js server, for example as a claude.ai artifact. `src/walk/preview` stands in
  for the server actions (with the same rules from `action-rules.ts`) and the chat route, saving the player's life,
  progress and journal to the viewer's private artifact storage or, failing that, to the browser.
- **AI.** `/api/walk/chat` streams replies from `claude-opus-5-5` (or `ANTHROPIC_MODEL`) at medium effort, with the
  last 30 messages of the thread, prompt caching, the server-side refusal fallback, and a limit of 60 messages per
  player per hour. Without `ANTHROPIC_API_KEY` every lesson still works; only the conversation step says that
  conversations need a key.

## Extending it

- **A new character** (Moses, David, Mary, Paul, Ruth…): add an entry to `src/walk/content/characters.ts` with
  personality, voice, Scripture-grounded backstory, key passages, honest limits and appearance, then give them a
  daily routine in a map (`ROUTINES` in `src/walk/world/maps/capernaum.ts`), citing Scripture for what they do.
  Set `conversational: true` to enable AI conversations.
- **A new activity:** add it to `ACTIVITIES` in `src/walk/life/activities.ts` (needs it feeds, hours, its passage)
  and an activity spot for it in the map.
- **A new lesson:** add it to `src/walk/content/lessons.ts` as a list of steps (`dialogue`, `quest`, `scene`,
  `choice`, `conversation`, `reflection`, `challenge`, ending with the challenge) and list its slug on its path in
  `paths.ts`. Quest targets are spot ids in the map.
- **New quotations:** copy them exactly from the WEB, then rebuild the verse fixture so the tests can check them:
  `npm pack world-english-bible && tar xzf world-english-bible-*.tgz` (into a scratch folder), then
  `npx tsx scripts/build-web-fixture.ts <that folder>/package/json`, and run `npm test`.
- **A new place** (Nazareth, Jerusalem, Gethsemane, the wilderness): they're listed in `content/locations.ts` and on
  the in-game signpost. Each needs its own map builder like `buildCapernaum()`.

## What's next

- **Building and crafting**, Minecraft-style: a home, a workshop, a boat, a gathering place for fellowship, built
  alongside Jesus the carpenter.
- **More places:** Nazareth, the Mount of the Beatitudes, the wilderness, Jerusalem and the Temple, and the Garden
  of Gethsemane, each with its own map and people.
- **Bible-story quests:** hauling the miraculous catch of fish with Peter, preparing for the feeding of the 5,000,
  sitting at the Sermon on the Mount, serving at the Last Supper.
- **More mentors and paths:** lessons with John, Andrew, Thomas and the other disciples (fasting, worship,
  forgiveness, serving, overcoming fear, daily time in the Word), and later Moses, David, Mary, Ruth and Paul.

## Limitations of this milestone

- The AI conversations were built against the documented API but not exercised live in development (no API key was
  available). Try a few conversations with your key, including the guardrail cases, before sharing it widely.
- The crisis detector is keyword-based and English-only. It errs towards showing help, but it will miss some
  phrasings; the prompt instructions are the second line of defence.
- Help lines are mostly for the US, with Canada, the UK and Ireland, and a worldwide directory. Review the numbers in
  `src/walk/safety/resources.ts` at least yearly.
- Only the Sea of Galilee and Capernaum is explorable; the other places and the other nine mentors' lessons are
  listed as coming in later chapters.
- Activities aren't saved part-way: closing the page in the middle of one gains nothing from it. The Sabbath and
  the seasons aren't modelled yet.
- No sound yet.
