# Orion, the bot for Incredible Server

Orion is the helper bot for the Incredible Server Discord. It sets up the channels and roles, welcomes new people and posts the Wednesday build reminders.

You don't need to know how to code to run it. Follow the steps below in order. The first time takes about 20 minutes.

## What you need

- A computer that stays on while you want Orion online. Orion only works while it's running.
- Owner or admin rights on the Incredible Server Discord.
- Node.js, the free program Orion runs on (step 1).
- Orion's files. On the GitHub page for Freedom-University, click the green **Code** button, then **Download ZIP**, and unzip it. Orion is the `bot` folder inside.

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

   `https://discord.com/oauth2/authorize?client_id=YOUR_APPLICATION_ID&scope=bot+applications.commands&permissions=2251800082205712`

2. Open the link in your browser, pick **Incredible Server** and click **Authorize**.

The link gives Orion only what it needs: manage roles, manage channels, see channels, send messages, embed links, read message history and pin messages.

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

A dry run never changes anything on Discord, so it doesn't add Orion's slash commands either. Run `npm start` once to add them.

## Set up the server (once)

With Orion running, type `/setup` in any channel. Only admins can use it. Orion creates whatever is missing:

- **THE TABLE**: #welcome (house rules, pinned), #the-table (general chat), #wins (post a win, any size)
- **FREEDOM UNIVERSITY**: #wednesday-build (the weekly session), #the-vault (lessons, read-only for members), #questions (ask anything about money)
- **THE DROP**: #the-drop (shirts and drops, read-only), #keys (where members redeem keys)
- **Roles**: Headmaster (you), Captain, Crew and Founding Member

Running `/setup` again is safe. It skips anything that already exists, so nothing gets doubled up. If a channel with the same name already exists somewhere else, Orion leaves it where it is.

People already in the server when you first run `/setup` were here first, so they become founding members, oldest first. Bots and you don't count.

## When someone joins

The moment a new person joins, Orion:

1. **Says hello in #welcome**, by name.
2. **Gives them Founding Member** if they're one of the first 50, and the hello says which number they are. Someone who leaves and comes back keeps their number. The list is in `bot/data/founding.json`.
3. **DMs them five questions**, one at a time:
   - If money weren't a thing, what's the first thing you'd buy?
   - What's stopping you right now?
   - Roughly what would it cost a month?
   - Where do you want to be in five years?
   - Want help getting there?

They can type `skip` to pass on any. Once all five are in, Orion DMs the answers to you. Some people block DMs from servers. They still get the hello and the role, just not the questions. Someone who comes back after answering all five isn't asked again.

The answers are saved in `bot/data/answers.json`. They're private, so don't share that file.

## Commands

| Command | Who | What happens |
| --- | --- | --- |
| `/setup` | Admins | Creates the channels and roles (see above). |
| `/settopic` | Admins | Sets the topic Gabriel posts at 5:00 on Wednesday. |
| `/key` | Everyone | Redeems a code from a shirt or a drop. Only the member sees Gabriel's answer. |
| `/refer` | Everyone | Says who you brought. Your first makes you Crew, your fifth makes you Captain, and Orion thanks you in #wins. |
| `/win` | Everyone | Posts your win in #wins with your name. |
| `/lesson` | Everyone | Gabriel posts a link to the newest lesson in #the-vault. |

`/refer` only counts someone who joined after you, and each person can only be one member's referral. Referrals are saved in `bot/data/referrals.json`.

For `/lesson`, just post each new lesson in #the-vault. Gabriel always links the newest post there.

## Keys: how a shirt becomes a key

1. Make a copy of `keys.example.json` and name it `keys.json`.
2. Open `keys.json` in a text editor. Each line is a code and what it unlocks:
   - a role: `"7KQ2-M9XD": { "role": "Founding Member", "uses": 1 }`
   - a lesson: `"PAYSTUB-4FJ8": { "lesson": "Reading a pay stub, line by line", "link": "https://..." }`
3. `"uses"` is how many people can use that code. Use `1` for one code per shirt. Leave it out for a code anyone can use.
4. Pick codes that are hard to guess, like `7KQ2-M9XD`, not `SHIRT-1`. After five wrong tries in an hour, Orion makes that person wait.
5. Save the file. No restart needed: Orion reads it every time someone uses `/key`.

A key can unlock any role except Headmaster. Codes don't care about capital letters or spaces. `keys.json` stays on your computer and is never committed. Used codes are tracked in `bot/data/keys-used.json`.

## The Wednesday build

Every Wednesday, Gabriel posts in #wednesday-build:

- **4:30 pm Central:** "Build starts in 30. Bring one question about money."
- **5:00 pm Central:** the topic you set with `/settopic`.

To set the topic, type `/settopic` anywhere before 5:00 on Wednesday, then the topic. Only admins can. Gabriel posts it once and then clears it, so next week starts fresh. If no topic is set, Gabriel says there's no set topic tonight and to bring whatever's on their mind.

Orion has to be running at 4:30 and 5:00 for the posts to go out. If it's restarted within five minutes after either time, it still posts. Central time follows daylight saving on its own. The topic is saved in `bot/data/topic.json`.

## If something goes wrong

- **"Orion needs DISCORD_TOKEN and GUILD_ID"**: the `.env` file is missing or one value is empty. Go back to step 5.
- **"Discord didn't accept the token"**: copy the token again (step 2.6) and paste it into `.env`.
- **"Orion isn't in the server"**: invite it again (step 3), or check the server ID (step 4).
- **"Server Members Intent is off"**: switch it on in the Developer Portal (step 2.5), then start Orion again.
- **No hello when someone joins**: check that #welcome exists (run `/setup`) and that Orion is running.
- **Orion can't give someone a role**: in **Server Settings**, then **Roles**, drag the **Orion** role above Headmaster, Captain, Crew and Founding Member. Discord only lets a bot hand out roles that sit below its own.

## Keep the token safe

The token works like Orion's password. If you ever think someone has seen it, go to the Developer Portal, open **Bot**, click **Reset Token**, and put the new one in `.env`.
