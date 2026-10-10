import type { Lesson } from "./types";

// The three lessons of the first milestone. Every quotation is from the World English Bible, checked word for word.
// Lines spoken by Jesus are His recorded words only; interpretation is given to the narrator or to a disciple.

const teachUsToPray: Lesson = {
  slug: "teach-us-to-pray",
  pathSlug: "prayer",
  mentorId: "jesus",
  title: "Teach Us to Pray",
  summary:
    "Follow Jesus to a quiet place on the hillside and learn the prayer He taught His disciples: praying in secret, praying simply, and not giving up.",
  minutes: 15,
  goals: [
    "Prayer is talking with a Father who already sees and listens, not a performance for people (Matthew 6:5-8).",
    "The Lord's Prayer puts God first (His name, kingdom and will) and then brings our needs: daily bread, forgiveness and protection (Matthew 6:9-13).",
    "Jesus Himself withdrew to quiet places to pray (Luke 5:16; Mark 1:35), and taught His followers to have a secret place too (Matthew 6:6).",
    "Keep asking, seeking and knocking: always pray and don't give up (Luke 11:5-10; Luke 18:1-8).",
  ],
  keyRefs: ["Matthew 6:5-13", "Luke 11:1-10", "Luke 18:1-8", "Mark 1:35"],
  steps: [
    {
      kind: "dialogue",
      lines: [
        {
          speaker: "narrator",
          text: "The crowds who came to hear Jesus by the shore are drifting home. He looks up toward the quiet hills above Capernaum. The Gospels say He often slipped away to deserted places to pray.",
          refs: ["Luke 5:16", "Mark 1:35"],
        },
        { speaker: "jesus", text: "\"You come apart into a deserted place, and rest awhile.\"", refs: ["Mark 6:31"] },
      ],
    },
    {
      kind: "quest",
      objective: "Follow Jesus up to the quiet place on the hillside.",
      target: "prayer-rock",
      mentorWalks: true,
      lines: [
        {
          speaker: "narrator",
          text: "Jesus sets off up the path toward the hillside. Follow Him to the quiet place above the town. Look for the glowing marker.",
        },
      ],
    },
    {
      kind: "scene",
      title: "A quiet place",
      setting: "The hillside above Capernaum",
      narration: [
        "Below you the lake turns silver and the first lamps are lit in the town. Jesus kneels by a flat rock and prays. You wait, and the noise of the day slowly drains out of you.",
        "When He finishes, you remember the question one of His disciples once asked in a moment just like this.",
      ],
      passages: [
        {
          ref: "Luke 11:1",
          text: "When he finished praying in a certain place, one of his disciples said to him, \"Lord, teach us to pray, just as John also taught his disciples.\"",
        },
      ],
    },
    {
      kind: "dialogue",
      lines: [
        {
          speaker: "jesus",
          text: "\"But you, when you pray, enter into your inner room, and having shut your door, pray to your Father who is in secret, and your Father who sees in secret will reward you openly.\"",
          refs: ["Matthew 6:6"],
        },
        {
          speaker: "narrator",
          text: "Just before this, He warned against praying to be seen by others. Prayer is not a performance. It is a child talking with a Father who is already listening.",
          refs: ["Matthew 6:5"],
        },
        {
          speaker: "jesus",
          text: "\"In praying, don't use vain repetitions, as the Gentiles do; for they think that they will be heard for their much speaking. Therefore don't be like them, for your Father knows what things you need, before you ask him.\"",
          refs: ["Matthew 6:7-8"],
        },
        {
          speaker: "jesus",
          text: "\"Pray like this: 'Our Father in heaven, may your name be kept holy. Let your Kingdom come. Let your will be done on earth as it is in heaven. Give us today our daily bread. Forgive us our debts, as we also forgive our debtors. Bring us not into temptation, but deliver us from the evil one.'\"",
          refs: ["Matthew 6:9-13"],
        },
        {
          speaker: "narrator",
          text: "Notice the shape of it. The prayer begins with God: His name, His kingdom, His will. Only then does it turn to our needs: bread for today, forgiveness, and protection.",
        },
        {
          speaker: "jesus",
          text: "\"I tell you, keep asking, and it will be given you. Keep seeking, and you will find. Keep knocking, and it will be opened to you.\"",
          refs: ["Luke 11:9"],
        },
        {
          speaker: "narrator",
          text: "He also told a parable about a widow who kept coming to an unjust judge until he gave her justice. Luke says He told it so that they \"must always pray, and not give up.\"",
          refs: ["Luke 18:1-8"],
        },
      ],
    },
    {
      kind: "choice",
      prompt: "Which line of the prayer do you want to sit with for a moment?",
      options: [
        {
          id: "father",
          label: "\"Our Father in heaven\"",
          response: [
            {
              speaker: "narrator",
              text: "Jesus taught you to call God \"Father\". If your own father was absent, distant or harsh, this may be the hardest word in the prayer, and the most healing. Scripture calls God \"a father of the fatherless\", and says His Spirit teaches us to cry, \"Abba! Father!\"",
              refs: ["Psalm 68:5", "Romans 8:15"],
            },
          ],
        },
        {
          id: "will",
          label: "\"Let your will be done\"",
          response: [
            {
              speaker: "narrator",
              text: "On His last night, in a garden, Jesus prayed this line Himself: \"Father, if you are willing, remove this cup from me. Nevertheless, not my will, but yours, be done.\" It is a prayer you can pray with tears, too.",
              refs: ["Luke 22:42"],
            },
          ],
        },
        {
          id: "bread",
          label: "\"Give us today our daily bread\"",
          response: [
            {
              speaker: "narrator",
              text: "Daily bread is today's bread. A few sentences later Jesus says, \"don't be anxious for tomorrow, for tomorrow will be anxious for itself.\" You are invited to trust God one day at a time.",
              refs: ["Matthew 6:11", "Matthew 6:34"],
            },
          ],
        },
        {
          id: "forgive",
          label: "\"Forgive us our debts\"",
          response: [
            {
              speaker: "narrator",
              text: "This is the one line Jesus comes back to right after the prayer: \"For if you forgive men their trespasses, your heavenly Father will also forgive you.\" Receiving mercy and giving it are bound together.",
              refs: ["Matthew 6:14-15"],
            },
          ],
        },
      ],
    },
    {
      kind: "conversation",
      intro:
        "Jesus sits beside you on the rock. Ask Him about prayer: what you find hard, what a line of the prayer means, or why to keep praying.",
      suggestions: [
        "What if I don't know what to say when I pray?",
        "Why pray if God already knows what I need?",
        "How do I keep praying when nothing changes?",
        "What does \"your will be done\" really mean?",
      ],
    },
    {
      kind: "reflection",
      question:
        "Which line of the Lord's Prayer is hardest for you to pray honestly right now? Why do you think that is?",
      guidance: "There are no wrong answers. You can write it as a prayer if you like.",
    },
    {
      kind: "challenge",
      title: "Ten quiet minutes",
      description:
        "Every day this week, find your own \"inner room\" for ten minutes. Pray the Lord's Prayer slowly, one line at a time, pausing after each line to say it again in your own words.",
      steps: [
        "Choose a time and a place before the day gets busy.",
        "Silence your phone and shut the door, as Jesus said (Matthew 6:6).",
        "Pray one line, pause, then put it in your own words.",
        "On the days it feels dry, pray anyway. Always pray, and don't give up (Luke 18:1).",
      ],
      refs: ["Matthew 6:6", "Matthew 6:9-13", "Luke 18:1"],
    },
  ],
  blessing: {
    ref: "Numbers 6:24-26",
    text: "Yahweh bless you, and keep you. Yahweh make his face to shine on you, and be gracious to you. Yahweh lift up his face toward you, and give you peace.",
  },
};

