import type {
  CEFRLevel,
  DailyMinutes,
  LearningDay,
  LearningGoal,
  LearningGoalType,
  LearningPhase,
  LearningPlan,
  LearningTask,
  SkillPriority,
  TaskType,
} from "./types";

export const SYSTEM_DECK_IDS = {
  OFFICE: "11111111-1111-4111-8111-111111111111",
  IT: "22222222-2222-4222-8222-222222222222",
  CUSTOMER_SERVICE: "33333333-3333-4333-8333-333333333333",
  INTERVIEW: "44444444-4444-4444-8444-444444444444",
  SMALL_TALK: "55555555-5555-4555-8555-555555555555",
  TRAVEL: "66666666-6666-4666-8666-666666666666",
};

export const GOAL_TITLES_VI: Record<LearningGoalType, string> = {
  daily_english: "Giao tiếp hàng ngày (Daily English)",
  travel_english: "Tiếng Anh du lịch (Travel English)",
  business_english: "Tiếng Anh công việc & Đàm phán",
  job_interview: "Phỏng vấn xin việc (Job Interview)",
  academic_english: "Tiếng Anh học thuật & Thuyết trình",
  improve_speaking: "Bứt phá phản xạ nói (Speaking Focus)",
  improve_listening: "Nâng cao kỹ năng nghe (Listening Focus)",
  vocabulary_building: "Mở rộng vốn từ vựng thực chiến",
  general_english: "Phát triển toàn diện 4 kỹ năng",
  custom: "Mục tiêu học tập cá nhân",
};

export const SKILL_LABELS_VI: Record<SkillPriority, string> = {
  speaking: "Nói & Phản xạ",
  listening: "Nghe hiểu",
  vocabulary: "Từ vựng & Cụm từ",
  grammar: "Ngữ pháp ứng dụng",
  pronunciation: "Phát âm & Shadowing",
  reading: "Đọc hiểu",
};

/**
 * Returns matching system deck and roleplay scenarios based on learner's goal
 */
export function getRecommendedDeckAndScenarioForGoal(goal: LearningGoalType): {
  primaryDeckId: string;
  primaryScenarioId: string;
  secondaryScenarioId: string;
} {
  switch (goal) {
    case "travel_english":
      return {
        primaryDeckId: SYSTEM_DECK_IDS.TRAVEL,
        primaryScenarioId: "airport-travel",
        secondaryScenarioId: "hotel",
      };
    case "business_english":
      return {
        primaryDeckId: SYSTEM_DECK_IDS.OFFICE,
        primaryScenarioId: "office-communication",
        secondaryScenarioId: "business-english",
      };
    case "job_interview":
      return {
        primaryDeckId: SYSTEM_DECK_IDS.INTERVIEW,
        primaryScenarioId: "job-interview",
        secondaryScenarioId: "office-communication",
      };
    case "daily_english":
    case "improve_speaking":
    case "improve_listening":
    default:
      return {
        primaryDeckId: SYSTEM_DECK_IDS.SMALL_TALK,
        primaryScenarioId: "daily-conversation",
        secondaryScenarioId: "restaurant",
      };
  }
}

/**
 * Builds AI system prompt to generate a personalized learning plan
 */
