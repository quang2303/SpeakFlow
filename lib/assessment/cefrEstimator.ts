import type {
  AssessmentResponse,
  CEFRLevel,
  ConfidenceLevel,
  SkillCategory,
  SkillScoreSummary,
} from "./types";

export interface CefrEstimationDetails {
  estimatedLevel: CEFRLevel;
  possibleRange: string;
  confidence: ConfidenceLevel;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  recommendedLearningLevel: CEFRLevel;
}

/**
 * Pedagogically sound CEFR estimation engine for SpeakFlow internal placement
 * Synthesizes overall weighted scores, skill distributions, and question volume
 */
export function estimateCefrProfile(
  overallScore: number,
  skillScores: Record<SkillCategory, SkillScoreSummary>,
  responses: AssessmentResponse[]
): CefrEstimationDetails {
  const answeredCount = responses.length;

  // 1. Determine base estimated level & possible range
  let estimatedLevel: CEFRLevel;
  let possibleRange: string;
  let recommendedLearningLevel: CEFRLevel;

  if (overallScore >= 90) {
    estimatedLevel = "C2";
    possibleRange = "C1–C2";
    recommendedLearningLevel = "C1"; // Start with C1 mastery before C2 nuance
  } else if (overallScore >= 78) {
    estimatedLevel = "C1";
    possibleRange = "B2–C1";
    recommendedLearningLevel = "C1";
  } else if (overallScore >= 63) {
    estimatedLevel = "B2";
    possibleRange = "B1–B2";
    recommendedLearningLevel = "B2";
  } else if (overallScore >= 48) {
    estimatedLevel = "B1";
    possibleRange = "A2–B1";
    recommendedLearningLevel = "B1";
  } else if (overallScore >= 30) {
    estimatedLevel = "A2";
    possibleRange = "A1–A2";
    recommendedLearningLevel = "A2";
  } else {
    estimatedLevel = "A1";
    possibleRange = "A1";
    recommendedLearningLevel = "A1";
  }

  // 2. Assess confidence level
  const assessedSkillsList = (
    Object.keys(skillScores) as SkillCategory[]
  ).filter((s) => skillScores[s].isAssessed);
  const assessedCount = assessedSkillsList.length;

  let confidence: ConfidenceLevel;
  if (answeredCount >= 18 && assessedCount >= 4) {
    confidence = "high";
  } else if (answeredCount >= 10 && assessedCount >= 3) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // 3. Extract Strengths (skills with high performance)
  const strengths: string[] = [];
  const sortedSkills = [...assessedSkillsList].sort(
    (a, b) => skillScores[b].score - skillScores[a].score
  );

  for (const skill of sortedSkills) {
    const s = skillScores[skill];
    if (s.score >= 70) {
      if (skill === "vocabulary") {
        strengths.push(
          `Vốn từ vựng khá tốt (${s.score}%), hiểu nghĩa và kết hợp từ (collocations) đúng ngữ cảnh.`
        );
      } else if (skill === "grammar") {
        strengths.push(
          `Nắm vững nền tảng ngữ pháp (${s.score}%), phân biệt được các thì và cấu trúc câu.`
        );
      } else if (skill === "reading") {
        strengths.push(
          `Kỹ năng đọc hiểu nhanh (${s.score}%), nắm bắt chính xác ý chính và chi tiết văn bản.`
        );
      } else if (skill === "listening") {
        strengths.push(
          `Khả năng nghe hiểu tốt (${s.score}%), bắt được từ khóa và mục đích của người nói.`
        );
      } else if (skill === "speaking") {
        strengths.push(
          `Khả năng diễn đạt và phát âm lưu loát (${s.score}%), tự tin trả lời vào chủ đề.`
        );
      }
    }
  }

  if (strengths.length === 0) {
    strengths.push(
      "Có tinh thần học hỏi và sẵn sàng rèn luyện các kỹ năng tiếng Anh cơ bản."
    );
  }

  // 4. Extract Weaknesses & Areas for Improvement (skills with score < 60% or lowest score)
  const weaknesses: string[] = [];
  const weakSkills = [...assessedSkillsList]
    .filter((s) => skillScores[s].score < 65)
    .sort((a, b) => skillScores[a].score - skillScores[b].score);

  for (const skill of weakSkills) {
    const s = skillScores[skill];
    if (skill === "listening") {
      weaknesses.push(
        `Kỹ năng nghe còn hạn chế (${s.score}%), dễ bị lỡ thông tin khi tốc độ nói nhanh.`
      );
    } else if (skill === "grammar") {
      weaknesses.push(
        `Còn nhầm lẫn ở một số cấu trúc ngữ pháp phức tạp (${s.score}%), như mệnh đề quan hệ hoặc câu điều kiện.`
      );
    } else if (skill === "speaking") {
      weaknesses.push(
        `Phản xạ nói còn ngập ngừng (${s.score}%), cần luyện nói thành câu hoàn chỉnh và trau chuốt phát âm.`
      );
    } else if (skill === "vocabulary") {
      weaknesses.push(
        `Cần mở rộng thêm vốn từ vựng học thuật và thành ngữ giao tiếp (${s.score}%).`
      );
    } else if (skill === "reading") {
      weaknesses.push(
        `Tốc độ đọc hiểu và suy luận hàm ý câu văn cần được cải thiện (${s.score}%).`
      );
    }
  }

  // Check if speaking was skipped/not assessed
  if (!skillScores.speaking.isAssessed) {
    weaknesses.push(
      "Kỹ năng Nói (Speaking) chưa được đánh giá do chưa sử dụng micro."
    );
  }

  if (weaknesses.length === 0) {
    weaknesses.push(
      "Các kỹ năng khá đồng đều; nên tiếp tục thử thách với tài liệu nâng cao và ngữ điệu tự nhiên."
    );
  }

  // 5. Tailored Recommendations
  const recommendations: string[] = [];
  recommendations.push(
    `Bắt đầu học với lộ trình gợi ý trình độ **${recommendedLearningLevel}** trên SpeakFlow để xây dựng phản xạ vững chắc.`
  );

  if (weakSkills.some((s) => s === "speaking") || !skillScores.speaking.isAssessed) {
    recommendations.push(
      "Dành ít nhất 10–15 phút mỗi ngày luyện phản xạ với AI Tutor (/roleplay) và phát âm câu."
    );
  }
  if (weakSkills.some((s) => s === "listening")) {
    recommendations.push(
      "Luyện nghe qua tính năng Shadowing và Flashcard âm thanh trên SpeakFlow để tai quen với nối âm."
    );
  }
  if (weakSkills.some((s) => s === "grammar" || s === "vocabulary")) {
    recommendations.push(
      "Ôn tập ngắt quãng (SRS) với các bộ thẻ theo chủ đề để củng cố từ vựng và mẫu câu vào trí nhớ dài hạn."
    );
  }

  return {
    estimatedLevel,
    possibleRange,
    confidence,
    strengths,
    weaknesses,
    recommendations,
    recommendedLearningLevel,
  };
}
