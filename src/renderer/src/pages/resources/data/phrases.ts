// Everyday phrases by situation, with the Vietnamese.

export interface PhraseSituation {
  id: string
  title: string
  phrases: { en: string; vi: string }[]
}

const F = (en: string, vi: string): { en: string; vi: string } => ({ en, vi })

export const PHRASES: PhraseSituation[] = [
  {
    id: 'smalltalk',
    title: 'Small talk',
    phrases: [
      F("How's it going?", 'Dạo này thế nào?'),
      F('Long time no see!', 'Lâu rồi không gặp!'),
      F('What have you been up to?', 'Dạo này bạn làm gì?'),
      F('What do you do?', 'Bạn làm nghề gì?'),
      F('Where are you from?', 'Bạn đến từ đâu?'),
      F('Nice to meet you.', 'Rất vui được gặp bạn.'),
      F('Have a good weekend!', 'Cuối tuần vui vẻ nhé!'),
      F('Take care!', 'Bảo trọng nhé!'),
    ],
  },
  {
    id: 'work',
    title: 'At work',
    phrases: [
      F('Could you send me the file?', 'Bạn gửi tôi tệp đó được không?'),
      F("I'll get back to you by Friday.", 'Tôi sẽ phản hồi bạn trước thứ Sáu.'),
      F('Can we reschedule the meeting?', 'Chúng ta dời cuộc họp được không?'),
      F("Sorry, I'm running a bit late.", 'Xin lỗi, tôi đến trễ một chút.'),
      F('Please find the report attached.', 'Báo cáo được đính kèm theo thư.'),
      F('Let me check and get back to you.', 'Để tôi kiểm tra rồi báo lại bạn.'),
      F("What's the deadline?", 'Hạn chót là khi nào?'),
      F('Thanks for your help.', 'Cảm ơn bạn đã giúp.'),
    ],
  },
  {
    id: 'travel',
    title: 'Travel',
    phrases: [
      F("Where's the nearest station?", 'Nhà ga gần nhất ở đâu?'),
      F('How much is a ticket to the airport?', 'Vé ra sân bay bao nhiêu tiền?'),
      F('I have a reservation under the name Nguyen.', 'Tôi đã đặt phòng dưới tên Nguyễn.'),
      F('Is breakfast included?', 'Có bao gồm bữa sáng không?'),
      F('Could you take a photo of us?', 'Bạn chụp giúp chúng tôi một tấm ảnh được không?'),
      F("I'm lost. Can you help me?", 'Tôi bị lạc. Bạn giúp tôi được không?'),
      F('What time does the train leave?', 'Mấy giờ tàu chạy?'),
    ],
  },
  {
    id: 'shopping',
    title: 'Shopping and eating out',
    phrases: [
      F('Can I try this on?', 'Tôi mặc thử cái này được không?'),
      F('Do you have this in a smaller size?', 'Cái này có cỡ nhỏ hơn không?'),
      F('How much does this cost?', 'Cái này giá bao nhiêu?'),
      F('Can I pay by card?', 'Tôi trả bằng thẻ được không?'),
      F('A table for two, please.', 'Cho tôi một bàn hai người.'),
      F("I'm allergic to peanuts.", 'Tôi bị dị ứng đậu phộng.'),
      F('Could we have the bill, please?', 'Cho chúng tôi tính tiền nhé.'),
    ],
  },
  {
    id: 'phone',
    title: 'On the phone and asking for help',
    phrases: [
      F('Hello, this is Lan speaking.', 'A lô, Lan nghe đây.'),
      F('Could I speak to Mr. Smith, please?', 'Cho tôi gặp ông Smith được không?'),
      F('Can I leave a message?', 'Tôi để lại lời nhắn được không?'),
      F('Sorry, I didn’t catch that.', 'Xin lỗi, tôi chưa nghe rõ.'),
      F('Could you speak a bit more slowly?', 'Bạn nói chậm hơn một chút được không?'),
      F('How do you spell that?', 'Từ đó đánh vần thế nào?'),
      F('What does this word mean?', 'Từ này nghĩa là gì?'),
    ],
  },
]
