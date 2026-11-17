# Freedom University: setup on a Windows PC

Plain steps, in order. The first time takes about 20 minutes.

## What the app needs

These go in a file called `.env`. Below are the names only; the values are yours, and secret ones stay on your PC.

| Name | What to put | Where to get it |
| --- | --- | --- |
| `DATABASE_URL` | Leave it as `file:./dev.db` | Already filled in |
| `ANTHROPIC_API_KEY` | Your Claude API key. Secret, and it costs money per use. | [console.anthropic.com](https://console.anthropic.com), then API Keys |
| `ANTHROPIC_MODEL` | Leave it as it is, or set `claude-sonnet-5-5` to spend less | Optional |
| `GNEWS_API_KEY` | A news key. Secret. | [gnews.io](https://gnews.io). The free plan allows 100 requests a day. |
| `NEWS_MOCK` | Put `1` to use fake headlines if you have no GNews key yet | Optional |
| `FEED_INTERVAL_MINUTES` | Minutes between Trading Floor posts. The default is 4. | Optional |

## 1. Install Node.js (once)

1. Go to [nodejs.org](https://nodejs.org) and download an **LTS** Windows Installer. This project was tested with Node 22.
2. Run it and click Next until it finishes.

## 2. Download Freedom University

1. Sign in to GitHub, then open this link:
   `https://github.com/POLARISC0/Freedom-University/archive/refs/heads/export/freedom-university.zip`
2. In your Downloads folder, right-click `Freedom-University-export-freedom-university.zip` and choose **Extract All**, then **Extract**.
3. The project folder is `Freedom-University-export-freedom-university`. Windows sometimes puts it inside another folder with the same name. Use the one that contains `package.json`.

## 3. Open a terminal in the project folder

Open the project folder in File Explorer, click the address bar at the top, type `cmd` and press Enter.

## 4. Fill in the settings first

This has to come before installing, because the install step needs `DATABASE_URL`.

```
copy .env.example .env
notepad .env
```

In Notepad, paste your Claude key between the quotes after `ANTHROPIC_API_KEY=`. Then do one of these:

- paste a GNews key after `GNEWS_API_KEY=`, or
- put `1` between the quotes after `NEWS_MOCK=`.

Save and close. Never share `.env` or paste a key into a chat.

## 5. Install and create the database

```
npm install
npx prisma migrate deploy
```

The first command takes a few minutes. The second creates the `dev.db` database file.

## 6. Run it

```
npm run dev
```

1. Open **http://localhost:3000**.
2. Sign in with any username. There's no password yet; see `STATUS.md`.
3. Leave the window open while you use it, and press Ctrl+C to stop.

On a computer with a mouse and a wide screen the home page is a 3D world. Phones get a flat map.

## 7. Check that everything still works

```
npm test
```

It should say all tests passed (44 at the time of export).

## 8. Open the project in Claude Code

1. Install the Claude desktop app for Windows, from the Claude Code desktop page on claude.com, and sign in. Claude Code needs a paid Claude plan.
2. In the app, open the **Code** tab and choose **Local**.
3. Click the folder control, choose **Open folder…** and pick the project folder.
4. Paste the message from `dna/NEW_PROJECT_PROMPT.md` as your first message.

Claude reads `CLAUDE.md` in this folder automatically. Installing Git for Windows (git-scm.com) is optional, but it lets Claude save versions of your work.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| `Cannot resolve environment variable: DATABASE_URL` during install | `.env` is missing. Do step 4, then run `npm install` again. |
| "Your version of Next.js is affected by a known security vulnerability" | This is the known Next.js security problem, first on the list in `STATUS.md`. Next.js shows it once when Claude runs the app, so ask Claude to do the update. |
| Install fails with `better-sqlite3` or `node-gyp` errors | Your Node.js version is too new for the database driver. Install Node 22 LTS instead and try again. |
| Lessons or quizzes say the AI isn't configured | `ANTHROPIC_API_KEY` in `.env` is empty or wrong. |
| The news page is empty | Add a `GNEWS_API_KEY`, or set `NEWS_MOCK` to `1`, then restart. |
