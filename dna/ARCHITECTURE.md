# Walk With Him: architecture

## What runs where

Walk With Him is one Next.js web app.

- **Your computer** runs it with `npm run dev`, and it opens at http://localhost:3000. That address takes you to the game at `/walk`.
- **Accounts and progress** live in a small database file, `dev.db` (SQLite), in the project folder.
- **The mentors' conversations** come from Claude, through the Anthropic API.
- **There's also a static preview:** the whole game bundled into three files that run in a browser with no server.

## Folder map

| Path | What it does |
| --- | --- |
| `src/app/walk/(site)/` | The pages around the game: home, sign-in (`begin`), `me`, `paths`, `journal`, `lessons/[slug]`, `mentors`, `help` |
| `src/app/walk/play/` | The game itself |
| `src/app/walk/actions.ts` | The game's server actions (saving the walk, the journal, check-ins and more) |
| `src/app/walk/layout.tsx` | Page titles ("… · Walk With Him") and the theme colour |
| `src/app/api/walk/chat/` | Streams the mentors' replies from Claude |
| `src/app/actions.ts` | The sign-in form action |
| `src/app/layout.tsx`, `src/app/globals.css` | Fonts; colours, the Walk theme, and the game's on-screen controls |
| `src/proxy.ts` | Sends signed-out visitors to `/walk/begin` |
| `src/walk/content/` | Characters (12), growth paths (11), lessons (3), daily verses and places (6), as typed data |
| `src/walk/scripture/` | Bible references: reading, checking and links |
| `src/walk/safety/` | Crisis detection (`concern.ts`) and help lines (`resources.ts`) |
| `src/walk/ai/` | The mentors' instructions (`prompts.ts`) and conversation threads |
| `src/walk/world/` | The simulation: map, daily routines, clock, weather, path-finding |
| `src/walk/life/` | Needs, activities, friendships, badges, and the saved life (`state.ts`) |
| `src/walk/game3d/` | The three.js renderer (`createGame.ts` and about 20 modules) |
| `src/walk/game/art/` | 2D portraits, drawn in code |
| `src/walk/components/` | The game and page screens. `game/GameShell.tsx` is the in-game shell, and `WalkHeader.tsx` holds the logo. |
| `src/walk/preview/` | Stand-ins for the server, used by the static preview |
| `src/walk/server/data.ts` | Database reads |
| `src/lib/` | Accounts and sessions (`auth.ts`, `password.ts`, `rate-limit.ts`, `username.ts`), the database client (`db.ts`) and the Claude client (`anthropic.ts`) |
| `src/components/` | The sign-in form and the Markdown renderer |
| `prisma/schema.prisma`, `prisma/migrations/` | The database tables and one initial migration |
| `scripts/` | The static preview build, and the Bible verse file builder |
| `tests/` | 9 test files with 399 checks, including every Scripture quotation word for word |
| `docs/` | Third-party lists of free services and APIs, and notes on options not installed |
| `.claude/skills/` | Agent skills used by Claude Code (see `CLAUDE.md`) |
| `AGENTS.md` | Next.js's own note for AI agents, imported by `CLAUDE.md` |

## Database tables (Prisma, SQLite)

| Table | What it holds |
| --- | --- |
| User | Username and password (stored as a scrypt hash) |
| Session | Sign-in sessions: a random token, stored hashed, valid for 30 days |
| WalkLessonProgress | Which lessons each player has done |
| WalkJournalEntry | The private Walk Journal |
| WalkMessage | Conversation history with the mentors |
| WalkCheckIn | Daily check-ins |
| WalkLife | The player's whole life in one record (name, look, needs, friendships, badges), checked field by field by `parseLife` in `src/walk/life/state.ts` |

## How the pieces connect

```
Browser ─► /walk pages (src/app/walk) ─► src/lib/auth.ts ─► Prisma ─► dev.db (SQLite)
   │                                      src/walk/server/data.ts ──┘
   ├─► the game (/walk/play): src/walk/game3d draws the world from src/walk/world and src/walk/life
   └─► /api/walk/chat ─► src/walk/ai/prompts.ts + src/walk/safety ─► Claude (Anthropic API)

src/proxy.ts checks for the walk_session cookie on the personal pages, and each page checks it against the database.
```

## Accounts and safety limits

- **Sign-in:** a username and password. A new username creates an account.
- **Session:** a random token in a secure (httpOnly) cookie, `walk_session`.
- **Limits:**
  - Sign-in attempts are rate limited.
  - Conversations are limited to 60 messages per player per hour, and use the last 30 messages of the thread.
  - Both limits live in server memory, so they suit one server.
- **No AI key?** Everything works except the conversations, which then show a clear message.

## Settings (names only; values go in `.env`)

| Name | Needed? | What for |
| --- | --- | --- |
| `DATABASE_URL` | Yes, even to install | Where the database file is. Normally `file:./dev.db`. |
| `ANTHROPIC_API_KEY` | Only for the conversations | The mentors' replies |
| `ANTHROPIC_MODEL` | No | Default `claude-opus-5-5`. `claude-sonnet-5-5` costs less. |

## Tech

| Part | What's used |
| --- | --- |
| Framework | Next.js 16.4.0. It needs a security update; see `STATUS.md`. |
| Language and UI | TypeScript, React 19, Tailwind CSS 4 |
| 3D | three.js 0.186 |
| Database | Prisma 7.10 with SQLite (better-sqlite3) |
| AI | Anthropic SDK (Claude) |
| Checks | Vitest and ESLint |
| Static preview | esbuild and the Tailwind CLI |
| Runtime | Node.js 22 (22.12 or later) or Node.js 24 |

## Commands

| What | Command |
| --- | --- |
| First, create the settings file (must come before install) | `copy .env.example .env` (Windows) |
| Install | `npm install` |
| Create or update the database | `npx prisma migrate deploy` |
| Run the game | `npm run dev`, then open http://localhost:3000 |
| Run the checks | `npm test` |
| Lint | `npm run lint` |
| Type check | `npx next typegen`, then `npm run typecheck` |
| Production build and server | `npm run build`, then `npm start` |
| Static playable preview | `npm run preview:build`, then open `preview-dist\index.html` |
| After changing the database schema | `npm run db:migrate` |
| After adding a Bible quotation | `npm pack world-english-bible`, unpack it, run `npx tsx scripts/build-web-fixture.ts <unpacked folder>/package/json`, then `npm test` |
