export const WORLDS = [
  {
    id: 'daily',
    index: '01',
    name: 'Daily Life',
    cn: '日常对话',
    tagline: 'Small talk, real life.',
    cnTagline: '从一杯咖啡开始，把英语用进生活。',
    description:
      'Cafés, streets, airports, dinner tables. The ordinary moments where real English happens.',
    art: 'daily',
    tone: 'coral'
  },
  {
    id: 'campus',
    index: '02',
    name: 'Campus',
    cn: '校园学习',
    tagline: 'Find your voice in class.',
    cnTagline: '课堂、社团、办公室，练习表达观点。',
    description:
      'First days, seminars, group projects and office hours. Speak up without overthinking.',
    art: 'campus',
    tone: 'forest'
  },
  {
    id: 'play',
    index: '03',
    name: 'Play & Culture',
    cn: '娱乐交流',
    tagline: 'Talk about what you love.',
    cnTagline: '电影、游戏、旅行、音乐，用兴趣带动表达。',
    description:
      'Movies, games, travel and music. Low-pressure conversations with high-energy opinions.',
    art: 'play',
    tone: 'indigo'
  },
  {
    id: 'custom',
    index: '04',
    name: 'Your Own Scene',
    cn: '自定义场景',
    tagline: 'Any topic. Any world.',
    cnTagline: '面试、谈判、辩论，或者只属于你的场景。',
    description:
      'Invent the room, the person and the stakes. Your conversation, your rules.',
    art: 'custom',
    tone: 'ink'
  }
];

export const DIFFICULTIES = [
  {
    id: 'starter',
    label: 'Starter',
    cn: '入门 A1–A2',
    desc: 'Short sentences, everyday words, plenty of patience.',
    prompt:
      'Use simple A2 English: short sentences, high-frequency words, and concrete questions. Speak a little slower. Avoid idioms unless the context makes them obvious.'
  },
  {
    id: 'confident',
    label: 'Confident',
    cn: '进阶 B1–B2',
    desc: 'Natural pace, common idioms, room to make mistakes.',
    prompt:
      'Use natural B1–B2 English. Contractions and common idioms are welcome. Keep sentences conversational rather than textbook-perfect.'
  },
  {
    id: 'fluent',
    label: 'Fluent',
    cn: '流利 C1',
    desc: 'Idiomatic, quicker, with richer vocabulary.',
    prompt:
      'Use fluent C1 English with natural rhythm, idioms, phrasal verbs and some cultural references. Do not simplify unless the learner explicitly asks.'
  },
  {
    id: 'expert',
    label: 'Expert',
    cn: '高阶 C2 / 职场',
    desc: 'Nuance, debate, professional vocabulary.',
    prompt:
      'Use sophisticated C2 English appropriate to a professional or academic setting. Challenge ideas, use nuance and precise vocabulary, and expect the learner to defend a position.'
  }
];

export const SUBTITLE_MODES = [
  {
    id: 'none',
    label: 'No subtitles',
    cn: '无字幕',
    desc: 'Pure listening. Text stays hidden until you turn it back on.',
    icon: 'headphones'
  },
  {
    id: 'en',
    label: 'English',
    cn: '英文字幕',
    desc: 'See every English line while you listen.',
    icon: 'cc'
  },
  {
    id: 'bilingual',
    label: 'English + 中文',
    cn: '双语字幕',
    desc: 'A quiet Chinese translation under each line.',
    icon: 'globe'
  }
];

export const ACCENTS = [
  { id: 'us', label: 'American', cn: '美式', lang: 'en-US', voiceHints: ['Aria', 'Jenny', 'Samantha', 'Google US English', 'Alex', 'Guy'] },
  { id: 'uk', label: 'British', cn: '英式', lang: 'en-GB', voiceHints: ['Sonia', 'Libby', 'Daniel', 'Serena', 'Google UK English Female', 'Ryan'] },
  { id: 'au', label: 'Australian', cn: '澳式', lang: 'en-AU', voiceHints: ['Natasha', 'Karen', 'William', 'Google Australian English', 'Catherine'] }
];

export const PACES = [
  { id: 'relaxed', label: 'Relaxed', cn: '慢速', rate: 0.86 },
  { id: 'natural', label: 'Natural', cn: '自然', rate: 1 },
  { id: 'brisk', label: 'Brisk', cn: '稍快', rate: 1.12 }
];

