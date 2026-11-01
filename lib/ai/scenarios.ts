import type { RoleplayScenario } from "./types";

export const ROLEPLAY_SCENARIOS: RoleplayScenario[] = [
  {
    id: "daily-conversation",
    category: "daily-conversation",
    title: "Daily Conversation",
    titleVi: "Trò chuyện thường ngày",
    contextVi: "Gặp lại người quen/bạn bè cũ tại quán cà phê và hỏi thăm về cuộc sống dạo này.",
    defaultUserRole: "Bạn thân / Người quen",
    defaultAiRole: "Người bạn lâu ngày gặp lại",
    starterAiPrompt: "Hey! It has been such a long time since we last caught up. How have you been doing lately?",
    starterAiPromptVi: "Này! Lâu lắm rồi bọn mình mới gặp lại nhau đấy. Dạo này cậu thế nào rồi?",
    recommendedLevel: "A2",
    icon: "Coffee",
    starterReplies: [
      {
        en: "I've been quite busy with work, but everything is going well. How about you?",
        vi: "Dạo này mình khá bận rộn với công việc, nhưng mọi thứ vẫn ổn. Còn cậu thì sao?",
      },
      {
        en: "Not bad at all! Just moved into a new apartment last weekend.",
        vi: "Không tệ chút nào! Mình vừa mới chuyển sang căn hộ mới cuối tuần trước.",
      },
    ],
  },
  {
    id: "restaurant",
    category: "restaurant",
    title: "At the Restaurant",
    titleVi: "Tại nhà hàng",
    contextVi: "Bạn đến ăn tối tại một nhà hàng Âu, gọi món, hỏi về nguyên liệu và yêu cầu thanh toán.",
    defaultUserRole: "Khách hàng (Diner)",
    defaultAiRole: "Nhân viên phục vụ bàn (Waiter)",
    starterAiPrompt: "Good evening! Welcome to The Bistro. Table for how many tonight, and can I get you started with some drinks?",
    starterAiPromptVi: "Chào buổi tối! Chào mừng quý khách đến The Bistro. Tối nay mình đi mấy người ạ, và em có thể lấy nước uống trước cho quý khách không?",
    recommendedLevel: "A2",
    icon: "Utensils",
    starterReplies: [
      {
        en: "A table for two, please. Could we also see the dinner menu?",
        vi: "Bàn cho hai người nhé. Cho chúng tôi xem thực đơn bữa tối được không?",
      },
      {
        en: "Just sparkling water for now, thank you. What is your special of the day?",
        vi: "Cho tôi nước khoáng có ga trước nhé, cảm ơn bạn. Hôm nay nhà hàng có món đặc biệt gì vậy?",
      },
    ],
  },
  {
    id: "hotel",
    category: "hotel",
    title: "At the Hotel",
    titleVi: "Tại khách sạn",
    contextVi: "Làm thủ tục nhận phòng (Check-in), hỏi mật khẩu Wi-Fi, giờ ăn sáng và yêu cầu phòng yên tĩnh.",
    defaultUserRole: "Khách lưu trú (Guest)",
    defaultAiRole: "Lễ tân khách sạn (Receptionist)",
    starterAiPrompt: "Welcome to Grand Horizon Hotel! How may I assist you with your reservation today?",
    starterAiPromptVi: "Chào mừng quý khách đến khách sạn Grand Horizon! Em có thể hỗ trợ quý khách về thủ tục đặt phòng hôm nay như thế nào ạ?",
    recommendedLevel: "B1",
    icon: "Building2",
    starterReplies: [
      {
        en: "Hi, I have a reservation under the name Minh Nguyen for three nights.",
        vi: "Chào bạn, tôi có đặt phòng trước dưới tên Minh Nguyen cho 3 đêm.",
      },
      {
        en: "Could I have a quiet room on a higher floor with a nice city view?",
        vi: "Tôi có thể lấy một phòng yên tĩnh ở tầng cao với hướng nhìn ra thành phố được không?",
      },
    ],
  },
  {
    id: "airport-travel",
    category: "airport-travel",
    title: "Airport & Travel",
    titleVi: "Sân bay & Du lịch",
    contextVi: "Làm thủ tục gửi hành lý tại quầy check-in sân bay, hỏi thông tin cửa ra máy bay và cân nặng hành lý.",
    defaultUserRole: "Hành khách (Passenger)",
    defaultAiRole: "Nhân viên hãng hàng không (Check-in Agent)",
    starterAiPrompt: "Good morning. May I please have your passport and flight booking confirmation?",
    starterAiPromptVi: "Chào buổi sáng. Cho tôi xin hộ chiếu và mã đặt chỗ chuyến bay của quý khách nhé?",
    recommendedLevel: "B1",
    icon: "Plane",
    starterReplies: [
      {
        en: "Here is my passport. I would like to check in one suitcase and keep this backpack as carry-on.",
        vi: "Hộ chiếu của tôi đây. Tôi muốn ký gửi một va li và mang ba lô này làm hành lý xách tay.",
      },
      {
        en: "Could you please give me a window seat if there is one available?",
        vi: "Nếu còn chỗ, bạn có thể xếp cho tôi ghế cạnh cửa sổ được không?",
      },
    ],
  },
  {
    id: "shopping",
    category: "shopping",
    title: "Shopping",
    titleVi: "Mua sắm tại cửa hàng",
    contextVi: "Tìm mua chiếc áo khoác phù hợp, hỏi nhân viên về size, màu sắc và chính sách đổi trả hàng.",
    defaultUserRole: "Khách mua sắm (Shopper)",
    defaultAiRole: "Nhân viên bán hàng (Sales Associate)",
    starterAiPrompt: "Hello! Are you looking for anything in particular today, or just browsing around?",
    starterAiPromptVi: "Chào bạn! Hôm nay bạn đang tìm kiếm món đồ nào cụ thể hay đang đi xem đồ vậy ạ?",
    recommendedLevel: "A1",
    icon: "ShoppingBag",
    starterReplies: [
      {
        en: "I'm looking for a warm jacket for my winter trip. Do you have this in medium?",
        vi: "Mình đang tìm một chiếc áo khoác ấm cho chuyến đi mùa đông. Mẫu này có size M không bạn?",
      },
      {
        en: "Can I try this on? Where are the fitting rooms located?",
        vi: "Mình có thể mặc thử mẫu này không? Phòng thay đồ ở đâu vậy?",
      },
    ],
  },
  {
    id: "hospital",
    category: "hospital",
    title: "At the Hospital",
    titleVi: "Tại bệnh viện / Phòng khám",
    contextVi: "Gặp bác sĩ, mô tả triệu chứng sốt nhẹ, đau họng và nghe lời khuyên về đơn thuốc, cách nghỉ ngơi.",
    defaultUserRole: "Bệnh nhân (Patient)",
    defaultAiRole: "Bác sĩ thăm khám (Doctor)",
    starterAiPrompt: "Good afternoon. What seems to be bothering you today, and how long have you had these symptoms?",
    starterAiPromptVi: "Chào bạn. Hôm nay trong người bạn cảm thấy khó chịu thế nào, và bạn bị các triệu chứng này bao lâu rồi?",
    recommendedLevel: "B1",
    icon: "Stethoscope",
    starterReplies: [
      {
        en: "I have had a sore throat and a slight fever since yesterday evening.",
        vi: "Tôi bị đau họng và sốt nhẹ từ tối hôm qua đến giờ.",
      },
      {
        en: "I also feel very fatigued and have a persistent dry cough.",
        vi: "Tôi cũng cảm thấy rất mệt mỏi và bị ho khan liên tục.",
      },
    ],
  },
  {
    id: "job-interview",
    category: "job-interview",
    title: "Job Interview",
    titleVi: "Phỏng vấn xin việc",
    contextVi: "Phỏng vấn với Hiring Manager về kinh nghiệm làm việc, giải quyết thử thách và mục tiêu nghề nghiệp.",
    defaultUserRole: "Ứng viên (Candidate)",
    defaultAiRole: "Người phỏng vấn / Trưởng bộ phận (Interviewer)",
    starterAiPrompt: "Thank you for joining our interview today. To kick things off, could you briefly introduce yourself and tell me what drew you to this position?",
    starterAiPromptVi: "Cảm ơn bạn đã tham gia buổi phỏng vấn hôm nay. Để bắt đầu, bạn có thể giới thiệu ngắn gọn về bản thân và điều gì đã thu hút bạn đến với vị trí này không?",
    recommendedLevel: "B2",
    icon: "Briefcase",
    starterReplies: [
      {
        en: "Certainly! I have over three years of experience building modern web applications, and I was deeply impressed by your company's mission.",
        vi: "Chắc chắn rồi ạ! Em có hơn 3 năm kinh nghiệm phát triển ứng dụng web hiện đại, và em rất ấn tượng với sứ mệnh của công ty mình.",
      },
      {
        en: "I specialize in front-end development and love tackling user experience challenges in high-growth environments.",
        vi: "Thế mạnh của em là lập trình front-end và em rất thích giải quyết các bài toán trải nghiệm người dùng trong môi trường tăng trưởng nhanh.",
      },
    ],
  },
  {
    id: "office-communication",
    category: "office-communication",
    title: "Office Communication",
    titleVi: "Giao tiếp công sở",
    contextVi: "Trao đổi Daily Standup với đồng nghiệp và Quản lý dự án, báo cáo tiến độ và đề xuất phương án xử lý.",
    defaultUserRole: "Nhân viên (Team Member)",
    defaultAiRole: "Quản lý dự án (Project Manager)",
    starterAiPrompt: "Morning team! Let's do a quick sync on our sprint progress. How are things looking on your end today?",
    starterAiPromptVi: "Chào cả nhóm! Chúng ta cập nhật nhanh tiến độ sprint nhé. Hôm nay phía công việc của bạn tiến triển thế nào rồi?",
    recommendedLevel: "B1",
    icon: "Laptop",
    starterReplies: [
      {
        en: "Everything is right on track. I wrapped up the authentication flow yesterday and will test the API today.",
        vi: "Mọi thứ đang đúng tiến độ. Hôm qua em đã hoàn thành luồng xác thực và hôm nay sẽ kiểm thử API.",
      },
      {
        en: "I ran into a minor blocker with the database schema, but I'm pairing with the backend team to resolve it.",
        vi: "Em gặp một vướng mắc nhỏ với schema database, nhưng em đang phối hợp với đội backend để xử lý dứt điểm.",
      },
    ],
  },
  {
    id: "business-english",
    category: "business-english",
    title: "Business English",
    titleVi: "Đàm phán & Thương mại",
    contextVi: "Đàm phán điều khoản hợp đồng, chiết khấu số lượng lớn và thời hạn bàn giao dự án với đối tác.",
    defaultUserRole: "Đại diện kinh doanh (Account Manager)",
    defaultAiRole: "Đại diện đối tác mua hàng (Procurement Director)",
    starterAiPrompt: "We appreciate your detailed proposal. While the feature set looks solid, your current quote is slightly above our allocated budget. Can we discuss pricing flexibility?",
    starterAiPromptVi: "Chúng tôi đánh giá cao bản đề xuất chi tiết của bạn. Mặc dù các tính năng rất hoàn thiện, mức báo giá hiện tại hơi vượt ngân sách của chúng tôi. Chúng ta có thể thảo luận về mức chiết khấu linh hoạt hơn không?",
    recommendedLevel: "C1",
    icon: "TrendingUp",
    starterReplies: [
      {
        en: "We would be open to offering an 8% volume discount if we can agree on a two-year commitment.",
        vi: "Chúng tôi sẵn sàng áp dụng mức chiết khấu 8% theo số lượng nếu hai bên thống nhất cam kết hợp đồng kỳ hạn 2 năm.",
      },
      {
        en: "We can also phase the implementation milestones to accommodate your quarterly cash flow requirements.",
        vi: "Chúng tôi cũng có thể chia nhỏ các giai đoạn triển khai để phù hợp hơn với dòng tiền theo quý của quý công ty.",
      },
    ],
  },
  {
    id: "meeting-presentation",
    category: "meeting-presentation",
    title: "Meeting & Presentation",
    titleVi: "Họp hành & Thuyết trình",
    contextVi: "Báo cáo kết quả dự án quý trước các bên liên quan và trả lời câu hỏi phản biện từ người tham dự.",
    defaultUserRole: "Người thuyết trình (Presenter)",
    defaultAiRole: "Thành viên ban quản trị (Stakeholder)",
    starterAiPrompt: "That was a very thorough presentation. Could you elaborate on what assumptions drove your conversion rate projections for Q4?",
    starterAiPromptVi: "Đó là một bài thuyết trình rất chi tiết. Bạn có thể giải thích rõ hơn những giả định nào đã dẫn đến dự báo tỷ lệ chuyển đổi cho Quý 4 không?",
    recommendedLevel: "B2",
    icon: "Presentation",
    starterReplies: [
      {
        en: "Certainly. Our model is based on our recent A/B test results on the onboarding flow, which showed a 15% uplift.",
        vi: "Chắc chắn rồi ạ. Mô hình của chúng tôi dựa trên kết quả thử nghiệm A/B gần đây của quy trình đăng ký, cho thấy mức tăng trưởng 15%.",
      },
      {
        en: "To be conservative, we adjusted for seasonal fluctuations and accounted for potential customer churn.",
        vi: "Để thận trọng, chúng tôi cũng đã điều chỉnh theo các biến động theo mùa và tính đến tỷ lệ rời bỏ tiềm ẩn của khách hàng.",
      },
    ],
  },
  {
    id: "making-friends",
    category: "making-friends",
    title: "Making Friends",
    titleVi: "Kết bạn & Giao lưu",
    contextVi: "Gặp một người bạn quốc tế tại sự kiện giao lưu văn hóa, nói về sở thích, âm nhạc và du lịch.",
    defaultUserRole: "Người tham gia giao lưu",
    defaultAiRole: "Bạn quốc tế thân thiện",
    starterAiPrompt: "Hi there! I love the energy at this meetup tonight. Have you lived in this city for long?",
    starterAiPromptVi: "Chào bạn! Mình rất thích không khí sôi động của buổi gặp mặt tối nay. Bạn đã sống ở thành phố này lâu chưa?",
    recommendedLevel: "A2",
    icon: "Users",
    starterReplies: [
      {
        en: "I've been here for about three years now. It has a fantastic food culture. How about you?",
        vi: "Mình sống ở đây khoảng 3 năm rồi. Nơi này có văn hóa ẩm thực tuyệt vời lắm. Còn bạn thì sao?",
      },
      {
        en: "I just moved here a couple of months ago! I'm still exploring all the interesting neighborhoods.",
        vi: "Mình vừa mới chuyển đến đây vài tháng trước! Mình vẫn đang đi khám phá các khu phố thú vị.",
      },
    ],
  },
  {
    id: "phone-conversation",
    category: "phone-conversation",
    title: "Phone Conversation",
    titleVi: "Gọi điện thoại trao đổi",
    contextVi: "Gọi điện đặt hẹn nha sĩ, hỏi lại thời gian trống phù hợp vào cuối tuần và xác nhận địa chỉ phòng khám.",
    defaultUserRole: "Người gọi đặt hẹn (Caller)",
    defaultAiRole: "Tiếp tân phòng khám (Clinic Receptionist)",
    starterAiPrompt: "Thank you for calling Bright Dental Care! This is Sarah speaking. How can I help you today?",
    starterAiPromptVi: "Cảm ơn quý khách đã gọi đến Nha khoa Bright Dental Care! Em là Sarah. Em có thể hỗ trợ gì cho quý khách hôm nay ạ?",
    recommendedLevel: "B1",
    icon: "PhoneCall",
    starterReplies: [
      {
        en: "Hello Sarah, I would like to schedule a routine dental check-up and teeth cleaning for this Saturday morning.",
        vi: "Chào Sarah, tôi muốn đặt lịch khám răng định kỳ và cạo vôi răng vào sáng thứ Bảy tuần này.",
      },
      {
        en: "Do you have any available slots after 10 AM? Also, could you remind me what documents I need to bring?",
        vi: "Bên bạn còn khung giờ trống nào sau 10 giờ sáng không? Bạn cũng nhắc giúp tôi cần mang theo giấy tờ gì nhé?",
      },
    ],
  },
];

export function getScenarioById(id: string): RoleplayScenario | undefined {
  return ROLEPLAY_SCENARIOS.find((s) => s.id === id);
}

export function getDefaultScenario(): RoleplayScenario {
  return ROLEPLAY_SCENARIOS[0];
}
