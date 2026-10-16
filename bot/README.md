# Orion, the bot for Incredible Server

Orion is the helper bot for the Incredible Server Discord. It sets up the channels and roles, says hello to new people and posts the Wednesday build reminders.

You don't need to know how to code to run it. Follow the steps below in order. The first time takes about 20 minutes.

## What you need

- A computer that stays on while you want Orion online. Orion only works while it's running.
- Owner or admin rights on the Incredible Server Discord.
- Node.js, the free program Orion runs on (step 1).

## One-time setup

### 1. Install Node.js

1. Go to [nodejs.org](https://nodejs.org).
2. Download the version marked **LTS** and install it with the normal installer.

### 2. Create Orion in the Discord Developer Portal

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and sign in.
2. Click **New Application**, name it **Orion**, and click **Create**.
3. On the **General Information** page, copy the **Application ID** and keep it handy for step 3.
4. Click **Bot** in the left menu. Make sure the username says **Orion**.
5. Scroll to **Privileged Gateway Intents** and switch on **Server Members Intent**. Click **Save Changes**. Orion needs this to see when someone joins.
6. Scroll up and click **Reset Token**, then **Copy**. This token is Orion's password. Paste it somewhere private for step 5, and never post it anywhere.

### 3. Invite Orion to your server

1. Copy this link and replace `YOUR_APPLICATION_ID` with the Application ID from step 2:

   `https://discord.com/oauth2/authorize?client_id=YOUR_APPLICATION_ID&scope=bot+applications.commands&permissions=268520464`

2. Open the link in your browser, pick **Incredible Server** and click **Authorize**.

The link gives Orion only what it needs: manage roles, manage channels, see channels, send messages, embed links and read message history.

### 4. Copy your server ID

1. In Discord, open **User Settings**, then **Advanced**, and turn on **Developer Mode**.
2. Right-click the Incredible Server icon on the left and click **Copy Server ID**.

### 5. Give Orion its settings

1. Open the `bot` folder.
2. Make a copy of `.env.example` and name the copy `.env` (just `.env`, nothing before the dot).
   Can't see `.env.example`? On a Mac press Cmd+Shift+. (full stop) in the folder to show hidden files. On Windows, in File Explorer pick **View**, then **Show**, then **Hidden items**.
3. Open `.env` in a plain text editor (TextEdit or Notepad).
4. Paste the token after `DISCORD_TOKEN=` and the server ID after `GUILD_ID=`, with no spaces. Save.

`.env` stays on your computer. It is never uploaded or shared, and Orion never shows the token on screen.

### 6. Open a terminal in the bot folder

- **Mac:** open the Terminal app, type `cd ` (with a space after it), drag the `bot` folder into the window and press Enter.
- **Windows:** open the `bot` folder in File Explorer, click the address bar at the top, type `cmd` and press Enter.

### 7. Install Orion

In the terminal, type this and press Enter:

```
npm install
```

Wait until it finishes. You only need to do this once, and again after an update.

## Running Orion

In the terminal, in the `bot` folder:

```
npm start
```

When you see **Orion is online**, it's working. Leave the terminal window open. To stop Orion, click the terminal and press Ctrl+C.

### Try a dry run first

```
npm run dry-run
```

Orion connects and writes in the terminal everything it would do, but changes nothing on the server. Use this before the real thing whenever you want to check.

You can also set `DRY_RUN=true` in `.env` to keep it in dry-run mode every time you start it.

## If something goes wrong

- **"Orion needs DISCORD_TOKEN and GUILD_ID"**: the `.env` file is missing or one value is empty. Go back to step 5.
- **"Discord didn't accept the token"**: copy the token again (step 2.6) and paste it into `.env`.
- **"Orion isn't in the server"**: invite it again (step 3), or check the server ID (step 4).

## Keep the token safe

The token works like Orion's password. If you ever think someone has seen it, go to the Developer Portal, open **Bot**, click **Reset Token**, and put the new one in `.env`.
