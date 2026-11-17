@AGENTS.md

# Freedom University

Polaris's online school that teaches money the way school doesn't, with AI specialists as teachers.

Read the DNA at the start of every session, in this order:

1. `dna/PROJECT_DNA.md`: what this is, the Polaris story, the brand rules and the look
2. `dna/ARCHITECTURE.md`: every folder, how the pieces connect, the tech and the commands
3. `dna/SETUP.md`: how to run it on a Windows PC
4. `dna/STATUS.md`: what's done, what's broken, and what's next (Next.js security update first)

## How we work

- **Minimal code.** Make the smallest change that fully does the job. Reuse what the project and the platform already have before adding anything.
- **Plain language.** Use short sentences and no jargon, in chat, in docs and on screen.
- **Preview after each change.** Run the app and show me the result (a screenshot at phone and desktop size, or the test run for logic) before moving on. Then wait for my feedback.
- **Ask one question instead of guessing.** If something isn't clear, ask me one question rather than assuming.
- **Follow the brand rules in `dna/PROJECT_DNA.md`:**
  - Teaching how crypto, coins, stocks and ETFs work is the point of this school.
  - Never recommend a specific coin or investment.
  - Never promise income.
  - Polaris never sells a coin or token of its own, and never takes investors.
- **Secrets stay in `.env`,** which git ignores. Never print or commit an API key.
- **Run `npm test` after changes.**

## Tools in this project

These are kept from the original setup.

- **Skills** live in `.claude/skills/`, and you invoke them by name:
  - Start tasks with `using-superpowers`.
  - Use `ponytail` for minimal code and `test-driven-development` for new logic.
  - Use `taste` for UI work, and check every page with `audit` before calling it finished.
- **Chat replies:** keep them short (the `caveman` skill), but always in plain language.
- **Design source:** this project's colours and fonts (`src/app/globals.css` and `src/app/layout.tsx`) win over any skill's defaults.
- **Free services and APIs:** check `docs/resources/` first. Running AI models locally is a future option only (`docs/ollama.md`).