export const DURATIONS = [
  { value: 5, label: '5 min', cn: '快速热身' },
  { value: 10, label: '10 min', cn: '刚好进入状态' },
  { value: 15, label: '15 min', cn: '一次完整对话' },
  { value: 0, label: 'Open', cn: '不限时' }
];

export const DEFAULT_CONFIG = {
  subtitle: 'en',
  difficulty: 'confident',
  accent: 'us',
  pace: 'natural',
  coach: 'gentle',
  duration: 10
};

export const SCENES = [
  {
    id: 'cafe',
    world: 'daily',
    title: 'Corner Café',
    cn: '街角咖啡店',
    blurb: 'Order a coffee, ask for a recommendation, and survive the small talk.',
    setting:
      'A busy neighbourhood café in Brooklyn, New York. It is 9am and the morning rush has finally slowed down.',
    aiName: 'Mia',
    aiRole: "the café's barista and co-owner",
    personality: 'warm, quick and a little witty; a real New Yorker who slows down for you',
    userRole: 'a first-time customer',
    level: 'starter',
    tags: ['ordering', 'small talk'],
    goals: ['Order a drink and customise it', 'Ask for a food recommendation', 'Keep one minute of small talk going'],
    phrases: [
      { en: 'Could I get a flat white with oat milk?', zh: '我想要一杯燕麦奶平白咖啡。' },
      { en: 'What would you recommend?', zh: '你推荐什么？' },
      { en: "I'll take that to go, please.", zh: '我要打包带走。' }
    ],
    opening: 'Morning! Welcome in. What can I get started for you today?',
    openingZh: '早上好！欢迎光临。今天想喝点什么？',
    demo: [
      { en: 'Good choice. Oat milk makes it a little creamier. Are you grabbing it to go, or staying for a bit?', zh: '好选择。燕麦奶会更顺滑一点。你是带走还是坐一会儿？' },
      { en: "If you're hungry, the almond croissant just came out of the oven. It's honestly dangerous.", zh: '如果你饿了，杏仁可颂刚出炉。说实话，好吃到危险。' },
      { en: "Nice. I'm Mia, by the way. I run this place with my sister. First time in the neighbourhood?", zh: '对了，我是 Mia。我和我姐姐一起经营这里。第一次来这个街区吗？' },
      { en: "See, that's the correct answer. The coffee's good, but the pastries are the real reason people come back.", zh: '看吧，这才是正确答案。咖啡不错，但大家回头客的真正原因是点心。' }
    ]
  },
  {
    id: 'directions',
    world: 'daily',
    title: 'Getting Around',
    cn: '城市问路',
    blurb: 'Ask a stranger for directions and understand the answer the first time.',
    setting:
      'A rainy afternoon outside a Tube station in London. You are trying to find a small record shop in a side street.',
    aiName: 'Sam',
    aiRole: 'a friendly local on his lunch break',
    personality: 'dry British humour, genuinely helpful, walks fast but stops for you',
    userRole: 'a slightly lost visitor',
    level: 'confident',
    tags: ['directions', 'listening'],
    goals: ['Ask for directions politely', 'Repeat the route back to confirm', 'React naturally to an unexpected detail'],
    phrases: [
      { en: 'Excuse me, could you point me toward the record shop?', zh: '打扰一下，你能告诉我去唱片店怎么走吗？' },
      { en: 'Is it within walking distance?', zh: '走路能到吗？' },
      { en: 'So I take the second left, right?', zh: '所以我第二个路口左转，对吗？' }
    ],
    opening: "You look like you're deciding whether to trust your phone or a stranger. Need a hand?",
    openingZh: '你看起来正在纠结该信手机还是信陌生人。需要帮忙吗？',
    demo: [
      { en: 'Right. The record shop is two streets over, but the quickest way is through the market. Follow me as far as the corner.', zh: '好。唱片店在两条街外，但最快的路是穿过市场。跟我走到路口吧。' },
      { en: "Fair warning: the sign is tiny and the door looks like a fire exit. Half the neighbourhood has walked past it.", zh: '提前提醒你：招牌很小，门看起来像消防出口。半个街区的人都走过头过。' },
      { en: "If you get to the old cinema, you've gone too far. Come back and look for the blue awning.", zh: '如果你走到老电影院，就是走过头了。回来找蓝色遮阳棚。' },
      { en: "You've got it. And if the shop is closed, there's a decent coffee place next door. Tell them Sam sent you.", zh: '你记住了。如果店关门了，隔壁有家不错的咖啡店。就说是 Sam 让你来的。' }
    ]
  },
  {
    id: 'airport',
    world: 'daily',
    title: 'Airport Check-in',
    cn: '机场值机',
    blurb: 'Check a bag, choose a seat and handle a small travel hiccup.',
    setting:
      'Terminal 4 at JFK, 7:40pm. Your flight to San Francisco boards in an hour and the queue is finally moving.',
    aiName: 'Jordan',
    aiRole: 'an airline check-in agent',
    personality: 'calm, efficient and kind; completely used to nervous travellers',
    userRole: 'a traveller with one checked bag',
    level: 'confident',
    tags: ['travel', 'service'],
    goals: ['Check in and choose a seat', 'Ask about your baggage allowance', 'Solve one small travel problem'],
    phrases: [
      { en: "I'd like a window seat if possible.", zh: '如果可以的话，我想要靠窗座位。' },
      { en: 'Is this bag within the limit?', zh: '这个包在限额内吗？' },
      { en: 'What time does boarding start?', zh: '几点开始登机？' }
    ],
    opening: "Good evening. Passport and booking reference, whenever you're ready.",
    openingZh: '晚上好。方便的时候把护照和订票号给我。',
    demo: [
      { en: 'Thank you. One bag to check? Place it on the scale for me. And would you prefer a window or an aisle?', zh: '谢谢。一件托运行李？请放上称。你想要靠窗还是靠过道？' },
      { en: "It's two kilos over, but I can let it slide this time. Your boarding pass will be on your phone in a moment.", zh: '超重两公斤，但这次我可以放你过。登机牌稍后会发到你手机上。' },
      { en: 'Boarding starts at 8:25 at gate B12. Security is about fifteen minutes right now, so you have time for coffee.', zh: '8:25 在 B12 登机口开始登机。现在安检大约十五分钟，所以你还有时间喝咖啡。' },
      { en: "Happens all the time. Just keep your passport out until you're through security. Have a good flight.", zh: '这很常见。过安检前把护照拿在手上就好。祝你飞行愉快。' }
    ]
  },
  {
    id: 'dinner',
    world: 'daily',
    title: 'Dinner with Friends',
    cn: '朋友晚餐',
    blurb: 'Meet new people, join the table and have an opinion worth sharing.',
    setting:
      'A cosy dinner party in a Chicago apartment. Six people, too much pasta and one empty chair saved for you.',
    aiName: 'Riley',
    aiRole: "your friend's roommate and a fellow guest",
    personality: 'curious, easygoing and full of unexpected questions',
    userRole: 'a friend of a friend at the table',
    level: 'confident',
    tags: ['social', 'opinions'],
    goals: ['Introduce yourself naturally', 'Join a group conversation', 'Share an opinion and ask one back'],
    phrases: [
      { en: 'How do you know the host?', zh: '你怎么认识主人的？' },
      { en: "I'm not gonna lie, this is amazing.", zh: '说实话，这太好吃了。' },
      { en: "What's your take on it?", zh: '你怎么看？' }
    ],
    opening: "Hey, you must be the friend of a friend. I'm Riley. How do you know Jess?",
    openingZh: '嘿，你一定就是朋友的朋友。我是 Riley。你怎么认识 Jess 的？',
    demo: [
      { en: "No way, you two worked together? She never told me that. What was she like at work?", zh: '不会吧，你们俩一起工作过？她从来没跟我说过。她工作时是什么样？' },
      { en: "Okay, since you're new, I need your honest opinion: is pineapple on pizza a crime or a vibe?", zh: '好，既然你是新来的，我需要你的真实意见：菠萝披萨是犯罪还是很有感觉？' },
      { en: "That's a much more reasonable answer than the last person. You're going to fit in fine.", zh: '这比上一个人的回答合理多了。你会融入得很好的。' },
      { en: 'Fair. Now tell me one thing about Chicago that has surprised you so far.', zh: '有道理。那告诉我一件到目前为止让你意外的芝加哥的事。' }
    ]
  },
  {
    id: 'first-day',
    world: 'campus',
    title: 'First Day on Campus',
    cn: '开学第一天',
    blurb: 'Find your building, explain your major and make a plan to meet again.',
    setting:
      'A sunny quad at a university in California. You have ten minutes before your first lecture and no idea where the building is.',
    aiName: 'Taylor',
    aiRole: 'a second-year student and orientation volunteer',
    personality: 'bubbly, practical and knows where everything is',
    userRole: 'a new international student',
    level: 'starter',
    tags: ['campus', 'introductions'],
    goals: ['Ask where a building is', 'Talk about your major', 'Make a plan to meet again'],
    phrases: [
      { en: "I'm still figuring out where everything is.", zh: '我还在摸索这里的一切。' },
      { en: "What's the best place to grab lunch?", zh: '去哪里吃午饭最好？' },
      { en: 'Would you mind showing me?', zh: '你介意带我去吗？' }
    ],
    opening: "Hi! You look a little lost — no judgment, I got turned around for a whole week last year. Where are you headed?",
    openingZh: '嗨！你看起来有点迷路——别担心，我去年整整一周都分不清方向。你要去哪儿？',
    demo: [
      { en: "Oh, that's literally across the quad. I'm walking that way anyway. What are you studying?", zh: '哦，就在广场对面。反正我也往那边走。你学什么专业？' },
      { en: "That's a great department. Fair warning: the coffee machine on the third floor is broken, so everyone goes to the library café.", zh: '那是个很好的院系。提前提醒你：三楼咖啡机坏了，所以大家都去图书馆咖啡厅。' },
      { en: 'We should swap numbers. There is a club fair on Friday and I can show you the ones that are actually worth it.', zh: '我们交换一下号码吧。周五有社团招新，我可以带你去那些真正值得去的。' },
      { en: "See, you're already doing better than I was. Text me if you get lost again — I mean it.", zh: '看，你已经比我当时强了。再迷路就发消息给我——我是认真的。' }
    ]
  },
  {
    id: 'seminar',
    world: 'campus',
    title: 'Seminar Spotlight',
    cn: '课堂讨论',
    blurb: 'Share an opinion, disagree politely and sound like you belong in the room.',
    setting:
      'A small anthropology seminar at a British university. Twelve students, one very engaged professor and a reading everyone has opinions about.',
    aiName: 'Dr. Hayes',
    aiRole: 'the seminar professor',
    personality: 'curious, rigorous and warm; asks "why" until you find the real reason',
    userRole: 'a student who wants to speak up more',
    level: 'fluent',
    tags: ['academic', 'debate'],
    goals: ['Share an opinion with a reason', 'Disagree politely', 'Ask a clarifying question'],
    phrases: [
      { en: 'I see it a little differently.', zh: '我的看法有点不同。' },
      { en: 'Could you clarify what you mean by...?', zh: '你能解释一下你说的……是什么意思吗？' },
      { en: 'That connects to something I read...', zh: '这和我读到的一些内容有关……' }
    ],
    opening: 'Before we dive in — the reading divided everyone. Did it persuade you?',
    openingZh: '开始之前——这周的阅读材料让大家意见分歧。它说服你了吗？',
    demo: [
      { en: "Interesting. You're saying the argument works in theory but not in practice. What would change your mind?", zh: '有意思。你是说这个论证理论上成立，但实践中不行。什么会改变你的看法？' },
      { en: "Hold on, let's separate two claims there. Which one are you actually defending?", zh: '等等，我们把两个主张分开。你真正想捍卫的是哪一个？' },
      { en: "That's a stronger point. Can you connect it to last week's reading, or are you making a different argument?", zh: '这个观点更有力。你能把它和上周的阅读联系起来吗，还是在提出一个不同的论点？' },
      { en: 'Good. That is exactly the kind of precision I want in your essays. Who wants to respond to that?', zh: '很好。这正是我希望在你们论文里看到的精确度。谁想回应这个观点？' }
    ]
  },
  {
    id: 'study-group',
    world: 'campus',
    title: 'Study Group',
    cn: '小组作业',
    blurb: 'Suggest an idea, negotiate tasks and get everyone out before midnight.',
    setting:
      'A library study room at 8pm. A group project is due Friday and nobody agrees on the outline.',
    aiName: 'Maya',
    aiRole: 'your classmate and the de facto project organiser',
    personality: 'direct, funny and slightly stressed, but genuinely collaborative',
    userRole: 'a group member with an opinion',
    level: 'confident',
    tags: ['teamwork', 'negotiation'],
    goals: ['Suggest a clear idea', 'Negotiate who does what', 'Check that everyone agrees'],
    phrases: [
      { en: 'Can we go back to that for a second?', zh: '我们能回到刚才那点吗？' },
      { en: 'I can take the intro if you want.', zh: '如果需要的话，我可以负责引言。' },
      { en: 'Does that work for everyone?', zh: '大家都可以吗？' }
    ],
    opening: 'Okay, we have forty minutes and a Google Doc that looks like a crime scene. Where do you want to start?',
    openingZh: '好，我们只有四十分钟，而谷歌文档看起来像案发现场。你想从哪儿开始？',
    demo: [
      { en: "Thank God, someone with a plan. If you take the intro, I'll handle the data section. Does that feel balanced?", zh: '谢天谢地，终于有人有计划了。你负责引言，我来处理数据部分。这样平衡吗？' },
      { en: "Hmm, I'm not sure the conclusion works yet. We haven't actually answered the question we posed.", zh: '嗯，我不确定结论现在成立。我们其实还没有回答自己提出的问题。' },
      { en: 'Okay, that is a better structure. Can we put the deadline in the doc before someone disappears again?', zh: '好，这个结构更好。我们能在有人再次消失前把截止时间写进文档吗？' },
      { en: "Perfect. I'll message the others. Honestly, this might be the first group project I don't hate.", zh: '完美。我去通知其他人。说实话，这可能是我第一个不讨厌的小组作业。' }
    ]
  },
  {
    id: 'office-hours',
    world: 'campus',
    title: 'Office Hours',
    cn: '教授答疑',
    blurb: 'Explain what you do not understand and leave with a clear next step.',
    setting:
      "A professor's office at a large state university. The door is open, but you are not sure if you should knock.",
    aiName: 'Professor Bennett',
    aiRole: 'a computer science professor',
    personality: 'patient, precise and quietly funny; appreciates specific questions',
    userRole: 'a student stuck on an assignment',
    level: 'fluent',
    tags: ['academic', 'problem solving'],
    goals: ['Explain exactly where you are stuck', 'Ask for guidance without asking for the answer', 'Leave with a clear next step'],
    phrases: [
      { en: "I'm stuck on the part where...", zh: '我卡在……这一步。' },
      { en: 'Am I on the right track?', zh: '我的思路对吗？' },
      { en: 'What should I try next?', zh: '我接下来应该尝试什么？' }
    ],
    opening: "Come in, come in. You're here about the project? Tell me what's making sense and what isn't.",
    openingZh: '进来，进来。你是为了项目来的吧？告诉我哪些地方明白了，哪些还没明白。',
    demo: [
      { en: "Good, that's a precise question. Before I answer — what have you already tried, and what did you expect to happen?", zh: '很好，这是个精确的问题。在我回答之前——你已经试过什么，预期会发生什么？' },
      { en: "You're closer than you think. The bug isn't in the loop; it's in the assumption you're making before the loop runs.", zh: '你比想象中更接近了。问题不在循环里，而在循环运行前你做的假设。' },
      { en: "I won't give you the answer, but I'll give you a test case that should make the problem obvious. Try it and email me the result.", zh: '我不会直接给你答案，但我会给你一个能让问题变明显的测试用例。试一下，把结果邮件发我。' },
      { en: "That's the right instinct. Debugging is mostly learning to ask better questions. See you Thursday.", zh: '这个直觉是对的。调试基本上就是学会问更好的问题。周四见。' }
    ]
  },
  {
    id: 'movie',
    world: 'play',
    title: 'Movie Night',
    cn: '电影夜谈',
    blurb: 'Give a strong opinion, defend one scene and disagree without killing the mood.',
    setting:
      'A rooftop movie night in Los Angeles. The credits just rolled and everyone has an opinion.',
    aiName: 'Noah',
    aiRole: 'a film-obsessed friend',
    personality: 'enthusiastic, contrarian and constantly quoting movies',
    userRole: 'a friend with your own take',
    level: 'confident',
    tags: ['movies', 'opinions'],
    goals: ['Give a strong opinion', 'Support it with a scene or detail', 'Disagree without killing the mood'],
    phrases: [
      { en: 'I walked out of it feeling...', zh: '我看完之后感觉……' },
      { en: 'The scene that got me was...', zh: '最打动我的那场戏是……' },
      { en: 'Okay, hear me out.', zh: '好，听我说完。' }
    ],
    opening: 'Okay, be honest — did that ending work for you, or did it totally cheat?',
    openingZh: '说实话——那个结尾你觉得成立吗，还是完全在糊弄人？',
    demo: [
      { en: "See, I think that's exactly why it works. The film doesn't resolve it because the character can't resolve it either.", zh: '你看，我觉得这正是它成立的原因。电影不给出答案，因为角色自己也给不出答案。' },
      { en: "Okay, hear me out: the best scene isn't the ending, it's the three minutes where nobody says anything in the car.", zh: '好，听我说完：最好的一场戏不是结尾，而是车里没人说话的那三分钟。' },
      { en: "That's a fair criticism. I still think the first half is doing something the second half completely forgets.", zh: '这个批评有道理。我还是觉得前半段在做的事，后半段完全忘了。' },
      { en: 'This is why I love watching movies with you. You never just say "it was good." What would you change?', zh: '这就是我喜欢和你一起看电影的原因。你从来不会只说“挺好的”。你会怎么改？' }
    ]
  },
  {
    id: 'gaming',
    world: 'play',
    title: 'Gaming Squad',
    cn: '游戏开黑',
    blurb: 'Call out a plan, ask for help and celebrate a ridiculous moment.',
    setting:
      'A late-night voice chat with friends. Your squad is one player short and the match is about to start.',
    aiName: 'Leo',
    aiRole: 'your friend and the squad leader',
    personality: 'fast-talking, playful and strategic; competitive but never mean',
    userRole: 'the new player joining the group',
    level: 'confident',
    tags: ['gaming', 'teamwork'],
    goals: ['Call out a simple plan', 'Ask for help without stress', 'Celebrate a good moment'],
    phrases: [
      { en: "I'll cover the left side.", zh: '我守左边。' },
      { en: "What's the play here?", zh: '这波怎么打？' },
      { en: 'That was actually insane.', zh: '那波真的太离谱了。' }
    ],
    opening: "Yo, you're in! We've got one minute before queue. Do you usually play support or are you a menace?",
    openingZh: '哟，你来了！还有一分钟就匹配了。你一般玩辅助，还是个狠角色？',
    demo: [
      { en: "Perfect, we need someone who can actually aim. Stick with me on the left, call it if you see movement.", zh: '完美，我们需要一个真的能瞄准的人。跟着我走左边，看到动静就报点。' },
      { en: "No stress. If you go down, we reset and try the other side. It's one round, not the final.", zh: '别有压力。你倒了我们就重来，走另一边。只是一回合，不是决赛。' },
      { en: "That was actually insane. Did you see their reaction? Clip it, send it to the group.", zh: '那波真的太离谱了。你看到他们的反应了吗？录下来发群里。' },
      { en: "Okay, you're officially not the new guy anymore. One more game? I'll grab water.", zh: '好，你正式不是新人了。再来一局？我去拿点水。' }
    ]
  },
  {
    id: 'travel',
    world: 'play',
    title: 'Travel Stories',
    cn: '旅行故事',
    blurb: 'Tell a short story, ask good follow-ups and laugh at the disaster later.',
    setting:
      'A hostel common room in Lisbon. Rain outside, cheap wine inside and a table of travellers swapping stories.',
    aiName: 'Ava',
    aiRole: 'a fellow traveller',
    personality: 'adventurous, candid and laughs at her own disasters',
    userRole: 'a traveller with a story to tell',
    level: 'fluent',
    tags: ['travel', 'storytelling'],
    goals: ['Tell a short, clear story', 'Ask follow-up questions', 'Compare experiences'],
    phrases: [
      { en: 'The funniest part was...', zh: '最搞笑的部分是……' },
      { en: 'How did you end up there?', zh: '你怎么会到那儿去？' },
      { en: 'That sounds like a nightmare — in a good way.', zh: '听起来像场噩梦——但是好的那种。' }
    ],
    opening: "So, what's the worst travel decision you've ever made? I'll go first if you're shy.",
    openingZh: '你做过最糟的旅行决定是什么？如果你害羞，我可以先来。',
    demo: [
      { en: 'Okay, that tops mine. I once booked a "charming countryside hostel" that turned out to be a barn with Wi-Fi.', zh: '好吧，这比我的厉害。我曾订过一家“迷人的乡村旅舍”，结果是个有 Wi-Fi 的谷仓。' },
      { en: 'Wait, you did that alone? How did you talk yourself into it?', zh: '等等，你一个人去的？你怎么说服自己的？' },
      { en: "That's the thing about travel — the bad parts become the best stories. Would you do it again?", zh: '旅行就是这样——糟糕的部分会变成最好的故事。你还会再去吗？' },
      { en: "I'm stealing that idea. If we're both still here tomorrow, I'll show you the place with the terrible sangria.", zh: '这个主意我偷走了。如果我们明天都还在，我带你去那家桑格利亚很难喝的地方。' }
    ]
  },
  {
    id: 'music',
    world: 'play',
    title: 'Music Swap',
    cn: '交换歌单',
    blurb: 'Describe a sound, defend your taste and leave with a new favourite song.',
    setting:
      'A record store listening corner in Melbourne. The owner has left you two alone with the speakers.',
    aiName: 'Jamie',
    aiRole: 'a music nerd and a new friend',
    personality: 'obsessive in a charming way; asks for specifics and hates small talk',
    userRole: 'someone with a playlist to defend',
    level: 'fluent',
    tags: ['music', 'recommendations'],
    goals: ['Describe music you like', 'Recommend one song', 'Respond to a strong opinion'],
    phrases: [
      { en: "It's got this really specific vibe.", zh: '它有一种很特别的感觉。' },
      { en: 'What do you listen to when you...?', zh: '当你……的时候会听什么？' },
      { en: "Okay, that's a bold claim.", zh: '好，这话可够大胆的。' }
    ],
    opening: 'Right. You get one song to prove your taste. No pressure. What are we playing?',
    openingZh: '好。你只有一首歌来证明你的品味。别有压力。我们听什么？',
    demo: [
      { en: 'Interesting. I would not have guessed that from you. What is it that gets you — the voice, the bass, or the fact that it sounds slightly broken?', zh: '有意思。我不会猜到你会选这个。打动你的是人声、贝斯，还是它听起来有点破碎的感觉？' },
      { en: "Okay, that's a bold claim. I like it. If you like that, you need to hear the B-side — it's the same song but haunted.", zh: '好，这话够大胆。我喜欢。如果你喜欢那首，你得听听 B 面——同一首歌，但像闹鬼。' },
      { en: "See, this is why I don't do small talk. You just gave me three new things to listen to. What's the one you're embarrassed to admit you love?", zh: '看，这就是我不爱闲聊的原因。你刚给了我三样新东西去听。哪首是你不好意思承认喜欢的？' },
      { en: 'Your taste is strange, but consistent. That is the best kind. I am making you a playlist.', zh: '你的品味很奇怪，但很一致。那是最好的那种。我要给你做个歌单。' }
    ]
  }
];

