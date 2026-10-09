// Common irregular verbs (base, past, past participle, Vietnamese meaning) and everyday phrasal verbs.

export interface IrregularVerb {
  base: string
  past: string
  participle: string
  vi: string
}

const V = (base: string, past: string, participle: string, vi: string): IrregularVerb => ({ base, past, participle, vi })

export const IRREGULAR_VERBS: IrregularVerb[] = [
  V('be', 'was / were', 'been', 'thì, là, ở'),
  V('become', 'became', 'become', 'trở thành'),
  V('begin', 'began', 'begun', 'bắt đầu'),
  V('bend', 'bent', 'bent', 'uốn cong, cúi xuống'),
  V('bet', 'bet', 'bet', 'đánh cược'),
  V('bite', 'bit', 'bitten', 'cắn'),
  V('bleed', 'bled', 'bled', 'chảy máu'),
  V('blow', 'blew', 'blown', 'thổi'),
  V('break', 'broke', 'broken', 'làm vỡ, gãy'),
  V('bring', 'brought', 'brought', 'mang đến'),
  V('build', 'built', 'built', 'xây dựng'),
  V('burn', 'burnt / burned', 'burnt / burned', 'đốt cháy'),
  V('buy', 'bought', 'bought', 'mua'),
  V('catch', 'caught', 'caught', 'bắt, chụp'),
  V('choose', 'chose', 'chosen', 'chọn'),
  V('come', 'came', 'come', 'đến'),
  V('cost', 'cost', 'cost', 'có giá'),
  V('cut', 'cut', 'cut', 'cắt'),
  V('deal', 'dealt', 'dealt', 'giải quyết, xử lý'),
  V('dig', 'dug', 'dug', 'đào'),
  V('do', 'did', 'done', 'làm'),
  V('draw', 'drew', 'drawn', 'vẽ'),
  V('dream', 'dreamt / dreamed', 'dreamt / dreamed', 'mơ'),
  V('drink', 'drank', 'drunk', 'uống'),
  V('drive', 'drove', 'driven', 'lái xe'),
  V('eat', 'ate', 'eaten', 'ăn'),
  V('fall', 'fell', 'fallen', 'rơi, ngã'),
  V('feed', 'fed', 'fed', 'cho ăn'),
  V('feel', 'felt', 'felt', 'cảm thấy'),
  V('fight', 'fought', 'fought', 'chiến đấu, cãi nhau'),
  V('find', 'found', 'found', 'tìm thấy'),
  V('fly', 'flew', 'flown', 'bay'),
  V('forbid', 'forbade', 'forbidden', 'cấm'),
  V('forget', 'forgot', 'forgotten', 'quên'),
  V('forgive', 'forgave', 'forgiven', 'tha thứ'),
  V('freeze', 'froze', 'frozen', 'đóng băng'),
  V('get', 'got', 'got / gotten', 'nhận được, trở nên'),
  V('give', 'gave', 'given', 'cho, đưa'),
  V('go', 'went', 'gone', 'đi'),
  V('grow', 'grew', 'grown', 'lớn lên, trồng'),
  V('hang', 'hung', 'hung', 'treo'),
  V('have', 'had', 'had', 'có'),
  V('hear', 'heard', 'heard', 'nghe thấy'),
  V('hide', 'hid', 'hidden', 'trốn, giấu'),
  V('hit', 'hit', 'hit', 'đánh, đụng'),
  V('hold', 'held', 'held', 'cầm, giữ, tổ chức'),
  V('hurt', 'hurt', 'hurt', 'làm đau'),
  V('keep', 'kept', 'kept', 'giữ'),
  V('know', 'knew', 'known', 'biết'),
  V('lay', 'laid', 'laid', 'đặt, để'),
  V('lead', 'led', 'led', 'dẫn dắt'),
  V('learn', 'learnt / learned', 'learnt / learned', 'học'),
  V('leave', 'left', 'left', 'rời đi, để lại'),
  V('lend', 'lent', 'lent', 'cho mượn'),
  V('let', 'let', 'let', 'để, cho phép'),
  V('lie', 'lay', 'lain', 'nằm'),
  V('lose', 'lost', 'lost', 'mất, thua'),
  V('make', 'made', 'made', 'làm, chế tạo'),
  V('mean', 'meant', 'meant', 'có nghĩa là'),
  V('meet', 'met', 'met', 'gặp'),
  V('pay', 'paid', 'paid', 'trả tiền'),
  V('put', 'put', 'put', 'đặt, để'),
  V('quit', 'quit', 'quit', 'bỏ, nghỉ'),
  V('read', 'read', 'read', 'đọc'),
  V('ride', 'rode', 'ridden', 'cưỡi, đi (xe)'),
  V('ring', 'rang', 'rung', 'reo, gọi điện'),
  V('rise', 'rose', 'risen', 'tăng lên, mọc'),
  V('run', 'ran', 'run', 'chạy'),
  V('say', 'said', 'said', 'nói'),
  V('see', 'saw', 'seen', 'nhìn thấy'),
  V('seek', 'sought', 'sought', 'tìm kiếm'),
  V('sell', 'sold', 'sold', 'bán'),
  V('send', 'sent', 'sent', 'gửi'),
  V('set', 'set', 'set', 'đặt, thiết lập'),
  V('shake', 'shook', 'shaken', 'lắc, rung'),
  V('shine', 'shone', 'shone', 'chiếu sáng'),
  V('shoot', 'shot', 'shot', 'bắn, quay phim'),
  V('show', 'showed', 'shown', 'cho xem'),
  V('shut', 'shut', 'shut', 'đóng'),
  V('sing', 'sang', 'sung', 'hát'),
  V('sink', 'sank', 'sunk', 'chìm'),
  V('sit', 'sat', 'sat', 'ngồi'),
  V('sleep', 'slept', 'slept', 'ngủ'),
  V('speak', 'spoke', 'spoken', 'nói'),
  V('spend', 'spent', 'spent', 'tiêu (tiền), dành (thời gian)'),
  V('spread', 'spread', 'spread', 'lan ra, trải'),
  V('stand', 'stood', 'stood', 'đứng'),
  V('steal', 'stole', 'stolen', 'ăn trộm'),
  V('stick', 'stuck', 'stuck', 'dán, mắc kẹt'),
  V('strike', 'struck', 'struck', 'đánh, đình công'),
  V('swear', 'swore', 'sworn', 'thề, chửi thề'),
  V('swim', 'swam', 'swum', 'bơi'),
  V('take', 'took', 'taken', 'lấy, cầm, mang'),
  V('teach', 'taught', 'taught', 'dạy'),
  V('tear', 'tore', 'torn', 'xé'),
  V('tell', 'told', 'told', 'kể, bảo'),
  V('think', 'thought', 'thought', 'nghĩ'),
  V('throw', 'threw', 'thrown', 'ném'),
  V('understand', 'understood', 'understood', 'hiểu'),
  V('wake', 'woke', 'woken', 'thức dậy, đánh thức'),
  V('wear', 'wore', 'worn', 'mặc, đội, đeo'),
  V('win', 'won', 'won', 'thắng'),
  V('write', 'wrote', 'written', 'viết'),
]

