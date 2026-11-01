import { NextResponse } from "next/server";
import { handleTutorChat } from "@/lib/ai/tutorService";
import { AITutorChatRequest } from "@/lib/ai/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AITutorChatRequest;
    const {
      userMessage,
      scenarioId,
      scenarioTitle,
      scenarioContext,
      userRole,
      aiRole,
      level = "B1",
      correctionMode = "gentle",
      history = [],
    } = body;

    if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp nội dung câu nói (userMessage)." },
        { status: 400 }
      );
    }

    // Identify client for rate-limiting (via x-forwarded-for or fallback)
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    const clientId = ip;

    const result = await handleTutorChat(
      {
        userMessage: userMessage.trim(),
        scenarioId,
        scenarioTitle,
        scenarioContext,
        userRole,
        aiRole,
        level,
        correctionMode,
        history,
      },
      clientId
    );

    return NextResponse.json(result);
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    const isRateLimit = message.includes("quá nhiều yêu cầu") || message.includes("đang được xử lý");

    return NextResponse.json(
      {
        error: message,
        source: "error",
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
