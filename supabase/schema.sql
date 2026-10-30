-- ============================================================================
-- SPEAKFLOW - SUPABASE POSTGRESQL SCHEMA, USER PROGRESS & INITIAL SEED DATA
-- Copy and paste this entire script into your Supabase SQL Editor and click RUN
-- ============================================================================

DO $speakflow$
BEGIN
  -- Enable UUID generation extension if not already enabled
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  -- 1. Create `decks` table
  CREATE TABLE IF NOT EXISTS public.decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'MessageSquare',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 2. Create `cards` table
  CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    user_id UUID,
    phrase_en TEXT NOT NULL,
    ipa TEXT NOT NULL,
    meaning_vi TEXT NOT NULL,
    sentence_en TEXT NOT NULL,
    sentence_vi TEXT NOT NULL,
    context_note TEXT NOT NULL,
    variations TEXT[] NOT NULL DEFAULT '{}',
    box INT NOT NULL DEFAULT 1 CHECK (box BETWEEN 1 AND 5),
    interval_days INT NOT NULL DEFAULT 0,
    ease_factor FLOAT NOT NULL DEFAULT 2.5,
    next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_practiced_at TIMESTAMPTZ
  );

  -- Ensure `user_id` column exists on `cards` if table was created earlier
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cards' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.cards ADD COLUMN user_id UUID;
  END IF;

  -- Ensure `variations` column exists on `cards` if table was created earlier
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cards' AND column_name = 'variations'
  ) THEN
    ALTER TABLE public.cards ADD COLUMN variations TEXT[] NOT NULL DEFAULT '{}';
  END IF;

  -- 3. Create `user_card_progress` table (Per-user SRS progress synced across PC & Mobile)
  CREATE TABLE IF NOT EXISTS public.user_card_progress (
    user_id UUID NOT NULL,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    box INT NOT NULL DEFAULT 1 CHECK (box BETWEEN 1 AND 5),
    interval_days INT NOT NULL DEFAULT 0,
    ease_factor FLOAT NOT NULL DEFAULT 2.5,
    next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_practiced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, card_id)
  );

  -- 4. Create `user_stats` table (Per-user daily streak & profile info)
  CREATE TABLE IF NOT EXISTS public.user_stats (
    user_id UUID PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    current_streak INT NOT NULL DEFAULT 1,
    last_study_date TEXT,
    today_reviewed_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Create helpful indexes for fast SRS queries
  CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON public.cards(deck_id);
  CREATE INDEX IF NOT EXISTS idx_cards_next_review_at ON public.cards(next_review_at);
  CREATE INDEX IF NOT EXISTS idx_user_card_progress_user ON public.user_card_progress(user_id);

  -- Enable Row Level Security (RLS)
  ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.user_card_progress ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'decks' AND policyname = 'Allow public access to decks'
  ) THEN
    CREATE POLICY "Allow public access to decks" ON public.decks FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cards' AND policyname = 'Allow public access to cards'
  ) THEN
    CREATE POLICY "Allow public access to cards" ON public.cards FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_card_progress' AND policyname = 'Allow public access to user_card_progress'
  ) THEN
    CREATE POLICY "Allow public access to user_card_progress" ON public.user_card_progress FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_stats' AND policyname = 'Allow public access to user_stats'
  ) THEN
    CREATE POLICY "Allow public access to user_stats" ON public.user_stats FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- 5. SEED DATA: 6 CONVERSATIONAL DECKS + 108 HIGH-UTILITY REFLEX CARDS (18 PER DECK)
  INSERT INTO public.decks (id, title, description, icon, created_at) VALUES
    ('11111111-1111-4111-8111-111111111111', 'Giao tiếp Công sở & Họp hành', 'Báo cáo tiến độ, giải quyết sự cố, chốt deadline và cách trình bày ý kiến lịch sự, thuyết phục.', 'Briefcase', NOW()),
    ('22222222-2222-4222-8222-222222222222', 'Kỹ thuật, IT & Vận hành Hệ thống', 'Trao đổi Daily Standup, xử lý lỗi hệ thống, deploy phần mềm và giải thích kỹ thuật cho đối tác.', 'Terminal', NOW()),
    ('33333333-3333-4333-8333-333333333333', 'Hành chính công & Giao tiếp Khách hàng', 'Hướng dẫn thủ tục, tiếp nhận yêu cầu, giải thích giấy tờ và giữ thái độ lịch sự, chuyên nghiệp.', 'FileText', NOW()),
    ('44444444-4444-4444-8444-444444444444', 'Phỏng vấn Xin việc & Deal Lương', 'Giới thiệu bản thân, chia sẻ kinh nghiệm thực tế, ứng biến tình huống và đàm phán đãi ngộ.', 'Award', NOW()),
    ('55555555-5555-4555-8555-555555555555', 'Small Talk & Kết bạn Hàng ngày', 'Bắt chuyện làm quen, nói về kế hoạch cuối tuần, bày tỏ cảm xúc và giữ mạch trò chuyện tự nhiên.', 'Zap', NOW()),
    ('66666666-6666-4666-8666-666666666666', 'Du lịch, Sân bay & Xử lý tình huống khẩn cấp', 'Làm thủ tục sân bay, đặt bàn, hỏi đường, mua sắm và xử lý tình huống phát sinh khẩn cấp.', 'Plane', NOW())
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon;

  INSERT INTO public.cards (
    id, deck_id, phrase_en, ipa, meaning_vi, sentence_en, sentence_vi, context_note, variations, box, interval_days, ease_factor, next_review_at, last_practiced_at
  ) VALUES
    (
      '10000000-0000-4000-8000-000000000001',
      '11111111-1111-4111-8111-111111111111',
      'catch up on',
      '/kætʃ ʌp ɑːn/',
      'bắt kịp tiến độ / làm bù việc tồn đọng',
      'I need to catch up on some urgent emails before the meeting.',
      'Tôi cần tranh thủ trả lời mấy email gấp trước giờ họp.',
      'Dùng khi bạn bị dồn việc hoặc lỡ dở tiến độ và cần dành thời gian hoàn thành bù.',
      ARRAY['Let''s catch up on the project status first thing tomorrow morning.', 'I spent the whole weekend trying to catch up on my reading.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000002',
      '11111111-1111-4111-8111-111111111111',
      'run behind schedule',
      '/rʌn bɪˈhaɪnd ˈskedʒuːl/',
      'bị trễ hạn / chậm so với tiến độ dự kiến',
      'We are running slightly behind schedule, but we will make it by Friday.',
      'Chúng ta đang hơi chậm tiến độ một chút, nhưng chắc chắn sẽ kịp hạn thứ Sáu.',
      'Cách thông báo trễ tiến độ chuyên nghiệp và giảm nhẹ cảm giác tiêu cực so với ''we are late''.',
      ARRAY['The keynote speech is running twenty minutes behind schedule.', 'If we don''t start right now, the entire sprint will run behind schedule.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000003',
      '11111111-1111-4111-8111-111111111111',
      'touch base with',
      '/tʌtʃ beɪs wɪð/',
      'trao đổi nhanh / liên hệ cập nhật tình hình',
      'Let me touch base with the design team and get back to you.',
      'Để tôi trao đổi nhanh với bên thiết kế rồi phản hồi lại bạn nhé.',
      'Cụm từ cửa miệng trong văn phòng phương Tây khi muốn hẹn nói chuyện ngắn gọn 5-10 phút.',
      ARRAY['I just wanted to touch base with you regarding next week''s presentation.', 'Can we touch base for five minutes before you leave today?'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000004',
      '11111111-1111-4111-8111-111111111111',
      'bring to the table',
      '/brɪŋ tuː ðə ˈteɪbl/',
      'đóng góp giá trị / mang lại lợi thế độc đáo',
      'What unique skills does their team bring to the table?',
      'Đội ngũ của họ mang lại những lợi thế đặc biệt nào cho dự án?',
      'Thường dùng khi đánh giá năng lực ứng viên hoặc giá trị của đối tác trong cuộc thương thảo.',
      ARRAY['She brings years of enterprise sales experience to the table.', 'We need to clarify exactly what value this partnership brings to the table.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000005',
      '11111111-1111-4111-8111-111111111111',
      'look into the matter',
      '/lʊk ˈɪntuː ðə ˈmætər/',
      'kiểm tra / xem xét kỹ vấn đề',
      'I will look into the matter immediately and give you an update.',
      'Tôi sẽ trực tiếp kiểm tra vấn đề này ngay và cập nhật lại cho bạn.',
      'Phản hồi chuẩn mực khi nhận được khiếu nại hoặc sự cố từ cấp trên hoặc khách hàng.',
      ARRAY['Our support lead is looking into the payment failure matter right now.', 'Could you please look into why the contract hasn''t been signed yet?'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000006',
      '11111111-1111-4111-8111-111111111111',
      'keep everyone in the loop',
      '/kiːp ˈevriwʌn ɪn ðə luːp/',
      'cập nhật liên tục cho mọi người / không để ai bị thiếu thông tin',
      'Please keep everyone in the loop by sending a daily recap email.',
      'Nhớ gửi email tóm tắt mỗi ngày để cập nhật thông tin đồng đều cho cả nhóm nhé.',
      'Dùng để nhắc nhở việc chia sẻ thông tin tiến độ công việc giữa các phòng ban.',
      ARRAY['Don''t worry, I will make sure to keep you in the loop as things develop.', 'Loop me in whenever the client replies with their final decision.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000007',
      '11111111-1111-4111-8111-111111111111',
      'on the same page',
      '/ɑːn ðə seɪm peɪdʒ/',
      'thống nhất quan điểm / hiểu cùng một hướng',
      'Let''s make sure we are all on the same page before we talk to the client.',
      'Cả nhóm mình hãy chắc chắn đã hiểu cùng một hướng trước khi gặp khách hàng.',
      'Cực kỳ phổ biến đầu các cuộc họp nội bộ để căn chỉnh lại mục tiêu và kỳ vọng.',
      ARRAY['Are we on the same page regarding the project budget?', 'I called this short huddle to ensure product and engineering are on the same page.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000008',
      '11111111-1111-4111-8111-111111111111',
      'call it a day',
      '/kɔːl ɪt ə deɪ/',
      'hôm nay dừng ở đây thôi / kết thúc ca làm',
      'We''ve made great progress today, let''s call it a day and rest.',
      'Hôm nay tiến độ rất tốt rồi, chúng ta kết thúc ở đây để nghỉ ngơi nhé.',
      'Câu nói tự nhiên cuối ngày làm việc hoặc khi cuộc họp đã đạt đủ mục tiêu đề ra.',
      ARRAY['It''s already past seven, let''s call it a day and pick this up tomorrow.', 'I''m exhausted from staring at code all afternoon, let''s call it a day.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000009',
      '11111111-1111-4111-8111-111111111111',
      'follow up on',
      '/ˈfɑːloʊ ʌp ɑːn/',
      'theo dõi tiếp / hỏi lại tiến độ công việc đã bàn',
      'I am writing to follow up on our discussion from yesterday''s sync.',
      'Tôi gửi thư này để tiếp tục trao đổi về nội dung chúng ta đã thống nhất hôm qua.',
      'Câu mở đầu chuẩn mực và lịch thiệp số 1 cho các email công việc.',
      ARRAY['I''ll follow up on the vendor proposal by Thursday afternoon.', 'Just following up on my previous message to see if you had any questions.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000010',
      '11111111-1111-4111-8111-111111111111',
      'tight schedule',
      '/taɪt ˈskedʒuːl/',
      'lịch trình rất gấp / thời gian eo hẹp',
      'We are working on a very tight schedule this sprint, so every hour counts.',
      'Đợt sprint này lịch trình cực kỳ gấp gáp, từng giờ từng phút đều rất quý.',
      'Dùng để giải thích lý do cần ưu tiên giải quyết công việc khẩn trương.',
      ARRAY['Despite our tight schedule, the quality of delivery remained outstanding.', 'Can we streamline this approval flow? We are on a very tight schedule.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000011',
      '11111111-1111-4111-8111-111111111111',
      'wrap up the meeting',
      '/ræp ʌp ðə ˈmiːtɪŋ/',
      'chốt lại cuộc họp / kết thúc phiên làm việc',
      'Let''s wrap up the meeting by reviewing everyone''s assigned tasks.',
      'Hãy chốt lại cuộc họp bằng việc điểm lại nhiệm vụ được giao của từng người.',
      'Dùng khi người điều phối muốn tổng kết và cho mọi người rời phòng họp.',
      ARRAY['We have five minutes left, so let''s wrap things up quickly.', 'The facilitator wrapped up the meeting with clear milestones.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000012',
      '11111111-1111-4111-8111-111111111111',
      'get straight to the point',
      '/ɡet streɪt tuː ðə pɔɪnt/',
      'đi thẳng vào vấn đề chính',
      'Since our time is limited, allow me to get straight to the point.',
      'Vì thời gian có hạn, tôi xin phép được đi thẳng vào trọng tâm vấn đề.',
      'Rất được ưa chuộng khi báo cáo cấp quản lý bận rộn, bỏ qua phần rào đón dài dòng.',
      ARRAY['I appreciate how you always get straight to the point in negotiations.', 'No need for pleasantries, let''s get straight to the point of why this failed.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000013',
      '11111111-1111-4111-8111-111111111111',
      'play devil''s advocate',
      '/pleɪ ˈdevlz ˈædvəkət/',
      'đưa ra góc nhìn phản biện / lật ngược vấn đề',
      'Just to play devil''s advocate, what happens if our primary server goes down?',
      'Tôi xin đưa ra phản biện một chút, chuyện gì sẽ xảy ra nếu máy chủ chính bị sập?',
      'Cách lịch sự mở lời khi muốn nêu rủi ro mà không mang tính công kích cá nhân.',
      ARRAY['Let me play devil''s advocate here: is this feature truly essential for users?', 'Playing devil''s advocate helps the product team anticipate hidden pitfalls.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000014',
      '11111111-1111-4111-8111-111111111111',
      'circle back to',
      '/ˈsɜːrkl bæk tuː/',
      'quay lại thảo luận việc này sau',
      'Let''s table that discussion for now and circle back to it after lunch.',
      'Tạm thời gác chuyện đó lại, đầu giờ chiều chúng ta sẽ quay lại thảo luận tiếp.',
      'Giữ cho cuộc họp không bị lạc đề khi có một ý kiến phát sinh cần nhiều thời gian.',
      ARRAY['Can we circle back to your pricing question at the end of the demo?', 'I will circle back to you once I receive approval from executive leadership.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000015',
      '11111111-1111-4111-8111-111111111111',
      'put on hold',
      '/pʊt ɑːn hoʊld/',
      'tạm gác lại / hoãn thi hành',
      'The marketing campaign was put on hold until Q3 due to budget cuts.',
      'Chiến dịch quảng bá đã bị tạm hoãn tới quý 3 do công ty cắt giảm ngân sách.',
      'Diễn đạt việc một kế hoạch bị dừng tạm thời mà không phải là bị hủy vĩnh viễn.',
      ARRAY['We decided to put the redesign project on hold for the time being.', 'The hiring process was put on hold pending leadership review.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000016',
      '11111111-1111-4111-8111-111111111111',
      'weigh the pros and cons',
      '/weɪ ðə proʊz ænd kɑːnz/',
      'cân nhắc kỹ mặt lợi và mặt hại',
      'We should carefully weigh the pros and cons before committing to this vendor.',
      'Chúng ta nên cân nhắc kỹ các mặt lợi hại trước khi ký kết với nhà cung cấp này.',
      'Cụm từ đắt giá trong các buổi phân tích rủi ro và ra quyết định chiến lược.',
      ARRAY['After weighing the pros and cons, the board chose cloud migration.', 'Take some time tonight to weigh the pros and cons of both offers.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000017',
      '11111111-1111-4111-8111-111111111111',
      'reach a consensus',
      '/riːtʃ ə kənˈsensəs/',
      'đạt được sự đồng thuận chung',
      'It took over two hours, but we finally reached a consensus on the launch date.',
      'Mất hơn hai tiếng đồng hồ, nhưng cuối cùng chúng tôi đã đồng thuận về ngày ra mắt.',
      'Thể hiện kết quả tích cực khi tất cả các bên tham gia cuộc họp đều thống nhất ý chí.',
      ARRAY['The committee failed to reach a consensus regarding the salary structure.', 'Our main objective today is to reach a consensus across all stakeholders.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000018',
      '11111111-1111-4111-8111-111111111111',
      'action items',
      '/ˈækʃn ˈaɪtəmz/',
      'các đầu việc cần triển khai ngay sau họp',
      'Who is responsible for tracking the action items from today''s retrospective?',
      'Ai sẽ là người phụ trách theo dõi các đầu việc phát sinh từ buổi họp hôm nay?',
      'Từ vựng chuyên nghiệp bậc nhất trong quản trị dự án hiện đại (Agile/Scrum).',
      ARRAY['I have summarized all three action items in the Slack channel.', 'Let''s review our open action items before introducing new feature requests.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000001',
      '22222222-2222-4222-8222-222222222222',
      'deploy to production',
      '/dɪˈplɔɪ tuː prəˈdʌkʃn/',
      'đưa phần mềm lên môi trường thực tế (production)',
      'We are scheduled to deploy the new checkout feature to production at midnight.',
      'Chúng tôi dự kiến sẽ đưa tính năng thanh toán mới lên production vào nửa đêm nay.',
      'Thao tác đưa phiên bản phần mềm chính thức tới tay người dùng cuối.',
      ARRAY['Never deploy to production on Friday afternoon without a solid rollback plan.', 'The pipeline automatically runs automated tests before deploying to production.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000002',
      '22222222-2222-4222-8222-222222222222',
      'fix a critical bug',
      '/fɪks ə ˈkrɪtɪkl bʌɡ/',
      'sửa một lỗi hệ thống cực kỳ nghiêm trọng',
      'The entire backend team worked overnight to fix a critical bug in authentication.',
      'Cả nhóm backend đã thức trắng đêm để sửa một lỗi cực kỳ nghiêm trọng trong khâu đăng nhập.',
      'Dùng khi sự cố ảnh hưởng trực tiếp đến người dùng và cần ưu tiên xử lý lập tức.',
      ARRAY['We just pushed a hotfix to fix a critical bug affecting user payments.', 'Did QA confirm that the patch successfully fixed the critical bug?'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000003',
      '22222222-2222-4222-8222-222222222222',
      'check server logs',
      '/tʃek ˈsɜːrvər lɔːɡz/',
      'kiểm tra nhật ký hoạt động của máy chủ',
      'Whenever you encounter a 500 internal error, check the server logs first.',
      'Bất cứ khi nào gặp mã lỗi 500, việc đầu tiên bạn cần làm là kiểm tra log máy chủ.',
      'Hành động cơ bản nhất của kỹ sư khi điều tra nguyên nhân sự cố kỹ thuật.',
      ARRAY['I checked the server logs and noticed multiple memory overflow warnings.', 'Could you check the server logs to see which API endpoint timed out?'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000004',
      '22222222-2222-4222-8222-222222222222',
      'optimize performance',
      '/ˈɑːptɪmaɪz pərˈfɔːrməns/',
      'tối ưu hóa hiệu năng và tốc độ xử lý',
      'We refactored the database queries to optimize performance under heavy load.',
      'Chúng tôi đã viết lại các câu truy vấn để tối ưu hóa hiệu năng khi lượng tải tăng cao.',
      'Dùng khi cải thiện tốc độ tải trang, giảm tiêu hao RAM hoặc tăng thông lượng hệ thống.',
      ARRAY['Adding Redis cache helped us optimize page rendering performance significantly.', 'Our team is focusing this quarter on optimizing API response performance.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000005',
      '22222222-2222-4222-8222-222222222222',
      'rollback the deployment',
      '/ˈroʊlbæk ðə dɪˈplɔɪmənt/',
      'khôi phục lại phiên bản cũ khi bản mới gặp lỗi',
      'If error rates exceed two percent, we will immediately rollback the deployment.',
      'Nếu tỷ lệ lỗi vượt quá hai phần trăm, chúng ta sẽ lập tức rollback về bản cũ.',
      'Kế hoạch an toàn để giảm thiểu thời gian gián đoạn dịch vụ khi bản cập nhật lỗi.',
      ARRAY['The DevOps lead decided to rollback the deployment due to database migration conflicts.', 'Our automated deployment script can rollback the deployment in under thirty seconds.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000006',
      '22222222-2222-4222-8222-222222222222',
      'run into a glitch',
      '/rʌn ˈɪntuː ə ɡlɪtʃ/',
      'gặp sự cố gián đoạn nhỏ ngoài ý muốn',
      'Users on mobile devices ran into a slight glitch during checkout earlier today.',
      'Người dùng trên điện thoại vừa gặp một lỗi trục trặc nhỏ trong bước thanh toán sáng nay.',
      'Từ ''glitch'' chỉ các lỗi kỹ thuật nhỏ mang tính tạm thời, tự nhiên hơn từ ''mistake''.',
      ARRAY['We ran into a minor network glitch while syncing client files.', 'Don''t panic if you run into a display glitch, simply refresh your browser window.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000007',
      '22222222-2222-4222-8222-222222222222',
      'root cause',
      '/ruːt kɔːz/',
      'nguyên nhân gốc rễ của sự cố',
      'Our post-mortem report identified a database deadlock as the true root cause.',
      'Báo cáo mổ xẻ sự cố đã chỉ ra tình trạng khóa chết cơ sở dữ liệu chính là nguyên nhân gốc rễ.',
      'Luôn dùng trong các buổi họp hậu sự cố (Post-mortem / Incident Review).',
      ARRAY['Fixing the symptoms without identifying the root cause will lead to repeated outages.', 'The engineering team is still investigating the root cause of the memory spike.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000008',
      '22222222-2222-4222-8222-222222222222',
      'from scratch',
      '/frʌm skrætʃ/',
      'làm lại từ đầu / từ con số không',
      'The legacy codebase was so tangled that we chose to rewrite it from scratch.',
      'Mã nguồn cũ rối rắm đến mức chúng tôi quyết định viết lại toàn bộ từ đầu.',
      'Rất hay gặp khi nói về việc xây dựng một module mới hoặc làm lại sản phẩm.',
      ARRAY['Building a custom AI model from scratch requires tremendous training resources.', 'He designed the whole frontend framework completely from scratch.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000009',
      '22222222-2222-4222-8222-222222222222',
      'bottleneck',
      '/ˈbɑːtlnek/',
      'điểm nghẽn cổ chai / chỗ làm chậm toàn bộ hệ thống',
      'Slow disk write speed turned out to be the main bottleneck in our data pipeline.',
      'Tốc độ ghi đĩa quá chậm hóa ra lại là điểm nghẽn cổ chai lớn nhất trong đường ống xử lý dữ liệu.',
      'Áp dụng được cho cả phần cứng, thuật toán lẫn quy trình làm việc của con người.',
      ARRAY['Waiting for manual QA testing has become the biggest bottleneck in our release cycle.', 'We introduced asynchronous worker queues to eliminate the processing bottleneck.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000010',
      '22222222-2222-4222-8222-222222222222',
      'high latency',
      '/haɪ ˈleɪtnsi/',
      'độ trễ phản hồi cao / mạng phản hồi chậm',
      'Customers in Asia experienced high latency due to an undersea cable disruption.',
      'Khách hàng tại châu Á gặp phải độ trễ rất cao do sự cố đứt cáp quang biển.',
      'Thuật ngữ cốt lõi khi đo đạc tốc độ mạng và thời gian phản hồi máy chủ (Ping/RTT).',
      ARRAY['High latency directly hurts user conversion rates on e-commerce platforms.', 'Edge caching nodes were deployed across multiple regions to combat high latency.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000011',
      '22222222-2222-4222-8222-222222222222',
      'push the commit',
      '/pʊʃ ðə kəˈmɪt/',
      'đẩy các thay đổi mã nguồn lên kho lưu trữ (Git)',
      'Make sure you run the linter and unit tests before you push the commit.',
      'Nhớ chạy kiểm tra định dạng và unit test cẩn thận trước khi đẩy commit lên nhé.',
      'Hành động hàng ngày của lập trình viên khi sử dụng hệ thống kiểm soát phiên bản Git.',
      ARRAY['I just pushed the commit that fixes the broken navbar animation.', 'You cannot push the commit directly to the protected main branch.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000012',
      '22222222-2222-4222-8222-222222222222',
      'single point of failure',
      '/ˈsɪŋɡl pɔɪnt əv ˈfeɪljər/',
      'điểm yếu chí mạng đơn lẻ (hỏng là sập cả hệ thống)',
      'Relying on a single payment gateway creates a dangerous single point of failure.',
      'Việc chỉ phụ thuộc vào một cổng thanh toán duy nhất sẽ tạo ra một điểm yếu chí mạng.',
      'Khái niệm sống còn trong thiết kế kiến trúc phần mềm chịu lỗi (High Availability).',
      ARRAY['We configured multi-zone replication to eliminate any single point of failure.', 'Is there a single point of failure in our current cloud infrastructure?'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000013',
      '22222222-2222-4222-8222-222222222222',
      'seamless integration',
      '/ˈsiːmləs ˌɪntɪˈɡreɪʃn/',
      'tích hợp liền mạch / hoạt động mượt mà không xung đột',
      'The SDK offers seamless integration with existing authentication providers.',
      'Bộ công cụ SDK cung cấp khả năng tích hợp liền mạch với các nhà cung cấp định danh hiện có.',
      'Từ ''seamless'' dùng để khen ngợi trải nghiệm kết nối các hệ thống công nghệ trơn tru.',
      ARRAY['Our goal is to achieve seamless integration between mobile and desktop clients.', 'The webhook enables seamless integration with third-party logistics software.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000014',
      '22222222-2222-4222-8222-222222222222',
      'back up the database',
      '/bæk ʌp ðə ˈdeɪtəbeɪs/',
      'sao lưu dự phòng cơ sở dữ liệu',
      'Always back up the database before running heavy schema migrations.',
      'Luôn luôn phải sao lưu dữ liệu trước khi chạy các lệnh nâng cấp cấu trúc bảng lớn.',
      'Quy tắc an toàn bất di bất dịch của mọi kỹ sư quản trị hệ thống.',
      ARRAY['The automated cron job backs up the production database every six hours.', 'Did we verify that the backed up database can be successfully restored?'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000015',
      '22222222-2222-4222-8222-222222222222',
      'reproduce the issue',
      '/ˌriːprəˈduːs ði ˈɪʃuː/',
      'tái hiện lại lỗi để tìm nguyên nhân',
      'Could you provide exact steps so our QA engineers can reproduce the issue?',
      'Bạn có thể gửi các bước cụ thể để đội ngũ kiểm thử có thể tái hiện lại lỗi được không?',
      'Câu cửa miệng của kỹ sư phần mềm khi tiếp nhận thông báo lỗi từ người dùng.',
      ARRAY['I was finally able to reproduce the intermittent memory leak issue locally.', 'Without clear error logs, it is practically impossible to reproduce the issue.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000016',
      '22222222-2222-4222-8222-222222222222',
      'out of service',
      '/aʊt əv ˈsɜːrvɪs/',
      'ngừng hoạt động / tạm thời gián đoạn dịch vụ',
      'The staging environment will be temporarily out of service for maintenance.',
      'Môi trường thử nghiệm sẽ tạm thời ngừng hoạt động để bảo trì hệ thống.',
      'Dùng để thông báo việc một máy chủ hay dịch vụ bị gián đoạn hoạt động có kế hoạch.',
      ARRAY['One of our core payment microservices went out of service for twenty minutes.', 'All impacted servers are back online after being out of service this morning.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000017',
      '22222222-2222-4222-8222-222222222222',
      'technical debt',
      '/ˈteknɪkl det/',
      'nợ kỹ thuật (mã viết vội cần sửa đổi sau)',
      'We need to allocate twenty percent of our sprint capacity to pay down technical debt.',
      'Chúng ta cần dành ra hai mươi phần trăm thời lượng của sprint để xử lý các món nợ kỹ thuật.',
      'Khái niệm cực kỳ thông dụng khi nói về việc dọn dẹp mã nguồn chắp vá cũ.',
      ARRAY['Accumulating too much technical debt will eventually halt feature development.', 'Refactoring this legacy authentication module eliminates significant technical debt.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000018',
      '22222222-2222-4222-8222-222222222222',
      'scale up',
      '/skeɪl ʌp/',
      'mở rộng quy mô chịu tải của hệ thống',
      'We configured the cluster to automatically scale up during Black Friday traffic spikes.',
      'Chúng tôi đã cấu hình cụm máy chủ tự động mở rộng tài nguyên trong dịp bão đơn Black Friday.',
      'Thuật ngữ quan trọng trong điện toán đám mây (Cloud Auto-scaling).',
      ARRAY['Our infrastructure is designed to scale up effortlessly to millions of concurrent users.', 'The database instance was scaled up to handle the increased query throughput.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000001',
      '33333333-3333-4333-8333-333333333333',
      'fill out this form',
      '/fɪl aʊt ðɪs fɔːrm/',
      'điền vào mẫu đơn này',
      'Please fill out this registration form and sign at the bottom.',
      'Xin vui lòng điền vào tờ khai đăng ký này và ký tên ở phía dưới cùng.',
      'Mẫu câu hướng dẫn cơ bản nhất tại các quầy thủ tục hành chính và ngân hàng.',
      ARRAY['Make sure you fill out this form accurately using block capital letters.', 'You can fill out this form online beforehand to save waiting time.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000002',
      '33333333-3333-4333-8333-333333333333',
      'verify your citizen ID',
      '/ˈverɪfaɪ jʊr ˈsɪtɪzn aɪˈdiː/',
      'xác minh căn cước công dân / định danh cá nhân',
      'May I see your original passport or chip-based citizen ID to verify your identity?',
      'Tôi có thể xem hộ chiếu gốc hoặc căn cước công dân gắn chip để xác minh danh tính được không?',
      'Dùng khi đối chiếu giấy tờ tùy thân của công dân hoặc khách hàng làm thủ tục.',
      ARRAY['The officer took a minute to scan and verify my citizen ID.', 'Biometric data will be used to verify your citizen ID securely.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000003',
      '33333333-3333-4333-8333-333333333333',
      'process your request',
      '/ˈprɑːses jʊr rɪˈkwest/',
      'tiếp nhận và xử lý yêu cầu của bạn',
      'It will take approximately three business days to fully process your request.',
      'Sẽ mất khoảng ba ngày làm việc để hoàn tất việc xử lý yêu cầu của quý khách.',
      'Cách phản hồi chuẩn mực, trang trọng và lịch thiệp với khách hàng công chúng.',
      ARRAY['We are currently processing your request and will notify you via SMS.', 'Due to high volume, it might take a bit longer to process your request.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000004',
      '33333333-3333-4333-8333-333333333333',
      'please bear with me',
      '/pliːz ber wɪð miː/',
      'xin quý khách vui lòng thông cảm đợi tôi một chút',
      'The system is loading a bit slowly today, so please bear with me for a moment.',
      'Hôm nay hệ thống đang tải hơi chậm, xin quý khách vui lòng kiên nhẫn đợi tôi một lát.',
      'Cách xoa dịu khách hàng cực kỳ lịch thiệp khi gặp trục trặc kỹ thuật hoặc tra cứu hồ sơ lâu.',
      ARRAY['Please bear with me while I retrieve your archival documents from the system.', 'Thank you for bearing with us during this scheduled service transition.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000005',
      '33333333-3333-4333-8333-333333333333',
      'step-by-step guidance',
      '/step baɪ step ˈɡaɪdns/',
      'hướng dẫn chi tiết từng bước một',
      'Our public portal provides clear step-by-step guidance for business registration.',
      'Cổng dịch vụ công của chúng tôi có phần hướng dẫn chi tiết từng bước để đăng ký kinh doanh.',
      'Dùng khi giải thích một quy trình gồm nhiều bước phức tạp cho người dân.',
      ARRAY['The desk officer offered friendly, step-by-step guidance throughout the procedure.', 'Follow the step-by-step guidance in this handbook to renew your driver''s license.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000006',
      '33333333-3333-4333-8333-333333333333',
      'required documents',
      '/rɪˈkwaɪərd ˈdɑːkjumənts/',
      'các giấy tờ hồ sơ bắt buộc theo quy định',
      'Please double-check that you have brought all the required documents listed on the checklist.',
      'Xin vui lòng kiểm tra lại xem bạn đã mang đủ tất cả các giấy tờ bắt buộc theo danh mục chưa.',
      'Cụm danh từ quan trọng nhất trong việc tiếp nhận hồ sơ hành chính.',
      ARRAY['Missing any of the required documents will delay your application process.', 'All required documents must be submitted in clear, readable copies.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000007',
      '33333333-3333-4333-8333-333333333333',
      'certified copy',
      '/ˈsɜːrtɪfaɪd ˈkɑːpi/ ',
      'bản sao y có công chứng chứng thực',
      'You need to submit one original document along with two certified copies.',
      'Quý khách cần nộp một bản gốc kèm theo hai bản sao y có chứng thực.',
      'Thuật ngữ pháp lý phổ biến khi giải quyết thủ tục giấy tờ.',
      ARRAY['Only official certified copies from the municipal ward office will be accepted.', 'Keep the original certificate safe and submit the certified copy instead.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000008',
      '33333333-3333-4333-8333-333333333333',
      'valid through',
      '/ˈvælɪd θruː/',
      'có giá trị hiệu lực đến ngày...',
      'Your temporary residence permit is valid through December 31st of this year.',
      'Giấy xác nhận tạm trú của bạn có giá trị hiệu lực đến hết ngày 31 tháng 12 năm nay.',
      'Dùng để thông báo thời hạn hiệu lực của giấy tờ, thị thực hoặc chứng chỉ.',
      ARRAY['This notarized authorization letter is valid through the end of next month.', 'Ensure your passport is valid through at least six months from your travel date.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000009',
      '33333333-3333-4333-8333-333333333333',
      'notarize the document',
      '/ˈnoʊtəraɪz ðə ˈdɑːkjumənt/',
      'công chứng giấy tờ / văn bản',
      'You can notarize the document at any public notary office in the district.',
      'Bạn có thể đi công chứng văn bản này tại bất kỳ phòng công chứng nào trong quận.',
      'Hành động pháp lý chứng nhận tính xác thực của chữ ký và văn bản.',
      ARRAY['The contract must be properly notarized before it can take legal effect.', 'How much does it cost to translate and notarize this birth certificate?'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000010',
      '33333333-3333-4333-8333-333333333333',
      'take a queue number',
      '/teɪk ə kjuː ˈnʌmbər/',
      'lấy số thứ tự xếp hàng',
      'Please take a queue number from the kiosk near the entrance and wait for your turn.',
      'Xin vui lòng lấy số thứ tự tại máy phát số gần cửa ra vào và chờ đến lượt.',
      'Lời hướng dẫn đầu tiên khi bước vào trung tâm hành chính công một cửa.',
      ARRAY['I took a queue number and waited about fifteen minutes before being called.', 'Citizens with online appointment bookings do not need to take a queue number.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000011',
      '33333333-3333-4333-8333-333333333333',
      'submit the application',
      '/səbˈmɪt ði ˌæplɪˈkeɪʃn/',
      'nộp bộ hồ sơ đăng ký',
      'Once all fields are completed, you can submit the application online or in person.',
      'Sau khi điền đủ các mục, bạn có thể nộp hồ sơ trực tuyến hoặc nộp trực tiếp tại quầy.',
      'Cụm động từ tiêu chuẩn cho việc hoàn tất gửi hồ sơ xin giải quyết.',
      ARRAY['The deadline to submit the renewal application is 5 PM this Friday.', 'You will receive an automated confirmation email after you submit the application.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000012',
      '33333333-3333-4333-8333-333333333333',
      'processing fee',
      '/ˈprɑːsesɪŋ fiː/',
      'lệ phí xử lý hồ sơ hành chính',
      'The standard processing fee can be paid by debit card or bank transfer.',
      'Lệ phí xử lý hồ sơ theo quy định có thể thanh toán bằng thẻ ghi nợ hoặc chuyển khoản.',
      'Khoản phí dịch vụ công phải đóng theo biểu mẫu nhà nước.',
      ARRAY['Is the processing fee refundable if the visa application is rejected?', 'Please keep the bank payment receipt as proof of the processing fee.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000013',
      '33333333-3333-4333-8333-333333333333',
      'in accordance with',
      '/ɪn əˈkɔːrdns wɪð/',
      'đúng theo quy định của pháp luật / chính sách',
      'This procedure is handled strictly in accordance with municipal administrative regulations.',
      'Thủ tục này được xử lý nghiêm ngặt theo đúng các quy định hành chính của thành phố.',
      'Cụm từ thể hiện tính chuẩn mực, thượng tôn pháp luật và uy tín công vụ.',
      ARRAY['Tax returns must be filed in accordance with the latest statutory guidelines.', 'The refund was executed in accordance with our stated customer protection policy.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000014',
      '33333333-3333-4333-8333-333333333333',
      'issue a receipt',
      '/ˈɪʃuː ə rɪˈsiːt/',
      'xuất biên lai / hóa đơn thu tiền',
      'The cashier will stamp your paperwork and issue an official electronic receipt.',
      'Nhân viên thu ngân sẽ đóng dấu giấy tờ và xuất cho bạn một biên lai điện tử chính thức.',
      'Cung cấp chứng từ sau khi người dân hoàn tất việc nộp phí.',
      ARRAY['Could you please issue a receipt with our company tax code?', 'Always verify the total amount before the counter clerk issues a receipt.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000015',
      '33333333-3333-4333-8333-333333333333',
      'counter window',
      '/ˈkaʊntər ˈwɪndoʊ/',
      'quầy tiếp nhận số / cửa tiếp nhận thủ tục',
      'Ticket number A42, please proceed to counter window number five.',
      'Xin mời số thứ tự A42 di chuyển đến quầy tiếp nhận số năm.',
      'Câu thông báo tự động quen thuộc tại các cơ quan dịch vụ công cộng.',
      ARRAY['Counter window number three handles all passport and immigration services.', 'She asked the clerk at the counter window for an additional registration form.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000016',
      '33333333-3333-4333-8333-333333333333',
      'tracking number',
      '/ˈtrækɪŋ ˈnʌmbər/',
      'mã số biên nhận / mã tra cứu tiến độ',
      'Use this twelve-digit tracking number to check your dossier status on our website.',
      'Hãy dùng mã số tra cứu mười hai chữ số này để kiểm tra tiến độ hồ sơ trên trang web.',
      'Mã số định danh cho mỗi bộ hồ sơ để công dân tự tra cứu tình trạng.',
      ARRAY['Enter your tracking number on the national public service portal to see updates.', 'I lost my paper receipt, can I retrieve my tracking number using my citizen ID?'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000017',
      '33333333-3333-4333-8333-333333333333',
      'within three working days',
      '/wɪˈðɪn θriː ˈwɜːrkɪŋ deɪz/',
      'trong vòng ba ngày làm việc',
      'The certified birth certificate will be delivered to your home within three working days.',
      'Bản sao khai sinh có chứng thực sẽ được gửi chuyển phát về tận nhà bạn trong vòng 3 ngày làm việc.',
      'Thuật ngữ thời hạn chuẩn xác trong hành chính (loại trừ thứ Bảy, Chủ Nhật và ngày lễ).',
      ARRAY['Our customer desk commits to replying to all inquiries within three working days.', 'The payment will be credited to your account within three working days.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000018',
      '33333333-3333-4333-8333-333333333333',
      'at your earliest convenience',
      '/æt jʊr ˈɜːrliɪst kənˈviːniəns/',
      'vào lúc thuận tiện sớm nhất của bạn',
      'Please review the attached resolution draft at your earliest convenience.',
      'Kính mong quý khách xem qua dự thảo nghị quyết đính kèm vào thời gian thuận tiện sớm nhất.',
      'Lời đề nghị lịch thiệp, tôn trọng thời gian của đối tác trong văn thư giao dịch.',
      ARRAY['Could you sign and return the finalized agreement at your earliest convenience?', 'Feel free to call our hot line back at your earliest convenience.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000001',
      '44444444-4444-4444-8444-444444444444',
      'walk me through your resume',
      '/wɔːk miː θruː jʊr ˈrezəmeɪ/',
      'tóm tắt quá trình kinh nghiệm trong hồ sơ của bạn',
      'To kick off our conversation, could you walk me through your resume and career journey?',
      'Để bắt đầu buổi phỏng vấn, bạn có thể tóm lược quá trình sự nghiệp qua hồ sơ của mình được không?',
      'Câu hỏi mở đầu kinh điển trong 90% các buổi phỏng vấn tuyển dụng chuyên nghiệp.',
      ARRAY['She asked me to walk her through my resume focusing on project management roles.', 'I''m prepared to walk the panel through my resume and highlight key achievements.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000002',
      '44444444-4444-4444-8444-444444444444',
      'hands-on experience',
      '/hændz ɑːn ɪkˈspɪriəns/',
      'kinh nghiệm thực tế / kinh nghiệm cọ xát thực chiến',
      'I have over five years of hands-on experience building scalable cloud microservices.',
      'Tôi có hơn năm năm kinh nghiệm thực chiến trong việc xây dựng hệ thống vi dịch vụ đám mây.',
      'Từ ăn điểm mạnh nhất khi muốn khẳng định bản thân làm thật việc thật, không chỉ lý thuyết.',
      ARRAY['The role requires hands-on experience with TypeScript and modern CI/CD tools.', 'Graduates with hands-on internship experience adapt much faster to corporate workflows.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000003',
      '44444444-4444-4444-8444-444444444444',
      'align with company goals',
      '/əˈlaɪn wɪð ˈkʌmpəni ɡoʊlz/',
      'đồng điệu và phù hợp với mục tiêu của công ty',
      'My career aspirations strongly align with the long-term vision and goals of your company.',
      'Định hướng sự nghiệp của tôi rất đồng điệu với tầm nhìn và các mục tiêu dài hạn của công ty.',
      'Chứng minh bạn đã tìm hiểu kỹ về công ty và sẵn sàng cống hiến lâu dài.',
      ARRAY['Every initiative we roll out must closely align with core company goals.', 'Her proposed growth strategy perfectly aligns with our international expansion goals.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000004',
      '44444444-4444-4444-8444-444444444444',
      'room for growth',
      '/ruːm fɔːr ɡroʊθ/',
      'cơ hội học hỏi và thăng tiến trong sự nghiệp',
      'I am looking for a challenging environment with substantial room for professional growth.',
      'Tôi đang tìm kiếm một môi trường thử thách với nhiều cơ hội để học hỏi và thăng tiến nghề nghiệp.',
      'Câu trả lời khéo léo cho câu hỏi ''Tại sao bạn lại muốn chuyển việc?''.',
      ARRAY['This progressive startup offers exceptional room for personal and technical growth.', 'In my previous position, I felt there was little room for career growth.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000005',
      '44444444-4444-4444-8444-444444444444',
      'meet expectations',
      '/miːt ˌekspekˈteɪʃnz/',
      'đáp ứng tốt các kỳ vọng đặt ra',
      'I am confident that my skill set will not only meet but exceed your team''s expectations.',
      'Tôi tự tin rằng các kỹ năng của mình sẽ không chỉ đáp ứng mà còn vượt trên kỳ vọng của đội ngũ.',
      'Tạo sự tự tin và chuyên nghiệp khi khẳng định năng lực trước hội đồng tuyển dụng.',
      ARRAY['The newly hired architect consistently met all performance expectations during probation.', 'We set clear benchmarks so candidates understand what it takes to meet expectations.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000006',
      '44444444-4444-4444-8444-444444444444',
      'salary expectations',
      '/ˈsæləri ˌekspekˈteɪʃnz/',
      'mức lương / thu nhập kỳ vọng',
      'Based on current market standards and my experience, my salary expectations are around two thousand dollars.',
      'Dựa trên mặt bằng thị trường và kinh nghiệm của tôi, mức lương kỳ vọng của tôi vào khoảng hai nghìn đô.',
      'Cách mở đầu chuẩn mực khi bước vào giai đoạn thương lượng thù lao (deal lương).',
      ARRAY['Could you please share your salary expectations for this senior engineering position?', 'Her salary expectations were well within our department''s allocated hiring budget.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000007',
      '44444444-4444-4444-8444-444444444444',
      'competitive benefits package',
      '/kəmˈpetətɪv ˈbenɪfɪts ˈpækɪdʒ/',
      'gói chế độ đãi ngộ và phúc lợi hấp dẫn',
      'Aside from base salary, does the offer include a competitive benefits package and health insurance?',
      'Bên cạnh lương cứng, mức đề xuất này có bao gồm gói đãi ngộ phúc lợi và bảo hiểm sức khỏe tốt không?',
      'Hỏi khéo léo về bảo hiểm, thưởng, ngày phép và phụ cấp ngoài lương cứng.',
      ARRAY['Our firm attracts top talent by offering a highly competitive benefits package.', 'The competitive benefits package includes stock options and hybrid remote work.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000008',
      '44444444-4444-4444-8444-444444444444',
      'proven track record',
      '/ˈpruːvn træk ˈrekərd/',
      'bề dày thành tích đã được chứng minh qua thực tế',
      'I have a proven track record of boosting user retention rates by twenty percent.',
      'Tôi có bề dày thành tích thực tế trong việc tăng tỷ lệ người dùng quay lại thêm hai mươi phần trăm.',
      'Cụm từ đắt giá để khẳng định kết quả cụ thể đo lường được bằng số liệu.',
      ARRAY['The candidate brings a proven track record of managing enterprise software deliveries.', 'We chose her because of her proven track record in crisis management.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000009',
      '44444444-4444-4444-8444-444444444444',
      'strengths and weaknesses',
      '/streŋkθs ænd ˈwiːknəsɪz/',
      'điểm mạnh và điểm cần cải thiện',
      'When asked about my strengths and weaknesses, I focused on adaptability and delegating tasks.',
      'Khi được hỏi về điểm mạnh và điểm yếu, tôi tập trung vào khả năng thích ứng và kỹ năng phân chia việc.',
      'Câu hỏi tình huống phổ biến để đánh giá mức độ thấu hiểu bản thân của ứng viên.',
      ARRAY['Self-awareness about your strengths and weaknesses is highly valued by hiring managers.', 'Framing your weaknesses as areas actively undergoing improvement shows maturity.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000010',
      '44444444-4444-4444-8444-444444444444',
      'adapt quickly to',
      '/əˈdæpt ˈkwɪkli tuː/',
      'thích nghi nhanh chóng với môi trường / công nghệ mới',
      'I pride myself on my ability to adapt quickly to new tech stacks and dynamic workflows.',
      'Tôi tự hào về khả năng nhanh chóng thích nghi với các công nghệ mới và quy trình làm việc linh hoạt.',
      'Phẩm chất được đánh giá rất cao trong các công ty công nghệ có tốc độ thay đổi nhanh.',
      ARRAY['New hires must adapt quickly to our collaborative remote team culture.', 'She adapted quickly to the changing project requirements without losing momentum.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000011',
      '44444444-4444-4444-8444-444444444444',
      'problem-solving skill',
      '/ˈprɑːbləm ˈsɑːlvɪŋ skɪl/',
      'kỹ năng tư duy giải quyết vấn đề',
      'My strong problem-solving skills allow me to stay calm and diagnose root causes during outages.',
      'Kỹ năng giải quyết vấn đề tốt giúp tôi luôn giữ bình tĩnh và tìm ra nguyên nhân khi có sự cố.',
      'Kỹ năng mềm hàng đầu được tìm kiếm ở mọi cấp bậc vị trí việc làm.',
      ARRAY['Case study interviews are specifically designed to test your real-world problem-solving skills.', 'Her creative problem-solving skills saved the company thousands in licensing fees.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000012',
      '44444444-4444-4444-8444-444444444444',
      'work under pressure',
      '/wɜːrk ˈʌndər ˈpreʃər/',
      'chịu được áp lực cao trong công việc',
      'Having worked in fast-paced agencies, I am very comfortable working under pressure.',
      'Từng làm việc ở các agency với nhịp độ dồn dập, tôi rất quen với việc chịu áp lực công việc cao.',
      'Dùng để trấn an nhà tuyển dụng về khả năng giữ vững phong độ khi công việc bận rộn.',
      ARRAY['Can you describe a specific situation where you had to work under intense pressure?', 'The role requires an individual who thrives and stays organized when working under pressure.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000013',
      '44444444-4444-4444-8444-444444444444',
      'stand out from the crowd',
      '/stænd aʊt frʌm ðə kraʊd/',
      'tạo điểm nhấn khác biệt nổi bật so với các ứng viên khác',
      'My unique combination of design sense and full-stack engineering helps me stand out from the crowd.',
      'Sự kết hợp giữa tư duy thiết kế và kỹ thuật lập trình giúp tôi tạo nên sự khác biệt nổi bật.',
      'Dùng khi bạn muốn trả lời câu hỏi ''Tại sao chúng tôi nên chọn bạn?''.',
      ARRAY['To stand out from the crowd, tailor your portfolio specifically to the company''s domain.', 'His open-source contributions truly made him stand out from the crowd.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000014',
      '44444444-4444-4444-8444-444444444444',
      'team player',
      '/tiːm ˈpleɪər/',
      'người có tinh thần đồng đội / biết phối hợp ăn ý',
      'I am a dedicated team player who values constructive feedback and transparent communication.',
      'Tôi là người luôn đề cao tinh thần đồng đội, trân trọng góp ý xây dựng và giao tiếp minh bạch.',
      'Thể hiện thái độ hòa đồng, biết lắng nghe và đặt lợi ích tập thể lên hàng đầu.',
      ARRAY['While being technically brilliant, he is also an empathetic and supportive team player.', 'We are searching for a true team player to collaborate across multiple squads.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000015',
      '44444444-4444-4444-8444-444444444444',
      'notice period',
      '/ˈnoʊtɪs ˈpɪriəd/',
      'thời hạn báo trước khi chính thức nghỉ việc cũ',
      'I have a one-month notice period with my current employer, so I could start on the first of next month.',
      'Tôi có cam kết báo trước một tháng ở công ty hiện tại, vì vậy tôi có thể bắt đầu làm việc từ đầu tháng sau.',
      'Thông tin bắt buộc phải trao đổi để công ty mới sắp xếp ngày tiếp nhận công việc (onboarding).',
      ARRAY['Would your current employer be willing to shorten your notice period?', 'Due to my contract obligations, my notice period cannot be negotiated below thirty days.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000016',
      '44444444-4444-4444-8444-444444444444',
      'negotiable',
      '/nɪˈɡoʊʃiəbl/',
      'có thể thương lượng / linh hoạt trao đổi thêm',
      'My compensation expectations are negotiable depending on the overall growth potential and equity offer.',
      'Mức thu nhập của tôi hoàn toàn có thể thương lượng dựa trên tiềm năng phát triển và cổ phần của công ty.',
      'Tạo sự cởi mở, không bị cứng nhắc khi trao đổi về mức lương khởi điểm.',
      ARRAY['Is the remote work policy strictly enforced or is it negotiable?', 'The starting salary is somewhat fixed, but annual bonuses remain negotiable.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000017',
      '44444444-4444-4444-8444-444444444444',
      'fit into the company culture',
      '/fɪt ˈɪntuː ðə ˈkʌmpəni ˈkʌltʃər/',
      'hòa nhập tốt với văn hóa và phong cách làm việc của công ty',
      'I believe my openness to continuous learning enables me to fit seamlessly into your company culture.',
      'Tôi tin tinh thần ham học hỏi liên tục sẽ giúp tôi dễ dàng hòa nhập với văn hóa công ty bạn.',
      'Yếu tố ''Culture Fit'' ngày nay được nhà tuyển dụng xem trọng không kém gì kỹ năng chuyên môn.',
      ARRAY['During the peer interview, the team evaluated whether the applicant fits into our company culture.', 'It is essential that senior leaders embody and fit into the company culture.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000018',
      '44444444-4444-4444-8444-444444444444',
      'look forward to hearing from you',
      '/lʊk ˈfɔːrwərd tuː ˈhɪrɪŋ frʌm juː/',
      'rất mong sớm nhận được phản hồi từ quý công ty',
      'Thank you for your valuable time today; I look forward to hearing from you regarding the next steps.',
      'Cảm ơn anh chị đã dành thời gian quý báu hôm nay; tôi rất mong sớm nhận được phản hồi về các bước tiếp theo.',
      'Câu kết lịch sự hoàn hảo khi ra về hoặc khi gửi email cảm ơn (Thank-you note) sau phỏng vấn.',
      ARRAY['I truly enjoyed our discussion and look forward to hearing from you soon.', 'We look forward to hearing from you once the background check is completed.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000001',
      '55555555-5555-4555-8555-555555555555',
      'how''s it going',
      '/haʊz ɪt ˈɡoʊɪŋ/',
      'dạo này thế nào rồi? / công việc ổn cả chứ?',
      'Hey Duc, long time no see! How''s it going with you?',
      'Chào Đức, lâu ngày không gặp! Dạo này mọi việc thế nào rồi bạn?',
      'Lời chào hỏi thông dụng và tự nhiên nhất của người bản xứ, thân thiện hơn ''How are you?''.',
      ARRAY['How''s it going with your new apartment search?', 'Good morning everyone, how''s it going today?'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000002',
      '55555555-5555-4555-8555-555555555555',
      'fingers crossed',
      '/ˈfɪŋɡərz krɔːst/',
      'cầu mong mọi chuyện may mắn / suôn sẻ nhé',
      'I just submitted my visa renewal application, fingers crossed everything goes smoothly!',
      'Tôi vừa nộp hồ sơ gia hạn visa xong, cầu mong mọi chuyện thuận buồm xuôi gió!',
      'Thành ngữ chúc may mắn cực kỳ phổ biến kèm cử chỉ đan chéo ngón tay trỏ và ngón giữa.',
      ARRAY['Keep your fingers crossed for me during my driving test this afternoon.', 'Fingers crossed the rain holds off until the outdoor concert finishes.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000003',
      '55555555-5555-4555-8555-555555555555',
      'take it easy',
      '/teɪk ɪt ˈiːzi/',
      'cứ thư thả / đừng lo lắng quá nhé',
      'You have been working too hard lately, make sure you take it easy this weekend.',
      'Dạo này bạn làm việc vất vả quá rồi, cuối tuần này nhớ nghỉ ngơi thư thả nhé.',
      'Dùng để khuyên ai đó thư giãn hoặc làm lời chào tạm biệt thân thiện khi ra về.',
      ARRAY['Take it easy, we still have plenty of time before the gate closes.', 'See you on Monday, take it easy!'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000004',
      '55555555-5555-4555-8555-555555555555',
      'out of the blue',
      '/aʊt əv ðə bluː/',
      'bất thình lình / hoàn toàn bất ngờ không báo trước',
      'Out of the blue, my high school best friend called me after ten years.',
      'Bất thình lình, đứa bạn thân cấp ba gọi cho tôi sau mười năm bặt vô âm tín.',
      'Diễn đạt một sự việc xảy ra bất ngờ như sét đánh giữa trời xanh không mây.',
      ARRAY['She received a lucrative job offer completely out of the blue.', 'Out of the blue, the car engine just stopped running on the highway.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000005',
      '55555555-5555-4555-8555-555555555555',
      'ring a bell',
      '/rɪŋ ə bel/',
      'nghe quen quen / có chút ấn tượng nhớ ra',
      'Does the name Michael Anderson ring a bell to you?',
      'Cái tên Michael Anderson nghe có quen quen hay gợi cho bạn nhớ ra ai không?',
      'Dùng khi bạn muốn hỏi ai đó xem một cái tên hoặc sự việc nghe có quen tai không.',
      ARRAY['That restaurant''s name rings a bell, I think my sister recommended it.', 'Sorry, that address doesn''t ring any bells at all.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000006',
      '55555555-5555-4555-8555-555555555555',
      'count me in',
      '/kaʊnt miː ɪn/',
      'cho tôi tham gia với nhé / nhớ tính phần tôi!',
      'Are you guys going out for barbecue tonight? Count me in!',
      'Tối nay mọi người đi ăn thịt nướng hả? Cho tôi tham gia một chân với nhé!',
      'Cách đồng ý nhiệt tình và tức thì khi bạn bè rủ rê đi chơi hoặc tham gia hoạt động chung.',
      ARRAY['If you need volunteers for the beach cleanup, definitely count me in.', 'Count me in for board game night this Saturday!'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000007',
      '55555555-5555-4555-8555-555555555555',
      'catch you later',
      '/kætʃ juː ˈleɪtər/',
      'hẹn gặp lại bạn sau nhé',
      'I''ve got to run to my dentist appointment now, catch you later!',
      'Tôi phải chạy đi khám nha sĩ bây giờ rồi, hẹn gặp lại bạn sau nhé!',
      'Lời tạm biệt cực kỳ tự nhiên giữa đồng nghiệp hoặc bạn bè thân thiết.',
      ARRAY['Thanks for the coffee, I''ll catch you later at the gym.', 'Catch you later, let me know when you arrive home safely.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000008',
      '55555555-5555-4555-8555-555555555555',
      'long time no see',
      '/lɔːŋ taɪm noʊ siː/',
      'lâu ngày quá không gặp nhau!',
      'Hey Nam, long time no see! You haven''t changed a bit!',
      'Chào Nam, lâu ngày quá không gặp! Nhìn bạn chẳng thay đổi chút nào!',
      'Thành ngữ phá băng siêu nhanh khi tình cờ gặp lại bạn bè cũ sau thời gian dài.',
      ARRAY['Long time no see, we definitely need to grab coffee and catch up.', 'It was great running into Sarah yesterday, long time no see!'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000009',
      '55555555-5555-4555-8555-555555555555',
      'grab a bite to eat',
      '/ɡræb ə baɪt tuː iːt/',
      'đi kiếm gì ăn lót dạ đi',
      'I''m starving after that workshop, let''s grab a quick bite to eat.',
      'Học xong đói bụng quá rồi, tụi mình đi kiếm cái gì ăn lót dạ đi.',
      'Tự nhiên hơn rất nhiều so với ''Let''s go have lunch/dinner''.',
      ARRAY['Do you have time to grab a bite to eat before the movie starts?', 'We grabbed a bite to eat at that new taco stand near the office.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000010',
      '55555555-5555-4555-8555-555555555555',
      'slip my mind',
      '/slɪp maɪ maɪnd/',
      'quên khuấy đi mất tiêu',
      'I am so sorry I didn''t call you back yesterday, it completely slipped my mind!',
      'Thành thật xin lỗi vì hôm qua không gọi lại cho bạn, tôi bận quá quên khuấy đi mất!',
      'Cách xin lỗi chân thành khi lỡ quên một việc nhỏ mà không khiến đối phương khó chịu.',
      ARRAY['Buying more milk totally slipped my mind on the way home.', 'Don''t let our meeting tomorrow slip your mind, it''s very important.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000011',
      '55555555-5555-4555-8555-555555555555',
      'give it a shot',
      '/ɡɪv ɪt ə ʃɑːt/',
      'cứ thử làm một lần xem sao',
      'I''ve never tried cooking Thai curry before, but I''m willing to give it a shot.',
      'Tôi chưa từng nấu món cà ri Thái bao giờ, nhưng tôi sẵn sàng thử một lần xem sao.',
      'Thể hiện tinh thần cởi mở, dám thử thách những điều mới mẻ.',
      ARRAY['You should definitely give public speaking a shot, you might love it.', 'Even if the puzzle seems impossible, give it a shot first.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000012',
      '55555555-5555-4555-8555-555555555555',
      'sleep on it',
      '/sliːp ɑːn ɪt/',
      'để ngủ một đêm suy nghĩ kỹ lại rồi hãy quyết định',
      'Don''t make any hasty decisions right now; sleep on it and tell me tomorrow.',
      'Đừng vội đưa ra quyết định vội vàng lúc này; cứ ngủ một giấc rồi mai tính tiếp.',
      'Lời khuyên hữu ích khi đối diện với những quyết định quan trọng trong cuộc sống.',
      ARRAY['I need to sleep on this car purchase before transferring the deposit.', 'After sleeping on it, she felt much more confident about accepting the job.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000013',
      '55555555-5555-4555-8555-555555555555',
      'make up my mind',
      '/meɪk ʌp maɪ maɪnd/',
      'đưa ra quyết định dứt khoát',
      'Both jacket colors look great, I really can''t make up my mind!',
      'Cả hai màu áo khoác đều đẹp, tôi thực sự vẫn chưa quyết định chọn cái nào!',
      'Dùng khi bạn đang đắn đo giữa các lựa chọn thay vì nói đơn giản ''I haven''t decided''.',
      ARRAY['Hurry up and make up your mind, the ticket promotion ends in ten minutes.', 'Once he makes up his mind, it''s very hard to convince him otherwise.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000014',
      '55555555-5555-4555-8555-555555555555',
      'take a rain check',
      '/teɪk ə reɪn tʃek/',
      'xin phép hẹn dịp khác nhé',
      'I would love to join your party, but I''m under the weather, can I take a rain check?',
      'Tôi rất muốn đi dự tiệc của bạn nhưng người đang hơi mệt, cho tôi xin hẹn lại dịp khác nhé?',
      'Cách từ chối lịch thiệp nhất, ngụ ý bạn rất trân trọng lời mời và muốn đi vào dịp sau.',
      ARRAY['Mind if we take a rain check on our tennis match until next Sunday?', 'She asked for a rain check because her flight was delayed.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000015',
      '55555555-5555-4555-8555-555555555555',
      'keep in touch',
      '/kiːp ɪn tʌtʃ/',
      'nhớ giữ liên lạc thường xuyên nhé',
      'It was wonderful working with you, let''s definitely keep in touch on LinkedIn!',
      'Thật tuyệt vời khi được làm việc cùng bạn, nhớ giữ liên lạc thường xuyên qua LinkedIn nhé!',
      'Lời dặn dò ấm áp khi chia tay bạn bè hoặc đồng nghiệp chuyển công tác.',
      ARRAY['Even though we live on different continents, we still keep in touch weekly.', 'Don''t be a stranger, keep in touch whenever you visit Da Nang!'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000016',
      '55555555-5555-4555-8555-555555555555',
      'speak of the devil',
      '/spiːk əv ðə ˈdevl/',
      'vừa nhắc tào tháo là tào tháo tới liền!',
      'Speak of the devil! We were just discussing your vacation photos and here you are!',
      'Đúng là nhắc tào tháo tào tháo tới! Tụi này vừa mới nhắc tới ảnh đi chơi của bạn thì bạn bước vào!',
      'Nói vui khi một người vừa được nhắc tên thì bất ngờ xuất hiện ngay trước mắt.',
      ARRAY['Speak of the devil, John just walked through the front door.', 'Well, speak of the devil! Look who just commented on our Facebook post.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000017',
      '55555555-5555-4555-8555-555555555555',
      'on the tip of my tongue',
      '/ɑːn ðə tɪp əv maɪ tʌŋ/',
      'nhớ mang máng, ngay đầu môi mà chưa nhớ ra được',
      'Wait, don''t tell me, the actor''s name is right on the tip of my tongue!',
      'Khoan, đừng nói vội, tên diễn viên đó đang ở ngay đầu môi tôi rồi, sắp nhớ ra rồi!',
      'Diễn tả cảm giác bạn biết rõ điều đó nhưng tạm thời chưa gọi đúng tên được.',
      ARRAY['The answer was on the tip of my tongue throughout the trivia game.', 'His phone number was on the tip of my tongue, but I had to check my contacts.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '50000000-0000-4000-8000-000000000018',
      '55555555-5555-4555-8555-555555555555',
      'you bet',
      '/juː bet/',
      'chắc chắn rồi / không cần phải hỏi!',
      'Are you coming to the concert tonight? You bet I am!',
      'Tối nay bạn có đi xem buổi hòa nhạc không? Chắc chắn rồi, không đi sao được!',
      'Cách đồng ý cực kỳ nhiệt tình và quả quyết trong giao tiếp đời thường của người Mỹ.',
      ARRAY['Thanks so much for helping me carry these boxes! - You bet!', 'Will this code change improve speed? - You bet it will.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000001',
      '66666666-6666-4666-8666-666666666666',
      'window or aisle seat',
      '/ˈwɪndoʊ ɔːr aɪl siːt/',
      'ghế cạnh cửa sổ hay ghế cạnh lối đi',
      'When checking in for your long-haul flight, do you prefer a window or an aisle seat?',
      'Khi làm thủ tục cho chuyến bay đường dài, bạn thích chọn ghế cạnh cửa sổ hay cạnh lối đi hơn?',
      'Câu hỏi quen thuộc nhất từ nhân viên mặt đất tại quầy làm thủ tục sân bay.',
      ARRAY['Could you please assign me an aisle seat near the front of the aircraft?', 'I always pick a window seat so I can rest my head against the wall and sleep.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000002',
      '66666666-6666-4666-8666-666666666666',
      'check in baggage',
      '/tʃek ɪn ˈbæɡɪdʒ/',
      'gửi hành lý ký gửi tại quầy',
      'How many pieces of luggage do you need to check in for this domestic flight?',
      'Quý khách cần gửi bao nhiêu kiện hành lý ký gửi cho chuyến bay nội địa này?',
      'Phân biệt rõ giữa hành lý ký gửi (checked baggage) và hành lý xách tay (carry-on).',
      ARRAY['Please place your baggage on the scale to verify it does not exceed twenty kilos.', 'I only have a small backpack, so I don''t need to check in any baggage.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000003',
      '66666666-6666-4666-8666-666666666666',
      'book a table for two',
      '/bʊk ə ˈteɪbl fɔːr tuː/',
      'đặt trước một bàn ăn cho hai người',
      'I would like to book a table for two by the balcony for seven o''clock tonight, please.',
      'Tôi muốn đặt một bàn cho hai người gần ban công lúc bảy giờ tối nay, xin cảm ơn.',
      'Mẫu câu chuẩn chỉ khi gọi điện thoại đặt bàn tại các nhà hàng nước ngoài.',
      ARRAY['Do we need to book a table for two in advance, or do they accept walk-ins?', 'I booked a table for two under the name of Quang Duc.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000004',
      '66666666-6666-4666-8666-666666666666',
      'there seems to be a problem',
      '/ðer siːmz tuː biː ə ˈprɑːbləm/',
      'dường như đang có một sự cố phát sinh',
      'Excuse me, there seems to be a problem with the hot water system in room 402.',
      'Xin lỗi, dường như đang có trục trặc với hệ thống nước nóng ở phòng 402.',
      'Cách phản ánh sự cố lịch sự, tránh to tiếng nhưng vẫn khiến lễ tân khách sạn ưu tiên giải quyết.',
      ARRAY['There seems to be a problem with my credit card transaction at the terminal.', 'Pardon me, but there seems to be a problem with this restaurant bill.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000005',
      '66666666-6666-4666-8666-666666666666',
      'keep me posted',
      '/kiːp miː ˈpoʊstɪd/',
      'có tin gì mới nhớ báo mình biết ngay nhé',
      'Once your connecting flight status is updated on the board, please keep me posted.',
      'Khi nào thông tin chuyến bay chuyển tiếp của bạn được cập nhật trên bảng điện tử, nhớ báo mình ngay nhé.',
      'Thường dùng khi một sự việc đang chờ thông báo và bạn muốn người kia báo tin tức thì.',
      ARRAY['Keep me posted on whether you make it to the hotel before midnight.', 'I''ll keep you posted as soon as the weather advisory is lifted.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000006',
      '66666666-6666-4666-8666-666666666666',
      'sort things out',
      '/sɔːrt θɪŋz aʊt/',
      'dàn xếp ổn thỏa mọi khúc mắc / xử lý xong vấn đề',
      'Don''t panic about the booking mix-up, the hotel manager is sorting things out right now.',
      'Đừng lo lắng về chuyện nhầm lẫn phòng, quản lý khách sạn đang trực tiếp dàn xếp ổn thỏa rồi.',
      'Cụm từ rất hay khi nói về việc tháo gỡ rắc rối trong du lịch và đời sống.',
      ARRAY['Give the airline staff a few minutes to sort things out with your baggage claim.', 'We finally sorted things out and enjoyed the rest of our holiday in Tokyo.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000007',
      '66666666-6666-4666-8666-666666666666',
      'boarding pass',
      '/ˈbɔːrdɪŋ pæs/',
      'thẻ lên máy bay',
      'Please have your passport and boarding pass ready for inspection at gate twelve.',
      'Xin vui lòng chuẩn bị sẵn hộ chiếu và thẻ lên máy bay để kiểm tra tại cửa số 12.',
      'Giấy tờ bắt buộc phải giữ bên mình để qua cửa kiểm soát an ninh và lên máy bay.',
      ARRAY['You can add your mobile boarding pass directly to Apple Wallet.', 'The gate agent scanned my boarding pass and wished me a pleasant flight.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000008',
      '66666666-6666-4666-8666-666666666666',
      'carry-on luggage',
      '/ˈkæri ɑːn ˈlʌɡɪdʒ/',
      'hành lý xách tay mang lên khoang máy bay',
      'Your carry-on luggage must fit in the overhead bin or underneath the seat in front of you.',
      'Hành lý xách tay của bạn phải để vừa trong khoang hành lý phía trên hoặc dưới gầm ghế phía trước.',
      'Quy định an toàn bay bắt buộc cho mọi hành khách đi máy bay.',
      ARRAY['Make sure all liquids in your carry-on luggage comply with the 100ml limit.', 'Gate attendants were weighing heavy carry-on luggage to enforce airline policies.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000009',
      '66666666-6666-4666-8666-666666666666',
      'flight delay',
      '/flaɪt dɪˈleɪ/',
      'chuyến bay bị hoãn giờ cất cánh',
      'Due to heavy thunderstorms over the airport, we are experiencing a two-hour flight delay.',
      'Do giông bão lớn trên vùng trời sân bay, chuyến bay của chúng ta đang bị hoãn lại hai tiếng.',
      'Tình huống thường gặp khi đi máy bay vào mùa mưa bão.',
      ARRAY['The airline provided meal vouchers to compensate passengers for the long flight delay.', 'Frequent flight delays caused him to miss his crucial business conference.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000010',
      '66666666-6666-4666-8666-666666666666',
      'lost and found',
      '/lɔːst ænd faʊnd/',
      'quầy tiếp nhận đồ thất lạc',
      'I left my camera on the tour bus; where is the lost and found counter located?',
      'Tôi để quên máy ảnh trên xe buýt du lịch; quầy đồ thất lạc nằm ở khu vực nào vậy?',
      'Địa điểm cần tìm ngay tại sân bay, nhà ga hoặc điểm du lịch khi lỡ đánh rơi đồ đạc.',
      ARRAY['Fortunately, someone turned my lost wallet in to the airport''s lost and found office.', 'Check with the lost and found desk before filing an official police report.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000011',
      '66666666-6666-4666-8666-666666666666',
      'currency exchange',
      '/ˈkɜːrənsi ɪksˈtʃeɪndʒ/',
      'quầy đổi ngoại tệ',
      'Where can I find a currency exchange booth with reasonable rates in the arrival hall?',
      'Tôi có thể tìm thấy quầy đổi ngoại tệ có tỷ giá hợp lý ở đâu trong sảnh đến vậy?',
      'Dịch vụ quan trọng đầu tiên khi hạ cánh xuống một quốc gia mới.',
      ARRAY['Currency exchange booths at international airports usually charge higher transaction fees.', 'She exchanged five hundred US dollars into Japanese Yen at the downtown currency exchange.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000012',
      '66666666-6666-4666-8666-666666666666',
      'call an ambulance',
      '/kɔːl ən ˈæmbjələns/',
      'gọi ngay xe cấp cứu',
      'Please hurry and call an ambulance, someone just collapsed on the train platform!',
      'Làm ơn nhanh lên và gọi xe cấp cứu giúp tôi, có người vừa ngất xỉu ở sân ga xe lửa!',
      'Cụm từ khẩn cấp sống còn khi cần hỗ trợ y tế khẩn cấp ở nước ngoài.',
      ARRAY['The hotel concierge immediately called an ambulance when the guest suffered an allergic reaction.', 'Do you know the local emergency number to call an ambulance in Thailand?'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000013',
      '66666666-6666-4666-8666-666666666666',
      'lost my passport',
      '/lɔːst maɪ ˈpæspɔːrt/',
      'bị mất hộ chiếu',
      'I''ve lost my passport and wallet; could you direct me to the nearest Vietnamese embassy?',
      'Tôi bị mất hộ chiếu và ví tiền; bạn có thể chỉ đường giúp tôi đến đại sứ quán Việt Nam gần nhất không?',
      'Tình huống khẩn cấp nhất khi đi du lịch nước ngoài cần khai báo cảnh sát và đại sứ quán.',
      ARRAY['If you lost your passport, you must first obtain a police loss report for travel document reissue.', 'Keeping digital photocopies on your phone is a lifesaver if you ever lost your passport.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000014',
      '66666666-6666-4666-8666-666666666666',
      'complimentary breakfast',
      '/ˌkɑːmplɪˈmentri ˈbrekfəst/',
      'bữa sáng buffet miễn phí đi kèm theo phòng',
      'Your deluxe room reservation includes complimentary breakfast from six to ten every morning.',
      'Phòng hạng sang của bạn đã bao gồm bữa sáng miễn phí từ 6 giờ đến 10 giờ mỗi sáng.',
      'Thuật ngữ dịch vụ khách sạn (''complimentary'' nghĩa là miễn phí đi kèm dịch vụ).',
      ARRAY['Guests can enjoy a complimentary breakfast buffet on the top-floor terrace.', 'Is the complimentary breakfast served as a buffet or an à la carte menu?'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000015',
      '66666666-6666-4666-8666-666666666666',
      'itinerary',
      '/aɪˈtɪnəreri/',
      'lịch trình chuyến đi chi tiết',
      'Could you email me the updated travel itinerary including hotel booking codes?',
      'Bạn có thể gửi email cho tôi lịch trình chuyến đi mới nhất kèm mã đặt phòng khách sạn được không?',
      'Từ vựng then chốt cho việc tổ chức tour du lịch và chuyến công tác.',
      ARRAY['Our five-day itinerary in Paris includes museum tours and a Seine river cruise.', 'The tour guide reviewed the daily itinerary before the sightseeing bus departed.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000016',
      '66666666-6666-4666-8666-666666666666',
      'nearest subway station',
      '/ˈnɪrɪst ˈsʌbweɪ ˈsteɪʃn/',
      'ga tàu điện ngầm gần nhất',
      'Excuse me, could you tell me the fastest way to get to the nearest subway station?',
      'Xin lỗi, bạn có thể chỉ giúp tôi đường nhanh nhất để đến ga tàu điện ngầm gần đây được không?',
      'Câu hỏi đường phổ biến nhất của khách du lịch tại các thành phố lớn trên thế giới.',
      ARRAY['The boutique hotel is conveniently located just a three-minute walk from the nearest subway station.', 'Follow the green directional signs to reach the nearest subway station entrance.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000017',
      '66666666-6666-4666-8666-666666666666',
      'emergency exit',
      '/iˈmɜːrdʒənsi ˈeɡzɪt/',
      'cửa thoát hiểm khẩn cấp',
      'In case of a fire alarm, please walk calmly towards the illuminated emergency exit.',
      'Trong trường hợp có chuông báo cháy, xin vui lòng bình tĩnh di chuyển về phía cửa thoát hiểm có đèn sáng.',
      'Kỹ năng an toàn luôn cần chú ý khi nhận phòng khách sạn hoặc lên máy bay.',
      ARRAY['Never obstruct access to the emergency exit doors with heavy suitcases.', 'Passengers seated in the emergency exit row must be willing and able to assist the crew.'],
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '60000000-0000-4000-8000-000000000018',
      '66666666-6666-4666-8666-666666666666',
      'check-out time',
      '/ˈtʃekaʊt taɪm/',
      'giờ trả phòng khách sạn',
      'Standard check-out time is twelve noon, but late check-out is available upon request.',
      'Giờ trả phòng tiêu chuẩn là 12 giờ trưa, nhưng quý khách có thể yêu cầu trả phòng muộn nếu cần.',
      'Thông tin bắt buộc phải nắm khi lưu trú tại bất kỳ khách sạn nào.',
      ARRAY['Can we leave our luggage at the reception desk after check-out time?', 'Exceeding the check-out time without notification may incur an additional half-day fee.'],
      1, 0, 2.5, NOW(), NULL
    )
  ON CONFLICT (id) DO UPDATE SET
    deck_id = EXCLUDED.deck_id,
    phrase_en = EXCLUDED.phrase_en,
    ipa = EXCLUDED.ipa,
    meaning_vi = EXCLUDED.meaning_vi,
    sentence_en = EXCLUDED.sentence_en,
    sentence_vi = EXCLUDED.sentence_vi,
    context_note = EXCLUDED.context_note,
    variations = EXCLUDED.variations;

END $speakflow$;
