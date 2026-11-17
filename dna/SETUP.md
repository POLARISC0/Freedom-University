# Walk With Him: setup on a Windows PC

Plain steps, in order. The first time takes about 20 minutes.

## What the game needs

These go in a file called `.env`. Below are the names only; the values are yours, and secret ones stay on your PC.

| Name | What to put | Where to get it |
| --- | --- | --- |
| `DATABASE_URL` | Leave it as `file:./dev.db` | Already filled in |
| `ANTHROPIC_API_KEY` | Your Claude API key. Secret, and it costs money per use. Optional: without it, everything works except the conversations. | [platform.claude.com](https://platform.claude.com/settings/keys), API keys |
| `ANTHROPIC_MODEL` | Leave it as it is, or set `claude-sonnet-5-5` to spend less | Optional |

## 1. Install Node.js (once)

1. Go to [nodejs.org](https://nodejs.org) and download Node.js **22** or **24**, the Windows Installer. Version 22.12 or later is fine.
2. Run it and click Next until it finishes.

## 2. Download the game

1. On GitHub, open this project's branch, `export/walk-with-him`, click the green **Code** button, then **Download ZIP**.
2. In your Downloads folder, right-click the ZIP and choose **Extract All**, then **Extract**.
3. The project folder's name ends in `export-walk-with-him`. Windows sometimes puts it inside another folder with the same name. Use the one that contains `package.json`.

## 3. Open a terminal in the project folder

Open the project folder in File Explorer, click the address bar at the top, type `cmd` and press Enter.

## 4. Fill in the settings first

This has to come before installing, because the install step needs `DATABASE_URL`.

```
copy .env.example .env
notepad .env
```

If you have a Claude key, paste it between the quotes after `ANTHROPIC_API_KEY=`. Save and close. Never share `.env` or paste a key into a chat.

## 5. Install and create the database

```
npm install
npx prisma migrate deploy
```

The first command takes a few minutes. The second creates the `dev.db` database file.

## 6. Play

```
npm run dev
```

1. Open **http://localhost:3000**. It takes you to the game.
2. Create an account with a username and password, then press Play.
3. Leave the window open while you play, and press Ctrl+C to stop.

Use `localhost` in the address, not `127.0.0.1`, or the game page stays blank.

## 7. The static preview (no server needed)

```
npm run preview:build
```

Then double-click `preview-dist\index.html`. The whole game runs in the browser and saves progress there. The conversations only work when the preview is opened as a claude.ai artifact.

## 8. Check that everything still works

```
npm test
```

It should say all tests passed (399 at the time of export, including every Bible quotation checked word for word).

## 9. Open the project in Claude Code

1. Install the Claude desktop app for Windows, from the Claude Code desktop page on claude.com, and sign in. Claude Code needs a paid Claude plan.
2. In the app, open the **Code** tab and choose **Local**.
3. Click the folder control, choose **Open folder…** and pick the project folder.
4. Paste the message from `dna/NEW_PROJECT_PROMPT.md` as your first message.

Claude reads `CLAUDE.md` in this folder automatically. Installing Git for Windows (git-scm.com) is optional, but it lets Claude save versions of your work.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| `Cannot resolve environment variable: DATABASE_URL` during install | `.env` is missing. Do step 4, then run `npm install` again. |
| "Your version of Next.js is affected by a known security vulnerability" | This is the known Next.js security problem, first on the list in `STATUS.md`. Ask Claude to do the update. |
| Install fails with `better-sqlite3` or `node-gyp` errors | Use Node.js 22 or 24 (step 1), then try again. |
| The game page is blank | Open `http://localhost:3000`, not `http://127.0.0.1:3000`. |
| The mentors say they can't be reached | `ANTHROPIC_API_KEY` in `.env` is empty or wrong. The rest of the game still works. |
