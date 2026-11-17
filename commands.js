import fs from "node:fs";
import { SlashCommandBuilder } from "discord.js";
import { act } from "./act.js";
import { DRY_RUN } from "./env.js";
import { findChannel, findRole, same } from "./server.js";
import { load, save } from "./store.js";
import { answer, GABRIEL, LINES, ORION, post } from "./voices.js";

// ---------- Keys: a code from a shirt or a drop unlocks a role or a lesson ----------

const tidy = (code) => code.trim().toUpperCase();

/** Checks a code against keys.json and who has already used what. */
export function redeem(keys, used, code, userId) {
  const [found, key] = Object.entries(keys).find(([c]) => tidy(c) === tidy(code)) ?? [];
  if (!key) return { ok: false, reason: "unknown" };
  // A key gives a role (never Headmaster) or a lesson link, nothing else.
  if (key.role ? same(key.role, "Headmaster") : !key.link) return { ok: false, reason: "broken" };
  const by = used[tidy(found)] ?? [];
  if (by.includes(userId)) return { ok: false, reason: "alreadyYours" };
  if (key.uses && by.length >= key.uses) return { ok: false, reason: "usedUp" };
  return key.role ? { ok: true, code: tidy(found), role: key.role } : { ok: true, code: tidy(found), lesson: key.lesson ?? "Your lesson", link: key.link };
}

function readKeys() {
  try {
    return JSON.parse(fs.readFileSync(new URL("./keys.json", import.meta.url), "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw new Error(`keys.json can't be read (${err.message}). Check it against keys.example.json.`);
  }
}

// Wrong codes per member in the last hour, so nobody can guess codes by trying a long list.
// shortcut: forgets on restart, which is fine for a small server.
const misses = new Map();
const HOUR = 60 * 60 * 1000;
const tooManyMisses = (userId) => (misses.get(userId) ?? []).filter((t) => Date.now() - t < HOUR).length >= 5;

// ---------- Referrals: Crew at one, Captain at five ----------

/** Records that `referrerId` brought `newcomerId`, and says which role that earns, if any. */
export function recordReferral(referrals, referrerId, newcomerId) {
  if (referrerId === newcomerId) return { ok: false, reason: "self" };
  if (referrals[newcomerId]) return { ok: false, reason: "taken" };
  const count = Object.values(referrals).filter((id) => id === referrerId).length + 1;
  return { ok: true, count, milestone: count === 1 ? "Crew" : count === 5 ? "Captain" : null, referrals: { ...referrals, [newcomerId]: referrerId } };
}

/** Gives a member a role by name. In a dry run the role may not exist yet, because /setup only described it. */
export async function giveRole(member, roleName, why) {
  const role = findRole(member.guild, roleName);
  if (!role && !DRY_RUN) return console.error(`The ${roleName} role is missing. Run /setup.`);
  await act(`give ${member.displayName} the ${role?.name ?? roleName} role (${why})`, () => member.roles.add(role, `Orion: ${why}`));
}

export const commands = {
  key: {
    data: new SlashCommandBuilder()
      .setName("key")
      .setDescription("Redeem a key from a shirt or a drop.")
      .addStringOption((o) => o.setName("code").setDescription("The code on your key").setRequired(true).setMaxLength(64)),
    async run(interaction) {
      const { user, member } = interaction;
      if (tooManyMisses(user.id)) return answer(interaction, GABRIEL, LINES.keySlowDown);
      const used = load("keys-used.json", {});
      const result = redeem(readKeys(), used, interaction.options.getString("code"), user.id);
      if (!result.ok) {
        if (result.reason === "unknown") misses.set(user.id, [...(misses.get(user.id) ?? []), Date.now()]);
        if (result.reason === "broken") console.error("A key in keys.json gives no role or link, or tries to give Headmaster. Fix that entry.");
        return answer(interaction, GABRIEL, { unknown: LINES.keyUnknown, broken: LINES.keyBroken, usedUp: LINES.keyUsedUp, alreadyYours: LINES.keyAlreadyYours }[result.reason]);
      }
      if (result.role && !findRole(interaction.guild, result.role)) {
        console.error(`keys.json gives the role "${result.role}", which isn't on the server.`);
        return answer(interaction, GABRIEL, LINES.keyBroken);
      }
      if (result.role) await giveRole(member, result.role, `key ${result.code}`);
      save("keys-used.json", { ...used, [result.code]: [...(used[result.code] ?? []), user.id] });
      return answer(interaction, GABRIEL, result.role ? LINES.keyRole(result.role) : LINES.keyLesson(result.lesson, result.link));
    },
  },

  refer: {
    data: new SlashCommandBuilder()
      .setName("refer")
      .setDescription("Say who you brought to the server.")
      .addUserOption((o) => o.setName("user").setDescription("The person you brought").setRequired(true)),
    async run(interaction) {
      const { member } = interaction;
      const newcomer = interaction.options.getMember("user");
      if (!newcomer) return answer(interaction, ORION, LINES.referNotHere);
      if (newcomer.user.bot) return answer(interaction, ORION, LINES.referBot);
      // You can only have brought someone who arrived after you.
      if (newcomer.id !== member.id && newcomer.joinedTimestamp < member.joinedTimestamp) return answer(interaction, ORION, LINES.referEarlier(newcomer.displayName));
      const result = recordReferral(load("referrals.json", {}), member.id, newcomer.id);
      if (!result.ok) return answer(interaction, ORION, result.reason === "self" ? LINES.referSelf : LINES.referTaken(newcomer.displayName));
      save("referrals.json", result.referrals);
      if (result.milestone) {
        await giveRole(member, result.milestone, `${result.count} referral${result.count === 1 ? "" : "s"}`);
        await post(interaction.guild, "wins", ORION, result.milestone === "Crew" ? LINES.crewThanks(`${member}`, `${newcomer}`) : LINES.captainThanks(`${member}`));
      }
      return answer(interaction, ORION, LINES.referred(newcomer.displayName, result.count));
    },
  },

  win: {
    data: new SlashCommandBuilder()
      .setName("win")
      .setDescription("Post a win in #wins. Any size counts.")
      .addStringOption((o) => o.setName("text").setDescription("What went right?").setRequired(true).setMaxLength(500)),
    async run(interaction) {
      // The win is the member's own words, so it can't ping anyone.
      await post(interaction.guild, "wins", ORION, LINES.win(interaction.member.displayName, interaction.options.getString("text")), { mentions: [] });
      return answer(interaction, ORION, LINES.winPosted);
    },
  },

  lesson: {
    data: new SlashCommandBuilder().setName("lesson").setDescription("Post the current lesson from the Vault."),
    async run(interaction) {
      // The current lesson is whatever was posted last in #the-vault.
      const vault = findChannel(interaction.guild, "the-vault");
      const latest = vault && (await vault.messages.fetch({ limit: 1 })).first();
      return answer(interaction, GABRIEL, latest ? LINES.lesson(latest.url) : LINES.noLesson, { open: Boolean(latest) });
    },
  },
};