export interface PhrasalVerb {
  phrase: string
  vi: string
  example: string
}

export interface PhrasalGroup {
  verb: string
  items: PhrasalVerb[]
}

const PV = (phrase: string, vi: string, example: string): PhrasalVerb => ({ phrase, vi, example })

export const PHRASAL_VERBS: PhrasalGroup[] = [
  {
    verb: 'get',
    items: [
      PV('get up', 'thức dậy', 'I get up at six every morning.'),
      PV('get along with', 'hòa thuận với', 'She gets along with everyone at work.'),
      PV('get over', 'vượt qua, khỏi (bệnh)', 'It took me a week to get over the flu.'),
      PV('get back', 'trở về', 'When did you get back from Da Nang?'),
      PV('get rid of', 'loại bỏ, vứt bỏ', "Let's get rid of these old boxes."),
      PV('get by', 'xoay xở được', 'We get by on one salary.'),
    ],
  },
  {
    verb: 'take',
    items: [
      PV('take off', 'cất cánh; cởi ra', 'The plane takes off at nine.'),
      PV('take care of', 'chăm sóc', 'Who takes care of your dog when you travel?'),
      PV('take up', 'bắt đầu (một sở thích)', 'He took up running last year.'),
      PV('take over', 'tiếp quản', 'She will take over the project next month.'),
      PV('take after', 'giống (người thân)', 'He takes after his father.'),
    ],
  },
  {
    verb: 'put',
    items: [
      PV('put on', 'mặc vào, đeo vào', 'Put on your coat, it is cold.'),
      PV('put off', 'hoãn lại', "Don't put off your homework until tomorrow."),
      PV('put up with', 'chịu đựng', "I can't put up with this noise any more."),
      PV('put away', 'cất đi', 'Please put away your toys.'),
    ],
  },
  {
    verb: 'look',
    items: [
      PV('look for', 'tìm kiếm', "I'm looking for my keys."),
      PV('look after', 'chăm sóc', 'Can you look after my plants this weekend?'),
      PV('look up', 'tra cứu', 'Look up new words in the dictionary.'),
      PV('look forward to', 'mong chờ', 'I look forward to hearing from you.'),
      PV('look into', 'xem xét, điều tra', "We'll look into the problem."),
      PV('look out', 'coi chừng', 'Look out! A car is coming.'),
    ],
  },
  {
    verb: 'come',
    items: [
      PV('come back', 'quay lại', 'Come back soon!'),
      PV('come up with', 'nghĩ ra', 'She came up with a great idea.'),
      PV('come across', 'tình cờ gặp, thấy', 'I came across an old photo of us.'),
      PV('come in', 'đi vào', 'Come in and sit down.'),
    ],
  },
  {
    verb: 'go',
    items: [
      PV('go on', 'tiếp tục', 'Please go on, I am listening.'),
      PV('go out', 'ra ngoài, đi chơi', "Let's go out for dinner tonight."),
      PV('go over', 'xem lại', "Let's go over the plan once more."),
      PV('go through', 'trải qua', 'She went through a hard time last year.'),
      PV('go off', 'reo (chuông báo)', 'My alarm went off at six.'),
    ],
  },
  {
    verb: 'give',
    items: [
      PV('give up', 'từ bỏ', "Don't give up, you're almost there."),
      PV('give back', 'trả lại', "I'll give back your book tomorrow."),
      PV('give in', 'nhượng bộ', 'In the end, his parents gave in.'),
      PV('give away', 'cho đi, tặng', 'She gave away her old clothes.'),
    ],
  },
  {
    verb: 'turn',
    items: [
      PV('turn on', 'bật', 'Turn on the light, please.'),
      PV('turn off', 'tắt', 'Turn off your phone in the cinema.'),
      PV('turn down', 'từ chối; vặn nhỏ', 'She turned down the job offer.'),
      PV('turn up', 'xuất hiện; vặn to', 'He turned up an hour late.'),
      PV('turn into', 'biến thành', 'The rain turned into snow.'),
    ],
  },
  {
    verb: 'make',
    items: [
      PV('make up', 'làm lành; bịa ra', 'They argued, but they made up the next day.'),
      PV('make out', 'nhìn rõ, nghe rõ', "I can't make out what he is saying."),
    ],
  },
  {
    verb: 'set',
    items: [
      PV('set up', 'thành lập, cài đặt', 'They set up a small company in 2020.'),
      PV('set off', 'khởi hành', 'We set off early to avoid the traffic.'),
    ],
  },
  {
    verb: 'break',
    items: [
      PV('break down', 'hỏng (máy móc)', 'My car broke down on the highway.'),
      PV('break up', 'chia tay', 'They broke up after three years.'),
      PV('break in', 'đột nhập', 'Someone broke in last night.'),
    ],
  },
  {
    verb: 'bring',
    items: [
      PV('bring up', 'nêu ra; nuôi nấng', 'She brought up a good point in the meeting.'),
      PV('bring back', 'gợi lại; mang trả lại', 'This song brings back memories.'),
    ],
  },
  {
    verb: 'run',
    items: [
      PV('run out of', 'hết, cạn', "We've run out of milk."),
      PV('run into', 'tình cờ gặp', 'I ran into my teacher at the market.'),
      PV('run away', 'bỏ chạy, bỏ trốn', 'The cat ran away when it saw the dog.'),
    ],
  },
  {
    verb: 'carry',
    items: [
      PV('carry on', 'tiếp tục', 'Carry on with your work.'),
      PV('carry out', 'thực hiện', 'We carried out a survey of 500 people.'),
    ],
  },
  {
    verb: 'call',
    items: [
      PV('call back', 'gọi lại', "I'll call you back in ten minutes."),
      PV('call off', 'hủy bỏ', 'The match was called off because of the rain.'),
    ],
  },
  {
    verb: 'check',
    items: [
      PV('check in', 'làm thủ tục (khách sạn, sân bay)', 'We checked in at the hotel at two.'),
      PV('check out', 'trả phòng; xem thử', 'We have to check out by noon.'),
    ],
  },
  {
    verb: 'hang',
    items: [
      PV('hang out', 'đi chơi, tụ tập', 'We hang out at the café after class.'),
      PV('hang up', 'cúp máy', 'She hung up before I could answer.'),
      PV('hang on', 'đợi một chút', 'Hang on, I am almost ready.'),
    ],
  },
  {
    verb: 'other everyday ones',
    items: [
      PV('find out', 'phát hiện, tìm ra', 'I found out the truth yesterday.'),
      PV('figure out', 'hiểu ra, tìm ra cách', "I can't figure out how this works."),
      PV('work out', 'tập thể dục; tìm ra cách', 'I work out three times a week.'),
      PV('pick up', 'nhặt lên; đón', "I'll pick you up at seven."),
      PV('fill in', 'điền vào', 'Please fill in this form.'),
      PV('point out', 'chỉ ra', 'She pointed out a mistake in my report.'),
      PV('show up', 'xuất hiện, đến', 'Only five people showed up.'),
      PV('wake up', 'thức dậy', 'I woke up at midnight.'),
      PV('calm down', 'bình tĩnh lại', 'Calm down, everything will be fine.'),
      PV('cheer up', 'vui lên', 'Cheer up! It is not the end of the world.'),
      PV('slow down', 'chậm lại', 'Slow down, you are driving too fast.'),
      PV('catch up with', 'đuổi kịp, bắt kịp', 'Go ahead, I will catch up with you.'),
      PV('keep up with', 'theo kịp', "It's hard to keep up with the news."),
      PV('fall behind', 'tụt lại phía sau', "Don't fall behind with your lessons."),
      PV('drop by', 'ghé qua', 'Drop by if you are in the area.'),
      PV('eat out', 'ăn ở ngoài', "Let's eat out tonight."),
      PV('sign up', 'đăng ký', 'I signed up for an English course.'),
      PV('log in', 'đăng nhập', 'Log in with your email address.'),
    ],
  },
]