const outOfTheBoat: Lesson = {
  slug: "out-of-the-boat",
  pathSlug: "faith",
  mentorId: "peter",
  title: "Out of the Boat",
  summary:
    "Peter tells you about the night he walked on water and sank, and the morning by a charcoal fire when Jesus restored him after his worst failure.",
  minutes: 20,
  goals: [
    "Faith is not the absence of fear; it is where you look and who you call on when you are afraid (Matthew 14:28-31).",
    "Jesus catches those who cry out to Him, immediately (Matthew 14:31).",
    "Failure is not the end: Jesus prayed for Peter before he fell and restored him afterwards (Luke 22:31-32; John 21:15-17).",
    "Restoration comes with renewed purpose: \"Feed my sheep\" (John 21:17). A righteous person falls and rises again (Proverbs 24:16).",
  ],
  keyRefs: ["Matthew 14:22-33", "Luke 22:31-34", "Luke 22:54-62", "John 21:1-19"],
  steps: [
    {
      kind: "dialogue",
      lines: [
        {
          speaker: "peter",
          text: "You want to know about faith? Then let me tell you about the worst night and the best night of my life. They both happened on this lake.",
        },
        {
          speaker: "peter",
          text: "Walk out to the end of the jetty with me. I think better with water under my feet. Ha!",
        },
      ],
    },
    {
      kind: "quest",
      objective: "Meet Peter at the end of the jetty.",
      target: "jetty-end",
      mentorWalks: true,
      lines: [{ speaker: "peter", text: "Go on ahead. I'll be right behind you." }],
    },
    {
      kind: "scene",
      title: "The fourth watch of the night",
      setting: "The Sea of Galilee, as Peter remembers it",
      narration: [
        "Peter stares out over the water, and for a moment it is that night again: the wind against the boat, the waves slapping the hull, hours of rowing in the dark.",
      ],
      passages: [
        {
          ref: "Matthew 14:24-27",
          text: "But the boat was now in the middle of the sea, distressed by the waves, for the wind was contrary. In the fourth watch of the night, Jesus came to them, walking on the sea. When the disciples saw him walking on the sea, they were troubled, saying, \"It's a ghost!\" and they cried out for fear. But immediately Jesus spoke to them, saying, \"Cheer up! It is I! Don't be afraid.\"",
        },
        {
          ref: "Matthew 14:28-31",
          text: "Peter answered him and said, \"Lord, if it is you, command me to come to you on the waters.\" He said, \"Come!\" Peter stepped down from the boat, and walked on the waters to come to Jesus. But when he saw that the wind was strong, he was afraid, and beginning to sink, he cried out, saying, \"Lord, save me!\" Immediately Jesus stretched out his hand, took hold of him, and said to him, \"You of little faith, why did you doubt?\"",
        },
      ],
    },
    {
      kind: "dialogue",
      lines: [
        {
          speaker: "peter",
          text: "Here's what I want you to see. When I looked at Him, I walked. When I saw the wind, I sank. The wind hadn't changed. What I was looking at had.",
          refs: ["Matthew 14:29-30"],
        },
        {
          speaker: "peter",
          text: "And when I sank, I didn't have a long, beautiful prayer. Three words: \"Lord, save me!\" Immediately He stretched out His hand and took hold of me.",
          refs: ["Matthew 14:30-31"],
        },
        {
          speaker: "peter",
          text: "So faith isn't never being afraid. Faith is who you look at, and who you call out to, when you are.",
        },
        {
          speaker: "narrator",
          text: "Peter is quiet for a long moment. Then he says there is another story, one that is harder to tell.",
        },
      ],
    },
    {
      kind: "quest",
      objective: "Walk with Peter to the fire on the beach.",
      target: "charcoal-fire",
      mentorWalks: true,
      lines: [{ speaker: "peter", text: "Come on. There's a fire down on the beach. I want to tell you this part there." }],
    },
    {
      kind: "scene",
      title: "A fire of coals",
      setting: "The shore below Capernaum, at dawn",
      narration: [
        "Peter holds his hands out to the fire, the way he once did in a courtyard in Jerusalem on the worst night of his life.",
        "That night, warming himself beside a fire of coals, he denied three times that he even knew Jesus.",
      ],
      passages: [
        {
          ref: "John 18:18",
          text: "Now the servants and the officers were standing there, having made a fire of coals, for it was cold. They were warming themselves. Peter was with them, standing and warming himself.",
        },
        {
          ref: "Luke 22:60-62",
          text: "But Peter said, \"Man, I don't know what you are talking about!\" Immediately, while he was still speaking, a rooster crowed. The Lord turned and looked at Peter. Then Peter remembered the Lord's word, how he said to him, \"Before the rooster crows you will deny me three times.\" He went out, and wept bitterly.",
        },
      ],
    },
    {
      kind: "dialogue",
      lines: [
        {
          speaker: "peter",
          text: "Hours before, I'd told Him, \"Lord, I am ready to go with you both to prison and to death!\" Then I swore I didn't know Him. And He turned and looked at me.",
          refs: ["Luke 22:33", "Luke 22:61"],
        },
        {
          speaker: "peter",
          text: "But He'd already told me something I didn't understand until later: \"I prayed for you, that your faith wouldn't fail. You, when once you have turned again, establish your brothers.\" He knew I'd fall. He'd already planned my getting back up.",
          refs: ["Luke 22:32"],
        },
        {
          speaker: "narrator",
          text: "On the morning of the resurrection, the women at the tomb were given a message: \"go, tell his disciples and Peter.\" And Peter.",
          refs: ["Mark 16:7"],
        },
        {
          speaker: "peter",
          text: "Then one morning, right here on this shore, there was another fire of coals, with fish and bread on it. He asked me three times, \"Do you love me?\" One question for every denial. And every time, He gave me work to do: feed my lambs, tend my sheep, feed my sheep.",
          refs: ["John 21:9", "John 21:15-17"],
        },
        {
          speaker: "peter",
          text: "He didn't restore me by pretending I hadn't failed. He restored me with love, and by trusting me again.",
        },
        {
          speaker: "peter",
          text: "The proverb says \"a righteous man falls seven times and rises up again.\" Falling isn't the end of your story. Staying down doesn't have to be either.",
          refs: ["Proverbs 24:16"],
        },
      ],
    },
    {
      kind: "conversation",
      intro: "Peter sits on an upturned basket by the fire. Ask him about faith, fear, or getting back up after failure.",
      suggestions: [
        "How do I keep my eyes on Jesus when life is stormy?",
        "I've failed God badly. Can I really be restored?",
        "Did you ever doubt He would forgive you?",
        "What could a step of faith look like for me?",
      ],
    },
    {
      kind: "reflection",
      question:
        "Where in your life are you looking at the wind instead of at Jesus right now? Or is there a failure you've never let Him restore? Write what you would say to Him about it.",
      guidance: "Be honest; Peter was. You can write it as a prayer.",
    },
    {
      kind: "challenge",
      title: "One step out of the boat",
      description:
        "This week, take one step of faith you've been putting off because of fear: an apology, a hard conversation, serving somewhere new, or telling someone the truth. Before you step, pray Peter's prayer: \"Lord, save me!\"",
      steps: [
        "Name the step and write it in your Walk Journal.",
        "Ask a friend or someone at your church to pray for you.",
        "Take the step looking to Jesus, not at the wind (Hebrews 12:2).",
        "If it goes badly, remember: falling is not the end (Proverbs 24:16).",
      ],
      refs: ["Matthew 14:28-31", "Hebrews 12:1-2", "Proverbs 24:16"],
    },
  ],
  blessing: {
    ref: "1 Peter 5:10",
    text: "But may the God of all grace, who called you to his eternal glory by Christ Jesus, after you have suffered a little while, perfect, establish, strengthen, and settle you.",
  },
};

