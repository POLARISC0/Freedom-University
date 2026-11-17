# Walk With Him: project DNA

## In one line

A browser game set in first-century Galilee that helps people grow in their relationship with God.

## Why it exists

Many people never had a father or a mentor to teach them how to live. Scripture can. Walk With Him lets them live alongside Jesus and the disciples in Capernaum, by the Sea of Galilee, and learn from them through stories, conversations, small quests, reflections and a real-life challenge each week.

It's a personal project, made for people of any age who never had someone to show them the way.

## What a player does

- **Makes a character** and arrives in Capernaum.
- **Explores a 3D town,** built from simple blocks:
  - a day and night cycle, and weather;
  - townspeople who keep daily routines from the Gospels;
  - walking with WASD or the arrow keys, or by tapping where to go;
  - pressing E, or tapping someone, to talk.
- **Grows five gentle needs:** Prayer, Word, Fellowship, Service and Rest. Friendships and growth badges grow too. There are never scores, streaks or leaderboards.
- **Takes lessons:**
  - *Teach Us to Pray* with Jesus;
  - *Out of the Boat* with Peter;
  - *The Widow's Two Coins* with Matthew.
- **Talks with Jesus, Peter and Matthew** through AI conversations powered by Claude.
- **Keeps a private Walk Journal,** reads a verse of the day and does a daily check-in.
- **Always has a "Need help now?" button** on screen, which opens a page of crisis help lines.

## Guardrails

These are the heart of the project. Every change keeps them.

- **Scripture first.**
  - Every quotation comes from the World English Bible, which is public domain.
  - `tests/walk-scripture.test.ts` checks each quotation word for word.
  - Adding a quotation means rebuilding the verse file the test uses (see `ARCHITECTURE.md`).
- **Faithful mentors** (`src/walk/ai/prompts.ts`):
  - Every teaching point gets a chapter and verse.
  - No new doctrine, prophecies, personal revelations, or promises God hasn't made.
  - Disputed questions are presented fairly, and the player is sent to a pastor.
  - The characters say plainly that they're AI portrayals, and Jesus speaks in His recorded words.
  - Players are pointed to their Bible, prayer and a local church.
- **Care in a crisis:**
  - When a player mentions suicide, self-harm, abuse, violence, grief or addiction, the game shows real help lines (988, Crisis Text Line, domestic violence hotlines and others), and the mentor answers with compassion first.
  - It never tells anyone to stay somewhere unsafe.
- **No money talk.**
  - The mentors give no financial advice.
  - Matthew never talks amounts, never asks for money, and never promises riches.

## Tone

- **Gentle:** the fruit of the Spirit (Galatians 5:22-23) sets the tone. Warm, plain English, never shaming and never pressuring.
- **Short:** mentor replies run 60 to 170 words.

## Look

- **Colours** (`.walk-theme` in `src/app/globals.css`, light and dark):

  | Role | Light | Dark |
  | --- | --- | --- |
  | Background | `#f3ead8` | `#11161a` |
  | Surface | `#fffaf0` | `#182026` |
  | Text | `#2a2118` | `#efe7d7` |
  | Quiet text | `#6b5d48` | `#a99c86` |
  | Lines | `#ddcca9` | `#2f3b43` |
  | Brand teal | `#275f6c` | `#79c0cc` |
  | Gold accent | `#b07a1e` | `#e2b25a` |

  The browser theme colour is `#275f6c`.
- **Fonts:** Geist for text, Geist Mono for small labels, and Fraunces for headings and Scripture (italic).
- **Logo:** "WalkMark", a sun over water with a winding path, drawn in code in `src/walk/components/WalkHeader.tsx`. The browser-tab icon is still Next.js's default.
- **No image files:** the world and every character are drawn from code, and the portraits are 2D art made in code.

## Where this came from

Walk With Him was first built in October 2026 as a feature inside another web app's repository. In November 2026 it was exported to the branch `export/walk-with-him` and made to run on its own, with its own sign-in, database and AI connection.
