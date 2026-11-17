import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { act } from "./act.js";
import { DRY_RUN } from "./env.js";
import { findCategory, findRole, same, TEXT_TYPES } from "./server.js";
import { answer, LINES, ORION, post } from "./voices.js";
import { backfillFounding } from "./welcome.js";

// Created top to bottom: Discord puts each new role under the ones before it.
export const ROLES = [
  { name: "Headmaster", color: 0xf0b232, hoist: true },
  { name: "Captain", color: 0x5865f2, hoist: true },
  { name: "Crew", color: 0x23a55a, hoist: true },
  { name: "Founding Member", color: 0xeb459e, hoist: false },
];

export const CATEGORIES = [
  {
    name: "THE TABLE",
    channels: [
      { name: "welcome", topic: "Start here. House rules, and why this place exists." },
      { name: "the-table", topic: "General chat. Pull up a chair." },
      { name: "wins", topic: "Post a win, any size. Paid a bill on time? That counts." },
    ],
  },
  {
    name: "FREEDOM UNIVERSITY",
    channels: [
      { name: "wednesday-build", topic: "The weekly session. Wednesdays, 5:00 to 6:30 pm Central." },
      { name: "the-vault", topic: "Lessons. Read them any time. Only the Headmaster posts here.", readOnly: true },
      { name: "questions", topic: "Ask anything about money. No question is too basic." },
    ],
  },
  {
    name: "THE DROP",
    channels: [
      { name: "the-drop", topic: "Shirts and drops. Read-only.", readOnly: true },
      { name: "keys", topic: "Got a key from a shirt or a drop? Type /key and your code. Only you see the reply." },
    ],
  },
];

/** What's missing, given the names already on the server. A channel anywhere counts, so nothing is ever doubled up. */
export function planSetup({ roles, channels }) {
  const has = (names, name) => names.some((n) => same(n, name));
  const categories = channels.filter((c) => c.type === "category").map((c) => c.name);
  const texts = channels.filter((c) => c.type === "text").map((c) => c.name);
  return {
    roles: ROLES.filter((r) => !has(roles, r.name)),
    categories: CATEGORIES.map((c) => c.name).filter((name) => !has(categories, name)),
    channels: CATEGORIES.flatMap((c) => c.channels.map((ch) => ({ ...ch, parent: c.name }))).filter((ch) => !has(texts, ch.name)),
  };
}

// Members can read and react but not post; the Headmaster can post.
const readOnly = (guild) => [
  { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.SendMessagesInThreads, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads] },
  { id: findRole(guild, "Headmaster").id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.SendMessagesInThreads, PermissionFlagsBits.CreatePublicThreads] },
];

/** Creates whatever is missing. `runner` (the admin who typed /setup) becomes Headmaster, and people already here become founding members. */
export async function runSetup(guild, runner) {
  await guild.roles.fetch();
  await guild.channels.fetch();
  const plan = planSetup({
    roles: guild.roles.cache.map((r) => r.name),
    channels: guild.channels.cache.map((c) => ({ name: c.name, type: c.type === ChannelType.GuildCategory ? "category" : TEXT_TYPES.includes(c.type) ? "text" : "other" })),
  });
  const reason = "Orion /setup";

  for (const r of plan.roles) {
    await act(`create the role ${r.name}`, () => guild.roles.create({ name: r.name, colors: { primaryColor: r.color }, hoist: r.hoist, reason }));
  }
  for (const name of plan.categories) {
    await act(`create the category ${name}`, () => guild.channels.create({ name, type: ChannelType.GuildCategory, reason }));
  }
  for (const ch of plan.channels) {
    await act(`create #${ch.name} in ${ch.parent}${ch.readOnly ? " (read-only for members)" : ""}`, () =>
      guild.channels.create({
        name: ch.name,
        type: ChannelType.GuildText,
        parent: findCategory(guild, ch.parent)?.id,
        topic: ch.topic,
        permissionOverwrites: ch.readOnly ? readOnly(guild) : [],
        reason,
      }),
    );
  }
  if (plan.channels.some((ch) => ch.name === "welcome")) {
    const rules = await post(guild, "welcome", ORION, LINES.rules);
    // Pinned so the rules stay on top of the greetings; needs the Pin Messages permission.
    if (rules) await rules.pin().catch((err) => console.error(`Couldn't pin the rules: ${err.message}`));
  }
  if (runner && !runner.roles.cache.some((r) => same(r.name, "Headmaster"))) {
    await act(`give ${runner.displayName} the Headmaster role`, () => runner.roles.add(findRole(guild, "Headmaster"), reason));
  }
  return { ...plan, founding: await backfillFounding(guild, runner) };
}

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const commands = {
  setup: {
    data: new SlashCommandBuilder()
      .setName("setup")
      .setDescription("Create the Incredible Server channels and roles (admins only).")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async run(interaction) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return answer(interaction, ORION, LINES.adminOnly("setup"));
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const plan = await runSetup(interaction.guild, interaction.member);
      const made = plan.roles.length + plan.categories.length + plan.channels.length + plan.founding;
      const what = `${count(plan.roles.length, "role", "roles")}, ${count(plan.categories.length, "category", "categories")}, ${count(plan.channels.length, "channel", "channels")} and ${count(plan.founding, "founding member", "founding members")}`;
      await answer(interaction, ORION, DRY_RUN ? LINES.setupDry(what) : made ? LINES.setupDone(what) : LINES.setupNothing);
    },
  },
};