export const CUSTOM_PRESETS = [
  {
    id: 'interview',
    label: 'Job Interview',
    cn: '外企面试',
    topic: 'A product manager interview at a fast-growing tech company',
    setting: 'A glass meeting room at a startup. The interview is scheduled for 45 minutes.',
    aiName: 'Claire',
    aiRole: 'the hiring manager',
    personality: 'friendly but sharp; asks for concrete examples and hates vague answers',
    userRole: 'a candidate interviewing for a product role',
    goal: 'Give specific examples, ask one thoughtful question and leave a strong impression',
    opening: "Thanks for coming in. Before we get into the role, tell me a little about what you're looking for next."
  },
  {
    id: 'negotiation',
    label: 'Business Deal',
    cn: '商务谈判',
    topic: 'Renewing a software contract with a difficult client',
    setting: 'A video call between two companies. The current contract expires in two weeks.',
    aiName: 'Daniel',
    aiRole: 'the client-side procurement lead',
    personality: 'calm, firm and data-driven; friendly until you avoid the numbers',
    userRole: 'an account manager trying to renew the deal',
    goal: 'Find out the real objection, defend your value and propose a clear next step',
    opening: "Thanks for making the time. I'll be direct — we like the product, but the renewal number is hard to justify internally."
  },
  {
    id: 'ielts',
    label: 'IELTS Speaking',
    cn: '雅思口语',
    topic: 'IELTS Speaking Part 2: describe a journey that did not go as planned',
    setting: 'A quiet exam room. The examiner is neutral, precise and time-conscious.',
    aiName: 'Examiner Hale',
    aiRole: 'an IELTS speaking examiner',
    personality: 'neutral, precise and politely encouraging; follows the test format',
    userRole: 'an IELTS candidate',
    goal: 'Speak for up to two minutes, use varied vocabulary and finish with a clear reflection',
    opening: "Good morning. I'm going to give you a topic, and you'll have one minute to prepare. Ready?"
  },
  {
    id: 'debate',
    label: 'Friendly Debate',
    cn: '观点辩论',
    topic: 'Should social media platforms require age verification?',
    setting: 'A university debating society. The room is informal, but the arguments are serious.',
    aiName: 'Nora',
    aiRole: 'your debate opponent',
    personality: 'quick, respectful and relentless; attacks arguments, never people',
    userRole: 'a debater arguing the opposite side',
    goal: 'Make a clear case, respond to a challenge and concede one point gracefully',
    opening: "I'll start with the obvious: age verification sounds sensible until you ask who holds the data. Where do you stand?"
  }
];

