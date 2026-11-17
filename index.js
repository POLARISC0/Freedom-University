// Orion, the Discord bot for Incredible Server.
import { DISCORD_TOKEN, DRY_RUN, GUILD_ID } from "./env.js";
import { Client, Events, GatewayIntentBits, MessageFlags, Partials } from "discord.js";
import * as members from "./commands.js";
import * as schedule from "./schedule.js";
import * as setup from "./setup.js";
import * as welcome from "./welcome.js";

if (!DISCORD_TOKEN || !GUILD_ID) {
  console.error("Orion needs DISCORD_TOKEN and GUILD_ID. Copy .env.example to a file called .env, fill in both, then start again (README.md, step 5).");
  process.exit(1);
}

const commands = { ...setup.commands, ...schedule.commands, ...members.commands };
// Server Members lets Orion see people join (it's switched on in the Developer Portal).
// DMs come in on channels Orion hasn't seen since it started, which is what the Channel partial allows.
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Orion is online as ${c.user.tag}.`);
  const guild = c.guilds.cache.get(GUILD_ID);
  if (!guild) return console.error("Orion isn't in the server with that GUILD_ID yet. Invite it with the link in README.md (step 3).");
  schedule.startSchedule(guild);
  if (DRY_RUN) {
    console.log("DRY RUN: Orion only writes here what it would do. Nothing on the server changes.\nHere's what /setup would do right now:");
    await setup.runSetup(guild);
    return console.log("Slash commands aren't added in a dry run. Run npm start once to add them.");
  }
  await guild.commands.set(Object.values(commands).map((cmd) => cmd.data));
  console.log(`Commands ready: ${Object.keys(commands).map((name) => `/${name}`).join(" ")}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.guildId !== GUILD_ID) return;
  try {
    await commands[interaction.commandName]?.run(interaction);
  } catch (err) {
    console.error(`/${interaction.commandName} failed: ${err.message}`);
    const content = "That didn't work. The reason is in Orion's terminal window.";
    await (interaction.deferred || interaction.replied ? interaction.editReply(content) : interaction.reply({ content, flags: MessageFlags.Ephemeral })).catch(() => {});
  }
});

client.on(Events.GuildMemberAdd, (member) => {
  if (member.guild.id !== GUILD_ID) return;
  welcome.onJoin(member).catch((err) => console.error(`Welcoming ${member.displayName} failed: ${err.message}`));
});

// Answers to the welcome questions arrive as DMs.
client.on(Events.MessageCreate, (message) => {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (message.guild || message.author.bot || !guild) return;
  welcome.onDirectMessage(message, guild).catch((err) => console.error(`A DM from ${message.author.username} failed: ${err.message}`));
});

client.login(DISCORD_TOKEN).catch((err) => {
  // Say what went wrong, never echo the token.
  if (err.code === "TokenInvalid") console.error("Discord didn't accept the token. Copy it again from the Developer Portal into .env.");
  else if (err.message === "Used disallowed intents") console.error("Discord turned Orion away because Server Members Intent is off. Switch it on in the Developer Portal (README.md, step 2), then start again.");
  else if (["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"].includes(err.code)) console.error("Orion couldn't reach Discord. Check the internet connection and try again.");
  else console.error(`Orion couldn't connect: ${err.message}`);
  process.exit(1);
});
