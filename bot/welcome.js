import { giveRole } from "./commands.js";
import { same } from "./server.js";
import { load, save } from "./store.js";
import { dm, LINES, ORION, post } from "./voices.js";

const has = (member, roleName) => member.roles.cache.some((r) => same(r.name, roleName));

// ---------- Founding Member: the first 50 people, numbered in the order they arrived ----------

/** Gives `userId` the next founding number while spots are left. Someone who leaves and comes back keeps theirs. */
export function claimFounding(list, userId, spots = 50) {
  const at = list.indexOf(userId);
  if (at >= 0) return { number: at + 1, list };
  if (list.length >= spots) return { number: null, list };
  return { number: list.length + 1, list: [...list, userId] };
}

/** Member IDs, oldest first, leaving out anyone `skip` says doesn't count. */
export function foundingOrder(members, skip) {
  return members
    .filter((m) => !skip(m))
    .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp)
    .map((m) => m.id);
}

/**
 * Run by /setup. Everyone already here arrived before Orion, so they take the first founding spots, oldest first.
 * Bots, the server owner and the Headmaster don't count. Returns how many people got the role.
 */
export async function backfillFounding(guild, runner) {
  const members = await guild.members.fetch();
  const skip = (m) => m.user.bot || m.id === guild.ownerId || m.id === runner?.id || has(m, "Headmaster");
  let list = load("founding.json", []);
  const spots = foundingOrder([...members.values()], skip).map((id) => {
    const spot = claimFounding(list, id);
    list = spot.list;
    return { member: members.get(id), number: spot.number };
  });
  // Saved before giving any roles, so someone joining at this moment can't take the same number.
  save("founding.json", list);
  const missing = spots.filter((s) => s.number && !has(s.member, "Founding Member"));
  for (const { member, number } of missing) await giveRole(member, "Founding Member", `founding member number ${number}`);
  return missing.length;
}

// ---------- New members: a founding spot, five questions by DM, and a hello in #welcome ----------

export async function onJoin(member) {
  if (member.user.bot) return;
  const spot = claimFounding(load("founding.json", []), member.id);
  if (spot.number) {
    save("founding.json", spot.list);
    await giveRole(member, "Founding Member", `founding member number ${spot.number}`).catch((err) => console.error(`Couldn't give ${member.displayName} Founding Member: ${err.message}`));
  }
  // The DM goes first so the greeting only mentions it if it got through. Some people block DMs from servers,
  // and someone coming back who already answered all five isn't asked again, so their answers stay.
  const answeredBefore = load("answers.json", {})[member.id]?.step >= LINES.questions.length;
  const asked = !answeredBefore && (await dm(member.user, ORION, `${LINES.dmIntro(member.displayName)}\n\n${LINES.questions[0]}`));
  if (asked) save("answers.json", { ...load("answers.json", {}), [member.id]: { name: member.displayName, step: 0, answers: [] } });
  await post(member.guild, "welcome", ORION, LINES.greet(`${member}`, spot.number, Boolean(asked)));
}

// ---------- The welcome questions, one DM at a time ----------

// Five answers this long, plus the questions, still fit in one 2,000-character Discord message to the Headmaster.
const LONGEST = 300;

/** Records one answer and says which question is next (null after the fifth). Returns null once all five are in. */
export function answerQuestion(state, text) {
  if (state.step >= LINES.questions.length) return null;
  const clean = text.replace(/\s+/g, " ").trim();
  const answer = same(clean, "skip") ? "(skipped)" : clean.length > LONGEST ? `${clean.slice(0, LONGEST - 1)}…` : clean;
  const step = state.step + 1;
  return { state: { ...state, step, answers: [...state.answers, answer] }, next: step < LINES.questions.length ? step : null };
}

/** A DM to Orion. Only someone partway through the questions gets a reply; a picture with no words waits for a real answer. */
export async function onDirectMessage(message, guild) {
  const all = load("answers.json", {});
  const state = all[message.author.id];
  const result = state && message.content.trim() && answerQuestion(state, message.content);
  if (!result) return;
  save("answers.json", { ...all, [message.author.id]: result.state });
  if (result.next !== null) return dm(message.author, ORION, LINES.questions[result.next]);
  await dm(message.author, ORION, LINES.dmThanks(state.name));
  // The answers go to the Headmaster, or to the server owner if /setup hasn't made one yet.
  const heads = (await guild.members.fetch()).filter((m) => !m.user.bot && has(m, "Headmaster"));
  const summary = LINES.summary(`${state.name} (${message.author})`, result.state.answers);
  for (const head of heads.size ? heads.values() : [await guild.fetchOwner()]) await dm(head.user, ORION, summary);
}
