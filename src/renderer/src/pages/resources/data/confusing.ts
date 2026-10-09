// Words that are easy to mix up: meanings, examples and how to tell them apart.

export interface ConfusingSet {
  words: { word: string; vi: string; example: string }[]
  /** How to tell them apart (one or two sentences). */
  note: string
}

const W = (word: string, vi: string, example: string): ConfusingSet['words'][number] => ({ word, vi, example })

export const CONFUSING_WORDS: ConfusingSet[] = [
  {
    words: [W('borrow', 'mượn', 'Can I borrow your pen?'), W('lend', 'cho mượn', 'Can you lend me your pen?')],
    note: 'You borrow something from someone; you lend something to someone.',
  },
  {
    words: [W('say', 'nói', 'She said (that) she was tired.'), W('tell', 'kể, bảo', 'She told me (that) she was tired.')],
    note: 'Tell needs the person: tell someone something. Say does not: say something (to someone).',
  },
  {
    words: [W('make', 'làm ra, tạo ra', 'make a cake, make a decision, make a mistake'), W('do', 'làm (việc)', 'do homework, do the dishes, do your best')],
    note: 'Make is for creating or producing something; do is for tasks and activities.',
  },
  {
    words: [W('bored', 'thấy chán', 'I am bored.'), W('boring', 'nhàm chán', 'This film is boring.')],
    note: '-ed is how you feel; -ing is the thing that makes you feel it. The same goes for interested / interesting, tired / tiring, excited / exciting.',
  },
  {
    words: [W('fun', 'vui', 'The party was fun.'), W('funny', 'buồn cười', 'He told a funny story.')],
    note: 'Fun means enjoyable; funny means it makes you laugh.',
  },
  {
    words: [W('hear', 'nghe thấy', 'I heard a noise outside.'), W('listen', 'lắng nghe', 'Listen to me, please.')],
    note: 'You hear without trying; you listen when you pay attention. Listen to something.',
  },
  {
    words: [W('see', 'nhìn thấy', 'I can see the sea from here.'), W('look', 'nhìn', 'Look at this photo.'), W('watch', 'xem, theo dõi', 'We watched a film last night.')],
    note: 'See happens on its own; look is turning your eyes to something; watch is following something that moves.',
  },
  {
    words: [W('remember', 'nhớ', 'I remember her name.'), W('remind', 'nhắc nhở', 'Please remind me to call Mum.')],
    note: 'You remember something yourself; someone or something reminds you.',
  },
  {
    words: [W('affect', 'ảnh hưởng đến', 'The rain affected our plans.'), W('effect', 'tác động, hiệu quả', 'The new rule had a big effect.')],
    note: 'Affect is usually the verb; effect is usually the noun.',
  },
  {
    words: [W('lose', 'mất, thua', "Don't lose your keys."), W('loose', 'lỏng', 'These trousers are too loose.')],
    note: 'Lose (one o, /luːz/) is a verb; loose (two o, /luːs/) is an adjective.',
  },
  {
    words: [W('rise', 'tăng lên, mọc', 'The sun rises in the east.'), W('raise', 'nâng lên, giơ lên', 'Raise your hand if you know.')],
    note: 'Things rise by themselves; you raise something.',
  },
  {
    words: [W('lie', 'nằm', 'I need to lie down.'), W('lay', 'đặt, để', 'Lay the book on the table.')],
    note: 'You lie down (nothing after it); you lay something somewhere.',
  },
  {
    words: [W('already', 'đã ... rồi', "I've already eaten."), W('yet', 'chưa', "I haven't eaten yet."), W('still', 'vẫn', "I'm still hungry.")],
    note: 'Already: sooner than expected. Yet: in negatives and questions. Still: something continues.',
  },
  {
    words: [W('for', 'trong (khoảng)', "I've lived here for three years."), W('since', 'từ (khi)', "I've lived here since 2021.")],
    note: 'For + a length of time; since + the starting point.',
  },
  {
    words: [W('during', 'trong suốt', 'He slept during the film.'), W('while', 'trong khi', 'He slept while we were watching the film.')],
    note: 'During + a noun; while + a clause (subject and verb).',
  },
  {
    words: [W('ago', 'cách đây', 'I met him two years ago.'), W('before', 'trước đó', 'I had met him before.')],
    note: 'Ago counts back from now; before means earlier than another time.',
  },
  {
    words: [W('its', 'của nó', 'The cat licked its paw.'), W("it's", 'nó là (it is / it has)', "It's raining.")],
    note: "It's always means it is or it has; its shows that something belongs to it.",
  },
  {
    words: [W('than', 'hơn', 'She is taller than me.'), W('then', 'sau đó, lúc đó', 'We had lunch, then we went home.')],
    note: 'Than compares; then is about time.',
  },
  {
    words: [W('economic', 'thuộc kinh tế', 'economic growth'), W('economical', 'tiết kiệm', 'an economical car')],
    note: 'Economic is about the economy; economical means it saves money.',
  },
  {
    words: [W('sensible', 'hợp lý, khôn ngoan', 'That is a sensible plan.'), W('sensitive', 'nhạy cảm', 'She is sensitive to criticism.')],
    note: 'Sensible means having good sense; sensitive means easily affected.',
  },
  {
    words: [W('actually', 'thật ra', 'Actually, I am from Hue, not Hanoi.'), W('currently', 'hiện tại', 'I am currently working in Ho Chi Minh City.')],
    note: 'Actually means in fact (often a correction), not now. For now, say currently or at the moment.',
  },
  {
    words: [W('attend', 'tham dự', 'I attended the meeting.'), W('assist', 'hỗ trợ, giúp đỡ', 'She assisted the doctor.')],
    note: 'Attend means be present at; assist means help.',
  },
  {
    words: [W('advice', 'lời khuyên', 'Can you give me some advice?'), W('advise', 'khuyên', 'I advise you to rest.')],
    note: 'Advice (/s/) is the noun and has no plural; advise (/z/) is the verb.',
  },
  {
    words: [W('especially', 'đặc biệt là, nhất là', 'I love fruit, especially mangoes.'), W('specially', 'dành riêng', 'This cake was specially made for you.')],
    note: 'Especially means above all; specially means for a particular purpose.',
  },
  {
    words: [W('work', 'công việc (nói chung)', 'I have a lot of work today.'), W('job', 'một công việc', 'She has a new job.')],
    note: 'Work is uncountable; a job is countable.',
  },
  {
    words: [W('travel', 'du lịch, đi lại', 'I love to travel.'), W('trip', 'chuyến đi', 'We had a great trip to Sa Pa.')],
    note: 'Travel is usually a verb or uncountable; a trip is one journey.',
  },
  {
    words: [W('alone', 'một mình', 'I live alone.'), W('lonely', 'cô đơn', 'I sometimes feel lonely.')],
    note: 'Alone means without others; lonely is the sad feeling.',
  },
  {
    words: [W('almost', 'gần như', 'Almost all my friends came.'), W('most', 'hầu hết', 'Most students passed.')],
    note: 'Most + a noun: most students. Almost needs all or every: almost all students.',
  },
  {
    words: [W('between', 'giữa (hai)', 'between you and me'), W('among', 'giữa (nhiều)', 'among friends')],
    note: 'Between is for two clearly separate things; among is for a group.',
  },
  {
    words: [W('win', 'thắng, giành được', 'We won the match.'), W('beat', 'đánh bại', 'We beat the other team.')],
    note: 'You win a game or a prize; you beat a person or a team.',
  },
  {
    words: [W('quite', 'khá', 'It is quite cold today.'), W('quiet', 'yên tĩnh', 'Please be quiet.')],
    note: 'Quite (one syllable, /kwaɪt/) means fairly; quiet (two syllables) means not noisy.',
  },
  {
    words: [W('clothes', 'quần áo', 'I need new clothes.'), W('cloth', 'vải', 'a piece of cloth')],
    note: 'Clothes are what you wear (always plural); cloth is the material.',
  },
  {
    words: [W('dessert', 'món tráng miệng', 'We had ice cream for dessert.'), W('desert', 'sa mạc', 'The Sahara is a desert.')],
    note: 'Dessert has two s (you want more dessert!) and the stress at the end: de-SSERT.',
  },
]
