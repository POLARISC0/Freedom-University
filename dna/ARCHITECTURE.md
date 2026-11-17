# Freedom University: architecture

## What runs where

Freedom University is one Next.js web app.

- **Your computer** runs the app with `npm run dev`, and it opens at http://localhost:3000.
- **The data** lives in a small database file, `dev.db` (SQLite), in the project folder.
- **The teaching** comes from Claude, through the Anthropic API.
- **The headlines** come from GNews.
- **There's no hosting set up yet.**

## Folder map

| Path | What it does |
| --- | --- |
| `src/app/` | The pages, one folder per web address |
| `src/app/layout.tsx` | The frame around every page: fonts, the top bar with the Headmaster button, and the "education only" footer |
| `src/app/page.tsx` | The home page: the 3D world, or the flat map |
| `src/app/login/` | Sign-in (username only) |
| `src/app/floor/` | The Trading Floor with the live feed |
| `src/app/specialists/[specialist]/` | A specialist's course page, with office hours |
| `src/app/specialists/[specialist]/[lesson]/` | A lesson (chat), plus `quiz/` for its quiz |
| `src/app/dashboard/` | Progress |
| `src/app/news/` | The daily news briefing |
| `src/app/square/`, `src/app/shop/` | "Opening soon" pages |
| `src/app/actions.ts` | Form actions: sign in, sign out, refresh the briefing, and "forget me" (clears a specialist's notes on you) |
| `src/app/api/chat/` | Streams lesson and office-hours chat from Claude |
| `src/app/api/quiz/generate/`, `src/app/api/quiz/submit/` | Writes a fresh quiz, then grades it on the server |
| `src/app/api/feed/` | Returns the floor's posts, and writes the next one when it's due |
| `src/app/api/headmaster/` | Headmaster chat: history and new messages |
| `src/proxy.ts` | Sends signed-out visitors to /login |
| `src/components/` | Screen parts: ChatRoom, QuizRunner, TradingFloor, HeadmasterDock, NavBar, Markdown, SourceList, ComingSoonDistrict |
| `src/components/world/` | The home world. WorldExperience picks 3D or flat. `scene.ts`, `islands.ts`, `environments.ts`, `kit.ts` and `lines.ts` build the 3D scene with three.js. WorldCollage is the flat graphic layer, and WorldStatic is the fallback map. |
| `src/content/specialists/` | The four courses as typed data: lessons, objectives, key terms and reading lists |
| `src/content/world.ts`, `src/content/floor.ts` | The 7 districts, and the Trading Floor's zones and movement schedule |
| `src/lib/prompts.ts` | Every instruction the AI gets, including `CORE_RULES` (education only) |
| `src/lib/anthropic.ts`, `src/lib/ai.ts` | The Claude connection, plus quiz writing and other AI calls |
| `src/lib/quiz.ts`, `src/lib/progress.ts` | Quiz format and grading, and unlock rules (pass mark 70%) |
| `src/lib/auth.ts`, `src/lib/username.ts` | Sessions (a hashed token in the database and a secure cookie) and username rules |
| `src/lib/memory.ts`, `src/lib/memory-rules.ts` | Each specialist's private notes about each student |
| `src/lib/feed.ts`, `src/lib/feed-rules.ts` | When and how the floor feed posts |
| `src/lib/news.ts`, `src/lib/briefing.ts` | GNews headlines and the daily briefing |
| `src/lib/agents/` | The Headmasters (`registry.ts`, `headmaster.ts`, `headmaster-rules.ts`) and mentor handoffs (`mentor.ts`) |
| `src/lib/db.ts`, `src/lib/data.ts`, `src/lib/citations.ts` | The database connection, shared data helpers, and turning `[S1]` citations into links |
| `prisma/schema.prisma` | The database tables (below) |
| `prisma/migrations/` | Table history: `init` and `agent_handoffs` |
| `tests/` | 8 test files, 44 checks, testing logic only |
| `references/` | 5 style pictures for the 3D world (not used by the code) |
| `docs/` | Third-party lists of free services and APIs, and a note on running AI models locally later |
| `.claude/skills/` | 39 agent skills used by Claude Code (see `CLAUDE.md`) |
| `requirements.txt` | A Python tool used only by a news-scraping skill. No app code uses it. |
| `AGENTS.md` | Next.js's own note for AI agents, imported by `CLAUDE.md`. Next.js rewrites it. |

## Database tables (Prisma, SQLite)

| Table | What it holds |
| --- | --- |
| User | A unique username |
| Session | Sign-in sessions: a hashed token, valid for 30 days |
| LessonProgress | Per student and lesson: status, best score, attempts |
| QuizAttempt | Each generated quiz with its answer key (kept on the server), plus the answers and score |
| ChatMessage | Chat history per student, specialist and thread (a lesson, office hours or the Headmaster) |
| SpecialistMemory | Each specialist's notes about each student |
| AgentHandoff | A Headmaster's note when passing a student to a specialist |
| FeedPost | Trading Floor posts, with their citations and replies |
| NewsBriefing | One briefing per day |

## How the pieces connect

```
Browser ─► Next.js pages (src/app) ─► src/lib ─► Prisma ─► dev.db (SQLite)
                │                         ├────► Anthropic API (Claude): lessons, quizzes, feed, briefing, Headmasters
                │                         └────► GNews: headlines for the feed and the briefing
                └─► API routes (src/app/api) for streaming chat, quizzes, the feed and the Headmasters

src/proxy.ts checks the sign-in cookie on every protected page.
```

## Settings (names only; values go in `.env`)

| Name | Needed? | What for |
| --- | --- | --- |
| `DATABASE_URL` | Yes, even to install | Where the database file is. Normally `file:./dev.db`. |
| `ANTHROPIC_API_KEY` | Yes, for any AI feature | Lessons, quizzes, the feed, the briefing and the Headmasters. The code also accepts `ANTHROPIC_AUTH_TOKEN` instead. |
| `ANTHROPIC_MODEL` | No | Default `claude-opus-5-5`. `claude-sonnet-5-5` costs less. |
| `GNEWS_API_KEY` | For real news | Headlines for the briefing and the feed (gnews.io) |
| `NEWS_MOCK` | No | Set to `1` to use fake headlines without a GNews key |
| `FEED_INTERVAL_MINUTES` | No | Minutes between floor posts while someone watches. Default 4. |

## Tech

| Part | What's used |
| --- | --- |
| Framework | Next.js 16.4.0 (App Router, Turbopack). It needs a security update; see `STATUS.md`. |
| Language and UI | TypeScript 5.9, React 19.3, Tailwind CSS 4 |
| Database | Prisma 7.10 with SQLite (better-sqlite3) |
| AI | Anthropic SDK 0.133 (Claude) |
| Validation | zod 4 |
| 3D | three.js 0.186, loaded only when the 3D world is shown |
| Checks | Vitest 5 and ESLint 9 |
| Runtime | Node.js. This project was tested with Node 22. |

## Commands

| What | Command |
| --- | --- |
| First, create the settings file (must come before install) | `copy .env.example .env` (Windows) |
| Install (also prepares the database code) | `npm install` |
| Create or update the database | `npx prisma migrate deploy` |
| Run the app | `npm run dev`, then open http://localhost:3000 |
| Run the checks | `npm test` |
| Lint | `npm run lint` |
| Type check (on a fresh copy, run `npx next typegen` first) | `npm run typecheck` |
| Production build | `npm run build` |