export function buildPlanningPrompt(goal: LearningGoal): string {
  const goalTitle = GOAL_TITLES_VI[goal.primary_goal] || goal.title;
  const skillsList = goal.preferred_skills.map((s) => SKILL_LABELS_VI[s]).join(", ");

  return `You are SpeakFlow's Chief Academic Architect. Build an adaptive, highly actionable personalized English learning plan for a Vietnamese learner.

=== LEARNER PROFILE ===
Current Level: ${goal.current_level}
Target Level: ${goal.target_level}
Primary Goal: "${goalTitle}" (${goal.custom_goal_text || ""})
Daily Time Budget: ${goal.daily_minutes} minutes/day
Days per Week: ${goal.days_per_week} days
Preferred Skills: ${skillsList}
Duration: ${goal.duration_days} days

=== CONTENT INVENTORY IN SPEAKFLOW ===
Available System Decks:
- Office Communication & Meetings (ID: ${SYSTEM_DECK_IDS.OFFICE})
- IT & Technical Operations (ID: ${SYSTEM_DECK_IDS.IT})
- Public Admin & Customer Relations (ID: ${SYSTEM_DECK_IDS.CUSTOMER_SERVICE})
- Job Interview & Salary Deal (ID: ${SYSTEM_DECK_IDS.INTERVIEW})
- Small Talk & Socializing (ID: ${SYSTEM_DECK_IDS.SMALL_TALK})
- Travel, Airport & Emergencies (ID: ${SYSTEM_DECK_IDS.TRAVEL})

Available AI Tutor Roleplay Scenarios:
- daily-conversation, restaurant, hotel, airport-travel, shopping, hospital, job-interview, office-communication, business-english, meeting-presentation, making-friends, phone-conversation.

Practice Modules in SpeakFlow:
1. Flashcard SRS: '/study?deck=[deckId]&level=[level]'
2. Shadowing pronunciation studio: '/study?deck=[deckId]&level=[level]'
3. 60-Second Reflex Drill: '/reflex?level=[level]'
4. AI Tutor Roleplay: '/roleplay?scenario=[scenarioId]'

=== PEDAGOGICAL CONSTRAINTS ===
1. Organize the plan into 4 clear progressive Phases.
2. For each active day, break down into 2-4 concrete tasks matching the learner's ${goal.daily_minutes} minutes budget.
3. Every task must link to a REAL SpeakFlow URL above with valid deckId or scenarioId. Never invent fake IDs.
4. Mark rest days with is_rest_day: true and empty tasks.
5. Emphasize active recall (Flashcard SRS) and speaking practice (Roleplay + Shadowing).
6. Provide objectives and descriptions in natural, motivating Vietnamese.

Respond STRICTLY in valid JSON matching this schema:
{
  "title": "Kế hoạch tiếng Anh cá nhân hóa...",
  "description": "Mô tả lộ trình...",
  "total_days": ${goal.duration_days},
  "phases": [
    {
      "phase_number": 1,
      "title": "Giai đoạn 1: ...",
      "description": "Mục tiêu giai đoạn...",
      "start_day": 1,
      "end_day": 15,
      "milestones": ["string"]
    }
  ],
  "days": [
    {
      "day_number": 1,
      "phase_number": 1,
      "week_number": 1,
      "is_rest_day": false,
      "learning_objective": "Mục tiêu cụ thể ngày 1...",
      "estimated_minutes": ${goal.daily_minutes},
      "tasks": [
        {
          "id": "task-1-1",
          "day_number": 1,
          "task_type": "srs_review" | "new_vocabulary" | "shadowing" | "reflex" | "roleplay",
          "title": "Tên nhiệm vụ",
          "description": "Hướng dẫn cụ thể cho học viên...",
          "estimated_minutes": number,
          "target_action_url": "/study?level=...",
          "status": "available"
        }
      ]
    }
  ]
}`;
}

/**
 * Builds a deterministic, high-quality template learning plan
 * Used when running offline, for instant preview, or when AI API keys are not present
 */
