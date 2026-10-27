export interface Deck {
  id: string;
  title: string;
  description: string;
  icon: string;
  created_at: string;
}

export interface Card {
  id: string;
  deck_id: string;
  phrase_en: string;
  ipa: string;
  meaning_vi: string;
  sentence_en: string;
  sentence_vi: string;
  context_note: string;
  box: number; // 1 to 5
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
  last_practiced_at: string | null;
}

const nowIso = new Date().toISOString();

export const SEED_DECKS: Deck[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Phản xạ Giao tiếp Hàng ngày",
    description:
      "Các cụm từ tự nhiên dùng mỗi ngày giúp bạn bật ra ý ngay lập tức không cần dịch từng chữ.",
    icon: "Zap",
    created_at: nowIso,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Tiếng Anh Công sở & Họp hành",
    description:
      "Cụm từ chuyên nghiệp để thảo luận dự án, báo cáo tiến độ, đồng tình hoặc phản biện khéo léo.",
    icon: "Briefcase",
    created_at: nowIso,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Du lịch & Sân bay",
    description:
      "Tình huống thực tế khi làm thủ tục bay, đặt phòng khách sạn, gọi món và hỏi đường ở nước ngoài.",
    icon: "Plane",
    created_at: nowIso,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    title: "Small Talk & Kết bạn",
    description:
      "Mở lời tự nhiên, duy trì cuộc trò chuyện thú vị và kết nối với bạn bè, đồng nghiệp quốc tế.",
    icon: "Users",
    created_at: nowIso,
  },
];

