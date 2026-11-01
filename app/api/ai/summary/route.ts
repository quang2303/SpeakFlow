import { NextResponse } from "next/server";
import { handleTutorSummary } from "@/lib/ai/tutorService";
import { AITutorSummaryRequest } from "@/lib/ai/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AITutorSummaryRequest;
    const { scenarioTitle, cefrLevel = "B1", durationSeconds = 0, history = [] } = body;

    if (!Array.isArray(history) || history.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy nội dung lịch sử hội thoại để tổng kết." },
        { status: 400 }
      );
    }

    const summary = await handleTutorSummary({
      scenarioTitle: scenarioTitle || "General Practice",
      cefrLevel,
      durationSeconds,
      history,
    });

    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Lỗi tổng hợp kết quả buổi học.",
      },
      { status: 500 }
    );
  }
}
