# Orion: project DNA

## In one line

Orion is the doorman bot for Incredible Server, the Polaris community on Discord. He builds the server, welcomes new people, and keeps the weekly Freedom University build on schedule.

## The Polaris family

Polaris is the parent company. Each project below belongs to it.

- **Freedom University** teaches money the way school doesn't: how credit, banks, crypto, coins, stocks and ETFs really work. It's an online school with AI teachers.
- **Polaris Vending** places vending machines in local businesses (gyms, barbershops, schools, offices) at no cost to the business. Polaris stocks and services each machine every week, and the business gets a share of every sale. Polaris never sells machines.
- **Orion** (this project) is the doorman of the community's Discord server, Incredible Server. That's where members meet, share wins and join the weekly Freedom University build.

## Brand rules

These apply to everything Polaris makes, Orion included.

- **Sell the skill, never a payout.** People come to learn how money works, not to be promised money.
- **Teaching how things work is allowed.** That includes crypto, coins, stocks and ETFs, and it's the core of Freedom University.
- **Polaris never issues or sells its own coin or token.**
- **Polaris never takes investors.**
- **Polaris never recommends a specific coin or investment.** Nothing Polaris says or writes means "buy this".
- **Polaris never promises income.**
- **Tone:** plain language and no hype. Sound like a mate who figured money out, not a guru.

## Orion's own word rules

These come from the bot's original brief.

- Plain language, no hype and no income promises.
- **Banned words:** never "invest" or "investor". Say "founding member" instead.
- The server stays at six to eight channels at most.
- `test/voices.js` fails if any banned or hype word appears in the bot's top-level files, so `npm test` catches slips.

## Two voices, one bot

Every message starts with the speaker's name, so members know who's talking, for example **Orion:** or **Gabriel:**.

- **Orion** greets new people, runs the welcome questions and looks after the community: `/setup`, referrals and wins.
- **Gabriel** delivers keys, lessons and reminders: the Wednesday posts, `/settopic`, `/key` and `/lesson`.

All their lines are in one file, `voices.js`, so the wording can be changed in one place.

## The server Orion builds (`/setup`)

| Category | Channel | What it's for |
| --- | --- | --- |
| THE TABLE | #welcome | Pinned house rules and the one-line why: this is for people who don't have a table where money gets explained. Orion greets newcomers here. |
| | #the-table | General chat |
| | #wins | Post a win, any size |
| FREEDOM UNIVERSITY | #wednesday-build | The weekly session, Wednesdays 5:00 to 6:30 pm Central |
| | #the-vault | Lessons. Read-only for members. |
| | #questions | Ask anything about money |
| THE DROP | #the-drop | Shirts and drops. Read-only. |
| | #keys | Where members redeem keys |

Roles:

| Role | Who gets it |
| --- | --- |
| Headmaster | You, the person who runs `/setup` |
| Founding Member | The first 50 members, numbered in the order they arrived. Someone who leaves and comes back keeps their number. |
| Crew | Anyone who brought one person (`/refer`) |
| Captain | Anyone who brought five people |

## The weekly rhythm

Every Wednesday, Gabriel posts in #wednesday-build:

- **4:30 pm Central:** "Build starts in 30. Bring one question about money."
- **5:00 pm Central:** the topic set with `/settopic`, or a note that there's no set topic.

## Keys: how a shirt becomes a key

Shirts and drops come with a code. A member types `/key` and the code, and Gabriel unlocks a role or sends a lesson link. Codes live in `keys.json` on the computer Orion runs on.

## Welcome questions

When someone joins, Orion DMs them five questions, one at a time:

1. If money weren't a thing, what's the first thing you'd buy?
2. What's stopping you right now?
3. Roughly what would it cost a month?
4. Where do you want to be in five years?
5. Want help getting there? Yes or no is fine.

When all five are in, Orion DMs the answers to the Headmaster.

## Look

- **Polaris brand colours:** black `#000000`, deep emerald `#177658` (deeper `#0c513c`) and mint `#5fe688`, all taken from the logo.
- **Logo:** `dna/polaris-logo.png`, a "P" on a compass star over northern lights. It's a good choice for Orion's avatar. Below about 48 pixels the P fades into the star, so a simplified small version is on the to-do list.
- **Role colours set by `/setup`:**
  - Headmaster: gold `#f0b232`
  - Captain: blue `#5865f2`
  - Crew: green `#23a55a`
  - Founding Member: pink `#eb459e`

## Where this came from

Orion was built in October 2026 in the GitHub repo POLARISC0/Freedom-University, in the `bot/` folder of the branch `claude/freedom-university-app-pq2brp`. In November 2026 it was exported to the branch `export/orion-bot` so it can live as its own project.
