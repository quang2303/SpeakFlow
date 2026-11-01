import type { AIProvider } from "./base";
import type {
  AIReplyResult,
  AITutorChatRequest,
  AITutorSummaryRequest,
  SessionSummary,
  TutorCorrection,
} from "../types";

/**
 * Intelligent rule & contextual response generator for development / test environments
 * Explicitly flags `isMock: true` and `source: "mock"`
 */
export class MockAIProvider implements AIProvider {
  name = "Mock AI Provider (Development & Testing Mode)";

  async generateReply(request: AITutorChatRequest): Promise<AIReplyResult> {
    const {
      userMessage,
      scenarioTitle = "General",
      scenarioContext = "",
      userRole = "Learner",
      aiRole = "Tutor",
      level = "B1",
      correctionMode = "gentle",
    } = request;

    const lower = userMessage.toLowerCase().trim();
    let tutorCorrection: TutorCorrection | null = null;

    // Detect common Vietnamese learner errors for demonstration and test verification
    if (lower.includes("very like")) {
      tutorCorrection = {
        hasError: true,
        errorType: "vocabulary",
        originalSentence: userMessage,
        correctedSentence: userMessage.replace(/very like/gi, "really like"),
        explanationVi:
          'Trong tiếng Anh, ta dùng "really like" hoặc "love" chứ không nói "very like".',
        betterAlternative: "I am a huge fan of this.",
        severity: "medium",
      };
    } else if (/\bi am agree\b/i.test(userMessage) || /\bi'm agree\b/i.test(userMessage)) {
      tutorCorrection = {
        hasError: true,
        errorType: "grammar",
        originalSentence: userMessage,
        correctedSentence: userMessage.replace(/i am agree|i'm agree/gi, "I agree"),
        explanationVi:
          '"Agree" là một động từ thường, do đó dùng "I agree" thay vì "I am agree".',
        betterAlternative: "I couldn't agree more.",
        severity: "medium",
      };
    } else if (/\bexplain me\b/i.test(userMessage)) {
      tutorCorrection = {
        hasError: true,
        errorType: "grammar",
        originalSentence: userMessage,
        correctedSentence: userMessage.replace(/explain me/gi, "explain to me"),
        explanationVi:
          'Cấu trúc đúng là "explain something to someone", không nói "explain me".',
        betterAlternative: "Could you clarify that for me?",
        severity: "low",
      };
    } else if (correctionMode === "intensive" && lower.length > 5) {
      tutorCorrection = {
        hasError: false,
        errorType: "none",
        originalSentence: userMessage,
        correctedSentence: userMessage,
        explanationVi:
          "Câu của bạn rất tự nhiên và chính xác về mặt ngữ pháp. Bạn có thể mở rộng thêm liên từ để câu văn uyển chuyển hơn.",
        betterAlternative: `To be more formal: "${userMessage.replace(/i want/gi, "I would appreciate")}"`,
        severity: "low",
      };
    }

    // Contextual responses based on scenario
    let replyEn = `That sounds very interesting! As your ${aiRole}, I would love to hear more about your thoughts on this.`;
    let replyVi = `Nghe rất thú vị! Với vai trò là ${aiRole}, tôi rất muốn nghe thêm suy nghĩ của bạn về điều này.`;
    let followUpQuestionEn = "Could you tell me a little bit more about that?";
    let followUpQuestionVi = "Bạn có thể chia sẻ thêm một chút về điều đó không?";

    if (scenarioTitle.toLowerCase().includes("restaurant") || lower.includes("menu") || lower.includes("table")) {
      replyEn = "Certainly! Our chef prepares everything fresh today. Would you like to start with an appetizer or head straight to the main courses?";
      replyVi = "Chắc chắn rồi ạ! Hôm nay bếp trưởng chuẩn bị toàn bộ đồ tươi mới. Quý khách muốn bắt đầu với món khai vị hay chọn luôn món chính ạ?";
      followUpQuestionEn = "Would you like our signature wine pairing with that?";
      followUpQuestionVi = "Quý khách có muốn dùng kèm rượu vang đặc trưng của quán không?";
    } else if (scenarioTitle.toLowerCase().includes("hotel") || lower.includes("check in") || lower.includes("reservation")) {
      replyEn = "I have your reservation pulled up right here. You are all set in a deluxe room on the 8th floor. Here is your keycard!";
      replyVi = "Em đã tìm thấy thông tin đặt phòng của quý khách ngay đây rồi. Phòng deluxe tầng 8 đã sẵn sàng. Em gửi quý khách thẻ từ ạ!";
      followUpQuestionEn = "Do you need any assistance with your luggage or parking?";
      followUpQuestionVi = "Quý khách có cần hỗ trợ mang hành lý hay đỗ xe không ạ?";
    } else if (scenarioTitle.toLowerCase().includes("interview") || lower.includes("experience") || lower.includes("project")) {
      replyEn = "That is a very impressive background. In our fast-paced team, we value resilience and cross-functional communication.";
      replyVi = "Đó là một nền tảng kinh nghiệm rất ấn tượng. Trong đội ngũ của chúng tôi, sự kiên cường và khả năng giao tiếp liên phòng ban được đánh giá rất cao.";
      followUpQuestionEn = "How do you typically prioritize tasks when deadlines overlap?";
      followUpQuestionVi = "Bạn thường ưu tiên sắp xếp công việc như thế nào khi các deadline bị trùng nhau?";
    } else if (scenarioTitle.toLowerCase().includes("standup") || scenarioTitle.toLowerCase().includes("office") || lower.includes("track")) {
      replyEn = "Great update! Glad to hear the core features are on schedule. Let's make sure the integration tests pass before deployment.";
      replyVi = "Báo cáo rất tốt! Rất vui vì các tính năng cốt lõi đang đúng tiến độ. Hãy đảm bảo các bài test tích hợp đều pass trước khi deploy nhé.";
      followUpQuestionEn = "Do you foresee any potential blockers from other teams?";
      followUpQuestionVi = "Em có lường trước trở ngại tiềm ẩn nào từ các nhóm khác không?";
    }

    const suggestedReplies = [
      {
        en: "Everything is going smoothly on my end, thank you for asking.",
        vi: "Mọi việc phía tôi đều đang diễn ra rất thuận lợi, cảm ơn bạn đã hỏi thăm.",
      },
      {
        en: "Could you give me a few minutes to think about that?",
        vi: "Bạn có thể cho tôi vài phút để suy nghĩ về điều đó được không?",
      },
    ];

    return {
      replyEn,
      replyVi,
      tutorCorrection,
      suggestedReplies,
      followUpQuestionEn,
      followUpQuestionVi,
      source: "mock",
      isMock: true,
      tokensUsed: {
        prompt: 120,
        completion: 95,
        total: 215,
      },
    };
  }

  async generateSummary(request: AITutorSummaryRequest): Promise<SessionSummary> {
    const { scenarioTitle, cefrLevel, durationSeconds, history } = request;
    const turnsCount = history.filter((h) => h.role === "user").length;

    const grammarFeedback = history
      .filter((h) => h.correction && h.correction.hasError)
      .map((h) => ({
        errorType: h.correction!.errorType,
        original: h.correction!.originalSentence,
        corrected: h.correction!.correctedSentence,
        explanationVi: h.correction!.explanationVi,
      }));

    return {
      topic: scenarioTitle,
      cefrLevel,
      turnsCount,
      durationSeconds,
      completionStatus: "completed",
      accomplishmentScore: Math.min(100, Math.max(65, turnsCount * 15)),
      strengths: [
        "Phản hồi tự tin và duy trì mạch đối thoại liên tục.",
        "Sử dụng từ vựng phù hợp với ngữ cảnh giao tiếp thực tế.",
        "Tiếp thu góp ý sửa lỗi nhanh chóng.",
      ],
      areasForImprovement: [
        "Cần chú ý thêm về các mạo từ (a/an/the) và giới từ đi kèm.",
        "Nên bổ sung thêm phrasal verbs để câu nói nghe tự nhiên hơn.",
      ],
      grammarFeedback:
        grammarFeedback.length > 0
          ? grammarFeedback
          : [
              {
                errorType: "vocabulary",
                original: "I very like this topic.",
                corrected: "I really like this topic.",
                explanationVi: 'Dùng "really like" thay vì "very like" để diễn đạt tự nhiên.',
              },
            ],
      vocabularyFeedback: {
        usedWell: ["right on track", "appreciate", "look forward to", "reservation"],
        recommended: [
          {
            wordOrPhrase: "could I get...",
            meaningVi: "Cho tôi xin / Cho tôi gọi...",
            example: "Could I get a glass of water, please?",
          },
          {
            wordOrPhrase: "keep someone posted",
            meaningVi: "cập nhật liên tục tình hình cho ai đó",
            example: "I will keep you posted on the project status.",
          },
        ],
      },
      nextRecommendations: [
        "Thực hành tiếp kịch bản Phỏng vấn hoặc Họp hành ở cấp độ B2.",
        "Luyện tập phát âm các từ nối và giảm âm trong câu giao tiếp ngắn.",
        "Ôn lại các cụm từ vừa lưu vào Flashcard theo lịch lặp lại SRS.",
      ],
      keyTakeawayCards: [
        {
          phraseEn: "right on track",
          sentenceEn: "Everything is right on track for our release.",
          meaningVi: "đúng tiến độ / đúng kế hoạch",
          sentenceVi: "Mọi thứ đang diễn ra hoàn toàn đúng tiến độ bàn giao.",
          contextNote: "Dùng phổ biến trong công việc và báo cáo tiến độ.",
          level: cefrLevel,
        },
        {
          phraseEn: "could I get",
          sentenceEn: "Could I get an iced latte with oat milk, please?",
          meaningVi: "cho tôi gọi / cho tôi xin",
          sentenceVi: "Cho tôi một ly latte đá sữa yến mạch nhé.",
          contextNote: "Cách gọi món và yêu cầu lịch sự chuẩn người bản ngữ.",
          level: cefrLevel,
        },
      ],
    };
  }
}
