import { NextRequest, NextResponse } from "next/server";
import { TestMode } from "@/lib/assessment/types";
import {
  getQuestionsForTestMode,
  sanitizeQuestionForClient,
} from "@/lib/assessment/questionBank";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get("mode") || "quick") as TestMode;

    const questions = getQuestionsForTestMode(mode);
    // Sanitize questions: strip correctAnswer and explanationVi
    const sanitized = questions.map(sanitizeQuestionForClient);

    return NextResponse.json({
      success: true,
      mode,
      totalQuestions: sanitized.length,
      questions: sanitized,
    });
  } catch (error) {
    console.error("Failed to load assessment questions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load assessment questions.",
      },
      { status: 500 }
    );
  }
}
