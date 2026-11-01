import { NextRequest, NextResponse } from "next/server";
import { TestMode } from "@/lib/assessment/types";
import { evaluateAssessmentSubmission } from "@/lib/assessment/adaptiveEngine";
import {
  getAllQuestions,
  getQuestionById,
} from "@/lib/assessment/questionBank";
import {
  computeOverallScore,
  computeSkillSummaries,
  scoreObjectiveQuestion,
  scoreSpeakingQuestion,
} from "@/lib/assessment/scoring";
import { estimateCefrProfile } from "@/lib/assessment/cefrEstimator";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      mode = "quick",
      responses = {},
      userId = null,
      durationSeconds = 0,
    } = body as {
      mode: TestMode;
      responses: Record<
        string,
        {
          answer: string;
          spokenText?: string;
          speechMatchScore?: number;
          responseTimeMs?: number;
        }
      >;
      userId?: string | null;
      durationSeconds?: number;
    };

    if (!responses || typeof responses !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid responses payload." },
        { status: 400 }
      );
    }

    // Objectively evaluate submission on server
    const result = evaluateAssessmentSubmission(
      mode,
      responses,
      userId,
      durationSeconds,
      {
        getAllQuestions,
        scoreObjectiveQuestion,
        scoreSpeakingQuestion,
        computeSkillSummaries,
        computeOverallScore,
        estimateCefrProfile,
      }
    );

    // Build review details with correct answers and Vietnamese explanations
    const reviewDetails = Object.keys(responses).map((qId) => {
      const q = getQuestionById(qId);
      const userResp = responses[qId];
      const evalResp = result.responses.find((r) => r.questionId === qId);

      return {
        questionId: qId,
        skill: q?.skill || "grammar",
        level: q?.level || "B1",
        prompt: q?.prompt || "",
        choices: q?.choices,
        userAnswer: userResp.answer || userResp.spokenText || "(Bỏ qua)",
        correctAnswer: q?.correctAnswer || "",
        isCorrect: Boolean(evalResp?.isCorrect),
        score: evalResp?.score || 0,
        explanationVi: q?.explanationVi || "",
      };
    });

    return NextResponse.json({
      success: true,
      result,
      reviewDetails,
    });
  } catch (error) {
    console.error("Assessment submission error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process assessment submission.",
      },
      { status: 500 }
    );
  }
}
