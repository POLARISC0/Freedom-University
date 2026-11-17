# Orion

The Discord doorman bot for Incredible Server, the community server of the Polaris family.

Read the DNA at the start of every session, in this order:

1. `dna/PROJECT_DNA.md`: what Orion is, the Polaris story, the brand rules and Orion's word rules
2. `dna/ARCHITECTURE.md`: every file and how they connect
3. `dna/SETUP.md`: how to run Orion on a Windows PC
4. `dna/STATUS.md`: what's done, what isn't confirmed yet, and what's next

## How we work

- **Minimal code.** Make the smallest change that fully does the job. Reuse what's already here, and don't add a package for a few lines.
- **Plain language.** Use short sentences and no jargon, in chat, in docs and in everything Orion says on Discord.
- **Preview after each change.** Before moving on, show me the result: the `npm test` result and what `npm run dry-run` prints. Then wait for my feedback.
- **Ask one question instead of guessing.** If something isn't clear, ask me one question rather than assuming.
- **Secrets stay secret.** Real values live only in `.env`, `keys.json` and the `data` folder, and git ignores all three. Never print, paste or commit the bot token.
- **Orion's words follow the rules in `dna/PROJECT_DNA.md`.** `npm test` checks the files for banned words.
