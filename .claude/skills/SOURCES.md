# Where these skills come from

Third-party agent skills, copied in on 2026-10-10 from shallow clones of each repository's default branch. Each skill
folder carries its repository's license file where the repository has one. To update a skill, copy the folder again
from its source and update the commit here.

| Skills | Source | Commit | License |
|---|---|---|---|
| composition-patterns, deploy-to-vercel, react-best-practices, react-native-skills, react-view-transitions, vercel-cli-with-tokens, vercel-optimize, web-design-guidelines, writing-guidelines | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | `063bee9` | MIT (stated in the repository README and in some skills' front matter; the repository has no LICENSE file) |
| brainstorming, diagnosing-superpowers, dispatching-parallel-agents, executing-plans, finishing-a-development-branch, receiving-code-review, requesting-code-review, subagent-driven-development, systematic-debugging, test-driven-development, using-git-worktrees, using-superpowers, verification-before-completion, writing-plans, writing-skills | [obra/superpowers](https://github.com/obra/superpowers) | `bb92a77` | MIT |
| find-skills | [vercel-labs/skills](https://github.com/vercel-labs/skills) | `13e4063` | MIT |
| ponytail, ponytail-audit, ponytail-debt, ponytail-gain, ponytail-help, ponytail-review | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | `9b58c1f` | MIT |
| caveman | [juliusbrussee/caveman](https://github.com/juliusbrussee/caveman) | `2e08b91` | Apache-2.0 (see the skill's LICENSING.md) |
| context-mode | [mksglu/context-mode](https://github.com/mksglu/context-mode) | `8de5f73` | Elastic License 2.0 |
| threejs-3d-generator, threejs-aaa-graphics-builder, threejs-audio-generator, threejs-debug-profiler, threejs-game-director, threejs-game-ui-designer, threejs-gameplay-systems, threejs-image-generator, threejs-qa-release | [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) | `8286774` | MIT |

## What was left out, and what these skills need

- Only skill folders (those with a `SKILL.md`) were copied. The repositories' plugins, hooks, installers and packaged
  `.zip` copies of skills were not.
- **Superpowers** normally loads `using-superpowers` through a plugin hook at session start; here `CLAUDE.md` imports it
  instead. Its skills refer to each other as `superpowers:<name>`; installed as project skills they are just `<name>`.
- **Caveman**: only the main `caveman` skill was copied. Its `/caveman ultra` and `/caveman wenyan` aliases point to the
  `ultracave` and `megacave` skills, which are not installed, so only the default mode works.
- **context-mode** tells the agent to use the `ctx_execute` tools of the context-mode MCP server, which is not installed
  in this project. Until it is, the skill has nothing to call.
- **deploy-to-vercel**, **vercel-cli-with-tokens** and **vercel-optimize** need the Vercel CLI and a Vercel account or token.
- **threejs-3d-generator**, **threejs-audio-generator** and **threejs-image-generator** call paid third-party APIs (Tripo,
  ElevenLabs, Google Gemini) and need their API keys.
- `.claude/` is excluded from TypeScript (`tsconfig.json`) and ESLint (`eslint.config.mjs`), because some skills ship
  example code and scripts that are not part of this app.
