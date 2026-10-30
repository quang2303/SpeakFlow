// Script to generate rich seed data for SpeakFlow
const fs = require('fs');
const path = require('path');

const DECKS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Giao tiếp Công sở & Họp hành",
    description: "Báo cáo tiến độ, giải quyết sự cố, chốt deadline và cách trình bày ý kiến lịch sự, thuyết phục.",
    icon: "Briefcase"
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Kỹ thuật, IT & Vận hành Hệ thống",
    description: "Trao đổi Daily Standup, xử lý lỗi hệ thống, deploy phần mềm và giải thích kỹ thuật cho đối tác.",
    icon: "Terminal"
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Hành chính công & Giao tiếp Khách hàng",
    description: "Hướng dẫn thủ tục, tiếp nhận yêu cầu, giải thích giấy tờ và giữ thái độ lịch sự, chuyên nghiệp.",
    icon: "FileText"
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    title: "Phỏng vấn Xin việc & Deal Lương",
    description: "Giới thiệu bản thân, chia sẻ kinh nghiệm thực tế, ứng biến tình huống và đàm phán đãi ngộ.",
    icon: "Award"
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    title: "Small Talk & Kết bạn Hàng ngày",
    description: "Bắt chuyện làm quen, nói về kế hoạch cuối tuần, bày tỏ cảm xúc và giữ mạch trò chuyện tự nhiên.",
    icon: "Zap"
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    title: "Du lịch, Sân bay & Xử lý tình huống khẩn cấp",
    description: "Làm thủ tục sân bay, đặt bàn, hỏi đường, mua sắm và xử lý tình huống phát sinh khẩn cấp.",
    icon: "Plane"
  }
];