export const OPENERS = [
  {
    en: 'If you could live in any city for a year, where would you go — and what would you do there?',
    zh: '如果可以在任何城市住一年，你会去哪里？会在那里做什么？',
    topic: 'A city you would live in for a year'
  },
  {
    en: 'What is one small habit that has genuinely improved your life?',
    zh: '有什么小习惯真的改善了你的生活？',
    topic: 'A small habit that improved your life'
  },
  {
    en: 'What is a popular opinion you completely disagree with?',
    zh: '有什么大众观点是你完全不同意的？',
    topic: 'A popular opinion you disagree with'
  },
  {
    en: 'Describe a meal you will never forget. Where were you, and who were you with?',
    zh: '描述一顿你永远不会忘记的饭。你在哪里，和谁一起？',
    topic: 'A meal you will never forget'
  },
  {
    en: 'If your next year had a soundtrack, what would it sound like?',
    zh: '如果接下来一年有背景音乐，它会是什么风格？',
    topic: 'The soundtrack of your next year'
  }
];

export function getWorld(id) {
  return WORLDS.find((world) => world.id === id) || WORLDS[0];
}

export function getStaticScene(id) {
  return SCENES.find((scene) => scene.id === id) || null;
}

export function getDifficulty(id) {
  return DIFFICULTIES.find((item) => item.id === id) || DIFFICULTIES[1];
}

