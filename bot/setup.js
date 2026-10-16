import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { act } from "./act.js";
import { DRY_RUN } from "./env.js";

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

export const RULES = `**Welcome to Incredible Server.**
This is for people who don't have a table where money gets explained.

**House rules**
1. Be kind. Everyone starts somewhere.
2. Ask anything about money. No question is too basic.
3. No selling, no promos, no DMing people offers.
4. Nobody here gives financial advice or promises income. We explain how money works so you can make your own calls.
5. Keep private things private: no account numbers, card details or passwords.

Say hi in #the-table. The Wednesday build is 5:00 to 6:30 pm Central in #wednesday-build.`;

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

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

const TEXT_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum];

export const findRole = (guild, name) => guild.roles.cache.find((r) => same(r.name, name));
export const findChannel = (guild, name) => guild.channels.cache.find((c) => TEXT_TYPES.includes(c.type) && same(c.name, name));
const findCategory = (guild, name) => guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && same(c.name, name));

/** Turns "#wins" in a message into a clickable channel link, when the channel exists. */
export const linkChannels = (guild, text) => text.replace(/#([a-z0-9-]+)/g, (m, name) => (findChannel(guild, name) ? `<#${findChannel(guild, name).id}>` : m));

// Members can read and react but not post; the Headmaster can post.
const readOnly = (guild) => [
  { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.SendMessagesInThreads, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads] },
  { id: findRole(guild, "Headmaster").id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.SendMessagesInThreads, PermissionFlagsBits.CreatePublicThreads] },
];

/** Creates whatever is missing. `runner` (the admin who typed /setup) becomes Headmaster. */
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
    await act("post the house rules in #welcome and pin them", async () => {
      const rules = await findChannel(guild, "welcome").send(linkChannels(guild, RULES));
      // Pinning keeps the rules on top of the greetings; it needs the Pin Messages permission.
      await rules.pin().catch((err) => console.error(`Couldn't pin the rules: ${err.message}`));
    });
  }
  if (runner && !runner.roles.cache.some((r) => same(r.name, "Headmaster"))) {
    await act(`give ${runner.displayName} the Headmaster role`, () => runner.roles.add(findRole(guild, "Headmaster"), reason));
  }
  return plan;
}

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const commands = {
  setup: {
    data: new SlashCommandBuilder()
      .setName("setup")
      .setDescription("Create the Incredible Server channels and roles (admins only).")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async run(interaction) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "Only an admin can run /setup.", flags: MessageFlags.Ephemeral });
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const plan = await runSetup(interaction.guild, interaction.member);
      const made = plan.roles.length + plan.categories.length + plan.channels.length;
      const what = `${count(plan.roles.length, "role", "roles")}, ${count(plan.categories.length, "category", "categories")} and ${count(plan.channels.length, "channel", "channels")}`;
      await interaction.editReply(
        DRY_RUN ? `Dry run, so nothing changed. /setup would create ${what}. The list is in Orion's terminal.` : made ? `Done. Created ${what}. You're the Headmaster.` : "Everything was already in place. Nothing new to create.",
      );
    },
  },
};
