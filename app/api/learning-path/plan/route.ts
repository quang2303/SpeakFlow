import { NextResponse } from "next/server";
import {
  buildPlanningPrompt,
  generateTemplateLearningPlan,
} from "@/lib/learningPath/planner";
import { LearningGoal, LearningPlan } from "@/lib/learningPath/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { goal: LearningGoal };
    const { goal } = body;

    if (!goal || !goal.current_level || !goal.primary_goal) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp đầy đủ thông tin mục tiêu học tập (goal)." },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const chosenProvider = process.env.AI_PROVIDER?.toLowerCase();

    // 1. If Gemini API is available and requested
    if ((chosenProvider === "gemini" || !chosenProvider) && geminiKey) {
      try {
        const prompt = buildPlanningPrompt(goal);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.6,
                responseMimeType: "application/json",
                maxOutputTokens: 4096,
              },
            }),
          }
        );
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          const parsed = JSON.parse(rawText) as Partial<LearningPlan>;

          if (parsed.phases && parsed.days && parsed.days.length > 0) {
            const aiPlan: LearningPlan = {
              id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              user_id: goal.user_id,
              goal_id: goal.id,
              title: parsed.title || `Lộ trình ${goal.title}`,
              description: parsed.description || "Lộ trình học cá nhân hóa được tạo bởi Google Gemini AI.",
              total_days: goal.duration_days,
              current_day: 1,
              plan_version: 1,
              status: "active",
              ai_provider: "Google Gemini 1.5 Flash",
              is_mock: false,
              phases: parsed.phases,
              days: parsed.days,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            return NextResponse.json(aiPlan);
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini planning failed, falling back to deterministic template planner:", geminiErr);
      }
    }

    // 2. If OpenAI is available
    if (chosenProvider === "openai" && openaiKey) {
      try {
        const prompt = buildPlanningPrompt(goal);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.6,
            response_format: { type: "json_object" },
            max_tokens: 4000,
          }),
        });
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "{}";
          const parsed = JSON.parse(content) as Partial<LearningPlan>;

          if (parsed.phases && parsed.days && parsed.days.length > 0) {
            const aiPlan: LearningPlan = {
              id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              user_id: goal.user_id,
              goal_id: goal.id,
              title: parsed.title || `Lộ trình ${goal.title}`,
              description: parsed.description || "Lộ trình học cá nhân hóa được tạo bởi OpenAI.",
              total_days: goal.duration_days,
              current_day: 1,
              plan_version: 1,
              status: "active",
              ai_provider: "OpenAI GPT-4o mini",
              is_mock: false,
              phases: parsed.phases,
              days: parsed.days,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            return NextResponse.json(aiPlan);
          }
        }
      } catch (openAiErr) {
        console.warn("OpenAI planning failed, falling back to deterministic template planner:", openAiErr);
      }
    }

    // 3. Fallback: Deterministic high-quality template planner (Offline / Dev / Testing mode)
    const fallbackPlan = generateTemplateLearningPlan(goal);
    return NextResponse.json(fallbackPlan);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Lỗi xây dựng lộ trình học tập.",
      },
      { status: 500 }
    );
  }
}
