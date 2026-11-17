# Walk With Him

A browser game set in first-century Galilee that helps people grow in their relationship with God. Many people never
had a father or mentor to teach them how to live; Scripture can. Players make their own character, live in Capernaum
by the Sea of Galilee alongside Jesus and the disciples, and learn from them through stories, conversations, small
quests, reflections and a real-life challenge for each week.

- **The world:** Capernaum in 3D with a day and night cycle, weather, and townspeople who keep daily routines from the
  Gospels. Walk with WASD or the arrow keys, or tap where you want to go. Press E or tap someone to talk.
- **Your walk:** five gentle needs (Prayer, Word, Fellowship, Service, Rest), friendships and growth badges. Never a
  score, a streak or a leaderboard.
- **Lessons:** *Teach Us to Pray* with Jesus, *Out of the Boat* with Peter and *The Widow's Two Coins* with Matthew.
  Jesus, Peter and Matthew also hold AI conversations, powered by Claude.
- **Also:** a private Walk Journal, a verse of the day, a daily check-in, and a help page with crisis lines.

Built with Next.js 16, React 19, Three.js, SQLite through Prisma 7, and the Anthropic API.

## Set up

You need Node.js 22 (22.12 or later) or Node.js 24.

1. Copy the settings file first: `npm install` runs `prisma generate`, which reads `DATABASE_URL` from `.env`.

   ```bash
   cp .env.example .env
   ```

   Add your Anthropic API key to `.env` if you have one. Without it everything works except the conversations.

2. Install, then create the database (`dev.db`):

   ```bash
   npm install
   npx prisma migrate deploy
   ```

3. Run it and open <http://localhost:3000>, which takes you to the game at `/walk`:

   ```bash
   npm run dev
   ```

### Settings (`.env`)

| Variable | What it is for |
|---|---|
| `DATABASE_URL` | The SQLite database file. Default `file:./dev.db`. |
| `ANTHROPIC_API_KEY` | The mentors' conversations. Get a key at <https://platform.claude.com/settings/keys>. |
| `ANTHROPIC_MODEL` | The Claude model they use. Default `claude-opus-5-5`; `claude-sonnet-5-5` costs less. |

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npx next typegen` then `npm run typecheck` | TypeScript check (typegen writes the route types the pages use) |
| `npm run build` then `npm start` | Production build and server |
| `npm run preview:build` | Static playable preview in `preview-dist/` (see below) |
| `npm run db:migrate` | After changing `prisma/schema.prisma`: create and apply a new migration |

## Static preview

`npm run preview:build` bundles the game alone, with no server, into `preview-dist/` (`index.html`, `app.js` and
`app.css`). Open `preview-dist/index.html` in a browser, or publish the three files together, for example as a
claude.ai artifact. It saves the player's walk in the browser, or in private artifact storage when it runs as an
artifact. Conversations work only as an artifact, through the viewer's own Claude account; everything else works
anywhere.

## Pages

`/walk` (home), `/walk/begin` (sign in or create an account), `/walk/play` (the game), `/walk/me`, `/walk/paths`,
`/walk/journal`, `/walk/lessons/[slug]` (a lesson as a page, for reading or assistive technology), `/walk/mentors`
and `/walk/help`. `/` redirects to `/walk`. Signed-out visitors to the game and the personal pages are sent to
`/walk/begin`.

## How it is built

```
src/
├── app/
│   ├── walk/              pages, layouts and the game's server actions (actions.ts)
│   ├── api/walk/chat/     streaming conversations with the mentors
│   ├── actions.ts         the sign-in form action
│   ├── layout.tsx         fonts
│   └── globals.css        colours, the Walk theme and the game's on-screen controls
├── walk/
│   ├── content/           characters, growth paths, lessons, daily verses and places, as typed data
│   ├── scripture/         Bible references: parsing, checking and links
│   ├── safety/            crisis detection and help lines
│   ├── ai/                the mentors' system prompts and conversation threads
│   ├── world/             the simulation: map, routines, clock, weather, pathfinding
│   ├── life/              needs, activities, friendships, badges and the saved life
│   ├── game3d/            the Three.js renderer
│   ├── game/art/          2D portraits
│   ├── components/        the game and page UI (game/GameShell.tsx is the in-game shell)
│   ├── preview/           in-browser stand-ins for the server, used by the static preview
│   └── server/data.ts     database reads
├── lib/                   accounts and sessions, the database client and the Anthropic client
├── components/            the sign-in form and the Markdown renderer
└── proxy.ts               sends signed-out visitors to /walk/begin
prisma/                    database schema and migration
scripts/                   the static preview build and the Bible verse fixture builder
tests/                     Vitest tests
```

- **Accounts:** username and password (scrypt hashes). A session is a random token in an httpOnly cookie,
  `walk_session`, stored hashed in the database for 30 days.
- **Data:** SQLite tables `User`, `Session`, `WalkLessonProgress`, `WalkJournalEntry`, `WalkMessage`, `WalkCheckIn`
  and `WalkLife`. The player's life (name, look, needs, friendships, badges) is one JSON document in `WalkLife`,
  checked field by field by `parseLife` (`src/walk/life/state.ts`).
- **Conversations:** `/api/walk/chat` streams replies from `ANTHROPIC_MODEL` with the last 30 messages of the thread
  and prompt caching, up to 60 messages per player per hour.
- **No image files:** the world and every character are drawn from code.

## Guardrails

- **Scripture first.** Every quotation is from the World English Bible (public domain), and
  `tests/walk-scripture.test.ts` checks each one word for word against `tests/fixtures/web-verses.json`. When you add
  a quotation, rebuild that file: `npm pack world-english-bible`, unpack it, then run
  `npx tsx scripts/build-web-fixture.ts <unpacked folder>/package/json` and `npm test`.
- **Faithful mentors.** The prompts (`src/walk/ai/prompts.ts`) require a chapter and verse for every teaching point,
  forbid new doctrine, prophecies, personal revelations and promises God hasn't made, present disputed questions
  fairly, and point players to their Bible, prayer and a local church. The characters say plainly that they are AI
  portrayals. Jesus speaks in His recorded words. Matthew never talks amounts, asks for money or promises riches.
- **Care in a crisis.** `src/walk/safety/concern.ts` spots first-person mentions of suicide, self-harm, abuse,
  violence, grief and addiction. The player then sees real help lines (`src/walk/safety/resources.ts`) and the mentor
  answers with compassion first. A "Need help now?" button is always on screen.

## Known limits

- No password reset or email verification. Sign-in rate limits live in server memory, so they suit one server.
- Only Capernaum is open. The other places, the eight other growth paths and the other nine mentors' lessons and
  conversations are planned for later chapters.
- No sound yet. Activities aren't saved part-way, and the Sabbath and seasons aren't modelled.
- The crisis detector is keyword-based and English-only, and the help lines are mostly for the US, Canada, the UK
  and Ireland. Review them at least once a year.
- The AI conversations were built against the documented API without a live key. Try them, including the guardrail
  cases, before sharing the game widely.