export function generateTemplateLearningPlan(goal: LearningGoal): LearningPlan {
  const { primaryDeckId, primaryScenarioId, secondaryScenarioId } =
    getRecommendedDeckAndScenarioForGoal(goal.primary_goal);

  const totalDays = goal.duration_days || 30;
  const phaseLength = Math.max(7, Math.floor(totalDays / 4));

  const phases: LearningPhase[] = [
    {
      phase_number: 1,
      title: "Giai đoạn 1: Xây dựng nền tảng & Cụm từ cốt lõi",
      description: `Ghi nhớ các cụm từ trọng tâm của trình độ ${goal.current_level} và làm quen với phát âm chuẩn.`,
      start_day: 1,
      end_day: phaseLength,
      milestones: [
        `Nắm vững 30 cụm từ phản xạ cốt lõi trình độ ${goal.current_level}`,
        "Hoàn thành các lượt ôn tập SRS đầu tiên đưa thẻ vào Hộp 2",
        "Luyện phát âm Shadowing đạt độ khớp trên 80%",
      ],
    },
    {
      phase_number: 2,
      title: "Giai đoạn 2: Luyện giao tiếp trong tình huống thực tế",
      description: "Ứng dụng các câu đã học vào các kịch bản đối thoại hai chiều với AI Tutor.",
      start_day: phaseLength + 1,
      end_day: phaseLength * 2,
      milestones: [
        "Thực hành ít nhất 3 kịch bản đối thoại với AI Tutor",
        "Nhận diện và sửa các lỗi ngữ pháp/cách dùng từ thông dụng",
        "Tăng phản xạ nghe hiểu các câu hỏi thường gặp",
      ],
    },
    {
      phase_number: 3,
      title: "Giai đoạn 3: Tăng tốc độ phản xạ & Làm chủ ngữ cảnh",
      description: "Thử thách phản xạ nhanh 60 giây và nâng cao khả năng diễn đạt lưu loát.",
      start_day: phaseLength * 2 + 1,
      end_day: phaseLength * 3,
      milestones: [
        "Đạt mốc 8 câu đúng trong thử thách phản xạ nhanh 60s",
        "Duy trì chuỗi học liên tiếp (Streak) đều đặn",
        "Hạn chế các lỗi phát âm bị bỏ sót từ",
      ],
    },
    {
      phase_number: 4,
      title: "Giai đoạn 4: Về đích & Làm chủ mục tiêu giao tiếp",
      description: `Đạt mức độ tự tin giao tiếp tương đương trình độ mục tiêu ${goal.target_level}.`,
      start_day: phaseLength * 3 + 1,
      end_day: totalDays,
      milestones: [
        `Tự tin trao đổi trọn vẹn tình huống giao tiếp ở mức ${goal.target_level}`,
        "Đưa ít nhất 20 thẻ quan trọng vào Hộp 4 và Hộp 5 của SRS",
        "Hoàn thành bài đánh giá tổng kết lộ trình",
      ],
    },
  ];

  // Helper to split daily minutes into proportional task chunks
  function getTaskMinutes(totalMin: DailyMinutes): {
    vocabMin: number;
    shadowingMin: number;
    roleplayMin: number;
    reflexMin: number;
  } {
    if (totalMin <= 10) return { vocabMin: 5, shadowingMin: 5, roleplayMin: 0, reflexMin: 0 };
    if (totalMin <= 15) return { vocabMin: 5, shadowingMin: 5, roleplayMin: 5, reflexMin: 0 };
    if (totalMin <= 20) return { vocabMin: 5, shadowingMin: 5, roleplayMin: 5, reflexMin: 5 };
    if (totalMin <= 30) return { vocabMin: 10, shadowingMin: 10, roleplayMin: 5, reflexMin: 5 };
    if (totalMin <= 45) return { vocabMin: 15, shadowingMin: 10, roleplayMin: 10, reflexMin: 10 };
    return { vocabMin: 20, shadowingMin: 15, roleplayMin: 15, reflexMin: 10 };
  }

  const taskMins = getTaskMinutes(goal.daily_minutes);
  const days: LearningDay[] = [];
  const startDate = new Date(goal.start_date || new Date().toISOString().slice(0, 10));

  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const curDate = new Date(startDate);
    curDate.setDate(startDate.getDate() + (dayNum - 1));
    const dayOfWeek = curDate.getDay(); // 0 = Sun
    const dateStr = curDate.toISOString().slice(0, 10);
    const isRestDay = goal.rest_days ? goal.rest_days.includes(dayOfWeek) : false;

    let phaseNum = 1;
    if (dayNum > phaseLength * 3) phaseNum = 4;
    else if (dayNum > phaseLength * 2) phaseNum = 3;
    else if (dayNum > phaseLength) phaseNum = 2;

    const weekNum = Math.ceil(dayNum / 7);

    if (isRestDay) {
      days.push({
        day_number: dayNum,
        phase_number: phaseNum,
        week_number: weekNum,
        date: dateStr,
        is_rest_day: true,
        learning_objective: "Ngày nghỉ phục hồi – Để não bộ củng cố kiến thức",
        estimated_minutes: 0,
        tasks: [],
        status: dayNum === 1 ? "current" : "upcoming",
        summary: "Bạn có thể nghe nhạc tiếng Anh hoặc xem một video ngắn thư giãn.",
      });
      continue;
    }

    // Build tasks for active day
    const tasks: LearningTask[] = [];

    // Task 1: SRS Flashcard review (always essential)
    tasks.push({
      id: `task-${dayNum}-1`,
      day_number: dayNum,
      task_type: "srs_review",
      title: "Ôn tập Flashcard ngắt quãng (SRS)",
      description: `Lật thẻ ghi nhớ và đánh giá độ nhớ các mẫu câu ${goal.current_level} theo chu kỳ 5 hộp Leitner.`,
      estimated_minutes: taskMins.vocabMin,
      target_action_url: `/study?deck=${primaryDeckId}&level=${goal.current_level}`,
      target_deck_id: primaryDeckId,
      target_level: goal.current_level,
      status: dayNum === 1 ? "available" : "locked",
    });

    // Task 2: Shadowing Pronunciation
    tasks.push({
      id: `task-${dayNum}-2`,
      day_number: dayNum,
      task_type: "shadowing",
      title: "Phòng thu Shadowing & Luyện phát âm",
      description: "Bật mic đọc to theo giọng người bản xứ, kiểm tra độ chính xác từng từ.",
      estimated_minutes: taskMins.shadowingMin,
      target_action_url: `/study?deck=${primaryDeckId}&level=${goal.current_level}`,
      target_deck_id: primaryDeckId,
      target_level: goal.current_level,
      status: dayNum === 1 ? "available" : "locked",
    });

    // Task 3: Roleplay or Reflex
    if (phaseNum >= 2 && taskMins.roleplayMin > 0) {
      const scenarioId = dayNum % 2 === 0 ? secondaryScenarioId : primaryScenarioId;
      tasks.push({
        id: `task-${dayNum}-3`,
        day_number: dayNum,
        task_type: "roleplay",
        title: "Đối thoại với AI Tutor",
        description: `Nhập vai thực hành giao tiếp trong tình huống ${scenarioId} với AI Tutor.`,
        estimated_minutes: taskMins.roleplayMin,
        target_action_url: `/roleplay?scenario=${scenarioId}`,
        target_scenario_id: scenarioId,
        target_level: goal.current_level,
        status: "locked",
      });
    } else if (taskMins.reflexMin > 0) {
      tasks.push({
        id: `task-${dayNum}-3`,
        day_number: dayNum,
        task_type: "reflex",
        title: "Thử thách phản xạ 60 giây",
        description: "Nghe câu hỏi và phản hồi ngay lập tức trong 7 giây mỗi câu.",
        estimated_minutes: taskMins.reflexMin,
        target_action_url: `/reflex?level=${goal.current_level}`,
        target_level: goal.current_level,
        status: "locked",
      });
    }

    days.push({
      day_number: dayNum,
      phase_number: phaseNum,
      week_number: weekNum,
      date: dateStr,
      is_rest_day: false,
      learning_objective: `Làm chủ mẫu câu giao tiếp ngày ${dayNum} – Chủ đề: ${GOAL_TITLES_VI[goal.primary_goal]}`,
      estimated_minutes: goal.daily_minutes,
      tasks,
      status: dayNum === 1 ? "current" : "upcoming",
      summary: `Mục tiêu: hoàn thành ${tasks.length} nhiệm vụ trong ${goal.daily_minutes} phút.`,
    });
  }

  return {
    id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: goal.user_id,
    goal_id: goal.id,
    title: `Lộ trình ${GOAL_TITLES_VI[goal.primary_goal]} (${goal.current_level} → ${goal.target_level})`,
    description: `Kế hoạch cá nhân hóa ${totalDays} ngày được thiết kế riêng với ngân sách ${goal.daily_minutes} phút/ngày.`,
    total_days: totalDays,
    current_day: 1,
    plan_version: 1,
    status: "active",
    ai_provider: "SpeakFlow Planning Engine",
    is_mock: true,
    phases,
    days,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