const theWidowsTwoCoins: Lesson = {
  slug: "the-widows-two-coins",
  pathSlug: "generosity",
  mentorId: "matthew",
  title: "The Widow's Two Coins",
  summary:
    "Matthew hands you two small coins and sends you into the market. Then he tells you about a widow Jesus noticed at the Temple, and what tithing and cheerful giving are really about.",
  minutes: 15,
  goals: [
    "God looks at the heart behind a gift, not its size: the widow gave more than all the rich (Mark 12:41-44).",
    "Money competes for our hearts: \"You can't serve both God and Mammon\" and \"where your treasure is, there your heart will be also\" (Matthew 6:19-24).",
    "The tithe in the Law provided for priests, foreigners, orphans and widows (Deuteronomy 14:28-29; Malachi 3:10). Jesus affirmed it but put justice, mercy and faith first (Matthew 23:23). Christians differ on whether the tenth binds believers today.",
    "Give cheerfully, as you have decided in your heart, not under pressure (2 Corinthians 9:7), and quietly (Matthew 6:3-4), according to what you have (2 Corinthians 8:12).",
  ],
  keyRefs: ["Mark 12:41-44", "Matthew 6:19-24", "Malachi 3:10", "Matthew 23:23", "2 Corinthians 9:6-8"],
  steps: [
    {
      kind: "dialogue",
      lines: [
        {
          speaker: "matthew",
          text: "This booth was my whole world. Every boat that landed, every cart on the road, I counted it and took Rome's share. Tax collectors were known for taking more than they should. John the Baptist had to tell us, \"Collect no more than that which is appointed to you.\"",
          refs: ["Luke 3:12-13"],
        },
        {
          speaker: "matthew",
          text: "Respectable people counted us with the sinners. Then the Master walked past and said, \"Follow me.\" I got up and left it all, and that night He ate at my table.",
          refs: ["Matthew 9:9-11", "Luke 5:27-29"],
        },
        {
          speaker: "matthew",
          text: "Money makes a good servant and a terrible master. He put it more simply: \"You can't serve both God and Mammon.\"",
          refs: ["Matthew 6:24"],
        },
      ],
    },
    {
      kind: "quest",
      objective: "Take the two coins into the market. Look for someone in need near the well.",
      target: "well",
      lines: [
        {
          speaker: "narrator",
          text: "Matthew presses two small brass coins into your palm. They are almost weightless.",
        },
        {
          speaker: "matthew",
          text: "Take a walk through the market and keep your eyes open. You'll know what to do. Or you won't, and that's worth learning too.",
        },
      ],
    },
    {
      kind: "choice",
      prompt:
        "By the well, an old widow is drawing water. Her basket is empty. She doesn't ask you for anything.",
      options: [
        {
          id: "give",
          label: "Give her the two coins",
          response: [
            { speaker: "widow", text: "For me? ...Thank you, child. May God bless you." },
            {
              speaker: "narrator",
              text: "She closes her hand around the coins. Your own hand feels lighter, and somehow so does your heart. Matthew catches up with you by the well, smiling.",
            },
          ],
        },
        {
          id: "keep",
          label: "Keep the coins for now",
          response: [
            {
              speaker: "narrator",
              text: "You walk on. That's all right: this was your choice, and nobody is keeping score. Still, you find yourself thinking about her. Matthew catches up with you by the well.",
            },
          ],
        },
      ],
    },
    {
      kind: "scene",
      title: "Two small coins",
      setting: "The Temple treasury in Jerusalem, as Matthew remembers it",
      narration: [
        "Matthew sits on the edge of the well and turns a coin over in his fingers.",
        "He wants to tell you about another widow, one he saw with Jesus in the Temple courts in Jerusalem, where people brought their offerings to the treasury.",
      ],
      passages: [
        {
          ref: "Mark 12:41-44",
          text: "Jesus sat down opposite the treasury, and saw how the multitude cast money into the treasury. Many who were rich cast in much. A poor widow came, and she cast in two small brass coins, which equal a quadrans coin. He called his disciples to himself, and said to them, \"Most certainly I tell you, this poor widow gave more than all those who are giving into the treasury, for they all gave out of their abundance, but she, out of her poverty, gave all that she had to live on.\"",
        },
      ],
    },
    {
      kind: "dialogue",
      lines: [
        {
          speaker: "matthew",
          text: "Do you see what He did? He didn't count the coins. He counted what was left. They gave out of their abundance; she gave out of her poverty.",
          refs: ["Mark 12:43-44"],
        },
        {
          speaker: "matthew",
          text: "God isn't after your money. He's after your heart, and money is often where the heart hides. \"For where your treasure is, there your heart will be also.\"",
          refs: ["Matthew 6:21"],
        },
        {
          speaker: "matthew",
          text: "Under the Law, God's people brought a tenth, a tithe. It fed the Levites, the foreigner, the fatherless and the widow. Through the prophet Malachi, God even said, \"Bring the whole tithe into the storehouse... and test me now in this.\"",
          refs: ["Deuteronomy 14:28-29", "Malachi 3:10"],
        },
        {
          speaker: "matthew",
          text: "Christians today hold different views on whether the tenth is a rule for us or a good starting place. Your pastor can help you think it through. But the Master was clear about what matters most: tithing without \"justice, mercy, and faith\" misses the point.",
          refs: ["Matthew 23:23"],
        },
        {
          speaker: "matthew",
          text: "Paul put it best: \"Let each man give according as he has determined in his heart, not grudgingly or under compulsion, for God loves a cheerful giver.\" Cheerful. Not guilty, not pressured. Cheerful.",
          refs: ["2 Corinthians 9:7"],
        },
        {
          speaker: "matthew",
          text: "And give quietly: \"don't let your left hand know what your right hand does.\" No trumpets. I spent years being noticed for money. I much prefer this.",
          refs: ["Matthew 6:3-4"],
        },
      ],
    },
    {
      kind: "conversation",
      intro:
        "Matthew pulls a small ledger from his belt out of habit, then tucks it away again with a smile. Ask him about money, stewardship or giving.",
      suggestions: [
        "Do Christians have to tithe ten percent?",
        "How can I give when I'm barely getting by?",
        "How do I stop worrying about money?",
        "Is it wrong to want to be wealthy?",
      ],
    },
    {
      kind: "reflection",
      question:
        "\"Where your treasure is, there your heart will be also.\" If someone read last month's bank statement, what would they say you treasure? Where might God be inviting you to loosen your grip?",
      guidance: "This is between you and God. Be honest and gentle with yourself.",
    },
    {
      kind: "challenge",
      title: "A cheerful, secret gift",
      description:
        "This week, give something cheerfully and in secret to someone in need: money, a meal, groceries or your time. Then sit down with your budget and prayerfully decide what you want your regular giving to be.",
      steps: [
        "Ask God to show you one person or need this week.",
        "Give quietly, without telling anyone (Matthew 6:3-4).",
        "Look over last month's spending and notice where your treasure goes (Matthew 6:21).",
        "Decide in your heart what you will give regularly, cheerfully and without pressure. If money is tight, start small; God looks at the heart (2 Corinthians 8:12; 9:7).",
      ],
      refs: ["Matthew 6:3-4", "Matthew 6:21", "2 Corinthians 9:7", "2 Corinthians 8:12"],
    },
  ],
  blessing: {
    ref: "2 Corinthians 9:8",
    text: "And God is able to make all grace abound to you, that you, always having all sufficiency in everything, may abound to every good work.",
  },
};

export const LESSONS: Lesson[] = [teachUsToPray, outOfTheBoat, theWidowsTwoCoins];

export function getLesson(slug: string): Lesson | undefined {
  return LESSONS.find((l) => l.slug === slug);
}