export function getAccent(id) {
  return ACCENTS.find((item) => item.id === id) || ACCENTS[0];
}

export function getPace(id) {
  return PACES.find((item) => item.id === id) || PACES[1];
}

export function getSubtitle(id) {
  return SUBTITLE_MODES.find((item) => item.id === id) || SUBTITLE_MODES[1];
}

export function buildCustomScene(form) {
  const topic = String(form.topic || '').trim();
  const setting = String(form.setting || '').trim() || 'A relaxed one-on-one conversation.';
  const aiName = String(form.aiName || '').trim() || 'Alex';
  const aiRole = String(form.aiRole || '').trim() || 'a friendly conversation partner';
  const personality =
    String(form.personality || '').trim() || 'curious, patient and genuinely interested in what you have to say';
  const userRole = String(form.userRole || '').trim() || 'yourself';
  const goal = String(form.goal || '').trim();
  const opening = String(form.opening || '').trim();
  const id = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  const defaultOpening = `Hey, I'm ${aiName}. We're here to talk about ${topic || 'whatever is on your mind'}. I'll be ${aiRole}. So — what would you like to get out of this conversation?`;

  return {
    id,
    world: 'custom',
    title: topic || 'Your Own Scene',
    cn: '自定义场景',
    blurb: goal || `A one-on-one conversation about ${topic || 'anything you want'}.`,
    setting,
    aiName,
    aiRole,
    personality,
    userRole,
    level: 'confident',
    tags: ['custom'],
    goals: goal ? [goal, 'Ask at least one follow-up question', 'Keep the conversation going for five turns'] : ['Start the conversation', 'Ask at least one follow-up question', 'Keep going for five turns'],
    phrases: [
      { en: 'Could we start with the basics?', zh: '我们可以从最基础的开始吗？' },
      { en: "Here's what I think, but I'd like your perspective.", zh: '这是我的想法，但我想听听你的看法。' },
      { en: 'Could you give me an example?', zh: '你能给我举个例子吗？' }
    ],
    opening: opening || defaultOpening,
    openingZh: '（自定义场景开场。你可以先听，再用自己的英文回应。）',
    demo: [
      { en: "That's a good place to start. Can you tell me a little more about why that matters to you?", zh: '这是个不错的起点。你能多告诉我一点，为什么这对你很重要吗？' },
      { en: 'I see what you mean. What would a good outcome look like from your side?', zh: '我明白你的意思。从你的角度看，一个好的结果会是什么样？' },
      { en: "That's more specific — thank you. If you had to choose one next step, what would it be?", zh: '这就具体多了——谢谢。如果必须选择一个下一步，你会选什么？' },
      { en: "I like that. Let's stay with it for a moment. What's the part you're least sure about?", zh: '我喜欢这个。我们再聊一会儿。你最不确定的部分是什么？' }
    ],
    isCustom: true
  };
}