export const SEED_CARDS: Card[] = [
  // DECK 1: Phản xạ Giao tiếp Hàng ngày (8 cards)
  {
    id: "10000000-0000-4000-8000-000000000001",
    deck_id: "11111111-1111-4111-8111-111111111111",
    phrase_en: "make up my mind",
    ipa: "/meɪk ʌp maɪ maɪnd/",
    meaning_vi: "đưa ra quyết định",
    sentence_en: "I haven't made up my mind yet.",
    sentence_vi: "Tôi vẫn chưa đưa ra quyết định nữa.",
    context_note:
      'Dùng khi bạn đang phân vân giữa các lựa chọn thay vì nói "I didn\'t decide".',
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    deck_id: "11111111-1111-4111-8111-111111111111",
    phrase_en: "take a rain check",
    ipa: "/teɪk ə reɪn tʃek/",
    meaning_vi: "hẹn dịp khác nhé",
    sentence_en: "Can I take a rain check on dinner tonight?",
    sentence_vi: "Tối nay mình hẹn ăn tối dịp khác được không?",
    context_note:
      "Cách từ chối lịch sự lời mời của ai đó và ngụ ý muốn hẹn lại lần sau.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    deck_id: "11111111-1111-4111-8111-111111111111",
    phrase_en: "slip my mind",
    ipa: "/slɪp maɪ maɪnd/",
    meaning_vi: "quên khuấy đi mất",
    sentence_en: "Sorry, it completely slipped my mind!",
    sentence_vi: "Xin lỗi nhé, tôi hoàn toàn quên khuấy đi mất!",
    context_note:
      'Tự nhiên hơn rất nhiều so với "I forgot it" khi bạn vô tình quên một việc nhỏ.',
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    deck_id: "11111111-1111-4111-8111-111111111111",
    phrase_en: "play it by ear",
    ipa: "/pleɪ ɪt baɪ ɪr/",
    meaning_vi: "tùy cơ ứng biến / tới đó tính tiếp",
    sentence_en: "Let's just play it by ear this weekend.",
    sentence_vi: "Cuối tuần này cứ tùy cơ ứng biến đi nhé.",
    context_note:
      "Dùng khi chưa muốn lên kế hoạch cố định mà xem tình hình thực tế rồi mới quyết.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    deck_id: "11111111-1111-4111-8111-111111111111",
    phrase_en: "grab a bite",
    ipa: "/ɡræb ə baɪt/",
    meaning_vi: "ăn lót dạ / kiếm gì ăn nhanh",
    sentence_en: "Do you want to grab a bite after work?",
    sentence_vi: "Tan làm xong bạn có muốn đi kiếm gì ăn nhanh không?",
    context_note:
      "Cụm từ rủ đi ăn nhẹ nhàng, thân mật với bạn bè hoặc đồng nghiệp.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    deck_id: "11111111-1111-4111-8111-111111111111",
    phrase_en: "sleep on it",
    ipa: "/sliːp ɑːn ɪt/",
    meaning_vi: "suy nghĩ thêm qua đêm",
    sentence_en: "It's a big decision, so let me sleep on it.",
    sentence_vi: "Đây là một quyết định lớn, để tôi suy nghĩ thêm đến mai nhé.",
    context_note:
      "Dùng khi ai đó cần câu trả lời quan trọng nhưng bạn muốn thêm thời gian cân nhắc.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000007",
    deck_id: "11111111-1111-4111-8111-111111111111",
    phrase_en: "better late than never",
    ipa: "/ˈbetər leɪt ðæn ˈnevər/",
    meaning_vi: "muộn còn hơn không",
    sentence_en: "You finally made it! Better late than never.",
    sentence_vi: "Cuối cùng bạn cũng tới rồi! Muộn còn hơn không.",
    context_note:
      "Câu nói vui vẻ khi ai đó đến trễ hoặc hoàn thành việc gì đó muộn.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "10000000-0000-4000-8000-000000000008",
    deck_id: "11111111-1111-4111-8111-111111111111",
    phrase_en: "up to you",
    ipa: "/ʌp tuː juː/",
    meaning_vi: "tùy bạn quyết định đấy",
    sentence_en: "I'm fine with anything, so it's totally up to you.",
    sentence_vi: "Tôi sao cũng được hết, nên hoàn toàn tùy bạn quyết định đấy.",
    context_note:
      "Phản xạ cực nhanh khi được hỏi chọn món ăn, địa điểm hoặc phương án.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },

  // DECK 2: Tiếng Anh Công sở & Họp hành (8 cards)
  {
    id: "20000000-0000-4000-8000-000000000001",
    deck_id: "22222222-2222-4222-8222-222222222222",
    phrase_en: "on the same page",
    ipa: "/ɑːn ðə seɪm peɪdʒ/",
    meaning_vi: "cùng chung quan điểm / hiểu thống nhất",
    sentence_en: "Let's make sure we are all on the same page before we start.",
    sentence_vi:
      "Hãy đảm bảo tất cả chúng ta đều hiểu thống nhất trước khi bắt đầu nhé.",
    context_note:
      "Câu kinh điển trong các cuộc họp để xác nhận mọi người không hiểu lệch ý nhau.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    deck_id: "22222222-2222-4222-8222-222222222222",
    phrase_en: "keep me in the loop",
    ipa: "/kiːp mi ɪn ðə luːp/",
    meaning_vi: "cập nhật thông tin cho tôi với nhé",
    sentence_en: "Please keep me in the loop as the project progresses.",
    sentence_vi:
      "Vui lòng cập nhật thông tin cho tôi khi dự án triển khai nhé.",
    context_note:
      "Dùng khi nhắn đồng nghiệp hoặc cấp dưới nhớ báo tình hình liên tục.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    deck_id: "22222222-2222-4222-8222-222222222222",
    phrase_en: "wrap things up",
    ipa: "/ræp θɪŋz ʌp/",
    meaning_vi: "tổng kết / khép lại công việc",
    sentence_en: "We're running out of time, so let's wrap things up.",
    sentence_vi:
      "Chúng ta sắp hết giờ rồi, hãy khép lại buổi họp tại đây nhé.",
    context_note:
      "Dùng cuối buổi họp hoặc cuối ngày làm việc để kết thúc gọn gàng.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    deck_id: "22222222-2222-4222-8222-222222222222",
    phrase_en: "swamped with work",
    ipa: "/swɑːmpt wɪð wɜːrk/",
    meaning_vi: "bận ngập đầu với công việc",
    sentence_en: "I'd love to help, but I'm totally swamped with work today.",
    sentence_vi:
      "Tôi rất muốn giúp nhưng hôm nay tôi bận ngập đầu với công việc rồi.",
    context_note:
      "Cách từ chối khéo khi đồng nghiệp nhờ thêm việc lúc bạn đang quá tải.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "20000000-0000-4000-8000-000000000005",
    deck_id: "22222222-2222-4222-8222-222222222222",
    phrase_en: "touch base",
    ipa: "/tʌtʃ beɪs/",
    meaning_vi: "trao đổi ngắn / cập nhật nhanh",
    sentence_en: "Let's touch base tomorrow morning about the client proposal.",
    sentence_vi:
      "Sáng mai chúng ta trao đổi nhanh về bản đề xuất cho khách hàng nhé.",
    context_note:
      "Rất phổ biến trong môi trường quốc tế khi muốn hẹn nói chuyện 5-10 phút.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "20000000-0000-4000-8000-000000000006",
    deck_id: "22222222-2222-4222-8222-222222222222",
    phrase_en: "get the ball rolling",
    ipa: "/ɡet ðə bɔːl ˈroʊlɪŋ/",
    meaning_vi: "bắt đầu khởi động công việc",
    sentence_en: "Everyone is here, so let's get the ball rolling.",
    sentence_vi:
      "Mọi người đều có mặt đủ rồi, chúng ta bắt đầu buổi họp thôi.",
    context_note:
      "Dùng để mở đầu cuộc họp hoặc khởi chạy một dự án mới đầy năng lượng.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "20000000-0000-4000-8000-000000000007",
    deck_id: "22222222-2222-4222-8222-222222222222",
    phrase_en: "circle back",
    ipa: "/ˈsɜːrkəl bæk/",
    meaning_vi: "quay lại bàn vấn đề này sau",
    sentence_en: "Let's circle back to this issue after we have more data.",
    sentence_vi:
      "Hãy quay lại bàn vấn đề này sau khi chúng ta có thêm dữ liệu nhé.",
    context_note:
      "Giúp cuộc họp không bị sa đà vào một chi tiết chưa có đủ thông tin.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "20000000-0000-4000-8000-000000000008",
    deck_id: "22222222-2222-4222-8222-222222222222",
    phrase_en: "call it a day",
    ipa: "/kɔːl ɪt ə deɪ/",
    meaning_vi: "nghỉ tay kết thúc ngày làm việc",
    sentence_en: "We've made great progress, let's call it a day.",
    sentence_vi:
      "Chúng ta đã đạt tiến độ rất tốt rồi, hôm nay nghỉ tay tại đây thôi.",
    context_note:
      "Câu nói thân thiện lúc tan tầm để rủ cả nhóm đóng máy nghỉ ngơi.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },

  // DECK 3: Du lịch & Sân bay (7 cards)
  {
    id: "30000000-0000-4000-8000-000000000001",
    deck_id: "33333333-3333-4333-8333-333333333333",
    phrase_en: "aisle seat",
    ipa: "/aɪl siːt/",
    meaning_vi: "ghế ngồi cạnh lối đi",
    sentence_en: "Could I get an aisle seat instead of a window seat, please?",
    sentence_vi:
      "Cho tôi xin ghế ngồi cạnh lối đi thay vì ghế cửa sổ được không ạ?",
    context_note:
      'Lưu ý chữ "s" trong "aisle" là âm câm (/aɪl/). Dùng tại quầy check-in sân bay.',
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    deck_id: "33333333-3333-4333-8333-333333333333",
    phrase_en: "carry-on luggage",
    ipa: "/ˈkæri ɑːn ˈlʌɡɪdʒ/",
    meaning_vi: "hành lý xách tay",
    sentence_en: "I only have this backpack as my carry-on luggage.",
    sentence_vi: "Tôi chỉ có chiếc ba lô này làm hành lý xách tay thôi.",
    context_note: 'Phân biệt với "checked baggage" là hành lý ký gửi.',
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    deck_id: "33333333-3333-4333-8333-333333333333",
    phrase_en: "boarding pass",
    ipa: "/ˈbɔːrdɪŋ pæs/",
    meaning_vi: "thẻ lên máy bay",
    sentence_en: "Please have your passport and boarding pass ready.",
    sentence_vi:
      "Xin vui lòng chuẩn bị sẵn hộ chiếu và thẻ lên máy bay của quý khách.",
    context_note:
      "Cụm từ bạn sẽ nghe liên tục ở cửa an ninh và cổng ra máy bay (boarding gate).",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    deck_id: "33333333-3333-4333-8333-333333333333",
    phrase_en: "check in early",
    ipa: "/tʃek ɪn ˈɜːrli/",
    meaning_vi: "nhận phòng sớm",
    sentence_en: "Is it possible to check in early if the room is ready?",
    sentence_vi: "Liệu có thể nhận phòng sớm nếu phòng đã dọn xong không ạ?",
    context_note:
      "Hỏi lễ tân khách sạn khi chuyến bay của bạn hạ cánh sớm hơn giờ nhận phòng chuẩn.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "30000000-0000-4000-8000-000000000005",
    deck_id: "33333333-3333-4333-8333-333333333333",
    phrase_en: "within walking distance",
    ipa: "/wɪˈðɪn ˈwɔːkɪŋ ˈdɪstəns/",
    meaning_vi: "ở gần có thể đi bộ tới được",
    sentence_en: "Is the metro station within walking distance from here?",
    sentence_vi:
      "Trạm tàu điện ngầm có ở gần đây để đi bộ tới được không bạn?",
    context_note:
      "Cực kỳ hữu ích khi hỏi đường người bản xứ hoặc lễ tân khách sạn.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "30000000-0000-4000-8000-000000000006",
    deck_id: "33333333-3333-4333-8333-333333333333",
    phrase_en: "keep the change",
    ipa: "/kiːp ðə tʃeɪndʒ/",
    meaning_vi: "cứ giữ lại tiền thừa nhé",
    sentence_en: "Here's twenty dollars, please keep the change.",
    sentence_vi: "Đây là 20 đô la, bạn cứ giữ lại tiền thừa nhé.",
    context_note:
      "Dùng khi trả tiền taxi hoặc thanh toán ở nhà hàng có văn hóa tiền tip.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "30000000-0000-4000-8000-000000000007",
    deck_id: "33333333-3333-4333-8333-333333333333",
    phrase_en: "split the bill",
    ipa: "/splɪt ðə bɪl/",
    meaning_vi: "chia đôi / chia đều hóa đơn",
    sentence_en: "Excuse me, could we split the bill, please?",
    sentence_vi: "Xin lỗi, tụi mình có thể chia hóa đơn tính riêng được không ạ?",
    context_note:
      "Dùng khi đi ăn nhóm và muốn nhà hàng tách thanh toán cho từng người.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },

  // DECK 4: Small Talk & Kết bạn (7 cards)
  {
    id: "40000000-0000-4000-8000-000000000001",
    deck_id: "44444444-4444-4444-8444-444444444444",
    phrase_en: "how have you been",
    ipa: "/haʊ hæv juː bɪn/",
    meaning_vi: "dạo này bạn thế nào rồi",
    sentence_en: "Hey! Long time no see, how have you been?",
    sentence_vi: "Chào! Lâu quá không gặp, dạo này bạn thế nào rồi?",
    context_note:
      'Dùng hỏi thăm người đã quen biết từ trước (khác với "How are you" dùng chung chung).',
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "40000000-0000-4000-8000-000000000002",
    deck_id: "44444444-4444-4444-8444-444444444444",
    phrase_en: "catch up over coffee",
    ipa: "/kætʃ ʌp ˈoʊvər ˈkɔːfi/",
    meaning_vi: "đi cà phê hàn huyên cập nhật tình hình",
    sentence_en: "We should definitely catch up over coffee sometime soon.",
    sentence_vi:
      "Hôm nào gần đây tụi mình nhất định phải đi cà phê hàn huyên nhé.",
    context_note:
      "Câu kết tuyệt vời khi gặp lại bạn cũ mà cả hai đang bận chưa nói chuyện lâu được.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "40000000-0000-4000-8000-000000000003",
    deck_id: "44444444-4444-4444-8444-444444444444",
    phrase_en: "what brings you here",
    ipa: "/wʌt brɪŋz juː hɪr/",
    meaning_vi: "cơn gió nào đưa bạn tới đây thế",
    sentence_en: "It's great to meet you! What brings you here to Vietnam?",
    sentence_vi: "Rất vui được gặp bạn! Điều gì đưa bạn đến với Việt Nam thế?",
    context_note:
      'Cách mở lời cực kỳ lịch sự và tự nhiên hơn hẳn câu "Why are you here?".',
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "40000000-0000-4000-8000-000000000004",
    deck_id: "44444444-4444-4444-8444-444444444444",
    phrase_en: "rings a bell",
    ipa: "/rɪŋz ə bel/",
    meaning_vi: "nghe quen quen",
    sentence_en: "His name rings a bell, but I can't remember where we met.",
    sentence_vi: "Tên anh ấy nghe quen lắm, nhưng tôi không nhớ đã gặp ở đâu rồi.",
    context_note:
      "Dùng khi ai đó nhắc tới tên người hoặc địa điểm mà bạn thấy quen quen nhưng chưa nhớ rõ.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "40000000-0000-4000-8000-000000000005",
    deck_id: "44444444-4444-4444-8444-444444444444",
    phrase_en: "have a lot in common",
    ipa: "/hæv ə lɑːt ɪn ˈkɑːmən/",
    meaning_vi: "có nhiều điểm chung",
    sentence_en: "It turns out we have a lot in common!",
    sentence_vi: "Hóa ra chúng mình lại có nhiều điểm chung đến vậy!",
    context_note:
      "Tạo thiện cảm ngay lập tức khi phát hiện cả hai cùng thích một sở thích hay quan điểm.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "40000000-0000-4000-8000-000000000006",
    deck_id: "44444444-4444-4444-8444-444444444444",
    phrase_en: "do for fun",
    ipa: "/duː fɔːr fʌn/",
    meaning_vi: "lúc rảnh thường làm gì cho vui",
    sentence_en: "Outside of work, what do you usually do for fun?",
    sentence_vi: "Ngoài giờ làm việc ra, bạn thường làm gì để giải trí?",
    context_note:
      'Tự nhiên hơn rất nhiều so với câu hỏi sách giáo khoa "What is your hobby?".',
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
  {
    id: "40000000-0000-4000-8000-000000000007",
    deck_id: "44444444-4444-4444-8444-444444444444",
    phrase_en: "stay in touch",
    ipa: "/steɪ ɪn tʌtʃ/",
    meaning_vi: "giữ liên lạc nhé",
    sentence_en: "Let's exchange numbers so we can stay in touch.",
    sentence_vi: "Mình trao đổi số điện thoại đi để còn giữ liên lạc nhé.",
    context_note:
      "Dùng khi chia tay người mới quen tại sự kiện, hội thảo hoặc chuyến đi.",
    box: 1,
    interval_days: 0,
    ease_factor: 2.5,
    next_review_at: nowIso,
    last_practiced_at: null,
  },
];
