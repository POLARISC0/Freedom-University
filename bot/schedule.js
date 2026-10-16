import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { act } from "./act.js";
import { load, save } from "./store.js";
import { answer, GABRIEL, LINES, ORION, post } from "./voices.js";

// Wednesday build: Gabriel's heads-up at 4:30 pm and the topic at 5:00 pm, Central time (daylight saving included).
const central = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "numeric", hourCycle: "h23" });
const GRACE = 5; // minutes late that still count, so a restart at the wrong moment doesn't miss a post

/** Which Wednesday post is due at this moment, if any. */
export function dueAt(date) {
  const p = Object.fromEntries(central.formatToParts(date).map((part) => [part.type, part.value]));
  if (p.weekday !== "Wed") return null;
  const minute = Number(p.hour) * 60 + Number(p.minute);
  const day = `${p.year}-${p.month}-${p.day}`;
  if (minute >= 16 * 60 + 30 && minute < 16 * 60 + 30 + GRACE) return { kind: "headsUp", day };
  if (minute >= 17 * 60 && minute < 17 * 60 + GRACE) return { kind: "live", day };
  return null;
}

/** Posts whatever Wednesday message is due at `now`, once. `sent` remembers what has gone out. */
export async function postDue(guild, now, sent) {
  const due = dueAt(now);
  if (!due || sent.has(`${due.day} ${due.kind}`)) return;
  sent.add(`${due.day} ${due.kind}`);
  save("schedule.json", [...sent].slice(-4));
  if (due.kind === "headsUp") {
    await post(guild, "wednesday-build", GABRIEL, LINES.headsUp);
    return;
  }
  const { topic } = load("topic.json", {});
  await post(guild, "wednesday-build", GABRIEL, LINES.live(topic));
  // Used up, so last week's topic never comes round again.
  if (topic) save("topic.json", { topic: null, lastTopic: topic });
}

/** Checks the clock every 30 seconds. */
export function startSchedule(guild) {
  const sent = new Set(load("schedule.json", []));
  const tick = () => postDue(guild, new Date(), sent).catch((err) => console.error(`Wednesday post failed: ${err.message}`));
  tick();
  return setInterval(tick, 30_000);
}

export const commands = {
  settopic: {
    data: new SlashCommandBuilder()
      .setName("settopic")
      .setDescription("Set the topic Gabriel posts at 5:00 pm on Wednesday (admins only).")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption((o) => o.setName("topic").setDescription("This week's topic").setRequired(true).setMaxLength(200)),
    async run(interaction) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return answer(interaction, ORION, LINES.adminOnly("settopic"));
      const topic = interaction.options.getString("topic").trim();
      await act(`save Wednesday's topic: ${topic}`, () => save("topic.json", { topic, setBy: interaction.user.id, setAt: new Date().toISOString() }));
      return answer(interaction, GABRIEL, LINES.topicSet(topic));
    },
  },
};
