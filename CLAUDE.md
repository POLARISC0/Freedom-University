@AGENTS.md

## Skills workflow

Before starting any task in this project, invoke the `using-superpowers` skill (`.claude/skills/using-superpowers/`) and follow its workflow. Skills in `.claude/skills/` refer to each other as `superpowers:<name>`; here they are installed as plain project skills, so invoke them by `<name>` alone (e.g. `brainstorming`, `systematic-debugging`).

## Ponytail

Always use Ponytail (`.claude/skills/ponytail/`) for minimal, standard-library-first code: the smallest complete change, reusing what the codebase and platform already provide before adding anything new.
