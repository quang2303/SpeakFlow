import type {
  AssessmentQuestion,
  PublicQuestion,
  TestMode,
} from "./types";

/**
 * Authentic, pedagogical question bank for SpeakFlow CEFR Placement Test
 * Strictly categorizes items by CEFR level (A1 to C2) and Skill
 * Note: Answers and explanations are stripped before delivering to client during the test.
 */
export const ASSESSMENT_QUESTION_BANK: AssessmentQuestion[] = [
  // =========================================================================
  // GRAMMAR (A1 to C2)
  // =========================================================================
  {
    id: "g_a1_01",
    skill: "grammar",
    level: "A1",
    type: "multiple_choice",
    difficulty: 0.15,
    topic: "To be & Pronouns",
    prompt: "Choose the correct form to complete the sentence:\n\nMy sister and I _____ from Vietnam.",
    choices: [
      { id: "A", text: "am" },
      { id: "B", text: "is" },
      { id: "C", text: "are" },
      { id: "D", text: "be" },
    ],
    correctAnswer: "C",
    explanationVi: 'Chủ ngữ "My sister and I" là ngôi thứ nhất số nhiều (tương đương đại từ "we"), do đó động từ to be ở thì hiện tại đơn phải là "are".',
  },
  {
    id: "g_a1_02",
    skill: "grammar",
    level: "A1",
    type: "multiple_choice",
    difficulty: 0.18,
    topic: "Articles (a/an/the)",
    prompt: "Choose the correct article:\n\nShe usually eats _____ apple and drinks a cup of tea for breakfast.",
    choices: [
      { id: "A", text: "a" },
      { id: "B", text: "an" },
      { id: "C", text: "the" },
      { id: "D", text: "some" },
    ],
    correctAnswer: "B",
    explanationVi: 'Từ "apple" bắt đầu bằng một nguyên âm (/ˈæp.əl/), danh từ số ít đếm được đứng sau mạo từ bất định phải dùng "an".',
  },
  {
    id: "g_a2_01",
    skill: "grammar",
    level: "A2",
    type: "multiple_choice",
    difficulty: 0.32,
    topic: "Past Simple irregular verbs",
    prompt: "Choose the correct past form:\n\nLast Saturday, we _____ to Ha Long Bay and took a lot of photos.",
    choices: [
      { id: "A", text: "go" },
      { id: "B", text: "went" },
      { id: "C", text: "gone" },
      { id: "D", text: "going" },
    ],
    correctAnswer: "B",
    explanationVi: 'Có trạng từ thời gian quá khứ rõ ràng "Last Saturday", ta chia thì Quá khứ đơn (Past Simple). Động từ bất quy tắc của "go" ở dạng quá khứ là "went".',
  },
  {
    id: "g_a2_02",
    skill: "grammar",
    level: "A2",
    type: "multiple_choice",
    difficulty: 0.35,
    topic: "Comparatives",
    prompt: "Choose the correct comparative form:\n\nTraveling by train is usually _____ than traveling by plane.",
    choices: [
      { id: "A", text: "cheaper" },
      { id: "B", text: "more cheap" },
      { id: "C", text: "cheapest" },
      { id: "D", text: "as cheap" },
    ],
    correctAnswer: "A",
    explanationVi: '"Cheap" là tính từ ngắn 1 âm tiết. Khi so sánh hơn (comparative) với "than", ta thêm hậu tố "-er" thành "cheaper".',
  },
  {
    id: "g_b1_01",
    skill: "grammar",
    level: "B1",
    type: "multiple_choice",
    difficulty: 0.5,
    topic: "Present Perfect (for vs since)",
    prompt: "Choose the correct preposition of time:\n\nDavid has worked as a software engineer at this tech firm _____ five years.",
    choices: [
      { id: "A", text: "since" },
      { id: "B", text: "for" },
      { id: "C", text: "during" },
      { id: "D", text: "from" },
    ],
    correctAnswer: "B",
    explanationVi: 'Trong thì Hiện tại hoàn thành (Present Perfect), "for" đi với một khoảng thời gian (khoảng 5 năm - a period of time: "five years"), còn "since" đi với mốc thời gian cụ thể (ví dụ: since 2021).',
  },
  {
    id: "g_b1_02",
    skill: "grammar",
    level: "B1",
    type: "multiple_choice",
    difficulty: 0.55,
    topic: "Second Conditional",
    prompt: "Choose the correct verb form for hypothetical situation:\n\nIf I _____ more free time, I would enroll in an advanced public speaking course.",
    choices: [
      { id: "A", text: "have" },
      { id: "B", text: "had" },
      { id: "C", text: "have had" },
      { id: "D", text: "will have" },
    ],
    correctAnswer: "B",
    explanationVi: 'Đây là câu điều kiện loại 2 (Second Conditional) diễn tả điều kiện không có thật ở hiện tại: Mệnh đề If dùng thì Quá khứ đơn (had), mệnh đề chính dùng "would + V-inf" (would enroll).',
  },
  {
    id: "g_b2_01",
    skill: "grammar",
    level: "B2",
    type: "multiple_choice",
    difficulty: 0.68,
    topic: "Modal Perfect (Deduction in past)",
    prompt: "Choose the most appropriate modal verb:\n\nYou _____ have left your car keys at the restaurant; I searched everywhere in our house and they aren't here.",
    choices: [
      { id: "A", text: "must" },
      { id: "B", text: "should" },
      { id: "C", text: "would" },
      { id: "D", text: "can" },
    ],
    correctAnswer: "A",
    explanationVi: 'Cấu trúc "must have + V3/ed" dùng để suy đoán chắc chắn về một sự việc đã xảy ra trong quá khứ dựa trên bằng chứng cụ thể (đã tìm khắp nhà không thấy).',
  },
  {
    id: "g_b2_02",
    skill: "grammar",
    level: "B2",
    type: "multiple_choice",
    difficulty: 0.72,
    topic: "Reported Speech & Backshifting",
    prompt: "Choose the correct indirect speech form:\n\nEmma told me that she _____ her manager the previous afternoon.",
    choices: [
      { id: "A", text: "meets" },
      { id: "B", text: "has met" },
      { id: "C", text: "had met" },
      { id: "D", text: "will meet" },
    ],
    correctAnswer: "C",
    explanationVi: 'Trong câu gián tiếp (reported speech), hành động xảy ra trước thời điểm kể ("the previous afternoon" là quá khứ của "yesterday afternoon"), động từ phải lùi thì thành Quá khứ hoàn thành (Past Perfect: had met).',
  },
  {
    id: "g_c1_01",
    skill: "grammar",
    level: "C1",
    type: "multiple_choice",
    difficulty: 0.85,
    topic: "Negative Inversion",
    prompt: "Choose the correct inversion pattern:\n\nScarcely _____ the keynote speech when the audience broke into enthusiastic applause.",
    choices: [
      { id: "A", text: "he finished" },
      { id: "B", text: "did he finish" },
      { id: "C", text: "had he finished" },
      { id: "D", text: "he had finished" },
    ],
    correctAnswer: "C",
    explanationVi: 'Cấu trúc đảo ngữ với phó từ phủ định đứng đầu câu: "Scarcely had + S + V3/ed... when + S + V2/ed" (Vừa mới... thì...). Đảo trợ động từ "had" lên trước chủ ngữ.',
  },
  {
    id: "g_c2_01",
    skill: "grammar",
    level: "C2",
    type: "multiple_choice",
    difficulty: 0.95,
    topic: "Syntactic Nuance & Subjunctive Cleft",
    prompt: "Choose the grammatically refined option:\n\nIt is imperative that every board member _____ notified of the acquisition prior to the press release.",
    choices: [
      { id: "A", text: "is" },
      { id: "B", text: "be" },
      { id: "C", text: "was" },
      { id: "D", text: "will be" },
    ],
    correctAnswer: "B",
    explanationVi: 'Cấu trúc giả định thức hiện tại (Present Subjunctive) theo sau tính từ mang tính cấp bách ("It is imperative that + S + (should) be + V3/ed"). Động từ giữ nguyên mẫu không "to" là "be".',
  },

  // =========================================================================
  // VOCABULARY (A1 to C2)
  // =========================================================================
  {
    id: "v_a1_01",
    skill: "vocabulary",
    level: "A1",
    type: "multiple_choice",
    difficulty: 0.15,
    topic: "Daily Routine Collocations",
    prompt: "Choose the correct verb to complete the collocation:\n\nI always _____ my teeth before going to bed.",
    choices: [
      { id: "A", text: "brush" },
      { id: "B", text: "wash" },
      { id: "C", text: "comb" },
      { id: "D", text: "make" },
    ],
    correctAnswer: "A",
    explanationVi: 'Cụm từ cố định (collocation) trong tiếng Anh là "brush one\'s teeth" (đánh răng). Không dùng "wash" hay "comb" cho răng.',
  },
  {
    id: "v_a2_01",
    skill: "vocabulary",
    level: "A2",
    type: "multiple_choice",
    difficulty: 0.3,
    topic: "Common Phrasal Verbs",
    prompt: "Choose the correct phrasal verb:\n\nIt is getting chilly outside; you should _____ your jacket.",
    choices: [
      { id: "A", text: "put on" },
      { id: "B", text: "take off" },
      { id: "C", text: "look after" },
      { id: "D", text: "turn on" },
    ],
    correctAnswer: "A",
    explanationVi: '"Put on" nghĩa là mặc vào (áo ấm, giày dép), phù hợp với ngữ cảnh trời trở lạnh ("getting chilly"). "Take off" là cởi ra.',
  },
  {
    id: "v_b1_01",
    skill: "vocabulary",
    level: "B1",
    type: "multiple_choice",
    difficulty: 0.48,
    topic: "Work Collocations",
    prompt: "Choose the correct verb that collocates with 'decision':\n\nAfter discussing all viable options, the management finally _____ a major decision to expand overseas.",
    choices: [
      { id: "A", text: "did" },
      { id: "B", text: "made" },
      { id: "C", text: "took" },
      { id: "D", text: "gave" },
    ],
    correctAnswer: "B",
    explanationVi: 'Collocation chuẩn trong tiếng Anh là "make a decision" (đưa ra quyết định). Ở quá khứ chia là "made a decision".',
  },
  {
    id: "v_b2_01",
    skill: "vocabulary",
    level: "B2",
    type: "multiple_choice",
    difficulty: 0.65,
    topic: "Business & Communication Idioms",
    prompt: "Choose the word that fits the idiom:\n\nBecause the two companies could not agree on price terms, the negotiations fell _____.",
    choices: [
      { id: "A", text: "through" },
      { id: "B", text: "down" },
      { id: "C", text: "away" },
      { id: "D", text: "off" },
    ],
    correctAnswer: "A",
    explanationVi: 'Cụm động từ "fall through" có nghĩa là đổ vỡ, không thành công (nói về kế hoạch, đàm phán hoặc thỏa thuận).',
  },
  {
    id: "v_c1_01",
    skill: "vocabulary",
    level: "C1",
    type: "multiple_choice",
    difficulty: 0.82,
    topic: "Advanced Collocations & Register",
    prompt: "Choose the adjective that best collocates with 'scrutiny':\n\nFollowing the financial audit, the startup\'s accounting methods were subjected to intense public _____.",
    choices: [
      { id: "A", text: "scrutiny" },
      { id: "B", text: "glance" },
      { id: "C", text: "look" },
      { id: "D", text: "sight" },
    ],
    correctAnswer: "A",
    explanationVi: 'Cụm từ "intense public scrutiny" là collocation học thuật cao cấp chỉ sự xem xét, soi xét kỹ lưỡng và gắt gao từ công chúng.',
  },
  {
    id: "v_c2_01",
    skill: "vocabulary",
    level: "C2",
    type: "multiple_choice",
    difficulty: 0.94,
    topic: "Semantic Precision & Nuance",
    prompt: "Choose the most precise word:\n\nThe witness\'s explanation was deliberately _____, leaving prosecutors unsure about the sequence of events.",
    choices: [
      { id: "A", text: "equivocal" },
      { id: "B", text: "unequivocal" },
      { id: "C", text: "transparent" },
      { id: "D", text: "candid" },
    ],
    correctAnswer: "A",
    explanationVi: '"Equivocal" nghĩa là mập mờ, nước đôi, cố ý không rõ ràng ("deliberately ambiguous"), khiến công tố viên không thể xác định được sự việc.',
  },

  // =========================================================================
  // READING COMPREHENSION (A1 to C2)
  // =========================================================================
  {
    id: "r_a2_01",
    skill: "reading",
    level: "A2",
    type: "reading_comprehension",
    difficulty: 0.32,
    topic: "Travel Notice",
    readingPassage: {
      title: "Notice: City Airport Express Bus",
      content:
        "The Airport Express Bus leaves every 20 minutes from Central Station between 5:00 AM and 11:00 PM daily. One-way tickets cost $10 for adults and $5 for children under 12. Free Wi-Fi is provided on board. Please arrive at least 5 minutes before departure.",
    },
    prompt: "According to the notice, how often does the Airport Express Bus depart?",
    choices: [
      { id: "A", text: "Every 5 minutes" },
      { id: "B", text: "Every 10 minutes" },
      { id: "C", text: "Every 20 minutes" },
      { id: "D", text: "Every 12 minutes" },
    ],
    correctAnswer: "C",
    explanationVi: 'Đoạn văn nêu rõ: "The Airport Express Bus leaves every 20 minutes from Central Station", tức là cứ 20 phút có một chuyến.',
  },
  {
    id: "r_b1_01",
    skill: "reading",
    level: "B1",
    type: "reading_comprehension",
    difficulty: 0.52,
    topic: "Workplace Memo",
    readingPassage: {
      title: "Internal Memo: Flexible Working Policy",
      content:
        "Starting next month, all team members in the marketing department may work remotely up to two days per week. However, all employees must be physically present in the office on Tuesdays for the weekly cross-functional synchronization meeting. Remote work days must be logged on the HR portal by Friday afternoon.",
    },
    prompt: "Which day is mandatory for all employees to work in the office?",
    choices: [
      { id: "A", text: "Monday" },
      { id: "B", text: "Tuesday" },
      { id: "C", text: "Friday" },
      { id: "D", text: "Any day of their choice" },
    ],
    correctAnswer: "B",
    explanationVi: 'Đoạn thông báo quy định: "all employees must be physically present in the office on Tuesdays for the weekly cross-functional synchronization meeting".',
  },
  {
    id: "r_b2_01",
    skill: "reading",
    level: "B2",
    type: "reading_comprehension",
    difficulty: 0.7,
    topic: "Technology & Habit Formation",
    readingPassage: {
      title: "Digital Well-being in Modern Workspaces",
      content:
        "Continuous workplace notifications fracture cognitive focus. Recent neuroscience studies suggest that once distracted by a non-critical alert, the average knowledge worker requires up to 23 minutes to regain deep conceptual focus. Progressive tech firms have thus introduced 'silent blocks'—dedicated hours where asynchronous communication takes precedence over immediate responses.",
    },
    prompt: "What is the primary objective of implementing 'silent blocks'?",
    choices: [
      { id: "A", text: "To eliminate all communication among team members" },
      { id: "B", text: "To allow knowledge workers uninterrupted time for deep conceptual focus" },
      { id: "C", text: "To reduce employee working hours by 23 minutes per day" },
      { id: "D", text: "To replace human workers with automated asynchronous bots" },
    ],
    correctAnswer: "B",
    explanationVi: 'Đoạn văn giải thích việc bị xao nhãng khiến não bộ mất tới 23 phút để lấy lại tập trung sâu, do đó các công ty đưa ra "silent blocks" để nhân sự có thời gian tập trung làm việc chuyên sâu mà không bị ngắt quãng bởi thông báo.',
  },
  {
    id: "r_c1_01",
    skill: "reading",
    level: "C1",
    type: "reading_comprehension",
    difficulty: 0.86,
    topic: "Linguistic Anthropology",
    readingPassage: {
      title: "Language Evolution and Socio-economic Mobility",
      content:
        "Linguistic repertoires are not merely vehicles for semantic exchange; they function as potent socio-economic gatekeepers. The implicit prestige assigned to standardized registers frequently marginalizes non-standard dialect speakers, entrenching structural inequalities under the neutral guise of communicative clarity. Consequently, language proficiency assessments must navigate the delicate boundary between communicative competence and socio-dialectal bias.",
    },
    prompt: "What does the author imply regarding language assessments?",
    choices: [
      { id: "A", text: "They should entirely ignore standardized grammar rules" },
      { id: "B", text: "They must carefully avoid penalizing test-takers based on dialectal background rather than genuine communication ability" },
      { id: "C", text: "They always favor non-standard dialect speakers over prestigious accents" },
      { id: "D", text: "They have completely eradicated socio-economic gatekeeping" },
    ],
    correctAnswer: "B",
    explanationVi: 'Câu cuối đoạn nhấn mạnh: "assessments must navigate the delicate boundary between communicative competence and socio-dialectal bias" — các bài đánh giá ngôn ngữ cần cẩn trọng để không thiên kiến theo phương ngữ xã hội mà phải tập trung vào năng lực giao tiếp thực thụ.',
  },

  // =========================================================================
  // LISTENING COMPREHENSION (A1 to C2)
  // Audio playback is tracked, audio text is NOT shown as a transcript beforehand
  // =========================================================================
  {
    id: "l_a1_01",
    skill: "listening",
    level: "A1",
    type: "listening_comprehension",
    difficulty: 0.18,
    topic: "Time & Meeting Location",
    audioPrompt: {
      transcriptForPlayer:
        "Hi Sarah, let's meet at the coffee shop at three thirty this afternoon.",
      allowedPlays: 3,
    },
    prompt: "Listen to the audio and answer the question:\n\nWhat time is the speaker meeting Sarah?",
    choices: [
      { id: "A", text: "2:30 PM" },
      { id: "B", text: "3:15 PM" },
      { id: "C", text: "3:30 PM" },
      { id: "D", text: "4:00 PM" },
    ],
    correctAnswer: "C",
    explanationVi: 'Trong đoạn ghi âm, người nói thông báo: "meet at the coffee shop at three thirty this afternoon" (3 giờ 30 chiều).',
  },
  {
    id: "l_a2_01",
    skill: "listening",
    level: "A2",
    type: "listening_comprehension",
    difficulty: 0.35,
    topic: "Travel Departure Announcement",
    audioPrompt: {
      transcriptForPlayer:
        "Attention all passengers for Flight VN two four eight to Da Nang. The departure gate has changed from Gate four to Gate twelve. Boarding starts in fifteen minutes.",
      allowedPlays: 3,
    },
    prompt: "Listen to the announcement and answer:\n\nWhich gate should passengers go to?",
    choices: [
      { id: "A", text: "Gate 4" },
      { id: "B", text: "Gate 12" },
      { id: "C", text: "Gate 24" },
      { id: "D", text: "Gate 8" },
    ],
    correctAnswer: "B",
    explanationVi: 'Thông báo nói: "The departure gate has changed from Gate four to Gate twelve" (Cổng khởi hành đã đổi sang Cổng 12).',
  },
  {
    id: "l_b1_01",
    skill: "listening",
    level: "B1",
    type: "listening_comprehension",
    difficulty: 0.54,
    topic: "Work Schedule Negotiation",
    audioPrompt: {
      transcriptForPlayer:
        "I was wondering if we could push our project status meeting back to Thursday morning? I have an urgent client presentation scheduled for Wednesday.",
      allowedPlays: 2,
    },
    prompt: "Why does the speaker want to reschedule the project meeting?",
    choices: [
      { id: "A", text: "He is taking a day off on Wednesday" },
      { id: "B", text: "He has an urgent client presentation on Wednesday" },
      { id: "C", text: "The project has already been finalized" },
      { id: "D", text: "The client requested a meeting on Thursday" },
    ],
    correctAnswer: "B",
    explanationVi: 'Người nói giải thích lý do dời lịch: "I have an urgent client presentation scheduled for Wednesday".',
  },
  {
    id: "l_b2_01",
    skill: "listening",
    level: "B2",
    type: "listening_comprehension",
    difficulty: 0.72,
    topic: "Project Delivery Risk",
    audioPrompt: {
      transcriptForPlayer:
        "Although the core features have passed internal quality assurance, releasing the mobile application this Friday without stress testing the payment gateway would expose us to severe reputational damage.",
      allowedPlays: 2,
    },
    prompt: "What is the speaker's primary concern regarding Friday's release?",
    choices: [
      { id: "A", text: "The development team has not coded the core features" },
      { id: "B", text: "The payment gateway has not undergone sufficient stress testing" },
      { id: "C", text: "The marketing department missed the release deadline" },
      { id: "D", text: "Internal QA failed completely" },
    ],
    correctAnswer: "B",
    explanationVi: 'Người nói lo ngại việc phát hành ứng dụng mà chưa kiểm tra tải cổng thanh toán ("without stress testing the payment gateway") sẽ gây rủi ro uy tín lớn.',
  },
  {
    id: "l_c1_01",
    skill: "listening",
    level: "C1",
    type: "listening_comprehension",
    difficulty: 0.88,
    topic: "Academic Lecture on Urban Sustainability",
    audioPrompt: {
      transcriptForPlayer:
        "Advocates of rapid urbanization often tout municipal density as an inherent environmental virtue; yet without rigorous transit-oriented infrastructure, density simply compounds localized ecological externalities rather than mitigating them.",
      allowedPlays: 2,
    },
    prompt: "What nuance does the lecturer express about urban density?",
    choices: [
      { id: "A", text: "Urban density is universally harmful to economic growth" },
      { id: "B", text: "Density alone does not guarantee ecological sustainability unless backed by robust public transit infrastructure" },
      { id: "C", text: "Rural areas are vastly superior to cities in every environmental metric" },
      { id: "D", text: "Transit-oriented development has failed to mitigate traffic congestion" },
    ],
    correctAnswer: "B",
    explanationVi: 'Giảng viên phân tích: Mật độ đô thị chỉ thực sự có lợi cho môi trường khi đi kèm với hạ tầng giao thông công cộng đồng bộ ("without transit-oriented infrastructure, density compounds ecological externalities").',
  },

  // =========================================================================
  // SPEAKING ASSESSMENT (A1 to C2)
  // Evaluates read aloud text accuracy & conversational communicative intent
  // Note: Uses Web Speech API for speech recognition text matching + AI Tutor evaluation
  // =========================================================================
  {
    id: "s_a1_01",
    skill: "speaking",
    level: "A1",
    type: "speaking_read_aloud",
    difficulty: 0.2,
    topic: "Self Introduction",
    speakingPrompt: {
      targetSentence: "Hello, my name is Alex and I live in Hanoi.",
      sampleIdealResponse: "Hello, my name is Alex and I live in Hanoi.",
    },
    prompt: "Đọc to câu sau vào micro rõ ràng:\n\n\"Hello, my name is Alex and I live in Hanoi.\"",
    correctAnswer: "Hello, my name is Alex and I live in Hanoi.",
    explanationVi: 'Phần đọc to nhằm đánh giá độ trôi chảy, khả năng phát âm từ vựng căn bản (Hello, live, Hanoi) và nhịp điệu câu chào hỏi A1.',
  },
  {
    id: "s_a2_01",
    skill: "speaking",
    level: "A2",
    type: "speaking_read_aloud",
    difficulty: 0.35,
    topic: "Daily Routine",
    speakingPrompt: {
      targetSentence: "I usually wake up at seven and have breakfast with my family.",
      sampleIdealResponse: "I usually wake up at seven and have breakfast with my family.",
    },
    prompt: "Đọc to câu sau vào micro rõ ràng:\n\n\"I usually wake up at seven and have breakfast with my family.\"",
    correctAnswer: "I usually wake up at seven and have breakfast with my family.",
    explanationVi: 'Đánh giá khả năng nối âm (wake up at) và phát âm chuẩn các âm gió, từ chỉ tần suất (usually, breakfast).',
  },
  {
    id: "s_b1_01",
    skill: "speaking",
    level: "B1",
    type: "speaking_open_response",
    difficulty: 0.55,
    topic: "Hobbies & Personal Interests",
    speakingPrompt: {
      contextScenario: "Introduce your favorite leisure activity and explain why it helps you relax.",
      sampleIdealResponse: "In my free time, I really enjoy reading books and practicing English because it broadens my horizons.",
    },
    prompt: "Trả lời câu hỏi sau bằng tiếng Anh (nói từ 2 đến 3 câu):\n\n\"What is your favorite hobby and why do you enjoy it?\"",
    correctAnswer: "[Open Response: Needs mention of a hobby and clear reasons with connected clauses]",
    explanationVi: 'Đánh giá khả năng trả lời tự nhiên ở trình độ B1: Sử dụng liên từ (because, so, and), cấu trúc câu ghép và vốn từ vựng miêu tả sở thích cá nhân.',
  },
  {
    id: "s_b2_01",
    skill: "speaking",
    level: "B2",
    type: "speaking_open_response",
    difficulty: 0.72,
    topic: "Work Preferences & Remote Work",
    speakingPrompt: {
      contextScenario: "State your opinion on remote work versus office work with concrete reasons.",
      sampleIdealResponse: "In my opinion, working from home offers great flexibility and saves commute time, but collaborating in the office fosters better team cohesion.",
    },
    prompt: "Trả lời câu hỏi sau bằng tiếng Anh (nói từ 3 đến 4 câu):\n\n\"What do you think are the biggest advantages and disadvantages of working from home?\"",
    correctAnswer: "[Open Response: Balanced argument with advantages and drawbacks, good transition words]",
    explanationVi: 'Đánh giá trình độ B2: Khả năng so sánh hai mặt của một vấn đề (advantages vs disadvantages), sử dụng từ nối phản đề (however, on the other hand, although) và từ vựng công sở.',
  },
  {
    id: "s_c1_01",
    skill: "speaking",
    level: "C1",
    type: "speaking_open_response",
    difficulty: 0.88,
    topic: "Technology & The Future of Education",
    speakingPrompt: {
      contextScenario: "Critically evaluate the impact of artificial intelligence on traditional language classrooms.",
      sampleIdealResponse: "While AI empowers personalized self-paced learning, human educators remain irreplaceable in cultivating empathy, cultural nuances, and critical discourse.",
    },
    prompt: "Trả lời câu hỏi sau bằng tiếng Anh (nói từ 3 đến 5 câu):\n\n\"Do you believe artificial intelligence can ever completely replace human language teachers? Why or why not?\"",
    correctAnswer: "[Open Response: Complex syntactic structures, nuanced argumentation, professional register]",
    explanationVi: 'Đánh giá trình độ C1: Lập luận đa chiều, cấu trúc câu phức, sử dụng ngữ điệu và sắc thái từ ngữ học thuật (e.g. irreplaceable, indispensable, foster, autonomous learning).',
  },
];

