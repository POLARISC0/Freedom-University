@AGENTS.md

# Walk With Him

A browser game set in first-century Galilee that helps people grow in their relationship with God.

Read the DNA at the start of every session, in this order:

1. `dna/PROJECT_DNA.md`: what the game is and why, who it's for, its guardrails, tone and look
2. `dna/ARCHITECTURE.md`: every folder, how the pieces connect, the tech and the commands
3. `dna/SETUP.md`: how to run it on a Windows PC
4. `dna/STATUS.md`: what's done, what's broken, and what's next (Next.js security update first)

## How we work

- **Minimal code.** Make the smallest change that fully does the job. Reuse what the project and the platform already have before adding anything.
- **Plain language.** Use short sentences and no jargon, in chat, in docs and in the game.
- **Preview after each change.** Show me the result before moving on: the game in the browser (a screenshot), or the static preview, or the test run for logic. Then wait for my feedback.
- **Ask one question instead of guessing.** If something isn't clear, ask me one question rather than assuming.
- **The guardrails in `dna/PROJECT_DNA.md` are not optional:**
  - Scripture is quoted word for word from the World English Bible.
  - The mentors stay faithful to the text.
  - Care comes first in a crisis.
  - There's no money talk.
- **Secrets stay in `.env`,** which git ignores. Never print or commit an API key.
- **Run `npm test` after changes.** It checks every Bible quotation word for word.

## Tools in this project

- **Skills** live in `.claude/skills/`, and you invoke them by name. Where each came from is in `.claude/skills/SOURCES.md`.
  - Start tasks with `using-superpowers`. Where its skills say `superpowers:<name>`, use the project skill `<name>`.
  - Use `ponytail` for minimal code.
  - For 3D work, use the `threejs-*` skills.
- **Chat replies:** keep them short (the `caveman` skill), but always in plain language.
- **Free services and APIs:** check `docs/resources/` first. Options we haven't installed are in `docs/future-options.md`.
