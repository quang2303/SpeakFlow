import { NextResponse } from "next/server";
import { generateAdaptiveRecommendations } from "@/lib/learningPath/adaptiveEngine";
import { LearningPlan } from "@/lib/learningPath/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { plan: LearningPlan; userId?: string };
    const { plan, userId } = body;

    if (!plan || !plan.id || !Array.isArray(plan.days)) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp dữ liệu lộ trình học (plan) hợp lệ." },
        { status: 400 }
      );
    }

    const recommendations = generateAdaptiveRecommendations(plan, userId);
    return NextResponse.json({ recommendations });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Lỗi đánh giá và thích ứng lộ trình.",
      },
      { status: 500 }
    );
  }
}
