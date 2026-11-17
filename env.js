import { existsSync } from "node:fs";

// Settings live in bot/.env, which you fill in yourself. Nothing in Orion prints the token.
const file = new URL(".env", import.meta.url);
if (existsSync(file)) process.loadEnvFile(file);

export const { DISCORD_TOKEN, GUILD_ID } = process.env;
export const DRY_RUN = process.env.DRY_RUN === "true" || process.argv.includes("--dry-run");
