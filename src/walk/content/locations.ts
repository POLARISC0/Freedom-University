import type { WorldLocation } from "./types";

export const LOCATIONS: WorldLocation[] = [
  {
    id: "sea-of-galilee",
    name: "Sea of Galilee & Capernaum",
    region: "Galilee",
    summary:
      "The lakeside town Jesus made His home: fishing boats on the shore, the market and well, the tax booth by the road, and quiet hills above.",
    refs: ["Matthew 4:13-22", "Mark 2:13-14", "John 21:1-14"],
    available: true,
  },
  {
    id: "mount-of-beatitudes",
    name: "Mount of the Beatitudes",
    region: "Galilee",
    summary: "The hillside where Jesus sat down and taught the Sermon on the Mount. (The exact site is traditional.)",
    refs: ["Matthew 5-7"],
    available: false,
  },
  {
    id: "nazareth",
    name: "Nazareth",
    region: "Galilee",
    summary: "The small hill town where Jesus grew up, and where He read from Isaiah in the synagogue.",
    refs: ["Luke 2:39-52", "Luke 4:16-30"],
    available: false,
  },
  {
    id: "jerusalem",
    name: "Jerusalem & the Temple",
    region: "Judea",
    summary: "The holy city: the Temple courts, the treasury where the widow gave her two coins, and the upper room.",
    refs: ["Mark 11:15-17", "Mark 12:41-44", "Luke 22:7-20"],
    available: false,
  },
  {
    id: "gethsemane",
    name: "Garden of Gethsemane",
    region: "Judea",
    summary: "An olive grove on the Mount of Olives where Jesus prayed, \"not my will, but yours, be done.\"",
    refs: ["Matthew 26:36-46", "Luke 22:39-46"],
    available: false,
  },
  {
    id: "wilderness",
    name: "The Wilderness",
    region: "Wilderness",
    summary: "The Judean desert where Jesus fasted forty days and answered every temptation with Scripture.",
    refs: ["Matthew 4:1-11", "Luke 4:1-13"],
    available: false,
  },
];
