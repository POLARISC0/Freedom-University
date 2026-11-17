# Freedom University: status (November 2026)

## Next, in priority order

1. **Update Next.js to fix the security hole.** Version 16.4.0 has a critical, publicly known problem: people outside could run code on the server through image handling. `npm audit` lists 24 issues in total: 1 critical (Next.js), 16 high (including Prisma, zod and Vitest) and 7 moderate. Update Next.js first, then re-run `npm test` and `npm run build`. Until then, `next dev` and `next build` stop once with "SecurityFatalError" when an AI agent runs them.
2. **Add a password to sign-in.** Right now anyone who knows a username can sign in as that student.
3. **Fix the README.**
   - It lists the install steps in the wrong order: `.env` must exist before `npm install`.
   - It still describes the older "2D floor" and doesn't mention the 3D world, the Headmasters, Community Square or the Shop.
   - It should say that type checking on a fresh copy needs `npx next typegen` first.
4. **Review the lessons flagged below** against the brand rule "never recommend a specific coin or investment".
5. **Put a limit on AI use.** The chat has no rate limit, so a signed-in user could run up Claude costs.
6. **Test the AI features with a real Claude key.** Lessons, quizzes, the feed, the briefing and the Headmasters have never been tried for real. Then test GNews with a real key.
7. **Decide on the look.** The app uses gold accents and has no logo. The Polaris brand is black, emerald `#177658` and mint `#5fe688`, with the compass-star logo (`dna/polaris-logo.png`). Decide whether Freedom University switches.
8. **Finish the "opening soon" districts** (Community Square and the Shop), and give the Headmasters their real names (Halo and Kite are placeholders).
9. **Choose hosting** so the school is online. None is set up yet.

## Lessons flagged for review

No lesson says "buy this", and every AI prompt forbids buy, sell or hold advice and price predictions. These three spots come closest, so check their wording:

1. **`src/content/specialists/nova.ts`, lesson "XRP, XLM and Solana: Payments and Speed".** It's about how three networks work, and one objective is "Distinguish a network's technology from the price of its token". Even so, giving three named coins a lesson of their own can read like picks. Make sure it stays about how they work.
2. **`nova.ts`, lesson "Planning an Exit Strategy".** Its summary is "Writing down how and when you take profits or cut risk before emotions take over", and it teaches "take-profit ladders". It's marked "as education, not advice", but it assumes the student already holds coins. It's the closest the school gets to telling people what to do with their money.
3. **`nova.ts`, Nova's tagline:** "…market cycles and planning your exit."

## Done

- **Four specialists** (Nova, Sterling, Atlas and Sage), each with 5 lessons, office hours, private notes per student and a fresh 4-question quiz per lesson. A score of 70% or more unlocks the next lesson.
- **The Trading Floor:** specialists move on a schedule and post short, cited takes on the day's news.
- **The 3D world home page** with 7 districts and two Headmasters who answer questions and hand students to a specialist. It also has a flat version for phones and older computers.
- **The rest:** the daily news briefing, the dashboard, sign-in and sign-out, and "forget me".
- **Last checked in November 2026, with a stand-in AI key:**
  - 44 automatic checks pass;
  - lint is clean;
  - the build compiles;
  - every page answers correctly, signed in and signed out.

## Known problems

- **Type checking** (`npm run typecheck`) fails on a fresh copy until Next.js has generated its types, with `npx next typegen` or a build.
- **A failed AI reply still saves the student's message** in the history.
- **Old "professor" wording** from the first version remains in `.env.example` comments and in an error message (`src/lib/anthropic.ts`).
- **An older database can't be reused.** The database setup was rewritten in v1, so a `dev.db` from the first version must be reset (`npx prisma migrate reset`). A fresh copy is fine.
- **Running several servers could make the feed post too often,** because its "one post at a time" lock only works inside one server.
- **Lesson facts are as of late 2025** and need a periodic review.
- **The tests only check logic.** There are no tests for pages, the database, the AI or the 3D world.
- **Missing image notes:** the style pictures in `references/` have no source or licence notes, and 3 of the 8 planned pictures never arrived.