// 18 cards per deck = 108 cards total
const CARDS_DECK_1 = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    phrase_en: "catch up on",
    ipa: "/kætʃ ʌp ɑːn/",
    meaning_vi: "bắt kịp tiến độ / làm bù việc tồn đọng",
    sentence_en: "I need to catch up on some urgent emails before the meeting.",
    sentence_vi: "Tôi cần tranh thủ trả lời mấy email gấp trước giờ họp.",
    context_note: "Dùng khi bạn bị dồn việc hoặc lỡ dở tiến độ và cần dành thời gian hoàn thành bù.",
    variations: [
      "Let's catch up on the project status first thing tomorrow morning.",
      "I spent the whole weekend trying to catch up on my reading."
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    phrase_en: "run behind schedule",
    ipa: "/rʌn bɪˈhaɪnd ˈskedʒuːl/",
    meaning_vi: "bị trễ hạn / chậm so với tiến độ dự kiến",
    sentence_en: "We are running slightly behind schedule, but we will make it by Friday.",
    sentence_vi: "Chúng ta đang hơi chậm tiến độ một chút, nhưng chắc chắn sẽ kịp hạn thứ Sáu.",
    context_note: "Cách thông báo trễ tiến độ chuyên nghiệp và giảm nhẹ cảm giác tiêu cực so với 'we are late'.",
    variations: [
      "The keynote speech is running twenty minutes behind schedule.",
      "If we don't start right now, the entire sprint will run behind schedule."
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    phrase_en: "touch base with",
    ipa: "/tʌtʃ beɪs wɪð/",
    meaning_vi: "trao đổi nhanh / liên hệ cập nhật tình hình",
    sentence_en: "Let me touch base with the design team and get back to you.",
    sentence_vi: "Để tôi trao đổi nhanh với bên thiết kế rồi phản hồi lại bạn nhé.",
    context_note: "Cụm từ cửa miệng trong văn phòng phương Tây khi muốn hẹn nói chuyện ngắn gọn 5-10 phút.",
    variations: [
      "I just wanted to touch base with you regarding next week's presentation.",
      "Can we touch base for five minutes before you leave today?"
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    phrase_en: "bring to the table",
    ipa: "/brɪŋ tuː ðə ˈteɪbl/",
    meaning_vi: "đóng góp giá trị / mang lại lợi thế độc đáo",
    sentence_en: "What unique skills does their team bring to the table?",
    sentence_vi: "Đội ngũ của họ mang lại những lợi thế đặc biệt nào cho dự án?",
    context_note: "Thường dùng khi đánh giá năng lực ứng viên hoặc giá trị của đối tác trong cuộc thương thảo.",
    variations: [
      "She brings years of enterprise sales experience to the table.",
      "We need to clarify exactly what value this partnership brings to the table."
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    phrase_en: "look into the matter",
    ipa: "/lʊk ˈɪntuː ðə ˈmætər/",
    meaning_vi: "kiểm tra / xem xét kỹ vấn đề",
    sentence_en: "I will look into the matter immediately and give you an update.",
    sentence_vi: "Tôi sẽ trực tiếp kiểm tra vấn đề này ngay và cập nhật lại cho bạn.",
    context_note: "Phản hồi chuẩn mực khi nhận được khiếu nại hoặc sự cố từ cấp trên hoặc khách hàng.",
    variations: [
      "Our support lead is looking into the payment failure matter right now.",
      "Could you please look into why the contract hasn't been signed yet?"
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    phrase_en: "keep everyone in the loop",
    ipa: "/kiːp ˈevriwʌn ɪn ðə luːp/",
    meaning_vi: "cập nhật liên tục cho mọi người / không để ai bị thiếu thông tin",
    sentence_en: "Please keep everyone in the loop by sending a daily recap email.",
    sentence_vi: "Nhớ gửi email tóm tắt mỗi ngày để cập nhật thông tin đồng đều cho cả nhóm nhé.",
    context_note: "Dùng để nhắc nhở việc chia sẻ thông tin tiến độ công việc giữa các phòng ban.",
    variations: [
      "Don't worry, I will make sure to keep you in the loop as things develop.",
      "Loop me in whenever the client replies with their final decision."
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000007",
    phrase_en: "on the same page",
    ipa: "/ɑːn ðə seɪm peɪdʒ/",
    meaning_vi: "thống nhất quan điểm / hiểu cùng một hướng",
    sentence_en: "Let's make sure we are all on the same page before we talk to the client.",
    sentence_vi: "Cả nhóm mình hãy chắc chắn đã hiểu cùng một hướng trước khi gặp khách hàng.",
    context_note: "Cực kỳ phổ biến đầu các cuộc họp nội bộ để căn chỉnh lại mục tiêu và kỳ vọng.",
    variations: [
      "Are we on the same page regarding the project budget?",
      "I called this short huddle to ensure product and engineering are on the same page."
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000008",
    phrase_en: "call it a day",
    ipa: "/kɔːl ɪt ə deɪ/",
    meaning_vi: "hôm nay dừng ở đây thôi / kết thúc ca làm",
    sentence_en: "We've made great progress today, let's call it a day and rest.",
    sentence_vi: "Hôm nay tiến độ rất tốt rồi, chúng ta kết thúc ở đây để nghỉ ngơi nhé.",
    context_note: "Câu nói tự nhiên cuối ngày làm việc hoặc khi cuộc họp đã đạt đủ mục tiêu đề ra.",
    variations: [
      "It's already past seven, let's call it a day and pick this up tomorrow.",
      "I'm exhausted from staring at code all afternoon, let's call it a day."
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000009",
    phrase_en: "follow up on",
    ipa: "/ˈfɑːloʊ ʌp ɑːn/",
    meaning_vi: "theo dõi tiếp / hỏi lại tiến độ công việc đã bàn",
    sentence_en: "I am writing to follow up on our discussion from yesterday's sync.",
    sentence_vi: "Tôi gửi thư này để tiếp tục trao đổi về nội dung chúng ta đã thống nhất hôm qua.",
    context_note: "Câu mở đầu chuẩn mực và lịch thiệp số 1 cho các email công việc.",
    variations: [
      "I'll follow up on the vendor proposal by Thursday afternoon.",
      "Just following up on my previous message to see if you had any questions."
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000010",
    phrase_en: "tight schedule",
    ipa: "/taɪt ˈskedʒuːl/",
    meaning_vi: "lịch trình rất gấp / thời gian eo hẹp",
    sentence_en: "We are working on a very tight schedule this sprint, so every hour counts.",
    sentence_vi: "Đợt sprint này lịch trình cực kỳ gấp gáp, từng giờ từng phút đều rất quý.",
    context_note: "Dùng để giải thích lý do cần ưu tiên giải quyết công việc khẩn trương.",
    variations: [
      "Despite our tight schedule, the quality of delivery remained outstanding.",
      "Can we streamline this approval flow? We are on a very tight schedule."
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000011",
    phrase_en: "wrap up the meeting",
    ipa: "/ræp ʌp ðə ˈmiːtɪŋ/",
    meaning_vi: "chốt lại cuộc họp / kết thúc phiên làm việc",
    sentence_en: "Let's wrap up the meeting by reviewing everyone's assigned tasks.",
    sentence_vi: "Hãy chốt lại cuộc họp bằng việc điểm lại nhiệm vụ được giao của từng người.",
    context_note: "Dùng khi người điều phối muốn tổng kết và cho mọi người rời phòng họp.",
    variations: [
      "We have five minutes left, so let's wrap things up quickly.",
      "The facilitator wrapped up the meeting with clear milestones."
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000012",
    phrase_en: "get straight to the point",
    ipa: "/ɡet streɪt tuː ðə pɔɪnt/",
    meaning_vi: "đi thẳng vào vấn đề chính",
    sentence_en: "Since our time is limited, allow me to get straight to the point.",
    sentence_vi: "Vì thời gian có hạn, tôi xin phép được đi thẳng vào trọng tâm vấn đề.",
    context_note: "Rất được ưa chuộng khi báo cáo cấp quản lý bận rộn, bỏ qua phần rào đón dài dòng.",
    variations: [
      "I appreciate how you always get straight to the point in negotiations.",
      "No need for pleasantries, let's get straight to the point of why this failed."
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000013",
    phrase_en: "play devil's advocate",
    ipa: "/pleɪ ˈdevlz ˈædvəkət/",
    meaning_vi: "đưa ra góc nhìn phản biện / lật ngược vấn đề",
    sentence_en: "Just to play devil's advocate, what happens if our primary server goes down?",
    sentence_vi: "Tôi xin đưa ra phản biện một chút, chuyện gì sẽ xảy ra nếu máy chủ chính bị sập?",
    context_note: "Cách lịch sự mở lời khi muốn nêu rủi ro mà không mang tính công kích cá nhân.",
    variations: [
      "Let me play devil's advocate here: is this feature truly essential for users?",
      "Playing devil's advocate helps the product team anticipate hidden pitfalls."
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000014",
    phrase_en: "circle back to",
    ipa: "/ˈsɜːrkl bæk tuː/",
    meaning_vi: "quay lại thảo luận việc này sau",
    sentence_en: "Let's table that discussion for now and circle back to it after lunch.",
    sentence_vi: "Tạm thời gác chuyện đó lại, đầu giờ chiều chúng ta sẽ quay lại thảo luận tiếp.",
    context_note: "Giữ cho cuộc họp không bị lạc đề khi có một ý kiến phát sinh cần nhiều thời gian.",
    variations: [
      "Can we circle back to your pricing question at the end of the demo?",
      "I will circle back to you once I receive approval from executive leadership."
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000015",
    phrase_en: "put on hold",
    ipa: "/pʊt ɑːn hoʊld/",
    meaning_vi: "tạm gác lại / hoãn thi hành",
    sentence_en: "The marketing campaign was put on hold until Q3 due to budget cuts.",
    sentence_vi: "Chiến dịch quảng bá đã bị tạm hoãn tới quý 3 do công ty cắt giảm ngân sách.",
    context_note: "Diễn đạt việc một kế hoạch bị dừng tạm thời mà không phải là bị hủy vĩnh viễn.",
    variations: [
      "We decided to put the redesign project on hold for the time being.",
      "The hiring process was put on hold pending leadership review."
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000016",
    phrase_en: "weigh the pros and cons",
    ipa: "/weɪ ðə proʊz ænd kɑːnz/",
    meaning_vi: "cân nhắc kỹ mặt lợi và mặt hại",
    sentence_en: "We should carefully weigh the pros and cons before committing to this vendor.",
    sentence_vi: "Chúng ta nên cân nhắc kỹ các mặt lợi hại trước khi ký kết với nhà cung cấp này.",
    context_note: "Cụm từ đắt giá trong các buổi phân tích rủi ro và ra quyết định chiến lược.",
    variations: [
      "After weighing the pros and cons, the board chose cloud migration.",
      "Take some time tonight to weigh the pros and cons of both offers."
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000017",
    phrase_en: "reach a consensus",
    ipa: "/riːtʃ ə kənˈsensəs/",
    meaning_vi: "đạt được sự đồng thuận chung",
    sentence_en: "It took over two hours, but we finally reached a consensus on the launch date.",
    sentence_vi: "Mất hơn hai tiếng đồng hồ, nhưng cuối cùng chúng tôi đã đồng thuận về ngày ra mắt.",
    context_note: "Thể hiện kết quả tích cực khi tất cả các bên tham gia cuộc họp đều thống nhất ý chí.",
    variations: [
      "The committee failed to reach a consensus regarding the salary structure.",
      "Our main objective today is to reach a consensus across all stakeholders."
    ]
  },
  {
    id: "10000000-0000-4000-8000-000000000018",
    phrase_en: "action items",
    ipa: "/ˈækʃn ˈaɪtəmz/",
    meaning_vi: "các đầu việc cần triển khai ngay sau họp",
    sentence_en: "Who is responsible for tracking the action items from today's retrospective?",
    sentence_vi: "Ai sẽ là người phụ trách theo dõi các đầu việc phát sinh từ buổi họp hôm nay?",
    context_note: "Từ vựng chuyên nghiệp bậc nhất trong quản trị dự án hiện đại (Agile/Scrum).",
    variations: [
      "I have summarized all three action items in the Slack channel.",
      "Let's review our open action items before introducing new feature requests."
    ]
  }
];

const CARDS_DECK_2 = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    phrase_en: "deploy to production",
    ipa: "/dɪˈplɔɪ tuː prəˈdʌkʃn/",
    meaning_vi: "đưa phần mềm lên môi trường thực tế (production)",
    sentence_en: "We are scheduled to deploy the new checkout feature to production at midnight.",
    sentence_vi: "Chúng tôi dự kiến sẽ đưa tính năng thanh toán mới lên production vào nửa đêm nay.",
    context_note: "Thao tác đưa phiên bản phần mềm chính thức tới tay người dùng cuối.",
    variations: [
      "Never deploy to production on Friday afternoon without a solid rollback plan.",
      "The pipeline automatically runs automated tests before deploying to production."
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    phrase_en: "fix a critical bug",
    ipa: "/fɪks ə ˈkrɪtɪkl bʌɡ/",
    meaning_vi: "sửa một lỗi hệ thống cực kỳ nghiêm trọng",
    sentence_en: "The entire backend team worked overnight to fix a critical bug in authentication.",
    sentence_vi: "Cả nhóm backend đã thức trắng đêm để sửa một lỗi cực kỳ nghiêm trọng trong khâu đăng nhập.",
    context_note: "Dùng khi sự cố ảnh hưởng trực tiếp đến người dùng và cần ưu tiên xử lý lập tức.",
    variations: [
      "We just pushed a hotfix to fix a critical bug affecting user payments.",
      "Did QA confirm that the patch successfully fixed the critical bug?"
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    phrase_en: "check server logs",
    ipa: "/tʃek ˈsɜːrvər lɔːɡz/",
    meaning_vi: "kiểm tra nhật ký hoạt động của máy chủ",
    sentence_en: "Whenever you encounter a 500 internal error, check the server logs first.",
    sentence_vi: "Bất cứ khi nào gặp mã lỗi 500, việc đầu tiên bạn cần làm là kiểm tra log máy chủ.",
    context_note: "Hành động cơ bản nhất của kỹ sư khi điều tra nguyên nhân sự cố kỹ thuật.",
    variations: [
      "I checked the server logs and noticed multiple memory overflow warnings.",
      "Could you check the server logs to see which API endpoint timed out?"
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    phrase_en: "optimize performance",
    ipa: "/ˈɑːptɪmaɪz pərˈfɔːrməns/",
    meaning_vi: "tối ưu hóa hiệu năng và tốc độ xử lý",
    sentence_en: "We refactored the database queries to optimize performance under heavy load.",
    sentence_vi: "Chúng tôi đã viết lại các câu truy vấn để tối ưu hóa hiệu năng khi lượng tải tăng cao.",
    context_note: "Dùng khi cải thiện tốc độ tải trang, giảm tiêu hao RAM hoặc tăng thông lượng hệ thống.",
    variations: [
      "Adding Redis cache helped us optimize page rendering performance significantly.",
      "Our team is focusing this quarter on optimizing API response performance."
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000005",
    phrase_en: "rollback the deployment",
    ipa: "/ˈroʊlbæk ðə dɪˈplɔɪmənt/",
    meaning_vi: "khôi phục lại phiên bản cũ khi bản mới gặp lỗi",
    sentence_en: "If error rates exceed two percent, we will immediately rollback the deployment.",
    sentence_vi: "Nếu tỷ lệ lỗi vượt quá hai phần trăm, chúng ta sẽ lập tức rollback về bản cũ.",
    context_note: "Kế hoạch an toàn để giảm thiểu thời gian gián đoạn dịch vụ khi bản cập nhật lỗi.",
    variations: [
      "The DevOps lead decided to rollback the deployment due to database migration conflicts.",
      "Our automated deployment script can rollback the deployment in under thirty seconds."
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000006",
    phrase_en: "run into a glitch",
    ipa: "/rʌn ˈɪntuː ə ɡlɪtʃ/",
    meaning_vi: "gặp sự cố gián đoạn nhỏ ngoài ý muốn",
    sentence_en: "Users on mobile devices ran into a slight glitch during checkout earlier today.",
    sentence_vi: "Người dùng trên điện thoại vừa gặp một lỗi trục trặc nhỏ trong bước thanh toán sáng nay.",
    context_note: "Từ 'glitch' chỉ các lỗi kỹ thuật nhỏ mang tính tạm thời, tự nhiên hơn từ 'mistake'.",
    variations: [
      "We ran into a minor network glitch while syncing client files.",
      "Don't panic if you run into a display glitch, simply refresh your browser window."
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000007",
    phrase_en: "root cause",
    ipa: "/ruːt kɔːz/",
    meaning_vi: "nguyên nhân gốc rễ của sự cố",
    sentence_en: "Our post-mortem report identified a database deadlock as the true root cause.",
    sentence_vi: "Báo cáo mổ xẻ sự cố đã chỉ ra tình trạng khóa chết cơ sở dữ liệu chính là nguyên nhân gốc rễ.",
    context_note: "Luôn dùng trong các buổi họp hậu sự cố (Post-mortem / Incident Review).",
    variations: [
      "Fixing the symptoms without identifying the root cause will lead to repeated outages.",
      "The engineering team is still investigating the root cause of the memory spike."
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000008",
    phrase_en: "from scratch",
    ipa: "/frʌm skrætʃ/",
    meaning_vi: "làm lại từ đầu / từ con số không",
    sentence_en: "The legacy codebase was so tangled that we chose to rewrite it from scratch.",
    sentence_vi: "Mã nguồn cũ rối rắm đến mức chúng tôi quyết định viết lại toàn bộ từ đầu.",
    context_note: "Rất hay gặp khi nói về việc xây dựng một module mới hoặc làm lại sản phẩm.",
    variations: [
      "Building a custom AI model from scratch requires tremendous training resources.",
      "He designed the whole frontend framework completely from scratch."
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000009",
    phrase_en: "bottleneck",
    ipa: "/ˈbɑːtlnek/",
    meaning_vi: "điểm nghẽn cổ chai / chỗ làm chậm toàn bộ hệ thống",
    sentence_en: "Slow disk write speed turned out to be the main bottleneck in our data pipeline.",
    sentence_vi: "Tốc độ ghi đĩa quá chậm hóa ra lại là điểm nghẽn cổ chai lớn nhất trong đường ống xử lý dữ liệu.",
    context_note: "Áp dụng được cho cả phần cứng, thuật toán lẫn quy trình làm việc của con người.",
    variations: [
      "Waiting for manual QA testing has become the biggest bottleneck in our release cycle.",
      "We introduced asynchronous worker queues to eliminate the processing bottleneck."
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000010",
    phrase_en: "high latency",
    ipa: "/haɪ ˈleɪtnsi/",
    meaning_vi: "độ trễ phản hồi cao / mạng phản hồi chậm",
    sentence_en: "Customers in Asia experienced high latency due to an undersea cable disruption.",
    sentence_vi: "Khách hàng tại châu Á gặp phải độ trễ rất cao do sự cố đứt cáp quang biển.",
    context_note: "Thuật ngữ cốt lõi khi đo đạc tốc độ mạng và thời gian phản hồi máy chủ (Ping/RTT).",
    variations: [
      "High latency directly hurts user conversion rates on e-commerce platforms.",
      "Edge caching nodes were deployed across multiple regions to combat high latency."
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000011",
    phrase_en: "push the commit",
    ipa: "/pʊʃ ðə kəˈmɪt/",
    meaning_vi: "đẩy các thay đổi mã nguồn lên kho lưu trữ (Git)",
    sentence_en: "Make sure you run the linter and unit tests before you push the commit.",
    sentence_vi: "Nhớ chạy kiểm tra định dạng và unit test cẩn thận trước khi đẩy commit lên nhé.",
    context_note: "Hành động hàng ngày của lập trình viên khi sử dụng hệ thống kiểm soát phiên bản Git.",
    variations: [
      "I just pushed the commit that fixes the broken navbar animation.",
      "You cannot push the commit directly to the protected main branch."
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000012",
    phrase_en: "single point of failure",
    ipa: "/ˈsɪŋɡl pɔɪnt əv ˈfeɪljər/",
    meaning_vi: "điểm yếu chí mạng đơn lẻ (hỏng là sập cả hệ thống)",
    sentence_en: "Relying on a single payment gateway creates a dangerous single point of failure.",
    sentence_vi: "Việc chỉ phụ thuộc vào một cổng thanh toán duy nhất sẽ tạo ra một điểm yếu chí mạng.",
    context_note: "Khái niệm sống còn trong thiết kế kiến trúc phần mềm chịu lỗi (High Availability).",
    variations: [
      "We configured multi-zone replication to eliminate any single point of failure.",
      "Is there a single point of failure in our current cloud infrastructure?"
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000013",
    phrase_en: "seamless integration",
    ipa: "/ˈsiːmləs ˌɪntɪˈɡreɪʃn/",
    meaning_vi: "tích hợp liền mạch / hoạt động mượt mà không xung đột",
    sentence_en: "The SDK offers seamless integration with existing authentication providers.",
    sentence_vi: "Bộ công cụ SDK cung cấp khả năng tích hợp liền mạch với các nhà cung cấp định danh hiện có.",
    context_note: "Từ 'seamless' dùng để khen ngợi trải nghiệm kết nối các hệ thống công nghệ trơn tru.",
    variations: [
      "Our goal is to achieve seamless integration between mobile and desktop clients.",
      "The webhook enables seamless integration with third-party logistics software."
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000014",
    phrase_en: "back up the database",
    ipa: "/bæk ʌp ðə ˈdeɪtəbeɪs/",
    meaning_vi: "sao lưu dự phòng cơ sở dữ liệu",
    sentence_en: "Always back up the database before running heavy schema migrations.",
    sentence_vi: "Luôn luôn phải sao lưu dữ liệu trước khi chạy các lệnh nâng cấp cấu trúc bảng lớn.",
    context_note: "Quy tắc an toàn bất di bất dịch của mọi kỹ sư quản trị hệ thống.",
    variations: [
      "The automated cron job backs up the production database every six hours.",
      "Did we verify that the backed up database can be successfully restored?"
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000015",
    phrase_en: "reproduce the issue",
    ipa: "/ˌriːprəˈduːs ði ˈɪʃuː/",
    meaning_vi: "tái hiện lại lỗi để tìm nguyên nhân",
    sentence_en: "Could you provide exact steps so our QA engineers can reproduce the issue?",
    sentence_vi: "Bạn có thể gửi các bước cụ thể để đội ngũ kiểm thử có thể tái hiện lại lỗi được không?",
    context_note: "Câu cửa miệng của kỹ sư phần mềm khi tiếp nhận thông báo lỗi từ người dùng.",
    variations: [
      "I was finally able to reproduce the intermittent memory leak issue locally.",
      "Without clear error logs, it is practically impossible to reproduce the issue."
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000016",
    phrase_en: "out of service",
    ipa: "/aʊt əv ˈsɜːrvɪs/",
    meaning_vi: "ngừng hoạt động / tạm thời gián đoạn dịch vụ",
    sentence_en: "The staging environment will be temporarily out of service for maintenance.",
    sentence_vi: "Môi trường thử nghiệm sẽ tạm thời ngừng hoạt động để bảo trì hệ thống.",
    context_note: "Dùng để thông báo việc một máy chủ hay dịch vụ bị gián đoạn hoạt động có kế hoạch.",
    variations: [
      "One of our core payment microservices went out of service for twenty minutes.",
      "All impacted servers are back online after being out of service this morning."
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000017",
    phrase_en: "technical debt",
    ipa: "/ˈteknɪkl det/",
    meaning_vi: "nợ kỹ thuật (mã viết vội cần sửa đổi sau)",
    sentence_en: "We need to allocate twenty percent of our sprint capacity to pay down technical debt.",
    sentence_vi: "Chúng ta cần dành ra hai mươi phần trăm thời lượng của sprint để xử lý các món nợ kỹ thuật.",
    context_note: "Khái niệm cực kỳ thông dụng khi nói về việc dọn dẹp mã nguồn chắp vá cũ.",
    variations: [
      "Accumulating too much technical debt will eventually halt feature development.",
      "Refactoring this legacy authentication module eliminates significant technical debt."
    ]
  },
  {
    id: "20000000-0000-4000-8000-000000000018",
    phrase_en: "scale up",
    ipa: "/skeɪl ʌp/",
    meaning_vi: "mở rộng quy mô chịu tải của hệ thống",
    sentence_en: "We configured the cluster to automatically scale up during Black Friday traffic spikes.",
    sentence_vi: "Chúng tôi đã cấu hình cụm máy chủ tự động mở rộng tài nguyên trong dịp bão đơn Black Friday.",
    context_note: "Thuật ngữ quan trọng trong điện toán đám mây (Cloud Auto-scaling).",
    variations: [
      "Our infrastructure is designed to scale up effortlessly to millions of concurrent users.",
      "The database instance was scaled up to handle the increased query throughput."
    ]
  }
];

const CARDS_DECK_3 = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    phrase_en: "fill out this form",
    ipa: "/fɪl aʊt ðɪs fɔːrm/",
    meaning_vi: "điền vào mẫu đơn này",
    sentence_en: "Please fill out this registration form and sign at the bottom.",
    sentence_vi: "Xin vui lòng điền vào tờ khai đăng ký này và ký tên ở phía dưới cùng.",
    context_note: "Mẫu câu hướng dẫn cơ bản nhất tại các quầy thủ tục hành chính và ngân hàng.",
    variations: [
      "Make sure you fill out this form accurately using block capital letters.",
      "You can fill out this form online beforehand to save waiting time."
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    phrase_en: "verify your citizen ID",
    ipa: "/ˈverɪfaɪ jʊr ˈsɪtɪzn aɪˈdiː/",
    meaning_vi: "xác minh căn cước công dân / định danh cá nhân",
    sentence_en: "May I see your original passport or chip-based citizen ID to verify your identity?",
    sentence_vi: "Tôi có thể xem hộ chiếu gốc hoặc căn cước công dân gắn chip để xác minh danh tính được không?",
    context_note: "Dùng khi đối chiếu giấy tờ tùy thân của công dân hoặc khách hàng làm thủ tục.",
    variations: [
      "The officer took a minute to scan and verify my citizen ID.",
      "Biometric data will be used to verify your citizen ID securely."
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    phrase_en: "process your request",
    ipa: "/ˈprɑːses jʊr rɪˈkwest/",
    meaning_vi: "tiếp nhận và xử lý yêu cầu của bạn",
    sentence_en: "It will take approximately three business days to fully process your request.",
    sentence_vi: "Sẽ mất khoảng ba ngày làm việc để hoàn tất việc xử lý yêu cầu của quý khách.",
    context_note: "Cách phản hồi chuẩn mực, trang trọng và lịch thiệp với khách hàng công chúng.",
    variations: [
      "We are currently processing your request and will notify you via SMS.",
      "Due to high volume, it might take a bit longer to process your request."
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    phrase_en: "please bear with me",
    ipa: "/pliːz ber wɪð miː/",
    meaning_vi: "xin quý khách vui lòng thông cảm đợi tôi một chút",
    sentence_en: "The system is loading a bit slowly today, so please bear with me for a moment.",
    sentence_vi: "Hôm nay hệ thống đang tải hơi chậm, xin quý khách vui lòng kiên nhẫn đợi tôi một lát.",
    context_note: "Cách xoa dịu khách hàng cực kỳ lịch thiệp khi gặp trục trặc kỹ thuật hoặc tra cứu hồ sơ lâu.",
    variations: [
      "Please bear with me while I retrieve your archival documents from the system.",
      "Thank you for bearing with us during this scheduled service transition."
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000005",
    phrase_en: "step-by-step guidance",
    ipa: "/step baɪ step ˈɡaɪdns/",
    meaning_vi: "hướng dẫn chi tiết từng bước một",
    sentence_en: "Our public portal provides clear step-by-step guidance for business registration.",
    sentence_vi: "Cổng dịch vụ công của chúng tôi có phần hướng dẫn chi tiết từng bước để đăng ký kinh doanh.",
    context_note: "Dùng khi giải thích một quy trình gồm nhiều bước phức tạp cho người dân.",
    variations: [
      "The desk officer offered friendly, step-by-step guidance throughout the procedure.",
      "Follow the step-by-step guidance in this handbook to renew your driver's license."
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000006",
    phrase_en: "required documents",
    ipa: "/rɪˈkwaɪərd ˈdɑːkjumənts/",
    meaning_vi: "các giấy tờ hồ sơ bắt buộc theo quy định",
    sentence_en: "Please double-check that you have brought all the required documents listed on the checklist.",
    sentence_vi: "Xin vui lòng kiểm tra lại xem bạn đã mang đủ tất cả các giấy tờ bắt buộc theo danh mục chưa.",
    context_note: "Cụm danh từ quan trọng nhất trong việc tiếp nhận hồ sơ hành chính.",
    variations: [
      "Missing any of the required documents will delay your application process.",
      "All required documents must be submitted in clear, readable copies."
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000007",
    phrase_en: "certified copy",
    ipa: "/ˈsɜːrtɪfaɪd ˈkɑːpi/ ",
    meaning_vi: "bản sao y có công chứng chứng thực",
    sentence_en: "You need to submit one original document along with two certified copies.",
    sentence_vi: "Quý khách cần nộp một bản gốc kèm theo hai bản sao y có chứng thực.",
    context_note: "Thuật ngữ pháp lý phổ biến khi giải quyết thủ tục giấy tờ.",
    variations: [
      "Only official certified copies from the municipal ward office will be accepted.",
      "Keep the original certificate safe and submit the certified copy instead."
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000008",
    phrase_en: "valid through",
    ipa: "/ˈvælɪd θruː/",
    meaning_vi: "có giá trị hiệu lực đến ngày...",
    sentence_en: "Your temporary residence permit is valid through December 31st of this year.",
    sentence_vi: "Giấy xác nhận tạm trú của bạn có giá trị hiệu lực đến hết ngày 31 tháng 12 năm nay.",
    context_note: "Dùng để thông báo thời hạn hiệu lực của giấy tờ, thị thực hoặc chứng chỉ.",
    variations: [
      "This notarized authorization letter is valid through the end of next month.",
      "Ensure your passport is valid through at least six months from your travel date."
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000009",
    phrase_en: "notarize the document",
    ipa: "/ˈnoʊtəraɪz ðə ˈdɑːkjumənt/",
    meaning_vi: "công chứng giấy tờ / văn bản",
    sentence_en: "You can notarize the document at any public notary office in the district.",
    sentence_vi: "Bạn có thể đi công chứng văn bản này tại bất kỳ phòng công chứng nào trong quận.",
    context_note: "Hành động pháp lý chứng nhận tính xác thực của chữ ký và văn bản.",
    variations: [
      "The contract must be properly notarized before it can take legal effect.",
      "How much does it cost to translate and notarize this birth certificate?"
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000010",
    phrase_en: "take a queue number",
    ipa: "/teɪk ə kjuː ˈnʌmbər/",
    meaning_vi: "lấy số thứ tự xếp hàng",
    sentence_en: "Please take a queue number from the kiosk near the entrance and wait for your turn.",
    sentence_vi: "Xin vui lòng lấy số thứ tự tại máy phát số gần cửa ra vào và chờ đến lượt.",
    context_note: "Lời hướng dẫn đầu tiên khi bước vào trung tâm hành chính công một cửa.",
    variations: [
      "I took a queue number and waited about fifteen minutes before being called.",
      "Citizens with online appointment bookings do not need to take a queue number."
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000011",
    phrase_en: "submit the application",
    ipa: "/səbˈmɪt ði ˌæplɪˈkeɪʃn/",
    meaning_vi: "nộp bộ hồ sơ đăng ký",
    sentence_en: "Once all fields are completed, you can submit the application online or in person.",
    sentence_vi: "Sau khi điền đủ các mục, bạn có thể nộp hồ sơ trực tuyến hoặc nộp trực tiếp tại quầy.",
    context_note: "Cụm động từ tiêu chuẩn cho việc hoàn tất gửi hồ sơ xin giải quyết.",
    variations: [
      "The deadline to submit the renewal application is 5 PM this Friday.",
      "You will receive an automated confirmation email after you submit the application."
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000012",
    phrase_en: "processing fee",
    ipa: "/ˈprɑːsesɪŋ fiː/",
    meaning_vi: "lệ phí xử lý hồ sơ hành chính",
    sentence_en: "The standard processing fee can be paid by debit card or bank transfer.",
    sentence_vi: "Lệ phí xử lý hồ sơ theo quy định có thể thanh toán bằng thẻ ghi nợ hoặc chuyển khoản.",
    context_note: "Khoản phí dịch vụ công phải đóng theo biểu mẫu nhà nước.",
    variations: [
      "Is the processing fee refundable if the visa application is rejected?",
      "Please keep the bank payment receipt as proof of the processing fee."
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000013",
    phrase_en: "in accordance with",
    ipa: "/ɪn əˈkɔːrdns wɪð/",
    meaning_vi: "đúng theo quy định của pháp luật / chính sách",
    sentence_en: "This procedure is handled strictly in accordance with municipal administrative regulations.",
    sentence_vi: "Thủ tục này được xử lý nghiêm ngặt theo đúng các quy định hành chính của thành phố.",
    context_note: "Cụm từ thể hiện tính chuẩn mực, thượng tôn pháp luật và uy tín công vụ.",
    variations: [
      "Tax returns must be filed in accordance with the latest statutory guidelines.",
      "The refund was executed in accordance with our stated customer protection policy."
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000014",
    phrase_en: "issue a receipt",
    ipa: "/ˈɪʃuː ə rɪˈsiːt/",
    meaning_vi: "xuất biên lai / hóa đơn thu tiền",
    sentence_en: "The cashier will stamp your paperwork and issue an official electronic receipt.",
    sentence_vi: "Nhân viên thu ngân sẽ đóng dấu giấy tờ và xuất cho bạn một biên lai điện tử chính thức.",
    context_note: "Cung cấp chứng từ sau khi người dân hoàn tất việc nộp phí.",
    variations: [
      "Could you please issue a receipt with our company tax code?",
      "Always verify the total amount before the counter clerk issues a receipt."
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000015",
    phrase_en: "counter window",
    ipa: "/ˈkaʊntər ˈwɪndoʊ/",
    meaning_vi: "quầy tiếp nhận số / cửa tiếp nhận thủ tục",
    sentence_en: "Ticket number A42, please proceed to counter window number five.",
    sentence_vi: "Xin mời số thứ tự A42 di chuyển đến quầy tiếp nhận số năm.",
    context_note: "Câu thông báo tự động quen thuộc tại các cơ quan dịch vụ công cộng.",
    variations: [
      "Counter window number three handles all passport and immigration services.",
      "She asked the clerk at the counter window for an additional registration form."
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000016",
    phrase_en: "tracking number",
    ipa: "/ˈtrækɪŋ ˈnʌmbər/",
    meaning_vi: "mã số biên nhận / mã tra cứu tiến độ",
    sentence_en: "Use this twelve-digit tracking number to check your dossier status on our website.",
    sentence_vi: "Hãy dùng mã số tra cứu mười hai chữ số này để kiểm tra tiến độ hồ sơ trên trang web.",
    context_note: "Mã số định danh cho mỗi bộ hồ sơ để công dân tự tra cứu tình trạng.",
    variations: [
      "Enter your tracking number on the national public service portal to see updates.",
      "I lost my paper receipt, can I retrieve my tracking number using my citizen ID?"
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000017",
    phrase_en: "within three working days",
    ipa: "/wɪˈðɪn θriː ˈwɜːrkɪŋ deɪz/",
    meaning_vi: "trong vòng ba ngày làm việc",
    sentence_en: "The certified birth certificate will be delivered to your home within three working days.",
    sentence_vi: "Bản sao khai sinh có chứng thực sẽ được gửi chuyển phát về tận nhà bạn trong vòng 3 ngày làm việc.",
    context_note: "Thuật ngữ thời hạn chuẩn xác trong hành chính (loại trừ thứ Bảy, Chủ Nhật và ngày lễ).",
    variations: [
      "Our customer desk commits to replying to all inquiries within three working days.",
      "The payment will be credited to your account within three working days."
    ]
  },
  {
    id: "30000000-0000-4000-8000-000000000018",
    phrase_en: "at your earliest convenience",
    ipa: "/æt jʊr ˈɜːrliɪst kənˈviːniəns/",
    meaning_vi: "vào lúc thuận tiện sớm nhất của bạn",
    sentence_en: "Please review the attached resolution draft at your earliest convenience.",
    sentence_vi: "Kính mong quý khách xem qua dự thảo nghị quyết đính kèm vào thời gian thuận tiện sớm nhất.",
    context_note: "Lời đề nghị lịch thiệp, tôn trọng thời gian của đối tác trong văn thư giao dịch.",
    variations: [
      "Could you sign and return the finalized agreement at your earliest convenience?",
      "Feel free to call our hot line back at your earliest convenience."
    ]
  }
];

const CARDS_DECK_4 = [
  {
    id: "40000000-0000-4000-8000-000000000001",
    phrase_en: "walk me through your resume",
    ipa: "/wɔːk miː θruː jʊr ˈrezəmeɪ/",
    meaning_vi: "tóm tắt quá trình kinh nghiệm trong hồ sơ của bạn",
    sentence_en: "To kick off our conversation, could you walk me through your resume and career journey?",
    sentence_vi: "Để bắt đầu buổi phỏng vấn, bạn có thể tóm lược quá trình sự nghiệp qua hồ sơ của mình được không?",
    context_note: "Câu hỏi mở đầu kinh điển trong 90% các buổi phỏng vấn tuyển dụng chuyên nghiệp.",
    variations: [
      "She asked me to walk her through my resume focusing on project management roles.",
      "I'm prepared to walk the panel through my resume and highlight key achievements."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000002",
    phrase_en: "hands-on experience",
    ipa: "/hændz ɑːn ɪkˈspɪriəns/",
    meaning_vi: "kinh nghiệm thực tế / kinh nghiệm cọ xát thực chiến",
    sentence_en: "I have over five years of hands-on experience building scalable cloud microservices.",
    sentence_vi: "Tôi có hơn năm năm kinh nghiệm thực chiến trong việc xây dựng hệ thống vi dịch vụ đám mây.",
    context_note: "Từ ăn điểm mạnh nhất khi muốn khẳng định bản thân làm thật việc thật, không chỉ lý thuyết.",
    variations: [
      "The role requires hands-on experience with TypeScript and modern CI/CD tools.",
      "Graduates with hands-on internship experience adapt much faster to corporate workflows."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000003",
    phrase_en: "align with company goals",
    ipa: "/əˈlaɪn wɪð ˈkʌmpəni ɡoʊlz/",
    meaning_vi: "đồng điệu và phù hợp với mục tiêu của công ty",
    sentence_en: "My career aspirations strongly align with the long-term vision and goals of your company.",
    sentence_vi: "Định hướng sự nghiệp của tôi rất đồng điệu với tầm nhìn và các mục tiêu dài hạn của công ty.",
    context_note: "Chứng minh bạn đã tìm hiểu kỹ về công ty và sẵn sàng cống hiến lâu dài.",
    variations: [
      "Every initiative we roll out must closely align with core company goals.",
      "Her proposed growth strategy perfectly aligns with our international expansion goals."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000004",
    phrase_en: "room for growth",
    ipa: "/ruːm fɔːr ɡroʊθ/",
    meaning_vi: "cơ hội học hỏi và thăng tiến trong sự nghiệp",
    sentence_en: "I am looking for a challenging environment with substantial room for professional growth.",
    sentence_vi: "Tôi đang tìm kiếm một môi trường thử thách với nhiều cơ hội để học hỏi và thăng tiến nghề nghiệp.",
    context_note: "Câu trả lời khéo léo cho câu hỏi 'Tại sao bạn lại muốn chuyển việc?'.",
    variations: [
      "This progressive startup offers exceptional room for personal and technical growth.",
      "In my previous position, I felt there was little room for career growth."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000005",
    phrase_en: "meet expectations",
    ipa: "/miːt ˌekspekˈteɪʃnz/",
    meaning_vi: "đáp ứng tốt các kỳ vọng đặt ra",
    sentence_en: "I am confident that my skill set will not only meet but exceed your team's expectations.",
    sentence_vi: "Tôi tự tin rằng các kỹ năng của mình sẽ không chỉ đáp ứng mà còn vượt trên kỳ vọng của đội ngũ.",
    context_note: "Tạo sự tự tin và chuyên nghiệp khi khẳng định năng lực trước hội đồng tuyển dụng.",
    variations: [
      "The newly hired architect consistently met all performance expectations during probation.",
      "We set clear benchmarks so candidates understand what it takes to meet expectations."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000006",
    phrase_en: "salary expectations",
    ipa: "/ˈsæləri ˌekspekˈteɪʃnz/",
    meaning_vi: "mức lương / thu nhập kỳ vọng",
    sentence_en: "Based on current market standards and my experience, my salary expectations are around two thousand dollars.",
    sentence_vi: "Dựa trên mặt bằng thị trường và kinh nghiệm của tôi, mức lương kỳ vọng của tôi vào khoảng hai nghìn đô.",
    context_note: "Cách mở đầu chuẩn mực khi bước vào giai đoạn thương lượng thù lao (deal lương).",
    variations: [
      "Could you please share your salary expectations for this senior engineering position?",
      "Her salary expectations were well within our department's allocated hiring budget."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000007",
    phrase_en: "competitive benefits package",
    ipa: "/kəmˈpetətɪv ˈbenɪfɪts ˈpækɪdʒ/",
    meaning_vi: "gói chế độ đãi ngộ và phúc lợi hấp dẫn",
    sentence_en: "Aside from base salary, does the offer include a competitive benefits package and health insurance?",
    sentence_vi: "Bên cạnh lương cứng, mức đề xuất này có bao gồm gói đãi ngộ phúc lợi và bảo hiểm sức khỏe tốt không?",
    context_note: "Hỏi khéo léo về bảo hiểm, thưởng, ngày phép và phụ cấp ngoài lương cứng.",
    variations: [
      "Our firm attracts top talent by offering a highly competitive benefits package.",
      "The competitive benefits package includes stock options and hybrid remote work."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000008",
    phrase_en: "proven track record",
    ipa: "/ˈpruːvn træk ˈrekərd/",
    meaning_vi: "bề dày thành tích đã được chứng minh qua thực tế",
    sentence_en: "I have a proven track record of boosting user retention rates by twenty percent.",
    sentence_vi: "Tôi có bề dày thành tích thực tế trong việc tăng tỷ lệ người dùng quay lại thêm hai mươi phần trăm.",
    context_note: "Cụm từ đắt giá để khẳng định kết quả cụ thể đo lường được bằng số liệu.",
    variations: [
      "The candidate brings a proven track record of managing enterprise software deliveries.",
      "We chose her because of her proven track record in crisis management."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000009",
    phrase_en: "strengths and weaknesses",
    ipa: "/streŋkθs ænd ˈwiːknəsɪz/",
    meaning_vi: "điểm mạnh và điểm cần cải thiện",
    sentence_en: "When asked about my strengths and weaknesses, I focused on adaptability and delegating tasks.",
    sentence_vi: "Khi được hỏi về điểm mạnh và điểm yếu, tôi tập trung vào khả năng thích ứng và kỹ năng phân chia việc.",
    context_note: "Câu hỏi tình huống phổ biến để đánh giá mức độ thấu hiểu bản thân của ứng viên.",
    variations: [
      "Self-awareness about your strengths and weaknesses is highly valued by hiring managers.",
      "Framing your weaknesses as areas actively undergoing improvement shows maturity."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000010",
    phrase_en: "adapt quickly to",
    ipa: "/əˈdæpt ˈkwɪkli tuː/",
    meaning_vi: "thích nghi nhanh chóng với môi trường / công nghệ mới",
    sentence_en: "I pride myself on my ability to adapt quickly to new tech stacks and dynamic workflows.",
    sentence_vi: "Tôi tự hào về khả năng nhanh chóng thích nghi với các công nghệ mới và quy trình làm việc linh hoạt.",
    context_note: "Phẩm chất được đánh giá rất cao trong các công ty công nghệ có tốc độ thay đổi nhanh.",
    variations: [
      "New hires must adapt quickly to our collaborative remote team culture.",
      "She adapted quickly to the changing project requirements without losing momentum."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000011",
    phrase_en: "problem-solving skill",
    ipa: "/ˈprɑːbləm ˈsɑːlvɪŋ skɪl/",
    meaning_vi: "kỹ năng tư duy giải quyết vấn đề",
    sentence_en: "My strong problem-solving skills allow me to stay calm and diagnose root causes during outages.",
    sentence_vi: "Kỹ năng giải quyết vấn đề tốt giúp tôi luôn giữ bình tĩnh và tìm ra nguyên nhân khi có sự cố.",
    context_note: "Kỹ năng mềm hàng đầu được tìm kiếm ở mọi cấp bậc vị trí việc làm.",
    variations: [
      "Case study interviews are specifically designed to test your real-world problem-solving skills.",
      "Her creative problem-solving skills saved the company thousands in licensing fees."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000012",
    phrase_en: "work under pressure",
    ipa: "/wɜːrk ˈʌndər ˈpreʃər/",
    meaning_vi: "chịu được áp lực cao trong công việc",
    sentence_en: "Having worked in fast-paced agencies, I am very comfortable working under pressure.",
    sentence_vi: "Từng làm việc ở các agency với nhịp độ dồn dập, tôi rất quen với việc chịu áp lực công việc cao.",
    context_note: "Dùng để trấn an nhà tuyển dụng về khả năng giữ vững phong độ khi công việc bận rộn.",
    variations: [
      "Can you describe a specific situation where you had to work under intense pressure?",
      "The role requires an individual who thrives and stays organized when working under pressure."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000013",
    phrase_en: "stand out from the crowd",
    ipa: "/stænd aʊt frʌm ðə kraʊd/",
    meaning_vi: "tạo điểm nhấn khác biệt nổi bật so với các ứng viên khác",
    sentence_en: "My unique combination of design sense and full-stack engineering helps me stand out from the crowd.",
    sentence_vi: "Sự kết hợp giữa tư duy thiết kế và kỹ thuật lập trình giúp tôi tạo nên sự khác biệt nổi bật.",
    context_note: "Dùng khi bạn muốn trả lời câu hỏi 'Tại sao chúng tôi nên chọn bạn?'.",
    variations: [
      "To stand out from the crowd, tailor your portfolio specifically to the company's domain.",
      "His open-source contributions truly made him stand out from the crowd."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000014",
    phrase_en: "team player",
    ipa: "/tiːm ˈpleɪər/",
    meaning_vi: "người có tinh thần đồng đội / biết phối hợp ăn ý",
    sentence_en: "I am a dedicated team player who values constructive feedback and transparent communication.",
    sentence_vi: "Tôi là người luôn đề cao tinh thần đồng đội, trân trọng góp ý xây dựng và giao tiếp minh bạch.",
    context_note: "Thể hiện thái độ hòa đồng, biết lắng nghe và đặt lợi ích tập thể lên hàng đầu.",
    variations: [
      "While being technically brilliant, he is also an empathetic and supportive team player.",
      "We are searching for a true team player to collaborate across multiple squads."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000015",
    phrase_en: "notice period",
    ipa: "/ˈnoʊtɪs ˈpɪriəd/",
    meaning_vi: "thời hạn báo trước khi chính thức nghỉ việc cũ",
    sentence_en: "I have a one-month notice period with my current employer, so I could start on the first of next month.",
    sentence_vi: "Tôi có cam kết báo trước một tháng ở công ty hiện tại, vì vậy tôi có thể bắt đầu làm việc từ đầu tháng sau.",
    context_note: "Thông tin bắt buộc phải trao đổi để công ty mới sắp xếp ngày tiếp nhận công việc (onboarding).",
    variations: [
      "Would your current employer be willing to shorten your notice period?",
      "Due to my contract obligations, my notice period cannot be negotiated below thirty days."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000016",
    phrase_en: "negotiable",
    ipa: "/nɪˈɡoʊʃiəbl/",
    meaning_vi: "có thể thương lượng / linh hoạt trao đổi thêm",
    sentence_en: "My compensation expectations are negotiable depending on the overall growth potential and equity offer.",
    sentence_vi: "Mức thu nhập của tôi hoàn toàn có thể thương lượng dựa trên tiềm năng phát triển và cổ phần của công ty.",
    context_note: "Tạo sự cởi mở, không bị cứng nhắc khi trao đổi về mức lương khởi điểm.",
    variations: [
      "Is the remote work policy strictly enforced or is it negotiable?",
      "The starting salary is somewhat fixed, but annual bonuses remain negotiable."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000017",
    phrase_en: "fit into the company culture",
    ipa: "/fɪt ˈɪntuː ðə ˈkʌmpəni ˈkʌltʃər/",
    meaning_vi: "hòa nhập tốt với văn hóa và phong cách làm việc của công ty",
    sentence_en: "I believe my openness to continuous learning enables me to fit seamlessly into your company culture.",
    sentence_vi: "Tôi tin tinh thần ham học hỏi liên tục sẽ giúp tôi dễ dàng hòa nhập với văn hóa công ty bạn.",
    context_note: "Yếu tố 'Culture Fit' ngày nay được nhà tuyển dụng xem trọng không kém gì kỹ năng chuyên môn.",
    variations: [
      "During the peer interview, the team evaluated whether the applicant fits into our company culture.",
      "It is essential that senior leaders embody and fit into the company culture."
    ]
  },
  {
    id: "40000000-0000-4000-8000-000000000018",
    phrase_en: "look forward to hearing from you",
    ipa: "/lʊk ˈfɔːrwərd tuː ˈhɪrɪŋ frʌm juː/",
    meaning_vi: "rất mong sớm nhận được phản hồi từ quý công ty",
    sentence_en: "Thank you for your valuable time today; I look forward to hearing from you regarding the next steps.",
    sentence_vi: "Cảm ơn anh chị đã dành thời gian quý báu hôm nay; tôi rất mong sớm nhận được phản hồi về các bước tiếp theo.",
    context_note: "Câu kết lịch sự hoàn hảo khi ra về hoặc khi gửi email cảm ơn (Thank-you note) sau phỏng vấn.",
    variations: [
      "I truly enjoyed our discussion and look forward to hearing from you soon.",
      "We look forward to hearing from you once the background check is completed."
    ]
  }
];

const CARDS_DECK_5 = [
  {
    id: "50000000-0000-4000-8000-000000000001",
    phrase_en: "how's it going",
    ipa: "/haʊz ɪt ˈɡoʊɪŋ/",
    meaning_vi: "dạo này thế nào rồi? / công việc ổn cả chứ?",
    sentence_en: "Hey Duc, long time no see! How's it going with you?",
    sentence_vi: "Chào Đức, lâu ngày không gặp! Dạo này mọi việc thế nào rồi bạn?",
    context_note: "Lời chào hỏi thông dụng và tự nhiên nhất của người bản xứ, thân thiện hơn 'How are you?'.",
    variations: [
      "How's it going with your new apartment search?",
      "Good morning everyone, how's it going today?"
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000002",
    phrase_en: "fingers crossed",
    ipa: "/ˈfɪŋɡərz krɔːst/",
    meaning_vi: "cầu mong mọi chuyện may mắn / suôn sẻ nhé",
    sentence_en: "I just submitted my visa renewal application, fingers crossed everything goes smoothly!",
    sentence_vi: "Tôi vừa nộp hồ sơ gia hạn visa xong, cầu mong mọi chuyện thuận buồm xuôi gió!",
    context_note: "Thành ngữ chúc may mắn cực kỳ phổ biến kèm cử chỉ đan chéo ngón tay trỏ và ngón giữa.",
    variations: [
      "Keep your fingers crossed for me during my driving test this afternoon.",
      "Fingers crossed the rain holds off until the outdoor concert finishes."
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000003",
    phrase_en: "take it easy",
    ipa: "/teɪk ɪt ˈiːzi/",
    meaning_vi: "cứ thư thả / đừng lo lắng quá nhé",
    sentence_en: "You have been working too hard lately, make sure you take it easy this weekend.",
    sentence_vi: "Dạo này bạn làm việc vất vả quá rồi, cuối tuần này nhớ nghỉ ngơi thư thả nhé.",
    context_note: "Dùng để khuyên ai đó thư giãn hoặc làm lời chào tạm biệt thân thiện khi ra về.",
    variations: [
      "Take it easy, we still have plenty of time before the gate closes.",
      "See you on Monday, take it easy!"
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000004",
    phrase_en: "out of the blue",
    ipa: "/aʊt əv ðə bluː/",
    meaning_vi: "bất thình lình / hoàn toàn bất ngờ không báo trước",
    sentence_en: "Out of the blue, my high school best friend called me after ten years.",
    sentence_vi: "Bất thình lình, đứa bạn thân cấp ba gọi cho tôi sau mười năm bặt vô âm tín.",
    context_note: "Diễn đạt một sự việc xảy ra bất ngờ như sét đánh giữa trời xanh không mây.",
    variations: [
      "She received a lucrative job offer completely out of the blue.",
      "Out of the blue, the car engine just stopped running on the highway."
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000005",
    phrase_en: "ring a bell",
    ipa: "/rɪŋ ə bel/",
    meaning_vi: "nghe quen quen / có chút ấn tượng nhớ ra",
    sentence_en: "Does the name Michael Anderson ring a bell to you?",
    sentence_vi: "Cái tên Michael Anderson nghe có quen quen hay gợi cho bạn nhớ ra ai không?",
    context_note: "Dùng khi bạn muốn hỏi ai đó xem một cái tên hoặc sự việc nghe có quen tai không.",
    variations: [
      "That restaurant's name rings a bell, I think my sister recommended it.",
      "Sorry, that address doesn't ring any bells at all."
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000006",
    phrase_en: "count me in",
    ipa: "/kaʊnt miː ɪn/",
    meaning_vi: "cho tôi tham gia với nhé / nhớ tính phần tôi!",
    sentence_en: "Are you guys going out for barbecue tonight? Count me in!",
    sentence_vi: "Tối nay mọi người đi ăn thịt nướng hả? Cho tôi tham gia một chân với nhé!",
    context_note: "Cách đồng ý nhiệt tình và tức thì khi bạn bè rủ rê đi chơi hoặc tham gia hoạt động chung.",
    variations: [
      "If you need volunteers for the beach cleanup, definitely count me in.",
      "Count me in for board game night this Saturday!"
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000007",
    phrase_en: "catch you later",
    ipa: "/kætʃ juː ˈleɪtər/",
    meaning_vi: "hẹn gặp lại bạn sau nhé",
    sentence_en: "I've got to run to my dentist appointment now, catch you later!",
    sentence_vi: "Tôi phải chạy đi khám nha sĩ bây giờ rồi, hẹn gặp lại bạn sau nhé!",
    context_note: "Lời tạm biệt cực kỳ tự nhiên giữa đồng nghiệp hoặc bạn bè thân thiết.",
    variations: [
      "Thanks for the coffee, I'll catch you later at the gym.",
      "Catch you later, let me know when you arrive home safely."
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000008",
    phrase_en: "long time no see",
    ipa: "/lɔːŋ taɪm noʊ siː/",
    meaning_vi: "lâu ngày quá không gặp nhau!",
    sentence_en: "Hey Nam, long time no see! You haven't changed a bit!",
    sentence_vi: "Chào Nam, lâu ngày quá không gặp! Nhìn bạn chẳng thay đổi chút nào!",
    context_note: "Thành ngữ phá băng siêu nhanh khi tình cờ gặp lại bạn bè cũ sau thời gian dài.",
    variations: [
      "Long time no see, we definitely need to grab coffee and catch up.",
      "It was great running into Sarah yesterday, long time no see!"
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000009",
    phrase_en: "grab a bite to eat",
    ipa: "/ɡræb ə baɪt tuː iːt/",
    meaning_vi: "đi kiếm gì ăn lót dạ đi",
    sentence_en: "I'm starving after that workshop, let's grab a quick bite to eat.",
    sentence_vi: "Học xong đói bụng quá rồi, tụi mình đi kiếm cái gì ăn lót dạ đi.",
    context_note: "Tự nhiên hơn rất nhiều so với 'Let's go have lunch/dinner'.",
    variations: [
      "Do you have time to grab a bite to eat before the movie starts?",
      "We grabbed a bite to eat at that new taco stand near the office."
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000010",
    phrase_en: "slip my mind",
    ipa: "/slɪp maɪ maɪnd/",
    meaning_vi: "quên khuấy đi mất tiêu",
    sentence_en: "I am so sorry I didn't call you back yesterday, it completely slipped my mind!",
    sentence_vi: "Thành thật xin lỗi vì hôm qua không gọi lại cho bạn, tôi bận quá quên khuấy đi mất!",
    context_note: "Cách xin lỗi chân thành khi lỡ quên một việc nhỏ mà không khiến đối phương khó chịu.",
    variations: [
      "Buying more milk totally slipped my mind on the way home.",
      "Don't let our meeting tomorrow slip your mind, it's very important."
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000011",
    phrase_en: "give it a shot",
    ipa: "/ɡɪv ɪt ə ʃɑːt/",
    meaning_vi: "cứ thử làm một lần xem sao",
    sentence_en: "I've never tried cooking Thai curry before, but I'm willing to give it a shot.",
    sentence_vi: "Tôi chưa từng nấu món cà ri Thái bao giờ, nhưng tôi sẵn sàng thử một lần xem sao.",
    context_note: "Thể hiện tinh thần cởi mở, dám thử thách những điều mới mẻ.",
    variations: [
      "You should definitely give public speaking a shot, you might love it.",
      "Even if the puzzle seems impossible, give it a shot first."
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000012",
    phrase_en: "sleep on it",
    ipa: "/sliːp ɑːn ɪt/",
    meaning_vi: "để ngủ một đêm suy nghĩ kỹ lại rồi hãy quyết định",
    sentence_en: "Don't make any hasty decisions right now; sleep on it and tell me tomorrow.",
    sentence_vi: "Đừng vội đưa ra quyết định vội vàng lúc này; cứ ngủ một giấc rồi mai tính tiếp.",
    context_note: "Lời khuyên hữu ích khi đối diện với những quyết định quan trọng trong cuộc sống.",
    variations: [
      "I need to sleep on this car purchase before transferring the deposit.",
      "After sleeping on it, she felt much more confident about accepting the job."
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000013",
    phrase_en: "make up my mind",
    ipa: "/meɪk ʌp maɪ maɪnd/",
    meaning_vi: "đưa ra quyết định dứt khoát",
    sentence_en: "Both jacket colors look great, I really can't make up my mind!",
    sentence_vi: "Cả hai màu áo khoác đều đẹp, tôi thực sự vẫn chưa quyết định chọn cái nào!",
    context_note: "Dùng khi bạn đang đắn đo giữa các lựa chọn thay vì nói đơn giản 'I haven't decided'.",
    variations: [
      "Hurry up and make up your mind, the ticket promotion ends in ten minutes.",
      "Once he makes up his mind, it's very hard to convince him otherwise."
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000014",
    phrase_en: "take a rain check",
    ipa: "/teɪk ə reɪn tʃek/",
    meaning_vi: "xin phép hẹn dịp khác nhé",
    sentence_en: "I would love to join your party, but I'm under the weather, can I take a rain check?",
    sentence_vi: "Tôi rất muốn đi dự tiệc của bạn nhưng người đang hơi mệt, cho tôi xin hẹn lại dịp khác nhé?",
    context_note: "Cách từ chối lịch thiệp nhất, ngụ ý bạn rất trân trọng lời mời và muốn đi vào dịp sau.",
    variations: [
      "Mind if we take a rain check on our tennis match until next Sunday?",
      "She asked for a rain check because her flight was delayed."
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000015",
    phrase_en: "keep in touch",
    ipa: "/kiːp ɪn tʌtʃ/",
    meaning_vi: "nhớ giữ liên lạc thường xuyên nhé",
    sentence_en: "It was wonderful working with you, let's definitely keep in touch on LinkedIn!",
    sentence_vi: "Thật tuyệt vời khi được làm việc cùng bạn, nhớ giữ liên lạc thường xuyên qua LinkedIn nhé!",
    context_note: "Lời dặn dò ấm áp khi chia tay bạn bè hoặc đồng nghiệp chuyển công tác.",
    variations: [
      "Even though we live on different continents, we still keep in touch weekly.",
      "Don't be a stranger, keep in touch whenever you visit Da Nang!"
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000016",
    phrase_en: "speak of the devil",
    ipa: "/spiːk əv ðə ˈdevl/",
    meaning_vi: "vừa nhắc tào tháo là tào tháo tới liền!",
    sentence_en: "Speak of the devil! We were just discussing your vacation photos and here you are!",
    sentence_vi: "Đúng là nhắc tào tháo tào tháo tới! Tụi này vừa mới nhắc tới ảnh đi chơi của bạn thì bạn bước vào!",
    context_note: "Nói vui khi một người vừa được nhắc tên thì bất ngờ xuất hiện ngay trước mắt.",
    variations: [
      "Speak of the devil, John just walked through the front door.",
      "Well, speak of the devil! Look who just commented on our Facebook post."
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000017",
    phrase_en: "on the tip of my tongue",
    ipa: "/ɑːn ðə tɪp əv maɪ tʌŋ/",
    meaning_vi: "nhớ mang máng, ngay đầu môi mà chưa nhớ ra được",
    sentence_en: "Wait, don't tell me, the actor's name is right on the tip of my tongue!",
    sentence_vi: "Khoan, đừng nói vội, tên diễn viên đó đang ở ngay đầu môi tôi rồi, sắp nhớ ra rồi!",
    context_note: "Diễn tả cảm giác bạn biết rõ điều đó nhưng tạm thời chưa gọi đúng tên được.",
    variations: [
      "The answer was on the tip of my tongue throughout the trivia game.",
      "His phone number was on the tip of my tongue, but I had to check my contacts."
    ]
  },
  {
    id: "50000000-0000-4000-8000-000000000018",
    phrase_en: "you bet",
    ipa: "/juː bet/",
    meaning_vi: "chắc chắn rồi / không cần phải hỏi!",
    sentence_en: "Are you coming to the concert tonight? You bet I am!",
    sentence_vi: "Tối nay bạn có đi xem buổi hòa nhạc không? Chắc chắn rồi, không đi sao được!",
    context_note: "Cách đồng ý cực kỳ nhiệt tình và quả quyết trong giao tiếp đời thường của người Mỹ.",
    variations: [
      "Thanks so much for helping me carry these boxes! - You bet!",
      "Will this code change improve speed? - You bet it will."
    ]
  }
];

const CARDS_DECK_6 = [
  {
    id: "60000000-0000-4000-8000-000000000001",
    phrase_en: "window or aisle seat",
    ipa: "/ˈwɪndoʊ ɔːr aɪl siːt/",
    meaning_vi: "ghế cạnh cửa sổ hay ghế cạnh lối đi",
    sentence_en: "When checking in for your long-haul flight, do you prefer a window or an aisle seat?",
    sentence_vi: "Khi làm thủ tục cho chuyến bay đường dài, bạn thích chọn ghế cạnh cửa sổ hay cạnh lối đi hơn?",
    context_note: "Câu hỏi quen thuộc nhất từ nhân viên mặt đất tại quầy làm thủ tục sân bay.",
    variations: [
      "Could you please assign me an aisle seat near the front of the aircraft?",
      "I always pick a window seat so I can rest my head against the wall and sleep."
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000002",
    phrase_en: "check in baggage",
    ipa: "/tʃek ɪn ˈbæɡɪdʒ/",
    meaning_vi: "gửi hành lý ký gửi tại quầy",
    sentence_en: "How many pieces of luggage do you need to check in for this domestic flight?",
    sentence_vi: "Quý khách cần gửi bao nhiêu kiện hành lý ký gửi cho chuyến bay nội địa này?",
    context_note: "Phân biệt rõ giữa hành lý ký gửi (checked baggage) và hành lý xách tay (carry-on).",
    variations: [
      "Please place your baggage on the scale to verify it does not exceed twenty kilos.",
      "I only have a small backpack, so I don't need to check in any baggage."
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000003",
    phrase_en: "book a table for two",
    ipa: "/bʊk ə ˈteɪbl fɔːr tuː/",
    meaning_vi: "đặt trước một bàn ăn cho hai người",
    sentence_en: "I would like to book a table for two by the balcony for seven o'clock tonight, please.",
    sentence_vi: "Tôi muốn đặt một bàn cho hai người gần ban công lúc bảy giờ tối nay, xin cảm ơn.",
    context_note: "Mẫu câu chuẩn chỉ khi gọi điện thoại đặt bàn tại các nhà hàng nước ngoài.",
    variations: [
      "Do we need to book a table for two in advance, or do they accept walk-ins?",
      "I booked a table for two under the name of Quang Duc."
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000004",
    phrase_en: "there seems to be a problem",
    ipa: "/ðer siːmz tuː biː ə ˈprɑːbləm/",
    meaning_vi: "dường như đang có một sự cố phát sinh",
    sentence_en: "Excuse me, there seems to be a problem with the hot water system in room 402.",
    sentence_vi: "Xin lỗi, dường như đang có trục trặc với hệ thống nước nóng ở phòng 402.",
    context_note: "Cách phản ánh sự cố lịch sự, tránh to tiếng nhưng vẫn khiến lễ tân khách sạn ưu tiên giải quyết.",
    variations: [
      "There seems to be a problem with my credit card transaction at the terminal.",
      "Pardon me, but there seems to be a problem with this restaurant bill."
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000005",
    phrase_en: "keep me posted",
    ipa: "/kiːp miː ˈpoʊstɪd/",
    meaning_vi: "có tin gì mới nhớ báo mình biết ngay nhé",
    sentence_en: "Once your connecting flight status is updated on the board, please keep me posted.",
    sentence_vi: "Khi nào thông tin chuyến bay chuyển tiếp của bạn được cập nhật trên bảng điện tử, nhớ báo mình ngay nhé.",
    context_note: "Thường dùng khi một sự việc đang chờ thông báo và bạn muốn người kia báo tin tức thì.",
    variations: [
      "Keep me posted on whether you make it to the hotel before midnight.",
      "I'll keep you posted as soon as the weather advisory is lifted."
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000006",
    phrase_en: "sort things out",
    ipa: "/sɔːrt θɪŋz aʊt/",
    meaning_vi: "dàn xếp ổn thỏa mọi khúc mắc / xử lý xong vấn đề",
    sentence_en: "Don't panic about the booking mix-up, the hotel manager is sorting things out right now.",
    sentence_vi: "Đừng lo lắng về chuyện nhầm lẫn phòng, quản lý khách sạn đang trực tiếp dàn xếp ổn thỏa rồi.",
    context_note: "Cụm từ rất hay khi nói về việc tháo gỡ rắc rối trong du lịch và đời sống.",
    variations: [
      "Give the airline staff a few minutes to sort things out with your baggage claim.",
      "We finally sorted things out and enjoyed the rest of our holiday in Tokyo."
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000007",
    phrase_en: "boarding pass",
    ipa: "/ˈbɔːrdɪŋ pæs/",
    meaning_vi: "thẻ lên máy bay",
    sentence_en: "Please have your passport and boarding pass ready for inspection at gate twelve.",
    sentence_vi: "Xin vui lòng chuẩn bị sẵn hộ chiếu và thẻ lên máy bay để kiểm tra tại cửa số 12.",
    context_note: "Giấy tờ bắt buộc phải giữ bên mình để qua cửa kiểm soát an ninh và lên máy bay.",
    variations: [
      "You can add your mobile boarding pass directly to Apple Wallet.",
      "The gate agent scanned my boarding pass and wished me a pleasant flight."
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000008",
    phrase_en: "carry-on luggage",
    ipa: "/ˈkæri ɑːn ˈlʌɡɪdʒ/",
    meaning_vi: "hành lý xách tay mang lên khoang máy bay",
    sentence_en: "Your carry-on luggage must fit in the overhead bin or underneath the seat in front of you.",
    sentence_vi: "Hành lý xách tay của bạn phải để vừa trong khoang hành lý phía trên hoặc dưới gầm ghế phía trước.",
    context_note: "Quy định an toàn bay bắt buộc cho mọi hành khách đi máy bay.",
    variations: [
      "Make sure all liquids in your carry-on luggage comply with the 100ml limit.",
      "Gate attendants were weighing heavy carry-on luggage to enforce airline policies."
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000009",
    phrase_en: "flight delay",
    ipa: "/flaɪt dɪˈleɪ/",
    meaning_vi: "chuyến bay bị hoãn giờ cất cánh",
    sentence_en: "Due to heavy thunderstorms over the airport, we are experiencing a two-hour flight delay.",
    sentence_vi: "Do giông bão lớn trên vùng trời sân bay, chuyến bay của chúng ta đang bị hoãn lại hai tiếng.",
    context_note: "Tình huống thường gặp khi đi máy bay vào mùa mưa bão.",
    variations: [
      "The airline provided meal vouchers to compensate passengers for the long flight delay.",
      "Frequent flight delays caused him to miss his crucial business conference."
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000010",
    phrase_en: "lost and found",
    ipa: "/lɔːst ænd faʊnd/",
    meaning_vi: "quầy tiếp nhận đồ thất lạc",
    sentence_en: "I left my camera on the tour bus; where is the lost and found counter located?",
    sentence_vi: "Tôi để quên máy ảnh trên xe buýt du lịch; quầy đồ thất lạc nằm ở khu vực nào vậy?",
    context_note: "Địa điểm cần tìm ngay tại sân bay, nhà ga hoặc điểm du lịch khi lỡ đánh rơi đồ đạc.",
    variations: [
      "Fortunately, someone turned my lost wallet in to the airport's lost and found office.",
      "Check with the lost and found desk before filing an official police report."
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000011",
    phrase_en: "currency exchange",
    ipa: "/ˈkɜːrənsi ɪksˈtʃeɪndʒ/",
    meaning_vi: "quầy đổi ngoại tệ",
    sentence_en: "Where can I find a currency exchange booth with reasonable rates in the arrival hall?",
    sentence_vi: "Tôi có thể tìm thấy quầy đổi ngoại tệ có tỷ giá hợp lý ở đâu trong sảnh đến vậy?",
    context_note: "Dịch vụ quan trọng đầu tiên khi hạ cánh xuống một quốc gia mới.",
    variations: [
      "Currency exchange booths at international airports usually charge higher transaction fees.",
      "She exchanged five hundred US dollars into Japanese Yen at the downtown currency exchange."
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000012",
    phrase_en: "call an ambulance",
    ipa: "/kɔːl ən ˈæmbjələns/",
    meaning_vi: "gọi ngay xe cấp cứu",
    sentence_en: "Please hurry and call an ambulance, someone just collapsed on the train platform!",
    sentence_vi: "Làm ơn nhanh lên và gọi xe cấp cứu giúp tôi, có người vừa ngất xỉu ở sân ga xe lửa!",
    context_note: "Cụm từ khẩn cấp sống còn khi cần hỗ trợ y tế khẩn cấp ở nước ngoài.",
    variations: [
      "The hotel concierge immediately called an ambulance when the guest suffered an allergic reaction.",
      "Do you know the local emergency number to call an ambulance in Thailand?"
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000013",
    phrase_en: "lost my passport",
    ipa: "/lɔːst maɪ ˈpæspɔːrt/",
    meaning_vi: "bị mất hộ chiếu",
    sentence_en: "I've lost my passport and wallet; could you direct me to the nearest Vietnamese embassy?",
    sentence_vi: "Tôi bị mất hộ chiếu và ví tiền; bạn có thể chỉ đường giúp tôi đến đại sứ quán Việt Nam gần nhất không?",
    context_note: "Tình huống khẩn cấp nhất khi đi du lịch nước ngoài cần khai báo cảnh sát và đại sứ quán.",
    variations: [
      "If you lost your passport, you must first obtain a police loss report for travel document reissue.",
      "Keeping digital photocopies on your phone is a lifesaver if you ever lost your passport."
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000014",
    phrase_en: "complimentary breakfast",
    ipa: "/ˌkɑːmplɪˈmentri ˈbrekfəst/",
    meaning_vi: "bữa sáng buffet miễn phí đi kèm theo phòng",
    sentence_en: "Your deluxe room reservation includes complimentary breakfast from six to ten every morning.",
    sentence_vi: "Phòng hạng sang của bạn đã bao gồm bữa sáng miễn phí từ 6 giờ đến 10 giờ mỗi sáng.",
    context_note: "Thuật ngữ dịch vụ khách sạn ('complimentary' nghĩa là miễn phí đi kèm dịch vụ).",
    variations: [
      "Guests can enjoy a complimentary breakfast buffet on the top-floor terrace.",
      "Is the complimentary breakfast served as a buffet or an à la carte menu?"
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000015",
    phrase_en: "itinerary",
    ipa: "/aɪˈtɪnəreri/",
    meaning_vi: "lịch trình chuyến đi chi tiết",
    sentence_en: "Could you email me the updated travel itinerary including hotel booking codes?",
    sentence_vi: "Bạn có thể gửi email cho tôi lịch trình chuyến đi mới nhất kèm mã đặt phòng khách sạn được không?",
    context_note: "Từ vựng then chốt cho việc tổ chức tour du lịch và chuyến công tác.",
    variations: [
      "Our five-day itinerary in Paris includes museum tours and a Seine river cruise.",
      "The tour guide reviewed the daily itinerary before the sightseeing bus departed."
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000016",
    phrase_en: "nearest subway station",
    ipa: "/ˈnɪrɪst ˈsʌbweɪ ˈsteɪʃn/",
    meaning_vi: "ga tàu điện ngầm gần nhất",
    sentence_en: "Excuse me, could you tell me the fastest way to get to the nearest subway station?",
    sentence_vi: "Xin lỗi, bạn có thể chỉ giúp tôi đường nhanh nhất để đến ga tàu điện ngầm gần đây được không?",
    context_note: "Câu hỏi đường phổ biến nhất của khách du lịch tại các thành phố lớn trên thế giới.",
    variations: [
      "The boutique hotel is conveniently located just a three-minute walk from the nearest subway station.",
      "Follow the green directional signs to reach the nearest subway station entrance."
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000017",
    phrase_en: "emergency exit",
    ipa: "/iˈmɜːrdʒənsi ˈeɡzɪt/",
    meaning_vi: "cửa thoát hiểm khẩn cấp",
    sentence_en: "In case of a fire alarm, please walk calmly towards the illuminated emergency exit.",
    sentence_vi: "Trong trường hợp có chuông báo cháy, xin vui lòng bình tĩnh di chuyển về phía cửa thoát hiểm có đèn sáng.",
    context_note: "Kỹ năng an toàn luôn cần chú ý khi nhận phòng khách sạn hoặc lên máy bay.",
    variations: [
      "Never obstruct access to the emergency exit doors with heavy suitcases.",
      "Passengers seated in the emergency exit row must be willing and able to assist the crew."
    ]
  },
  {
    id: "60000000-0000-4000-8000-000000000018",
    phrase_en: "check-out time",
    ipa: "/ˈtʃekaʊt taɪm/",
    meaning_vi: "giờ trả phòng khách sạn",
    sentence_en: "Standard check-out time is twelve noon, but late check-out is available upon request.",
    sentence_vi: "Giờ trả phòng tiêu chuẩn là 12 giờ trưa, nhưng quý khách có thể yêu cầu trả phòng muộn nếu cần.",
    context_note: "Thông tin bắt buộc phải nắm khi lưu trú tại bất kỳ khách sạn nào.",
    variations: [
      "Can we leave our luggage at the reception desk after check-out time?",
      "Exceeding the check-out time without notification may incur an additional half-day fee."
    ]
  }
];

const ALL_CARDS = [
  ...CARDS_DECK_1.map(c => ({ ...c, deck_id: DECKS[0].id })),
  ...CARDS_DECK_2.map(c => ({ ...c, deck_id: DECKS[1].id })),
  ...CARDS_DECK_3.map(c => ({ ...c, deck_id: DECKS[2].id })),
  ...CARDS_DECK_4.map(c => ({ ...c, deck_id: DECKS[3].id })),
  ...CARDS_DECK_5.map(c => ({ ...c, deck_id: DECKS[4].id })),
  ...CARDS_DECK_6.map(c => ({ ...c, deck_id: DECKS[5].id })),
];

console.log(`Generated ${DECKS.length} decks and ${ALL_CARDS.length} cards.`);

// Output TS code for lib/seedData.ts
let tsCode = `export interface Deck {
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
  variations?: string[];
  box: number; // 1 to 5
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
  last_practiced_at: string | null;
}

const nowIso = new Date().toISOString();

export const SEED_DECKS: Deck[] = ${JSON.stringify(DECKS.map(d => ({ ...d, created_at: "__NOW_ISO__" })), null, 2).replace(/"__NOW_ISO__"/g, 'nowIso')};

export const SEED_CARDS: Card[] = [
`;

for (let i = 0; i < DECKS.length; i++) {
  const deck = DECKS[i];
  const deckCards = ALL_CARDS.filter(c => c.deck_id === deck.id);
  tsCode += `  // ============================================================================\n`;
  tsCode += `  // DECK ${i + 1}: ${deck.title} (${deckCards.length} cards)\n`;
  tsCode += `  // ============================================================================\n`;
  for (const c of deckCards) {
    tsCode += `  {\n`;
    tsCode += `    id: ${JSON.stringify(c.id)},\n`;
    tsCode += `    deck_id: ${JSON.stringify(c.deck_id)},\n`;
    tsCode += `    phrase_en: ${JSON.stringify(c.phrase_en)},\n`;
    tsCode += `    ipa: ${JSON.stringify(c.ipa)},\n`;
    tsCode += `    meaning_vi: ${JSON.stringify(c.meaning_vi)},\n`;
    tsCode += `    sentence_en: ${JSON.stringify(c.sentence_en)},\n`;
    tsCode += `    sentence_vi: ${JSON.stringify(c.sentence_vi)},\n`;
    tsCode += `    context_note: ${JSON.stringify(c.context_note)},\n`;
    tsCode += `    variations: ${JSON.stringify(c.variations)},\n`;
    tsCode += `    box: 1,\n`;
    tsCode += `    interval_days: 0,\n`;
    tsCode += `    ease_factor: 2.5,\n`;
    tsCode += `    next_review_at: nowIso,\n`;
    tsCode += `    last_practiced_at: null,\n`;
    tsCode += `  },\n`;
  }
}
tsCode += `];\n`;

fs.writeFileSync(path.join(__dirname, '../lib/seedData.ts'), tsCode, 'utf8');
console.log('Successfully wrote lib/seedData.ts');

// Output SQL for supabase/schema.sql
let sqlCode = `-- ============================================================================
-- SPEAKFLOW - SUPABASE POSTGRESQL SCHEMA, USER PROGRESS & INITIAL SEED DATA
-- Copy and paste this entire script into your Supabase SQL Editor and click RUN
-- ============================================================================

DO $speakflow$
BEGIN
  -- Enable UUID generation extension if not already enabled
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  -- 1. Create \`decks\` table
  CREATE TABLE IF NOT EXISTS public.decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'MessageSquare',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 2. Create \`cards\` table
  CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    user_id UUID,
    phrase_en TEXT NOT NULL,
    ipa TEXT NOT NULL,
    meaning_vi TEXT NOT NULL,
    sentence_en TEXT NOT NULL,
    sentence_vi TEXT NOT NULL,
    context_note TEXT NOT NULL,
    variations TEXT[] NOT NULL DEFAULT '{}',
    box INT NOT NULL DEFAULT 1 CHECK (box BETWEEN 1 AND 5),
    interval_days INT NOT NULL DEFAULT 0,
    ease_factor FLOAT NOT NULL DEFAULT 2.5,
    next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_practiced_at TIMESTAMPTZ
  );

  -- Ensure \`user_id\` column exists on \`cards\` if table was created earlier
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cards' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.cards ADD COLUMN user_id UUID;
  END IF;

  -- Ensure \`variations\` column exists on \`cards\` if table was created earlier
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cards' AND column_name = 'variations'
  ) THEN
    ALTER TABLE public.cards ADD COLUMN variations TEXT[] NOT NULL DEFAULT '{}';
  END IF;

  -- 3. Create \`user_card_progress\` table (Per-user SRS progress synced across PC & Mobile)
  CREATE TABLE IF NOT EXISTS public.user_card_progress (
    user_id UUID NOT NULL,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    box INT NOT NULL DEFAULT 1 CHECK (box BETWEEN 1 AND 5),
    interval_days INT NOT NULL DEFAULT 0,
    ease_factor FLOAT NOT NULL DEFAULT 2.5,
    next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_practiced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, card_id)
  );

  -- 4. Create \`user_stats\` table (Per-user daily streak & profile info)
  CREATE TABLE IF NOT EXISTS public.user_stats (
    user_id UUID PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    current_streak INT NOT NULL DEFAULT 1,
    last_study_date TEXT,
    today_reviewed_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Create helpful indexes for fast SRS queries
  CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON public.cards(deck_id);
  CREATE INDEX IF NOT EXISTS idx_cards_next_review_at ON public.cards(next_review_at);
  CREATE INDEX IF NOT EXISTS idx_user_card_progress_user ON public.user_card_progress(user_id);

  -- Enable Row Level Security (RLS)
  ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.user_card_progress ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'decks' AND policyname = 'Allow public access to decks'
  ) THEN
    CREATE POLICY "Allow public access to decks" ON public.decks FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cards' AND policyname = 'Allow public access to cards'
  ) THEN
    CREATE POLICY "Allow public access to cards" ON public.cards FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_card_progress' AND policyname = 'Allow public access to user_card_progress'
  ) THEN
    CREATE POLICY "Allow public access to user_card_progress" ON public.user_card_progress FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_stats' AND policyname = 'Allow public access to user_stats'
  ) THEN
    CREATE POLICY "Allow public access to user_stats" ON public.user_stats FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- 5. SEED DATA: 6 CONVERSATIONAL DECKS + 108 HIGH-UTILITY REFLEX CARDS (18 PER DECK)
  INSERT INTO public.decks (id, title, description, icon, created_at) VALUES
`;

for (let i = 0; i < DECKS.length; i++) {
  const d = DECKS[i];
  const comma = i === DECKS.length - 1 ? '' : ',';
  sqlCode += `    ('${d.id}', '${d.title.replace(/'/g, "''")}', '${d.description.replace(/'/g, "''")}', '${d.icon}', NOW())${comma}\n`;
}

sqlCode += `  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon;

  INSERT INTO public.cards (
    id, deck_id, phrase_en, ipa, meaning_vi, sentence_en, sentence_vi, context_note, variations, box, interval_days, ease_factor, next_review_at, last_practiced_at
  ) VALUES
`;

for (let i = 0; i < ALL_CARDS.length; i++) {
  const c = ALL_CARDS[i];
  const comma = i === ALL_CARDS.length - 1 ? '' : ',';
  const varArraySql = `ARRAY[${c.variations.map(v => `'${v.replace(/'/g, "''")}'`).join(', ')}]`;
  sqlCode += `    (
      '${c.id}',
      '${c.deck_id}',
      '${c.phrase_en.replace(/'/g, "''")}',
      '${c.ipa.replace(/'/g, "''")}',
      '${c.meaning_vi.replace(/'/g, "''")}',
      '${c.sentence_en.replace(/'/g, "''")}',
      '${c.sentence_vi.replace(/'/g, "''")}',
      '${c.context_note.replace(/'/g, "''")}',
      ${varArraySql},
      1, 0, 2.5, NOW(), NULL
    )${comma}\n`;
}

sqlCode += `  ON CONFLICT (id) DO UPDATE SET
    deck_id = EXCLUDED.deck_id,
    phrase_en = EXCLUDED.phrase_en,
    ipa = EXCLUDED.ipa,
    meaning_vi = EXCLUDED.meaning_vi,
    sentence_en = EXCLUDED.sentence_en,
    sentence_vi = EXCLUDED.sentence_vi,
    context_note = EXCLUDED.context_note,
    variations = EXCLUDED.variations;

END $speakflow$;
`;

fs.writeFileSync(path.join(__dirname, '../supabase/schema.sql'), sqlCode, 'utf8');
console.log('Successfully wrote supabase/schema.sql');
