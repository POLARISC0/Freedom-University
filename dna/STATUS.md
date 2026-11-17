# Walk With Him: status (November 2026)

## Next, in priority order

1. **Update Next.js to fix the security hole.** Version 16.4.0 has a critical, publicly known problem: people outside could run code on the server through image handling. Update it, then re-run `npm test`, `npm run build` and `npm run preview:build`. Until then, `next dev` and `next build` stop once with "SecurityFatalError" when an AI agent runs them, then work on the second try.
2. **Try the conversations with a real Claude key,** including the guardrail cases: a crisis message, a disputed question, a request for money talk. They were built from the documentation but never run for real.
3. **Add password reset, password change and account deletion.** None exist yet, and there's no email.
4. **Give the game its own browser-tab icon.** It's still Next.js's default; the WalkMark logo could become the icon.
5. **Write the next chapters:**
   - the other places: the mount of the Beatitudes, Nazareth, Jerusalem, Gethsemane and the wilderness;
   - lessons for the 8 growth paths without them: Fasting, Worship, Forgiveness, Serving Others, Handling Fear, Reading the Word Daily, Sharing Your Faith and Honest Questions;
   - lessons and conversations for the 9 mentors without them: John, Andrew, Thomas, James, Philip, Bartholomew, James son of Alphaeus, Thaddaeus and Simon the Zealot.
6. **Add sound.**
7. **Widen crisis care.** Detection only spots English keywords, and the help lines are mostly for the US, Canada, the UK and Ireland. Review them at least once a year.
8. **Choose hosting** so others can play online. None is set up yet. The sign-in and chat limits live in server memory, so they suit one server.

## Done

- **The first chapter is playable:**
  - character creation;
  - 3D Capernaum with a day and night cycle, weather and daily routines from the Gospels;
  - the five needs, friendships and badges;
  - three lessons;
  - conversations with Jesus, Peter and Matthew;
  - the Walk Journal, the verse of the day, the daily check-in and the help page.
- **Runs completely on its own (November 2026).**
  - It has its own sign-in (username and password, cookie `walk_session`), its own database with one fresh initial setup, and its own Claude connection.
  - Everything from the app it used to live inside has been removed.
  - The home address `/` now leads to `/walk`.
- **Checks passed in November 2026, with a stand-in AI key:**
  - all 399 automatic checks;
  - lint and type check;
  - the production build, on the second try because of the Next.js notice;
  - the static preview.
  - In a real browser, sign-up, sign-out, wrong password and sign-in all worked, and the 3D game loaded.
- **A static preview** runs the whole game from one folder with no server.

## Known problems and limits

- **The database starts fresh.** Players from the earlier copy aren't carried over, and every account must have a password.
- **Type checking** on a fresh copy needs `npx next typegen` first.
- **Use `localhost`, not `127.0.0.1`,** when running locally, or the game page stays blank.
- **Activities aren't saved part-way,** and the Sabbath and seasons aren't modelled yet.
- **Conversations in the static preview** only work when it's opened as a claude.ai artifact.
- **Not checked yet:** real Claude replies, and the production server (`npm start`).
