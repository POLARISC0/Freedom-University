import { MessageFlags } from "discord.js";
import { act } from "./act.js";
import { DRY_RUN } from "./env.js";
import { findChannel, linkChannels } from "./server.js";

// One bot, two voices. Orion greets people, runs the welcome questions and looks after the community.
// Gabriel delivers keys, lessons and reminders.
export const ORION = "Orion";
export const GABRIEL = "Gabriel";

/** Every message starts with who's talking, so members can tell the two apart. */
export const say = (voice, text) => `**${voice}:** ${text}`;

// Everything Orion and Gabriel say, in one place. Plain words from a mate who figured money out:
// no hype, no income promises.
export const LINES = {
  // Orion
  rules: `Welcome to Incredible Server.
This is for people who don't have a table where money gets explained.

**House rules**
1. Be kind. Everyone starts somewhere.
2. Ask anything about money. No question is too basic.
3. No selling, no promos, no DMing people offers.
4. Nobody here gives financial advice or promises income. We explain how money works so you can make your own calls.
5. Keep private things private: no account numbers, card details or passwords.

Say hi in #the-table. The Wednesday build is 5:00 to 6:30 pm Central in #wednesday-build.`,
  greet: (mention, foundingNumber, asked) =>
    `Welcome to the table, ${mention}. Glad you made it. Have a read of the rules up top, then say hi in #the-table.` +
    (asked ? " I've sent you a DM with five quick questions, no wrong answers." : "") +
    (foundingNumber ? ` You're founding member number ${foundingNumber}. The first 50 keep that for good.` : ""),
  dmIntro: (name) => `Hey ${name}, Orion here from Incredible Server. Five quick questions so we know where you're at. Answer each in one message, short is fine, and only the Headmaster sees them. Type skip to pass on any.`,
  questions: [
    "**1 of 5.** If money weren't a thing, what's the first thing you'd buy?",
    "**2 of 5.** What's stopping you right now?",
    "**3 of 5.** Roughly what would it cost a month?",
    "**4 of 5.** Where do you want to be in five years?",
    "**5 of 5.** Want help getting there? Yes or no is fine.",
  ],
  dmThanks: (name) => `Thanks, ${name}. That's all five. See you at the table. The Wednesday build is 5:00 to 6:30 pm Central.`,
  summary: (who, answers) => `${who} answered the welcome questions.\n` + LINES.questions.map((q, i) => `${q}\n> ${answers[i]}`).join("\n"),
  referred: (name, count) => `Got it, you brought ${name}. ${count === 1 ? "That's your first one." : `That's ${count} so far.`}`,
  referSelf: "You can't refer yourself.",
  referBot: "Bots don't count.",
  referNotHere: "They need to be in the server first.",
  referTaken: (name) => `${name} is already down as someone else's referral.`,
  referEarlier: (name) => `${name} was here before you, so they can't be your referral.`,
  crewThanks: (who, newcomer) => `Thanks ${who} for bringing ${newcomer} to the table. That's your first, so you're Crew now.`,
  captainThanks: (who) => `Thanks ${who}. That's five people you've brought to the table. You're a Captain now.`,
  win: (name, text) => `Win from **${name}**: ${text}`,
  winPosted: "Posted in #wins. Nice one.",
  adminOnly: (command) => `Only an admin can run /${command}.`,
  setupDone: (what) => `Done. Added ${what}. You're the Headmaster.`,
  setupNothing: "Everything was already in place. Nothing new to add.",
  setupDry: (what) => `Dry run, so nothing changed. /setup would add ${what}. The list is in Orion's terminal.`,

  // Gabriel
  headsUp: "Build starts in 30. Bring one question about money.",
  live: (topic) => (topic ? `We're on. Tonight's topic: ${topic}` : "We're on. No set topic tonight, so bring whatever's on your mind."),
  topicSet: (topic) => `Got it. I'll post this at 5:00 on Wednesday: ${topic}`,
  keyRole: (role) => `That key works. You've now got the ${role} role.`,
  keyLesson: (title, link) => `That key works. Here's your lesson: ${title}\n${link}`,
  keyUnknown: "I don't recognise that code. Check it and try again, or ask in #questions.",
  keyUsedUp: "That code has already been used.",
  keyAlreadyYours: "You've already used that code.",
  keyBroken: "That code isn't set up right yet. Let the Headmaster know.",
  keySlowDown: "That's a few wrong codes in a row. Give it an hour, then try again.",
  lesson: (link) => `This week's Vault lesson: ${link}`,
  noLesson: "Nothing in #the-vault yet. Check back after the next build.",
};

const firstLine = (text) => text.split("\n")[0].slice(0, 90);

/**
 * Posts in a channel, by name, as one of the voices. Returns the message, or null in a dry run or on failure.
 * Mentions can ping people (never roles or @everyone); pass `mentions: []` for text a member wrote.
 */
export async function post(guild, channelName, voice, text, { mentions = ["users"] } = {}) {
  const channel = findChannel(guild, channelName);
  if (!channel && !DRY_RUN) {
    console.error(`Orion can't find #${channelName}. Run /setup first.`);
    return null;
  }
  return act(`post in #${channelName} as ${voice}: "${firstLine(text)}"`, () => channel.send({ content: say(voice, linkChannels(guild, text)), allowedMentions: { parse: mentions } })).catch((err) => {
    console.error(`Couldn't post in #${channelName}: ${err.message}`);
    return null;
  });
}

/** Sends someone a direct message as one of the voices. People who've turned DMs off just don't get it. */
export async function dm(user, voice, text) {
  return act(`DM ${user.username} as ${voice}: "${firstLine(text)}"`, () => user.send(say(voice, text))).catch((err) => {
    console.error(`Couldn't DM ${user.username}: ${err.message}`);
    return null;
  });
}

/**
 * Answers a slash command as one of the voices. Private answers only the member sees.
 * An open answer is a post everyone sees, so a dry run shows it privately instead.
 */
export async function answer(interaction, voice, text, { open = false } = {}) {
  const content = say(voice, linkChannels(interaction.guild, text));
  if (interaction.deferred) return interaction.editReply(content);
  if (open && !DRY_RUN) return interaction.reply({ content, allowedMentions: { parse: [] } });
  if (open) console.log(`[dry run] would post in #${interaction.channel?.name} as ${voice}: "${firstLine(text)}"`);
  return interaction.reply({ content: open ? `(Dry run, only you see this.) ${content}` : content, flags: MessageFlags.Ephemeral });
}
