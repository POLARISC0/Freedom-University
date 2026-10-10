import type { Passage } from "./types";

export const MOOD_VERSES = {
  joyful: { ref: "Psalm 118:24", text: "This is the day that Yahweh has made. We will rejoice and be glad in it!" },
  peaceful: { ref: "John 14:27", text: "Peace I leave with you. My peace I give to you; not as the world gives, I give to you." },
  grateful: { ref: "1 Thessalonians 5:18", text: "In everything give thanks, for this is the will of God in Christ Jesus toward you." },
  weary: { ref: "Matthew 11:28", text: "Come to me, all you who labor and are heavily burdened, and I will give you rest." },
  anxious: { ref: "1 Peter 5:7", text: "casting all your worries on him, because he cares for you." },
  struggling: { ref: "Psalm 34:18", text: "Yahweh is near to those who have a broken heart, and saves those who have a crushed spirit." },
} satisfies Record<string, Passage>;
