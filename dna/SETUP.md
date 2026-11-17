# Orion: setup on a Windows PC

Plain steps, in order. The first time takes about 20 minutes. Orion only works while this PC is on and his window is open.

## What Orion needs

These go in a file called `.env`. Below are the names only; the values are yours.

| Name | What it is | Where to get it |
| --- | --- | --- |
| `DISCORD_TOKEN` | Orion's password for Discord. Secret. | Discord Developer Portal, your Orion application, Bot page, Reset Token |
| `GUILD_ID` | Your server's ID number. Not secret. | In Discord, right-click the server icon, then Copy Server ID (needs Developer Mode, step 6) |
| `DRY_RUN` | `true` means Orion only says what he would do. Normally `false`. | You choose |

## 1. Install Node.js (once)

1. Go to [nodejs.org](https://nodejs.org) and download the version marked **LTS**, the Windows Installer.
2. Run it and click Next until it finishes. The default options are fine.

## 2. Download Orion

1. Sign in to GitHub, then open this link:
   `https://github.com/POLARISC0/Freedom-University/archive/refs/heads/export/orion-bot.zip`
2. In your Downloads folder, right-click `Freedom-University-export-orion-bot.zip` and choose **Extract All**, then **Extract**.
3. Orion's folder is `Freedom-University-export-orion-bot`. Windows sometimes puts it inside another folder with the same name. Use the one that contains `package.json`.

You can move the folder anywhere, for example to `Documents`.

## 3. If Orion already ran from an older copy, move his memory over

If you ran Orion before from the old download, copy these from the old `bot` folder into the new folder before starting him:

- `.env`
- `keys.json`, if you made one
- the whole `data` folder

That folder holds the founding-member numbers, referrals and welcome answers. Without it, Orion starts from zero.

## 4. Create Orion in the Discord Developer Portal (skip if done)

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and sign in.
2. Click **New Application**, name it **Orion**, and click **Create**. Copy the **Application ID**.
3. Click **Bot** on the left. Switch on **Server Members Intent**, then click **Save Changes**.
4. Click **Reset Token**, then **Copy**. Keep it private.

## 5. Invite Orion to your server (skip if done)

Put your Application ID into this link, open it, pick your server and click **Authorize**:

`https://discord.com/oauth2/authorize?client_id=YOUR_APPLICATION_ID&scope=bot+applications.commands&permissions=2251800082205712`

## 6. Copy your server ID (skip if done)

1. In Discord, open **User Settings**, then **Advanced**, and turn on **Developer Mode**.
2. Right-click the server icon and click **Copy Server ID**.

## 7. Open a terminal in Orion's folder

Open Orion's folder in File Explorer, click the address bar at the top, type `cmd` and press Enter. A black Command Prompt window opens, already in the right folder.

## 8. Fill in the settings (skip if you copied `.env` in step 3)

Type these two commands, pressing Enter after each:

```
copy .env.example .env
notepad .env
```

In Notepad:

1. Paste the token right after `DISCORD_TOKEN=`.
2. Paste the server ID right after `GUILD_ID=`.
3. Leave out spaces and quotes, then save and close.

Never send this file or the token to anyone, and never paste the token into a chat.

## 9. Install and start

```
npm install
npm run dry-run
npm start
```

- `npm install` only needs running once, and again after an update.
- `npm run dry-run` connects and lists what Orion would do, changing nothing. Press Ctrl+C to stop it.
- `npm start` turns Orion on. When you see **Orion is online**, he's working. Leave the window open. Ctrl+C stops him.

## 10. First time in Discord

1. Type `/setup` in any channel. Only admins can, and it's safe to run again.
2. Optional: for key codes, run `copy keys.example.json keys.json` and `notepad keys.json`, then put in real codes. No restart needed.

## 11. Check that everything still works

```
npm test
```

It should end with `# fail 0`.

## 12. Open the project in Claude Code

1. Install the Claude desktop app for Windows, from the Claude Code desktop page on claude.com, and sign in. Claude Code needs a paid Claude plan.
2. In the app, open the **Code** tab and choose **Local**.
3. Click the folder control, choose **Open folder…** and pick Orion's folder.
4. Paste the message from `dna/NEW_PROJECT_PROMPT.md` as your first message.

Claude reads `CLAUDE.md` in this folder automatically. Installing Git for Windows (git-scm.com) is optional, but it lets Claude save versions of your work.

## If something goes wrong

| Orion says | What to do |
| --- | --- |
| "Orion needs DISCORD_TOKEN and GUILD_ID" | `.env` is missing or a value is empty. Go back to step 8. |
| "Discord didn't accept the token" | Copy the token again (step 4) into `.env`. |
| "Server Members Intent is off" | Switch it on in the Developer Portal (step 4), then start again. |
| "Orion isn't in the server with that GUILD_ID" | Invite him (step 5) or check the server ID (step 6). |
| "Orion couldn't reach Discord" | Check the internet connection. |
| He can't give someone a role | In Server Settings, then Roles, drag the Orion role above Headmaster, Captain, Crew and Founding Member. |
