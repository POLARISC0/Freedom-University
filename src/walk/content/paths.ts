import type { GrowthPath } from "./types";

export const PATHS: GrowthPath[] = [
  {
    slug: "prayer",
    title: "Prayer",
    icon: "🙏",
    mentorIds: ["jesus"],
    summary: "Talk with God as your Father: the Lord's Prayer, praying in secret, and persistence.",
    keyPassage: {
      ref: "Matthew 6:6",
      text: "But you, when you pray, enter into your inner room, and having shut your door, pray to your Father who is in secret, and your Father who sees in secret will reward you openly.",
    },
    lessonSlugs: ["teach-us-to-pray"],
    upcoming: [
      { title: "Praying in Secret", mentorId: "jesus", refs: ["Matthew 6:5-6", "Mark 1:35"] },
      { title: "Keep Knocking", mentorId: "jesus", refs: ["Luke 11:5-13", "Luke 18:1-8"] },
    ],
  },
  {
    slug: "faith",
    title: "Faith",
    icon: "⛵",
    mentorIds: ["peter"],
    summary: "Faith, courage, and getting back up after failure.",
    keyPassage: { ref: "Hebrews 11:1", text: "Now faith is assurance of things hoped for, proof of things not seen." },
    lessonSlugs: ["out-of-the-boat"],
    upcoming: [
      { title: "Put Out into the Deep", mentorId: "peter", refs: ["Luke 5:1-11"] },
      { title: "Who Do You Say I Am?", mentorId: "peter", refs: ["Matthew 16:13-19"] },
    ],
  },
  {
    slug: "generosity",
    title: "Tithing & Generosity",
    icon: "🪙",
    mentorIds: ["matthew"],
    summary: "Stewardship, tithing and cheerful giving, with your heart set on the right treasure.",
    keyPassage: {
      ref: "2 Corinthians 9:7",
      text: "Let each man give according as he has determined in his heart, not grudgingly or under compulsion, for God loves a cheerful giver.",
    },
    lessonSlugs: ["the-widows-two-coins"],
    upcoming: [
      { title: "Treasure in Heaven", mentorId: "matthew", refs: ["Matthew 6:19-34"] },
      { title: "Faithful in Little", mentorId: "matthew", refs: ["Luke 16:10-13", "Matthew 25:14-30"] },
    ],
  },
  {
    slug: "fasting",
    title: "Fasting",
    icon: "🏜️",
    mentorIds: ["jesus"],
    summary: "Jesus in the wilderness, and fasting with the right heart.",
    keyPassage: {
      ref: "Matthew 6:17-18",
      text: "But you, when you fast, anoint your head, and wash your face; so that you are not seen by men to be fasting, but by your Father who is in secret, and your Father, who sees in secret, will reward you.",
    },
    lessonSlugs: [],
    upcoming: [
      { title: "Forty Days in the Wilderness", mentorId: "jesus", refs: ["Matthew 4:1-11"] },
      { title: "Fasting with the Right Heart", mentorId: "jesus", refs: ["Matthew 6:16-18", "Isaiah 58:6-7"] },
    ],
  },
  {
    slug: "worship",
    title: "Worship",
    icon: "🎶",
    mentorIds: ["john"],
    summary: "Worship in spirit and truth, and remaining close to God.",
    keyPassage: {
      ref: "John 4:23-24",
      text: "But the hour comes, and now is, when the true worshipers will worship the Father in spirit and truth, for the Father seeks such to be his worshipers. God is spirit, and those who worship him must worship in spirit and truth.",
    },
    lessonSlugs: [],
    upcoming: [
      { title: "Spirit and Truth", mentorId: "john", refs: ["John 4:1-26"] },
      { title: "Remain in My Love", mentorId: "john", refs: ["John 15:1-17"] },
    ],
  },
  {
    slug: "forgiveness",
    title: "Forgiveness",
    icon: "🕊️",
    mentorIds: ["jesus", "simon-zealot"],
    summary: "Receiving God's forgiveness, and learning to forgive, even enemies.",
    keyPassage: {
      ref: "Matthew 18:21-22",
      text: "Then Peter came and said to him, \"Lord, how often shall my brother sin against me, and I forgive him? Until seven times?\" Jesus said to him, \"I don't tell you until seven times, but, until seventy times seven.\"",
    },
    lessonSlugs: [],
    upcoming: [
      { title: "Seventy Times Seven", mentorId: "jesus", refs: ["Matthew 18:21-35"] },
      { title: "Love Your Enemies", mentorId: "simon-zealot", refs: ["Matthew 5:43-48", "Romans 12:17-21"] },
    ],
  },
  {
    slug: "serving",
    title: "Serving Others",
    icon: "🧺",
    mentorIds: ["james-zebedee", "james-alphaeus"],
    summary: "True greatness is service, whether anyone notices or not.",
    keyPassage: {
      ref: "Mark 10:45",
      text: "For the Son of Man also came not to be served, but to serve, and to give his life as a ransom for many.",
    },
    lessonSlugs: [],
    upcoming: [
      { title: "The Towel and the Basin", mentorId: "james-zebedee", refs: ["John 13:1-17"] },
      { title: "Seen in Secret", mentorId: "james-alphaeus", refs: ["Matthew 6:1-4", "Colossians 3:23-24"] },
    ],
  },
  {
    slug: "fear",
    title: "Handling Fear",
    icon: "🌊",
    mentorIds: ["peter", "philip"],
    summary: "Finding peace in the storm and trusting God with tomorrow.",
    keyPassage: {
      ref: "Isaiah 41:10",
      text: "Don't you be afraid, for I am with you. Don't be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness.",
    },
    lessonSlugs: [],
    upcoming: [
      { title: "Peace in the Storm", mentorId: "peter", refs: ["Mark 4:35-41", "1 Peter 5:7"] },
      { title: "Don't Be Anxious", mentorId: "philip", refs: ["Matthew 6:25-34", "Philippians 4:6-7"] },
    ],
  },
  {
    slug: "word",
    title: "Reading the Word Daily",
    icon: "📜",
    mentorIds: ["thaddaeus"],
    summary: "Building a daily habit of reading Scripture, and living what it says.",
    keyPassage: { ref: "Psalm 119:105", text: "Your word is a lamp to my feet, and a light for my path." },
    lessonSlugs: [],
    upcoming: [
      { title: "Keep My Word", mentorId: "thaddaeus", refs: ["John 14:21-26", "James 1:22-25"] },
      { title: "Bread for Every Day", mentorId: "thaddaeus", refs: ["Matthew 4:4", "Psalm 1:1-3"] },
    ],
  },
  {
    slug: "sharing",
    title: "Sharing Your Faith",
    icon: "🤝",
    mentorIds: ["andrew", "philip"],
    summary: "Bringing others to Jesus naturally, with a simple \"Come and see.\"",
    keyPassage: {
      ref: "1 Peter 3:15",
      text: "But sanctify the Lord God in your hearts. Always be ready to give an answer to everyone who asks you a reason concerning the hope that is in you, with humility and fear",
    },
    lessonSlugs: [],
    upcoming: [
      { title: "Come and See", mentorId: "andrew", refs: ["John 1:35-46"] },
      { title: "Five Loaves and Two Fish", mentorId: "andrew", refs: ["John 6:1-14"] },
    ],
  },
  {
    slug: "questions",
    title: "Honest Questions",
    icon: "🔍",
    mentorIds: ["thomas", "bartholomew"],
    summary: "Bringing your doubts and questions to God, and finding faith through them.",
    keyPassage: {
      ref: "Mark 9:24",
      text: "Immediately the father of the child cried out with tears, \"I believe. Help my unbelief!\"",
    },
    lessonSlugs: [],
    upcoming: [
      { title: "My Lord and My God", mentorId: "thomas", refs: ["John 20:24-29"] },
      { title: "Can Any Good Thing Come out of Nazareth?", mentorId: "bartholomew", refs: ["John 1:45-51"] },
    ],
  },
];

export function getPath(slug: string): GrowthPath | undefined {
  return PATHS.find((p) => p.slug === slug);
}
