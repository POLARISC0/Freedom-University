# Orion: architecture

## What runs where

Orion is one small Node.js program. It runs on a computer you leave on, connects to Discord over the internet, and talks to one server, Incredible Server.

- There's no website and no database.
- Orion remembers things in small JSON files in a `data` folder next to the code.

## Folder map

| File | What it does |
| --- | --- |
| `index.js` | Starts Orion. It loads the settings, connects to Discord, adds the slash commands to the server, then listens for commands, new members and DMs. It also explains startup problems in plain words: a wrong token, Server Members Intent switched off, or no internet. |
| `env.js` | Reads `.env` (DISCORD_TOKEN, GUILD_ID, DRY_RUN). `index.js` loads it before anything else. |
| `act.js` | The dry-run switch. Every change Orion makes on Discord goes through `act()`. In a dry run it only prints what it would do. |
| `server.js` | Finds roles and channels by name, whatever their capital letters. Turns "#wins" in a message into a clickable channel link. |
| `setup.js` | The `/setup` command. It holds the server plan (3 categories, 8 channels, 4 roles) and creates only what's missing. It also pins the rules, makes the person who ran it Headmaster, and gives Founding Member to people who were already in the server. |
| `voices.js` | Everything Orion and Gabriel say (`LINES`), plus helpers to post in a channel, send a DM and answer a slash command. |
| `welcome.js` | New members: founding numbers, the five DM questions one at a time, the hello in #welcome, and the answers summary for the Headmaster. |
| `schedule.js` | The Wednesday 4:30 pm and 5:00 pm Central posts, and the `/settopic` command. |
| `commands.js` | `/key`, `/refer`, `/win` and `/lesson`. |
| `store.js` | Reads and writes the files in `data` safely, through a temporary file so a crash can't leave one half-written. A dry run saves nothing. |
| `keys.example.json` | Example key codes. Copy it to `keys.json` and put in real codes. |
| `test/` | 29 automatic checks: `setup.js`, `voices.js`, `schedule.js`, `commands.js` and `welcome.js`. |
| `.env.example` | The settings Orion needs, names only. Copy it to `.env`. |
| `README.md` | The original step-by-step guide for running Orion. |

## Files Orion uses on its computer

None of these are ever uploaded; git ignores them.

| File | What's in it |
| --- | --- |
| `.env` | The bot token, the server ID and the dry-run switch |
| `keys.json` | Your real key codes |
| `data/topic.json` | The topic for the next Wednesday build |
| `data/schedule.json` | Which Wednesday posts already went out, so none repeats |
| `data/keys-used.json` | Which member used which code |
| `data/referrals.json` | Who brought whom |
| `data/founding.json` | The founding-member list, in order (up to 50) |
| `data/answers.json` | New members' answers to the welcome questions. Private. |

## How the pieces connect

```
Discord ──► index.js
              ├─ slash commands ──► setup.js · schedule.js (/settopic) · commands.js
              ├─ someone joins ──► welcome.js
              ├─ a DM arrives ───► welcome.js (the next welcome question)
              └─ every 30 seconds ► schedule.js (is it 4:30 or 5:00 pm on a Wednesday?)

Each of those decides what to say with voices.js, finds channels and roles with server.js,
makes changes through act.js (which stops them in a dry run), and remembers things with store.js.
```

## Discord settings Orion depends on

- **Developer Portal:** an application named Orion. On its Bot page, **Server Members Intent** must be on. Without it, Discord refuses the connection.
- **What Orion listens to (intents):** Guilds, GuildMembers and DirectMessages. It also uses the Channel partial so it can receive DMs.
- **Invite permissions:** the number `2251800082205712`, which grants Manage Roles, Manage Channels, View Channels, Send Messages, Embed Links, Read Message History and Pin Messages.
- **Slash commands:** registered on the one server in GUILD_ID each time Orion starts with `npm start`. A dry run doesn't register them.
- **Role order:** Discord only lets Orion give roles that sit below his own role. Roles Orion creates start below him automatically.

## Tech

| Part | What's used |
| --- | --- |
| Runtime | Node.js 20.12 or newer. The current LTS is fine. |
| Library | discord.js 14.27, the only package Orion needs |
| Code style | Plain JavaScript (ES modules), no build step |
| Tests | Node's built-in test runner (`node --test`) |
| Time zone | Central time comes from the built-in `Intl` support, so daylight saving is handled automatically |

## Commands

| What | Command |
| --- | --- |
| Install (once, and after updates) | `npm install` |
| See what Orion would do, changing nothing | `npm run dry-run` |
| Run Orion | `npm start` |
| Run the checks | `npm test` |
| Stop Orion | Click the terminal window and press Ctrl+C |
