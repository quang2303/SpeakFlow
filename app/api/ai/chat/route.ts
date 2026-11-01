import { NextResponse } from "next/server";

interface ChatRequestPayload {
  userMessage: string;
  scenarioTitle?: string;
  scenarioContext?: string;
  level?: string;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

interface AIResponsePayload {
  replyEn: string;
  replyVi: string;
  feedbackVi: string;
  suggestedReplies: Array<{
    en: string;
    vi: string;
  }>;
  source: "gemini" | "builtin";
}

/**
 * Intelligent built-in rule & scenario engine for when Gemini API key is not configured or offline
 */
function generateBuiltinResponse(
  userText: string,
  scenarioTitle?: string,
  level = "B1"
): AIResponsePayload {
  const lower = userText.toLowerCase().trim();

  // 1. Scenario: Standup / Workplace
  if (
    scenarioTitle?.toLowerCase().includes("standup") ||
    lower.includes("track") ||
    lower.includes("progress") ||
    lower.includes("task")
  ) {
    return {
      replyEn:
        "That sounds wonderful! Please keep us posted if you run into any blockers with the QA team.",
      replyVi:
        "Nghe tuyệt vời đấy! Nhớ báo lại nếu em gặp bất kỳ trở ngại nào với đội ngũ QA nhé.",
      feedbackVi:
        "Câu trả lời rõ ràng, dùng đúng thì và thể hiện tác phong chuyên nghiệp trong môi trường làm việc.",
      suggestedReplies: [
        {
          en: "Will do. I will ping you on Slack as soon as the pull request is ready.",
          vi: "Dạ vâng. Em sẽ nhắn anh trên Slack ngay khi pull request sẵn sàng.",
        },
        {
          en: "Everything is smooth so far, no blockers at all.",
          vi: "Mọi thứ đến giờ vẫn rất suôn sẻ, không có vướng mắc gì ạ.",
        },
      ],
      source: "builtin",
    };
  }

  // 2. Scenario: Coffee Shop / Restaurant
  if (
    scenarioTitle?.toLowerCase().includes("cà phê") ||
    scenarioTitle?.toLowerCase().includes("coffee") ||
    lower.includes("latte") ||
    lower.includes("coffee") ||
    lower.includes("drink")
  ) {
    return {
      replyEn:
        "Great choice! Would you like that with whole milk, or would you prefer our house oat milk?",
      replyVi:
        "Lựa chọn tuyệt vời! Bạn muốn dùng sữa tươi nguyên kem hay sữa yến mạch đặc trưng của quán ạ?",
      feedbackVi:
        "Cấu trúc gọi món tự nhiên và lịch sự. Cụm từ 'Could I get...' được người bản xứ sử dụng rất phổ biến.",
      suggestedReplies: [
        {
          en: "Oat milk would be perfect, thank you!",
          vi: "Cho mình sữa yến mạch nhé, cảm ơn bạn!",
        },
        {
          en: "Could I also get a croissant to go with that?",
          vi: "Cho mình gọi thêm một chiếc bánh sừng bò ăn kèm được không?",
        },
      ],
      source: "builtin",
    };
  }

  // 3. Scenario: Meeting / Breaking up
  if (
    lower.includes("breaking up") ||
    lower.includes("repeat") ||
    lower.includes("connection")
  ) {
    return {
      replyEn:
        "No problem at all! Let me switch my audio input. Can you hear me clearly now?",
      replyVi:
        "Không sao cả! Để mình chuyển mic một chút. Bây giờ bạn nghe rõ mình nói chưa?",
      feedbackVi:
        "Xử lý tình huống kỹ thuật trong họp online rất khéo léo và tự nhiên bằng cụm 'breaking up a bit'.",
      suggestedReplies: [
        {
          en: "Yes, loud and clear now. Please go ahead!",
          vi: "Rồi, giờ nghe rất to và rõ. Bạn nói tiếp đi nhé!",
        },
        {
          en: "It is much better now, thank you.",
          vi: "Giờ ổn hơn nhiều rồi, cảm ơn bạn.",
        },
      ],
      source: "builtin",
    };
  }

  // 4. General fallback
  return {
    replyEn:
      "That is a great point. How do you plan to take this to the next step?",
    replyVi:
      "Đó là một ý rất hay. Bạn dự định sẽ triển khai bước tiếp theo như thế nào?",
    feedbackVi:
      "Phát âm và diễn đạt lưu loát. Bạn có thể mở rộng thêm bằng các liên từ như 'Furthermore' hoặc 'In addition'.",
    suggestedReplies: [
      {
        en: "I am going to discuss this with my team first.",
        vi: "Mình sẽ thảo luận với đội ngũ của mình trước đã.",
      },
      {
        en: "Let me check our schedule and get back to you shortly.",
        vi: "Để mình kiểm tra lịch rồi phản hồi bạn sớm nhé.",
      },
    ],
    source: "builtin",
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestPayload;
    const { userMessage, scenarioTitle, scenarioContext, level = "B1", history = [] } = body;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json(
        { error: "Vui lòng cung cấp nội dung câu nói (userMessage)." },
        { status: 400 }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;

    // If Gemini API key is present, invoke Google Gemini 1.5 Flash
    if (geminiApiKey) {
      try {
        const systemPrompt = `You are SpeakFlow AI Tutor, an empathetic, native English conversational partner helping Vietnamese learners practice real-world spoken English.
Context: "${scenarioTitle || "General English Conversation"} - ${scenarioContext || ""}".
Learner CEFR Level target: ${level}.
Task:
1. Act in character as the dialogue partner. Respond naturally and concisely in 1-2 sentences.
2. Provide an accurate Vietnamese translation of your response.
3. Provide a brief constructive feedback in Vietnamese (1-2 sentences max) noting vocabulary, grammar, or natural idiom nuances for the learner's utterance.
4. Suggest 2 realistic natural reply options the learner could say next, with Vietnamese translations.

Respond STRICTLY in valid JSON with this exact schema:
{
  "replyEn": "...",
  "replyVi": "...",
  "feedbackVi": "...",
  "suggestedReplies": [
    { "en": "...", "vi": "..." },
    { "en": "...", "vi": "..." }
  ]
}`;

        const contents = [
          {
            role: "user",
            parts: [{ text: systemPrompt }],
          },
          ...history.map((h) => ({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.content }],
          })),
          {
            role: "user",
            parts: [
              {
                text: `Learner just said: "${userMessage}". Please reply in character now.`,
              },
            ],
          },
        ];

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: 0.7,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText =
            data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          const parsed = JSON.parse(rawText) as Partial<AIResponsePayload>;

          if (parsed.replyEn && parsed.replyVi) {
            return NextResponse.json({
              replyEn: parsed.replyEn,
              replyVi: parsed.replyVi,
              feedbackVi:
                parsed.feedbackVi ||
                "Phản hồi tự nhiên và phát âm rõ ràng!",
              suggestedReplies: parsed.suggestedReplies || [],
              source: "gemini",
            });
          }
        }
      } catch (geminiError) {
        // Fall back gracefully to built-in conversational generator
        console.warn("Gemini API call failed, falling back to built-in AI:", geminiError);
      }
    }

    // Default built-in smart conversational response
    const fallback = generateBuiltinResponse(userMessage, scenarioTitle, level);
    return NextResponse.json(fallback);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Lỗi xử lý yêu cầu hội thoại AI.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
