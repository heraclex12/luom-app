// Words that are easy to mix up: meanings, examples and how to tell them apart.
// Most useful first: words that share one Vietnamese word (học, nói, mang, mặc, đến, mượn, khác, nhiều, ít…),
// then people and things, amounts, describing words, time and linking words, word forms, and look-alikes.

export interface ConfusingSet {
  words: { word: string; vi: string; example: string }[]
  /** How to tell them apart (one or two sentences). */
  note: string
}

const W = (word: string, vi: string, example: string): ConfusingSet['words'][number] => ({ word, vi, example })

export const CONFUSING_WORDS: ConfusingSet[] = [
  // Everyday verbs that share one Vietnamese word
  {
    words: [W('learn', 'học (được), học hỏi', 'I learned to swim when I was six.'), W('study', 'học (bài), nghiên cứu', 'I study English every evening.')],
    note: 'Study is the work you do: reading, practising, going to class. Learn is getting the knowledge or skill. You can study for hours and learn nothing.',
  },
  {
    words: [W('borrow', 'mượn', 'Can I borrow your pen?'), W('lend', 'cho mượn', 'Can you lend me your pen?')],
    note: 'You borrow something from someone; you lend something to someone.',
  },
  {
    words: [W('say', 'nói', 'She said (that) she was tired.'), W('tell', 'kể, bảo', 'She told me (that) she was tired.')],
    note: 'Tell needs the person: tell someone something. Say does not: say something (to someone).',
  },
  {
    words: [W('speak', 'nói (một thứ tiếng), phát biểu', 'Do you speak English?'), W('talk', 'nói chuyện, trò chuyện', 'We talked for hours.')],
    note: 'You speak a language (not talk English), and speak is a little more formal. Talk is chatting: talk to or with someone about something.',
  },
  {
    words: [W('make', 'làm ra, tạo ra', 'make a cake, make a decision, make a mistake'), W('do', 'làm (việc)', 'do homework, do the dishes, do your best')],
    note: 'Make is for creating or producing something; do is for tasks and activities.',
  },
  {
    words: [W('let', 'để cho, cho phép', 'My parents let me stay up late.'), W('make', 'bắt, khiến', 'My parents made me do my homework.')],
    note: 'Let means allow (you wanted to); make means force (you had to). Neither takes to: let me go, make me go.',
  },
  {
    words: [W('come', 'đến (chỗ người nói)', 'Come here, please.'), W('go', 'đi (chỗ khác)', "Let's go to the beach.")],
    note: 'Come is movement toward where the speaker or listener is; go is movement away, to somewhere else. When you are out and want to leave, say I want to go home.',
  },
  {
    words: [W('bring', 'mang đến', 'Can you bring me a glass of water?'), W('take', 'mang đi', 'Take an umbrella with you.')],
    note: 'Bring is toward the speaker (here); take is away from the speaker (there).',
  },
  {
    words: [W('arrive', 'đến nơi', 'We arrived in Hanoi at noon.'), W('reach', 'tới, đến được', 'We reached the hotel at noon.'), W('get to', 'đến (cách nói thường ngày)', 'What time did you get to work?')],
    note: 'Arrive in a city or country, arrive at a building or place. Reach takes the place straight after it (reach the station, not reach to). Get to is the everyday way to say it.',
  },
  {
    words: [W('wear', 'mặc, đeo (đang)', 'She is wearing a red dress.'), W('put on', 'mặc vào, đeo vào', "Put on your coat, it's cold."), W('dress', 'mặc quần áo (cho ai)', 'I got dressed and had breakfast.')],
    note: 'Put on is the action; wear is the state (you have it on). Dress is putting on all your clothes (get dressed, dress the baby), so it is not followed by one item.',
  },
  {
    words: [W('see', 'nhìn thấy', 'I can see the sea from here.'), W('look', 'nhìn', 'Look at this photo.'), W('watch', 'xem, theo dõi', 'We watched a film last night.')],
    note: 'See happens on its own; look is turning your eyes to something; watch is following something that moves.',
  },
  {
    words: [W('hear', 'nghe thấy', 'I heard a noise outside.'), W('listen', 'lắng nghe', 'Listen to me, please.')],
    note: 'You hear without trying; you listen when you pay attention. Listen to something.',
  },
  {
    words: [W('look for', 'tìm (đang tìm)', "I'm looking for my keys."), W('find', 'tìm thấy', 'I found them under the sofa.')],
    note: 'Look for is the search; find is the result. You can look for something all day and not find it.',
  },
  {
    words: [W('lose', 'mất, đánh mất', 'I lost my phone on the bus.'), W('miss', 'lỡ, trượt; nhớ', 'I missed the bus. I miss my family.')],
    note: 'You lose a thing you had (or a game). You miss a bus, a class or a chance you did not catch, and you miss people who are far away.',
  },
  {
    words: [W('remember', 'nhớ', 'I remember her name.'), W('remind', 'nhắc nhở', 'Please remind me to call Mum.')],
    note: 'You remember something yourself; someone or something reminds you.',
  },
  {
    words: [W('open', 'mở (cửa, hộp, sách)', 'Open the window, please.'), W('turn on', 'bật (đèn, máy)', 'Turn on the light, please.')],
    note: 'You turn on (and turn off) lights, fans, the TV and machines; you open (and close) doors, windows, boxes and books. Never open the light.',
  },
  {
    words: [W('meet', 'gặp (lần đầu), làm quen', 'Nice to meet you.'), W('know', 'biết, quen biết', "I've known her for years.")],
    note: 'You meet someone the first time you see them; after that you know them. Say Nice to meet you when you are introduced.',
  },
  {
    words: [W('play', 'chơi (trò chơi, thể thao, nhạc cụ)', 'The kids are playing football.'), W('hang out', 'đi chơi (với bạn)', 'I hung out with my friends at a café.')],
    note: 'Children play, and anyone plays a game, a sport or an instrument. Spending free time with friends is hang out or go out, not play.',
  },
  {
    words: [W('wake up', 'thức dậy, tỉnh giấc', 'I woke up at six but stayed in bed.'), W('get up', 'ra khỏi giường, dậy', 'I got up at seven and made coffee.')],
    note: 'Wake up is when you stop sleeping; get up is when you leave the bed.',
  },
  {
    words: [W('hope', 'hy vọng (có thể xảy ra)', 'I hope you pass the exam.'), W('wish', 'ước (khó hoặc không thể)', 'I wish I were taller.')],
    note: 'Hope is for things that may really happen; wish is for things that are not true or not likely, and the verb after it goes back in time: I wish I had more time.',
  },
  {
    words: [W('wait', 'chờ, đợi', "I'm waiting for the bus."), W('expect', 'mong đợi, nghĩ là sẽ xảy ra', 'I expect it will rain later.')],
    note: 'Wait (for) is spending time until something comes; expect is believing something will happen. You wait for a bus; you expect it to be late.',
  },
  {
    words: [W('agree', 'đồng ý (với ý kiến)', 'I agree with you.'), W('accept', 'chấp nhận, nhận lời', 'She accepted the job offer.')],
    note: 'You agree with a person or an idea (agree with, agree to do something); you accept something that is offered: an invitation, a gift, an apology.',
  },
  {
    words: [W('join', 'tham gia, gia nhập', 'I joined a running club.'), W('take part in', 'tham gia (hoạt động)', 'Twenty teams took part in the contest.'), W('attend', 'có mặt, dự', 'Over 200 people attended the talk.')],
    note: 'Join a group or people (join us, not join with us); take part in an activity where you do something; attend an event means you are there.',
  },
  {
    words: [W('attend', 'tham dự', 'I attended the meeting.'), W('assist', 'hỗ trợ, giúp đỡ', 'She assisted the doctor.')],
    note: 'Attend means be present at; assist means help.',
  },
  {
    words: [W('marry', 'cưới (ai)', 'He married his best friend.'), W('get married', 'kết hôn', 'They got married last year.')],
    note: 'Marry someone, with nothing in between (not marry with). With no person after it, say get married; get married to someone also works.',
  },
  {
    words: [W('steal', 'lấy cắp (đồ)', 'Someone stole my bike.'), W('rob', 'cướp (người, nơi)', 'Two men robbed the bank.')],
    note: 'You steal a thing; you rob a person or a place (of something): They robbed me of my phone.',
  },
  {
    words: [W('win', 'thắng, giành được', 'We won the match.'), W('beat', 'đánh bại', 'We beat the other team.')],
    note: 'You win a game or a prize; you beat a person or a team.',
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
    words: [W('fit', 'vừa (cỡ)', 'These shoes fit perfectly.'), W('suit', 'hợp (với người)', 'That colour really suits you.'), W('match', 'hợp nhau, đi với nhau', 'Your bag matches your shoes.')],
    note: 'Fit is about size; suit is about looking good on a person; match is two things that go well together.',
  },

  // People, places and things
  {
    words: [W('person', 'một người', 'She is a kind person.'), W('people', 'những người, mọi người', 'Many people live here.')],
    note: 'Person is one; people is the usual plural and takes a plural verb: People are friendly (not peoples, not people is).',
  },
  {
    words: [W('house', 'ngôi nhà (tòa nhà)', 'They built a new house.'), W('home', 'nhà (nơi mình sống)', "I'm going home.")],
    note: 'A house is the building; home is the place you live and belong. Say go home and get home, with no to.',
  },
  {
    words: [W('guest', 'khách (được mời, ở khách sạn)', 'We have guests for dinner.'), W('customer', 'khách hàng (người mua)', 'The shop was full of customers.'), W('visitor', 'khách tham quan, người đến thăm', 'The museum gets many visitors.')],
    note: 'A guest is invited or stays at a hotel; a customer buys something; a visitor comes to see a place or a person.',
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
    words: [W('road', 'đường (nối các nơi)', 'The road to Da Lat is beautiful.'), W('street', 'phố, đường phố', 'I live on Hang Bac Street.'), W('way', 'lối đi, đường đi; cách', 'Can you tell me the way to the station?')],
    note: 'A road goes from one place to another; a street is in a town, with buildings along it; way is the route you take (or a method), not the road itself.',
  },
  {
    words: [W('shade', 'bóng râm', "Let's sit in the shade."), W('shadow', 'cái bóng', 'My shadow is long in the evening.')],
    note: 'Shade is a cool area out of the sun; a shadow is the dark shape something makes.',
  },
  {
    words: [W('cook', 'đầu bếp, người nấu; nấu', 'My mum is a great cook.'), W('cooker', 'cái bếp, nồi nấu', 'a rice cooker')],
    note: 'A cook is a person; a cooker is a machine (a stove, a rice cooker). Here -er does not mean a person.',
  },
  {
    words: [W('clothes', 'quần áo', 'I need new clothes.'), W('cloth', 'vải', 'a piece of cloth')],
    note: 'Clothes are what you wear (always plural); cloth is the material.',
  },
  {
    words: [W('price', 'giá (tiền)', 'The price of rice has gone up.'), W('cost', 'có giá, tốn; chi phí', 'This shirt costs 200,000 dong.')],
    note: 'Price is the amount you pay; cost is mostly the verb: it costs, it cost. A price is high or low; the thing is expensive or cheap.',
  },
  {
    words: [W('prize', 'giải thưởng', 'She won first prize.'), W('price', 'giá', 'What is the price?')],
    note: 'You win a prize; you pay a price. Prize ends with a /z/ sound, price with /s/.',
  },
  {
    words: [W('mistake', 'lỗi, sai sót (làm sai)', 'I made a mistake in my answer.'), W('fault', 'lỗi (trách nhiệm)', "It's not your fault.")],
    note: 'A mistake is something done wrong (make a mistake); fault says who is to blame: It is my fault.',
  },
  {
    words: [W('hurt', 'đau, làm đau', 'My back hurts.'), W('pain', 'cơn đau, sự đau', 'I have a pain in my back.')],
    note: 'Hurt is usually the verb (my leg hurts); pain is the noun (I have a pain, I am in pain). Not my leg is pain.',
  },

  // How many, how much
  {
    words: [W('many', 'nhiều (đếm được)', 'How many books do you have?'), W('much', 'nhiều (không đếm được)', "I don't have much time."), W('a lot of', 'nhiều', 'She has a lot of friends.')],
    note: 'Many goes with plural nouns and much with uncountable nouns, mostly in questions and negatives. In positive sentences, a lot of sounds more natural for both.',
  },
  {
    words: [W('a few', 'một vài (đủ dùng)', 'I have a few friends here, so I am happy.'), W('few', 'rất ít (gần như không)', 'Few people came, so the room was empty.')],
    note: 'A few means some (a good thing); few means almost none (a bad thing). Both go with plural nouns.',
  },
  {
    words: [W('a little', 'một chút, một ít', 'I have a little money, so we can eat out.'), W('little', 'rất ít (gần như không)', 'There is little hope now.')],
    note: 'Like a few and few, but with uncountable nouns: a little means some; little means almost nothing.',
  },
  {
    words: [W('fewer', 'ít hơn (đếm được)', 'Fewer people came this year.'), W('less', 'ít hơn (không đếm được)', 'I drink less coffee now.')],
    note: 'Fewer goes with plural nouns (things you can count); less goes with uncountable nouns.',
  },
  {
    words: [W('number', 'số lượng (đếm được)', 'A large number of students passed.'), W('amount', 'lượng (không đếm được)', 'a large amount of money')],
    note: 'A number of things you can count; an amount of things you cannot count.',
  },
  {
    words: [W('each', 'mỗi (từng cái một)', 'Each student has a different book.'), W('every', 'mọi, mỗi (tất cả)', 'I go running every morning.')],
    note: 'Each looks at things one by one (and can be used for two); every sees them all together. Both take a singular noun.',
  },
  {
    words: [W('some', 'một vài, một ít', 'I bought some apples.'), W('any', '(không) chút nào; bất kỳ', "I don't have any money.")],
    note: 'Some is for positive sentences and for offers (Would you like some tea?); any is for negatives and most questions.',
  },
  {
    words: [W('almost', 'gần như', 'Almost all my friends came.'), W('most', 'hầu hết', 'Most students passed.')],
    note: 'Most + a noun: most students. Almost needs all or every: almost all students.',
  },
  {
    words: [W('another', 'một ... khác, thêm một', 'Can I have another cup of tea?'), W('other', '(những) ... khác', 'Other students agreed.'), W('different', 'khác (không giống)', 'My sister and I are very different.')],
    note: 'Another means one more or a different one, with a singular noun; other goes with plural nouns or after the (the other one). Different means not the same.',
  },

  // Describing words
  {
    words: [W('very', 'rất', 'This soup is very good.'), W('too', 'quá (đến mức không ổn)', 'This soup is too hot to eat.')],
    note: 'Too means more than you want, so it is usually a problem. To praise something, say very or so, not too: The food is so good.',
  },
  {
    words: [W('tall', 'cao (người, cây, tòa nhà)', 'He is very tall.'), W('high', 'cao (so với mặt đất)', 'The shelf is too high for me.')],
    note: 'Tall is for people and things that are long from bottom to top; high is for mountains, walls, prices and things far above the ground.',
  },
  {
    words: [W('the same', 'giống hệt, cùng', 'We are in the same class.'), W('similar', 'tương tự, gần giống', 'Our phones are similar.')],
    note: 'The same means not different at all (the same as); similar means alike but not exactly (similar to).',
  },
  {
    words: [W('look like', 'trông giống', 'She looks like her mother.'), W('be like', '(là người) như thế nào', "What's your new boss like?")],
    note: 'Look like is about how someone looks; be like is about what someone or something is like inside. Like on its own means enjoy: He likes his father does not mean they look the same.',
  },
  {
    words: [W('right', 'đúng (người nói đúng, câu trả lời đúng)', "You're right."), W('true', 'đúng (sự thật)', "That's true.")],
    note: 'A person or an answer is right; a fact or a story is true. Say You are right, not You are true.',
  },
  {
    words: [W('able', 'có khả năng (người)', 'She is able to speak three languages.'), W('possible', 'có thể (việc)', 'Is it possible to book online?')],
    note: 'People are able to do things; things are possible. Say It is possible for me to come, not I am possible to come.',
  },
  {
    words: [W('comfortable', 'thoải mái, dễ chịu', 'This chair is comfortable.'), W('convenient', 'tiện, thuận tiện', 'Is 3 p.m. convenient for you?')],
    note: 'Comfortable is how your body or mind feels; convenient means easy or suitable for your plans. A person feels comfortable, not convenient.',
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
    words: [W('alone', 'một mình', 'I live alone.'), W('lonely', 'cô đơn', 'I sometimes feel lonely.')],
    note: 'Alone means without others; lonely is the sad feeling.',
  },
  {
    words: [W('sensible', 'hợp lý, khôn ngoan', 'That is a sensible plan.'), W('sensitive', 'nhạy cảm', 'She is sensitive to criticism.')],
    note: 'Sensible means having good sense; sensitive means easily affected.',
  },
  {
    words: [W('economic', 'thuộc kinh tế', 'economic growth'), W('economical', 'tiết kiệm', 'an economical car')],
    note: 'Economic is about the economy; economical means it saves money.',
  },
  {
    words: [W('hard', 'chăm chỉ, vất vả', 'She works hard.'), W('hardly', 'hầu như không', 'I can hardly hear you.')],
    note: 'Hard is already an adverb (work hard); hardly is a different word that means almost not.',
  },
  {
    words: [W('late', 'muộn, trễ', 'I got up late.'), W('lately', 'gần đây', "I haven't seen him lately.")],
    note: 'Late means not on time; lately means recently.',
  },
  {
    words: [W('near', 'gần (khoảng cách)', 'I live near the school.'), W('nearly', 'gần như, suýt', 'I nearly missed the train.')],
    note: 'Near is about place; nearly means almost.',
  },
  {
    words: [W('early', 'sớm (trước giờ thường lệ)', 'I got up early today.'), W('soon', 'sớm, chẳng bao lâu nữa', 'See you soon!')],
    note: 'Early means before the usual or planned time; soon means a short time from now.',
  },
  {
    words: [W('actually', 'thật ra', 'Actually, I am from Hue, not Hanoi.'), W('currently', 'hiện tại', 'I am currently working in Ho Chi Minh City.')],
    note: 'Actually means in fact (often a correction), not now. For now, say currently or at the moment.',
  },
  {
    words: [W('especially', 'đặc biệt là, nhất là', 'I love fruit, especially mangoes.'), W('specially', 'dành riêng', 'This cake was specially made for you.')],
    note: 'Especially means above all; specially means for a particular purpose.',
  },

  // Time and linking words
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
    words: [W('although', 'mặc dù (+ mệnh đề)', 'Although it was raining, we went out.'), W('despite', 'mặc dù, bất chấp (+ danh từ)', 'Despite the rain, we went out.')],
    note: 'Although + subject and verb; despite + a noun or an -ing word. Never despite of.',
  },
  {
    words: [W('because', 'bởi vì (+ mệnh đề)', 'We stayed home because it was raining.'), W('because of', 'vì (+ danh từ)', 'We stayed home because of the rain.')],
    note: 'Because + subject and verb; because of + a noun.',
  },
  {
    words: [W('ago', 'cách đây', 'I met him two years ago.'), W('before', 'trước đó', 'I had met him before.')],
    note: 'Ago counts back from now; before means earlier than another time.',
  },
  {
    words: [W('after', 'sau (khi)', 'We went for a walk after lunch.'), W('later', 'sau đó, lát nữa', 'Two days later, she called.')],
    note: 'After comes before a time or event (after lunch); later comes after a length of time (two days later) or alone (See you later).',
  },
  {
    words: [W('by', 'trước, chậm nhất là', 'Please finish it by Friday.'), W('until', 'cho đến khi', 'I will wait until Friday.')],
    note: 'By is a deadline: done at or before that time. Until means something goes on up to that time.',
  },
  {
    words: [W('on time', 'đúng giờ', 'The train left on time.'), W('in time', 'kịp lúc', 'We got there in time for dinner.')],
    note: 'On time means at the planned time, not late; in time means early enough, before it is too late.',
  },
  {
    words: [W('at the end', 'vào cuối', 'at the end of the film'), W('in the end', 'cuối cùng, rốt cuộc', 'In the end, we stayed home.')],
    note: 'At the end (of something) is its last part; in the end means finally, after a long time or many changes.',
  },
  {
    words: [W('between', 'giữa (hai)', 'between you and me'), W('among', 'giữa (nhiều)', 'among friends')],
    note: 'Between is for two clearly separate things; among is for a group.',
  },

  // Word forms: noun, verb, adjective
  {
    words: [W('advice', 'lời khuyên', 'Can you give me some advice?'), W('advise', 'khuyên', 'I advise you to rest.')],
    note: 'Advice (/s/) is the noun and has no plural; advise (/z/) is the verb.',
  },
  {
    words: [W('affect', 'ảnh hưởng đến', 'The rain affected our plans.'), W('effect', 'tác động, hiệu quả', 'The new rule had a big effect.')],
    note: 'Affect is usually the verb; effect is usually the noun.',
  },
  {
    words: [W('life', 'cuộc sống, cuộc đời', 'City life is busy.'), W('live', 'sống', 'I live in Da Nang.')],
    note: 'Life is the noun (plural lives); live is the verb. Life has a long /aɪ/ sound, live a short /ɪ/.',
  },
  {
    words: [W('breath', 'hơi thở', 'Take a deep breath.'), W('breathe', 'thở', 'Breathe in slowly.')],
    note: 'Breath (short /e/, ends in /θ/) is the noun; breathe (long /iː/, ends in /ð/) is the verb.',
  },
  {
    words: [W('choice', 'sự lựa chọn', 'You made a good choice.'), W('choose', 'chọn', 'Choose one colour.')],
    note: 'Choice is the noun; choose is the verb (chose, chosen).',
  },
  {
    words: [W('success', 'sự thành công', 'The party was a big success.'), W('succeed', 'thành công (động từ)', 'She succeeded in getting the job.'), W('successful', 'thành công (tính từ)', 'He is a successful businessman.')],
    note: 'Success is the noun, succeed is the verb (succeed in + -ing), and successful describes a person or thing.',
  },
  {
    words: [W('dead', 'đã chết (tính từ)', 'The plant is dead.'), W('died', 'đã chết (động từ)', 'Her grandfather died in 2019.'), W('death', 'cái chết', 'His death was a shock.')],
    note: 'Died is the past of die (it happened); dead describes how things are now; death is the noun.',
  },

  // Words that look or sound alike
  {
    words: [W('lose', 'mất, thua', "Don't lose your keys."), W('loose', 'lỏng', 'These trousers are too loose.')],
    note: 'Lose (one o, /luːz/) is a verb; loose (two o, /luːs/) is an adjective.',
  },
  {
    words: [W('quite', 'khá', 'It is quite cold today.'), W('quiet', 'yên tĩnh', 'Please be quiet.')],
    note: 'Quite (one syllable, /kwaɪt/) means fairly; quiet (two syllables) means not noisy.',
  },
  {
    words: [W('its', 'của nó', 'The cat licked its paw.'), W("it's", 'nó là (it is / it has)', "It's raining.")],
    note: "It's always means it is or it has; its shows that something belongs to it.",
  },
  {
    words: [W('your', 'của bạn', 'Is this your bag?'), W("you're", 'bạn là (you are)', "You're very kind.")],
    note: "If you can say you are, write you're; otherwise it is your.",
  },
  {
    words: [W('there', 'ở đó; có', 'There is a cat on the roof.'), W('their', 'của họ', 'Their house is big.'), W("they're", 'họ là (they are)', "They're my neighbours.")],
    note: "Their shows belonging; they're means they are; there is a place, or starts there is / there are.",
  },
  {
    words: [W('than', 'hơn', 'She is taller than me.'), W('then', 'sau đó, lúc đó', 'We had lunch, then we went home.')],
    note: 'Than compares; then is about time.',
  },
  {
    words: [W('weather', 'thời tiết', 'The weather is nice today.'), W('whether', 'liệu ... hay không', "I don't know whether he will come.")],
    note: 'Weather is rain and sun; whether is like if, for a choice between two things (whether or not).',
  },
  {
    words: [W('accept', 'chấp nhận, nhận', 'Please accept this gift.'), W('except', 'ngoại trừ', 'Everyone came except Nam.')],
    note: 'Accept is a verb (take what is offered); except means but not. They sound almost the same, so check the meaning.',
  },
  {
    words: [W('everyday', 'hằng ngày, thường ngày', 'everyday English'), W('every day', 'mỗi ngày', 'I speak English every day.')],
    note: 'Everyday (one word) comes before a noun and means normal; every day (two words) means each day and says how often.',
  },
  {
    words: [W('dessert', 'món tráng miệng', 'We had ice cream for dessert.'), W('desert', 'sa mạc', 'The Sahara is a desert.')],
    note: 'Dessert has two s (you want more dessert!) and the stress at the end: de-SSERT.',
  },
  {
    words: [W('receipt', 'hóa đơn, biên lai', 'Can I have the receipt, please?'), W('recipe', 'công thức nấu ăn', "This is my grandma's recipe for pho.")],
    note: 'A receipt (the p is silent) shows that you paid; a recipe tells you how to cook something.',
  },
  {
    words: [W('principal', 'hiệu trưởng; chính, chủ yếu', 'The principal spoke to the students.'), W('principle', 'nguyên tắc', 'It is against my principles.')],
    note: 'A principal is the head of a school (or means main); a principle is a rule or belief. They sound the same.',
  },
  {
    words: [W('compliment', 'lời khen', 'She paid me a compliment.'), W('complement', 'bổ sung, làm cho hoàn chỉnh', 'The sauce complements the fish.')],
    note: 'A compliment (with i) is something nice you say about someone; complement (with e) means go well with something and make it complete.',
  },
  {
    words: [W('farther', 'xa hơn (khoảng cách)', 'The station is farther than I thought.'), W('further', 'xa hơn; thêm, hơn nữa', 'Do you have any further questions?')],
    note: 'Both can mean a longer distance, but only further means more or extra: further information.',
  },
  {
    words: [W('emigrate', 'di cư (rời nước mình)', 'Her family emigrated from Vietnam in 1990.'), W('immigrate', 'nhập cư (đến nước khác)', 'They immigrated to Canada.')],
    note: 'You emigrate from your own country (e for exit) and immigrate to a new one (i for in).',
  },
]