/**
 * Strips correct answers and explanations before sending to client for active assessment
 */
export function sanitizeQuestionForClient(
  question: AssessmentQuestion
): PublicQuestion {
  const sanitized: Partial<AssessmentQuestion> = { ...question };
  delete sanitized.correctAnswer;
  delete sanitized.explanationVi;
  return sanitized as PublicQuestion;
}

/**
 * Returns complete secure question bank
 */
export function getAllQuestions(): AssessmentQuestion[] {
  return [...ASSESSMENT_QUESTION_BANK];
}

/**
 * Finds question by ID from secure bank
 */
export function getQuestionById(id: string): AssessmentQuestion | undefined {
  return ASSESSMENT_QUESTION_BANK.find((q) => q.id === id);
}

/**
 * Selects questions tailored for a specific TestMode
 */
export function getQuestionsForTestMode(mode: TestMode): AssessmentQuestion[] {
  switch (mode) {
    case "quick": {
      // 12 representative questions spanning A1 to C1
      const selectedIds = [
        "g_a1_01",
        "g_a2_01",
        "g_b1_01",
        "g_b2_01",
        "v_a1_01",
        "v_a2_01",
        "v_b1_01",
        "v_b2_01",
        "r_a2_01",
        "r_b1_01",
        "l_a1_01",
        "l_b1_01",
        "s_a1_01",
        "s_b1_01",
      ];
      return selectedIds
        .map((id) => getQuestionById(id))
        .filter((q): q is AssessmentQuestion => Boolean(q));
    }

    case "grammar_vocab": {
      return ASSESSMENT_QUESTION_BANK.filter(
        (q) => q.skill === "grammar" || q.skill === "vocabulary"
      );
    }

    case "speaking_only": {
      return ASSESSMENT_QUESTION_BANK.filter((q) => q.skill === "speaking");
    }

    case "full":
    default: {
      return [...ASSESSMENT_QUESTION_BANK];
    }
  }
}
