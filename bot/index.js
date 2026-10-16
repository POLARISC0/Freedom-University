// Orion, the Discord bot for Incredible Server.
import { existsSync } from "node:fs";
import { Client, Events, GatewayIntentBits } from "discord.js";

// Settings live in bot/.env, which you fill in yourself. The token is never printed.
const envFile = new URL(".env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);
const { DISCORD_TOKEN, GUILD_ID } = process.env;
const DRY_RUN = process.env.DRY_RUN === "true" || process.argv.includes("--dry-run");

if (!DISCORD_TOKEN || !GUILD_ID) {
  console.error("Orion needs DISCORD_TOKEN and GUILD_ID. Copy .env.example to a file called .env, fill in both, then start again (README.md, step 5).");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Orion is online as ${c.user.tag}.`);
  if (DRY_RUN) console.log("DRY RUN: Orion only writes here what it would do. Nothing on the server changes.");
  if (!c.guilds.cache.has(GUILD_ID)) console.error("Orion isn't in the server with that GUILD_ID yet. Invite it with the link in README.md (step 3).");
});

client.login(DISCORD_TOKEN).catch((err) => {
  // Say what went wrong, never echo the token.
  if (err.code === "TokenInvalid") console.error("Discord didn't accept the token. Copy it again from the Developer Portal into .env.");
  else if (["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"].includes(err.code)) console.error("Orion couldn't reach Discord. Check the internet connection and try again.");
  else console.error(`Orion couldn't connect: ${err.message}`);
  process.exit(1);
});
