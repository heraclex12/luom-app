// Everyday phrasal verbs grouped by their verb: Vietnamese meaning and an example sentence.

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
      PV('get up', 'dậy, ra khỏi giường', 'I get up at six every morning.'),
      PV('get along with', 'hòa thuận với', 'She gets along with everyone at work.'),
      PV('get over', 'khỏi (bệnh); vượt qua (khó khăn)', 'It took me a week to get over the flu.'),
      PV('get back', 'trở về', 'When did you get back from Da Nang?'),
      PV('get rid of', 'loại bỏ, vứt bỏ', "Let's get rid of these old boxes."),
      PV('get by', 'xoay xở được', 'We get by on one salary.'),
      PV('get out', 'ra ngoài, ra khỏi', 'Get out of the water now!'),
      PV('get in', 'lên (xe hơi); vào', "Get in, I'll drive you home."),
      PV('get on', 'lên (xe buýt, tàu, máy bay)', 'We got on the bus at the first stop.'),
      PV('get off', 'xuống (xe buýt, tàu)', 'Get off at the next station.'),
      PV('get through', 'vượt qua; gọi được (điện thoại)', 'We got through the exam week together.'),
      PV('get away', 'đi nghỉ; trốn thoát', 'We need to get away for a few days.'),
      PV('get around', 'đi lại, di chuyển', 'It is easy to get around Hanoi by motorbike.'),
      PV('get together', 'tụ họp, gặp nhau', "Let's get together after work on Friday."),
      PV('get back to', 'trả lời (ai) sau', "I'll get back to you by Monday."),
      PV('get on with', 'hòa hợp với; tiếp tục làm', 'I get on with my roommate really well.'),
      PV('get down to', 'bắt tay vào (việc)', "Let's get down to business."),
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
      PV('take out', 'lấy ra; đưa (ai) đi chơi', 'Take out your notebooks, please.'),
      PV('take on', 'đảm nhận; tuyển (người)', "I can't take on any more work this week."),
      PV('take back', 'rút lại (lời); trả lại (hàng)', "I take back what I said. I'm sorry."),
      PV('take in', 'hiểu, tiếp thu', 'There was too much information to take in.'),
      PV('take down', 'ghi lại; gỡ xuống', 'Let me take down your phone number.'),
      PV('take away', 'mang đi; lấy đi', 'Two coffees to take away, please.'),
    ],
  },
  {
    verb: 'put',
    items: [
      PV('put on', 'mặc vào, đeo vào', "Put on your coat. It's cold."),
      PV('put off', 'hoãn lại', "Don't put off your homework until tomorrow."),
      PV('put up with', 'chịu đựng', "I can't put up with this noise any more."),
      PV('put away', 'cất đi', 'Please put away your toys.'),
      PV('put up', 'dựng lên, treo lên; cho ở nhờ', 'We put up a tent by the lake.'),
      PV('put out', 'dập tắt', 'Firefighters put out the fire quickly.'),
      PV('put down', 'đặt xuống', 'Put down your phone and listen.'),
      PV('put back', 'để lại chỗ cũ', 'Put the milk back in the fridge.'),
      PV('put in', 'bỏ (công sức, tiền); lắp đặt', 'She put in a lot of work on this.'),
      PV('put together', 'lắp ráp; tập hợp', 'It took two hours to put together the desk.'),
      PV('put forward', 'đề xuất, đưa ra', 'He put forward a new plan.'),
      PV('put through', 'nối máy (điện thoại)', 'Could you put me through to the manager?'),
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
      PV('look back', 'nhìn lại (quá khứ)', 'Looking back, I was very lucky.'),
      PV('look around', 'nhìn quanh; đi xem quanh', 'We looked around the old town.'),
      PV('look over', 'xem qua, kiểm tra', 'Can you look over my essay?'),
      PV('look down on', 'coi thường', "Don't look down on people with less money."),
      PV('look up to', 'kính trọng, ngưỡng mộ', 'I have always looked up to my aunt.'),
      PV('look out for', 'để ý; trông chừng', 'Look out for pickpockets on the bus.'),
    ],
  },
  {
    verb: 'come',
    items: [
      PV('come back', 'quay lại', 'Come back soon!'),
      PV('come up with', 'nghĩ ra', 'She came up with a great idea.'),
      PV('come across', 'tình cờ gặp, thấy', 'I came across an old photo of us.'),
      PV('come in', 'đi vào', 'Come in and sit down.'),
      PV('come up', 'nảy sinh; được nhắc đến', 'Something came up, so I have to leave.'),
      PV('come out', 'ra mắt, phát hành; lộ ra', 'Her new album comes out next week.'),
      PV('come on', 'thôi nào; nhanh lên', "Come on, we're going to be late!"),
      PV('come down', 'đi xuống; giảm xuống', 'Prices have come down a lot.'),
      PV('come over', 'ghé chơi (nhà ai)', 'Come over for dinner on Saturday.'),
      PV('come along', 'đi cùng; tiến triển', 'Do you want to come along?'),
      PV('come through', 'được duyệt (giấy tờ); vượt qua', 'My visa finally came through.'),
      PV('come around', 'đổi ý, xuôi theo; ghé chơi', 'She was angry at first, but she came around.'),
      PV('come about', 'xảy ra', 'How did this problem come about?'),
      PV('come down with', 'bị (ốm nhẹ)', "I think I'm coming down with a cold."),
    ],
  },
  {
    verb: 'go',
    items: [
      PV('go on', 'tiếp tục; xảy ra', 'Please go on, I am listening.'),
      PV('go out', 'ra ngoài, đi chơi', "Let's go out for dinner tonight."),
      PV('go over', 'xem lại', "Let's go over the plan once more."),
      PV('go through', 'trải qua', 'She went through a hard time last year.'),
      PV('go off', 'reo (chuông báo)', 'My alarm went off at six.'),
      PV('go back', 'quay lại, trở về', 'I want to go back to Hoi An someday.'),
      PV('go down', 'giảm; đi xuống', 'The price of petrol went down.'),
      PV('go up', 'tăng lên; đi lên', 'Rents go up every year.'),
      PV('go ahead', 'cứ làm đi; tiến hành', 'Go ahead and start without me.'),
      PV('go in', 'đi vào', "It's raining, let's go in."),
      PV('go away', 'hết (đau); đi khỏi', 'The headache finally went away.'),
      PV('go around', 'đủ chia; lan truyền', 'Is there enough cake to go around?'),
      PV('go along with', 'đồng ý, làm theo', 'I went along with their plan.'),
      PV('go with', 'hợp với', 'Does this tie go with my shirt?'),
      PV('go by', 'trôi qua', 'Time goes by so fast.'),
      PV('go out with', 'hẹn hò với', "She's been going out with Nam for a year."),
    ],
  },
  {
    verb: 'give',
    items: [
      PV('give up', 'từ bỏ', "Don't give up, you're almost there."),
      PV('give back', 'trả lại', "I'll give back your book tomorrow."),
      PV('give in', 'nhượng bộ', 'In the end, his parents gave in.'),
      PV('give away', 'cho đi, tặng', 'She gave away her old clothes.'),
      PV('give out', 'phát cho; hết, kiệt (sức)', 'The teacher gave out the test papers.'),
      PV('give off', 'tỏa ra (mùi, khói, nhiệt)', 'The flowers give off a sweet smell.'),
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
      PV('turn out', 'hóa ra', 'The test turned out to be easy.'),
      PV('turn around', 'quay lại, xoay người lại', 'Turn around and look at me.'),
      PV('turn back', 'quay lại, quay về', 'The road was closed, so we turned back.'),
      PV('turn over', 'lật lại', 'Turn over the paper and begin.'),
      PV('turn to', 'tìm đến (để nhờ giúp)', 'You can always turn to me for help.'),
      PV('turn in', 'nộp; đi ngủ', 'Turn in your homework by Friday.'),
    ],
  },
  {
    verb: 'make',
    items: [
      PV('make up', 'làm lành; bịa ra', 'They argued, but they made up the next day.'),
      PV('make out', 'nhìn rõ, nghe rõ', "I can't make out what he is saying."),
      PV('make up for', 'bù đắp', "I'll make up for being late."),
    ],
  },
  {
    verb: 'set',
    items: [
      PV('set up', 'thành lập, cài đặt', 'They set up a small company in 2020.'),
      PV('set off', 'khởi hành', 'We set off early to avoid the traffic.'),
      PV('set out', 'lên đường; bắt đầu (làm gì)', 'We set out at dawn.'),
      PV('set about', 'bắt tay vào làm', 'She set about cleaning the kitchen.'),
      PV('set aside', 'để dành ra', 'I set aside some money every month.'),
    ],
  },
  {
    verb: 'break',
    items: [
      PV('break down', 'hỏng (máy móc)', 'My car broke down on the highway.'),
      PV('break up', 'chia tay', 'They broke up after three years.'),
      PV('break in', 'đột nhập', 'Someone broke in last night.'),
      PV('break out', 'bùng nổ, bùng phát', 'A fire broke out in the night.'),
      PV('break off', 'cắt đứt; ngắt (lời)', 'They broke off their engagement.'),
      PV('break into', 'đột nhập vào', 'Thieves broke into our car.'),
    ],
  },
  {
    verb: 'bring',
    items: [
      PV('bring up', 'nêu ra; nuôi nấng', 'She brought up a good point in the meeting.'),
      PV('bring back', 'gợi lại; mang trả lại', 'This song brings back memories.'),
      PV('bring in', 'đem lại (thu nhập); mang vào', 'The new shop brings in good money.'),
      PV('bring out', 'làm nổi bật; ra mắt (sản phẩm)', 'That colour brings out your eyes.'),
      PV('bring about', 'gây ra, mang lại', 'The internet brought about huge changes.'),
      PV('bring down', 'hạ xuống, giảm', 'We need to bring down our costs.'),
    ],
  },
  {
    verb: 'run',
    items: [
      PV('run out of', 'hết, cạn', "We've run out of milk."),
      PV('run into', 'tình cờ gặp', 'I ran into my teacher at the market.'),
      PV('run away', 'bỏ chạy, bỏ trốn', 'The cat ran away when it saw the dog.'),
      PV('run out', 'hết; hết hạn', 'Hurry, time is running out.'),
    ],
  },
  {
    verb: 'keep',
    items: [
      PV('keep up with', 'theo kịp', "It's hard to keep up with the news."),
      PV('keep up', 'duy trì; theo kịp', 'Keep up the good work!'),
      PV('keep on', 'cứ tiếp tục', 'She kept on talking during the film.'),
      PV('keep away', 'tránh xa', 'Keep away from the edge.'),
    ],
  },
  {
    verb: 'hold',
    items: [
      PV('hold on', 'đợi một chút; giữ chặt', 'Hold on, let me check.'),
      PV('hold up', 'làm chậm trễ; giơ lên', "Sorry I'm late. I got held up in traffic."),
      PV('hold out', 'chìa ra; cầm cự', 'He held out his hand to me.'),
      PV('hold back', 'kìm lại, ngăn lại', 'She held back her tears.'),
    ],
  },
  {
    verb: 'pick',
    items: [
      PV('pick up', 'đón (ai); nhặt lên', "I'll pick you up at seven."),
      PV('pick out', 'chọn ra', 'Help me pick out a gift for Mum.'),
      PV('pick on', 'bắt nạt, chọc ghẹo', 'Stop picking on your little brother.'),
    ],
  },
  {
    verb: 'work',
    items: [
      PV('work out', 'tập thể dục; tìm ra cách', 'I work out three times a week.'),
      PV('work on', 'làm, cải thiện (việc gì)', "I'm working on my pronunciation."),
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
      PV('call out', 'gọi to', 'She called out my name across the street.'),
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
      PV('hang around', 'la cà, quanh quẩn', 'Kids hang around the park after school.'),
    ],
  },
  {
    verb: 'pull',
    items: [
      PV('pull out', 'rút ra; rút lui', 'He pulled out his wallet.'),
      PV('pull up', 'dừng (xe); kéo lên', 'A taxi pulled up outside the hotel.'),
      PV('pull over', 'tấp (xe) vào lề', 'The police told us to pull over.'),
      PV('pull off', 'làm được (việc khó)', 'Nobody thought she could pull it off.'),
    ],
  },
  {
    verb: 'sit',
    items: [
      PV('sit down', 'ngồi xuống', 'Please sit down and make yourself at home.'),
      PV('sit up', 'ngồi thẳng (lưng); ngồi dậy', 'Sit up straight, please.'),
      PV('sit back', 'ngồi thoải mái, thư giãn', 'Sit back and enjoy the show.'),
    ],
  },
  {
    verb: 'stand',
    items: [
      PV('stand up', 'đứng dậy', 'Everyone stood up when she came in.'),
      PV('stand out', 'nổi bật', 'Her red dress really stood out.'),
      PV('stand for', 'viết tắt của; ủng hộ', 'What does "ASAP" stand for?'),
      PV('stand up for', 'bênh vực, bảo vệ', 'Stand up for what you believe in.'),
      PV('stand by', 'ủng hộ; sẵn sàng', "I'll stand by you no matter what."),
    ],
  },
  {
    verb: 'move',
    items: [
      PV('move on', 'chuyển sang; bước tiếp', "Let's move on to the next topic."),
      PV('move in', 'dọn đến ở', 'We moved in last week.'),
      PV('move out', 'dọn đi', "She moved out of her parents' house."),
    ],
  },
  {
    verb: 'catch',
    items: [
      PV('catch up with', 'đuổi kịp, bắt kịp', 'Go ahead, I will catch up with you.'),
      PV('catch up', 'hàn huyên; bắt kịp', "Let's meet for coffee and catch up."),
      PV('catch on', 'trở nên phổ biến; hiểu ra', 'The new app caught on quickly.'),
    ],
  },
  {
    verb: 'cut',
    items: [
      PV('cut off', 'ngắt (cuộc gọi); cắt (điện, nước)', 'We got cut off in the middle of the call.'),
      PV('cut down on', 'cắt giảm', "I'm trying to cut down on sugar."),
      PV('cut in', 'chen ngang', "Sorry to cut in, but it's time to go."),
      PV('cut out', 'bỏ hẳn; cắt ra', 'He cut out fried food completely.'),
    ],
  },
  {
    verb: 'fall',
    items: [
      PV('fall behind', 'tụt lại phía sau', "Don't fall behind with your lessons."),
      PV('fall apart', 'rã ra, hỏng; tan vỡ', 'My old shoes are falling apart.'),
      PV('fall down', 'ngã xuống', 'She fell down the stairs.'),
      PV('fall out', 'cãi nhau, bất hòa; rụng (tóc, răng)', 'They fell out over money.'),
      PV('fall for', 'phải lòng; mắc lừa', 'He fell for her at first sight.'),
      PV('fall through', 'đổ bể, không thành', 'Our holiday plans fell through.'),
    ],
  },
  {
    verb: 'drop',
    items: [
      PV('drop by', 'ghé qua', 'Drop by if you are in the area.'),
      PV('drop off', 'thả (ai) xuống; ngủ thiếp đi', 'Can you drop me off at the station?'),
      PV('drop out', 'bỏ học, bỏ ngang', 'He dropped out of college.'),
    ],
  },
  {
    verb: 'fill',
    items: [
      PV('fill in', 'điền vào', 'Please fill in this form.'),
      PV('fill out', 'điền (đơn, mẫu)', 'Fill out the application online.'),
      PV('fill up', 'đổ đầy', 'Fill up the tank, please.'),
    ],
  },
  {
    verb: 'show',
    items: [
      PV('show up', 'xuất hiện, đến', 'Only five people showed up.'),
      PV('show off', 'khoe khoang', 'He loves to show off his new car.'),
      PV('show around', 'dẫn đi tham quan', "I'll show you around the office."),
    ],
  },
  {
    verb: 'pass',
    items: [
      PV('pass on', 'chuyển (lời, tin)', "I'll pass on your message."),
      PV('pass away', 'qua đời', 'His grandfather passed away last year.'),
      PV('pass out', 'ngất xỉu', 'She passed out from the heat.'),
    ],
  },
  {
    verb: 'hand',
    items: [
      PV('hand in', 'nộp (bài, đơn)', 'Hand in your essays on Monday.'),
      PV('hand out', 'phát (cho mọi người)', 'She handed out the menus.'),
      PV('hand over', 'giao lại, bàn giao', 'He handed over the keys to the new owner.'),
    ],
  },
  {
    verb: 'pay',
    items: [
      PV('pay back', 'trả lại (tiền)', "I'll pay you back next week."),
      PV('pay off', 'được đền đáp; trả hết (nợ)', 'All your hard work will pay off.'),
    ],
  },
  {
    verb: 'send',
    items: [
      PV('send out', 'gửi đi (hàng loạt)', 'We sent out the invitations today.'),
      PV('send back', 'gửi trả lại', 'The soup was cold, so I sent it back.'),
    ],
  },
  {
    verb: 'lay',
    items: [
      PV('lay off', 'sa thải, cho nghỉ việc', 'The factory laid off 200 workers.'),
      PV('lay out', 'bày ra; trình bày', 'She laid out all the papers on the table.'),
    ],
  },
  {
    verb: 'write',
    items: [
      PV('write down', 'ghi lại', 'Write down the address before you forget it.'),
      PV('write back', 'viết thư trả lời', 'She wrote back the same day.'),
    ],
  },
  {
    verb: 'throw',
    items: [
      PV('throw away', 'vứt đi', "Don't throw away those boxes."),
      PV('throw out', 'vứt bỏ; đuổi ra', 'We threw out the old sofa.'),
      PV('throw up', 'nôn, ói', 'He felt sick and threw up.'),
    ],
  },
  {
    verb: 'shut',
    items: [
      PV('shut down', 'đóng cửa; tắt (máy)', 'The factory shut down last year.'),
      PV('shut up', 'im miệng (bất lịch sự)', 'He told his brother to shut up.'),
    ],
  },
  {
    verb: 'settle',
    items: [
      PV('settle down', 'ổn định (cuộc sống); bình tĩnh lại', 'They want to settle down and have kids.'),
      PV('settle in', 'quen với chỗ mới', 'Have you settled in at your new job?'),
    ],
  },
  {
    verb: 'try',
    items: [
      PV('try on', 'mặc thử', 'Can I try on these shoes?'),
      PV('try out', 'dùng thử', 'I want to try out the new camera.'),
    ],
  },
  {
    verb: 'sign',
    items: [
      PV('sign up', 'đăng ký', 'I signed up for an English course.'),
      PV('sign in', 'đăng nhập; ký tên khi vào', 'Sign in with your Google account.'),
    ],
  },
  {
    verb: 'log',
    items: [
      PV('log in', 'đăng nhập', 'Log in with your email address.'),
      PV('log out', 'đăng xuất', 'Remember to log out on shared computers.'),
    ],
  },
  {
    verb: 'leave',
    items: [
      PV('leave out', 'bỏ sót, loại ra', "Don't leave out any details."),
      PV('leave behind', 'bỏ lại, để quên', 'I left my umbrella behind on the bus.'),
    ],
  },
  {
    verb: 'other everyday ones',
    items: [
      PV('find out', 'phát hiện, tìm ra', 'I found out the truth yesterday.'),
      PV('figure out', 'hiểu ra, tìm ra cách', "I can't figure out how this works."),
      PV('point out', 'chỉ ra', 'She pointed out a mistake in my report.'),
      PV('grow up', 'lớn lên', 'I grew up in a small town near Hue.'),
      PV('end up', 'rốt cuộc, cuối cùng thì', 'We ended up staying at home.'),
      PV('wake up', 'thức giấc, tỉnh giấc', 'I woke up at midnight.'),
      PV('calm down', 'bình tĩnh lại', 'Calm down, everything will be fine.'),
      PV('cheer up', 'vui lên', 'Cheer up! It is not the end of the world.'),
      PV('slow down', 'chậm lại', 'Slow down, you are driving too fast.'),
      PV('hurry up', 'nhanh lên', "Hurry up, or we'll miss the bus!"),
      PV('clean up', 'dọn dẹp', 'Clean up your room before dinner.'),
      PV('sort out', 'giải quyết; sắp xếp', "Don't worry, we'll sort it out."),
      PV('deal with', 'giải quyết, xử lý', "I'll deal with this problem tomorrow."),
      PV('count on', 'trông cậy vào', 'You can always count on me.'),
      PV('stick to', 'giữ đúng, bám sát', "Let's stick to the plan."),
      PV('open up', 'mở lòng; mở ra', 'It took time for him to open up to us.'),
      PV('reach out', 'liên hệ, chủ động tìm đến', 'Feel free to reach out if you have questions.'),
      PV('follow up', 'liên hệ lại, theo dõi tiếp', "I'll follow up with an email tomorrow."),
      PV('kick off', 'bắt đầu (cuộc họp, sự kiện)', "Let's kick off with some good news."),
      PV('wrap up', 'kết thúc, hoàn tất', "Let's wrap up the meeting here."),
      PV('sum up', 'tóm tắt', 'To sum up, the project was a success.'),
      PV('rule out', 'loại trừ', 'The doctor ruled out a broken bone.'),
      PV('step down', 'từ chức', 'The CEO stepped down last month.'),
      PV('back up', 'sao lưu; ủng hộ', 'Always back up your files.'),
      PV('plug in', 'cắm điện', 'Plug in your laptop. The battery is low.'),
      PV('print out', 'in ra', 'Can you print out the tickets?'),
      PV('top up', 'nạp thêm tiền', 'I need to top up my phone.'),
      PV('start over', 'làm lại từ đầu', 'I made a mistake, so I started over.'),
      PV('think over', 'suy nghĩ kỹ', 'Take a few days to think it over.'),
      PV('mix up', 'nhầm lẫn', 'I always mix up their names.'),
      PV('build up', 'tích tụ, tăng dần', 'Stress can build up over time.'),
      PV('line up', 'xếp hàng', 'People lined up outside the bakery.'),
      PV('speed up', 'tăng tốc, đẩy nhanh', 'Can we speed up the process?'),
      PV('speak up', 'nói to lên; lên tiếng', "Please speak up. I can't hear you."),
      PV('brush up on', 'ôn lại, trau dồi lại', 'I need to brush up on my English before the trip.'),
      PV('stay up', 'thức khuya', 'I stayed up late to finish the report.'),
      PV('sleep in', 'ngủ nướng', 'I like to sleep in on Sundays.'),
      PV('warm up', 'khởi động; hâm nóng', 'Always warm up before you exercise.'),
      PV('burn out', 'kiệt sức (vì làm quá nhiều)', "Take breaks so you don't burn out."),
      PV('let down', 'làm thất vọng', "Don't let me down."),
      PV('save up', 'để dành tiền', "I'm saving up for a new laptop."),
      PV('shop around', 'so sánh giá nhiều nơi', 'Shop around before you buy a new phone.'),
      PV('eat out', 'ăn ở ngoài', "Let's eat out tonight."),
      PV('dress up', 'ăn diện; hóa trang', "You don't need to dress up for the party."),
      PV('see off', 'tiễn (ai)', 'My family came to see me off at the airport.'),
      PV('ask out', 'rủ đi hẹn hò', 'He finally asked her out.'),
      PV('fit in', 'hòa nhập', 'It was hard to fit in at my new school.'),
      PV('join in', 'tham gia cùng', 'Everyone joined in the singing.'),
      PV('blow up', 'thổi phồng (bóng bay); nổ tung', 'Help me blow up these balloons.'),
      PV('mess up', 'làm hỏng, làm rối', 'I messed up the interview.'),
      PV('walk out', 'bỏ đi (giữa chừng)', 'He walked out in the middle of the meeting.'),
    ],
  },
]
