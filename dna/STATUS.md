# Orion: status (November 2026)

## Done

- **All five build steps:**
  - `/setup` builds the server;
  - two voices, Orion and Gabriel;
  - Wednesday reminders and `/settopic`;
  - `/key`, `/refer`, `/win` and `/lesson`;
  - the welcome on join, with founding members and the five DM questions.
- **Ran on real Discord** on the owner's PC: `/setup` built the 8 channels and 4 roles, and Orion welcomed a real member.
- **29 automatic checks pass** (`npm test`). They cover the server plan, the Wednesday timing (including daylight saving), keys, referrals, founding numbers, the welcome answers and a banned-word scan.
- A dry-run mode (`npm run dry-run`) shows what Orion would do without touching the server.

## Not confirmed on real Discord yet

These work in the automatic checks but haven't been seen on the real server yet:

- The Wednesday posts at 4:30 and 5:00 pm Central, and `/settopic`
- `/key` with real codes from `keys.json`
- `/refer` reaching Crew at one referral and Captain at five, with the thank-you in #wins
- `/win` and `/lesson`
- The five welcome DM questions, and the answers summary reaching the Headmaster

## Known limits

- Orion is only online while his computer is on and his window is open. Anyone who joins while he's off gets no hello. The next `/setup` still gives them Founding Member if spots are left.
- His memory lives only in the `data` folder on that computer, and nothing backs it up.
- If Discord's rules screening (new members must accept rules first) is switched on, giving roles on join hasn't been tested.
- The logo's "P" fades at avatar size, which matters if the logo becomes Orion's picture.

## Next, in priority order

1. **Keep Orion's memory when you switch to this copy.** Copy `.env`, `keys.json` and the `data` folder from the old `bot` folder (SETUP step 3).
2. **Confirm the unconfirmed list above** during the next Wednesday build, and note anything odd.
3. **Decide where Orion lives full-time:** a computer that stays on, or a small always-on host.
4. **Back up the `data` folder** regularly. It holds founding numbers, referrals and private welcome answers.
5. **Put real codes in `keys.json`** before the first shirt drop.
6. **Optional:** a simplified small version of the logo for Orion's avatar.
