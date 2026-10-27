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

  -- 5. SEED DATA: 4 CONVERSATIONAL DECKS + 30 HIGH-UTILITY REFLEX CARDS
  INSERT INTO public.decks (id, title, description, icon, created_at) VALUES
    ('11111111-1111-4111-8111-111111111111', 'Phản xạ Giao tiếp Hàng ngày', 'Các cụm từ tự nhiên dùng mỗi ngày giúp bạn bật ra ý ngay lập tức không cần dịch từng chữ.', 'Zap', NOW()),
    ('22222222-2222-4222-8222-222222222222', 'Tiếng Anh Công sở & Họp hành', 'Cụm từ chuyên nghiệp để thảo luận dự án, báo cáo tiến độ, đồng tình hoặc phản biện khéo léo.', 'Briefcase', NOW()),
    ('33333333-3333-4333-8333-333333333333', 'Du lịch & Sân bay', 'Tình huống thực tế khi làm thủ tục bay, đặt phòng khách sạn, gọi món và hỏi đường ở nước ngoài.', 'Plane', NOW()),
    ('44444444-4444-4444-8444-444444444444', 'Small Talk & Kết bạn', 'Mở lời tự nhiên, duy trì cuộc trò chuyện thú vị và kết nối với bạn bè, đồng nghiệp quốc tế.', 'Users', NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.cards (
    id, deck_id, phrase_en, ipa, meaning_vi, sentence_en, sentence_vi, context_note, box, interval_days, ease_factor, next_review_at, last_practiced_at
  ) VALUES
    -- DECK 1: Phản xạ Giao tiếp Hàng ngày (8 cards)
    (
      '10000000-0000-4000-8000-000000000001',
      '11111111-1111-4111-8111-111111111111',
      'make up my mind',
      '/meɪk ʌp maɪ maɪnd/',
      'đưa ra quyết định',
      'I haven''t made up my mind yet.',
      'Tôi vẫn chưa đưa ra quyết định nữa.',
      'Dùng khi bạn đang phân vân giữa các lựa chọn thay vì nói "I didn''t decide".',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000002',
      '11111111-1111-4111-8111-111111111111',
      'take a rain check',
      '/teɪk ə reɪn tʃek/',
      'hẹn dịp khác nhé',
      'Can I take a rain check on dinner tonight?',
      'Tối nay mình hẹn ăn tối dịp khác được không?',
      'Cách từ chối lịch sự lời mời của ai đó và ngụ ý muốn hẹn lại lần sau.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000003',
      '11111111-1111-4111-8111-111111111111',
      'slip my mind',
      '/slɪp maɪ maɪnd/',
      'quên khuấy đi mất',
      'Sorry, it completely slipped my mind!',
      'Xin lỗi nhé, tôi hoàn toàn quên khuấy đi mất!',
      'Tự nhiên hơn rất nhiều so với "I forgot it" khi bạn vô tình quên một việc nhỏ.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000004',
      '11111111-1111-4111-8111-111111111111',
      'play it by ear',
      '/pleɪ ɪt baɪ ɪr/',
      'tùy cơ ứng biến / tới đó tính tiếp',
      'Let''s just play it by ear this weekend.',
      'Cuối tuần này cứ tùy cơ ứng biến đi nhé.',
      'Dùng khi chưa muốn lên kế hoạch cố định mà xem tình hình thực tế rồi mới quyết.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000005',
      '11111111-1111-4111-8111-111111111111',
      'grab a bite',
      '/ɡræb ə baɪt/',
      'ăn lót dạ / kiếm gì ăn nhanh',
      'Do you want to grab a bite after work?',
      'Tan làm xong bạn có muốn đi kiếm gì ăn nhanh không?',
      'Cụm từ rủ đi ăn nhẹ nhàng, thân mật với bạn bè hoặc đồng nghiệp.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000006',
      '11111111-1111-4111-8111-111111111111',
      'sleep on it',
      '/sliːp ɑːn ɪt/',
      'suy nghĩ thêm qua đêm',
      'It''s a big decision, so let me sleep on it.',
      'Đây là một quyết định lớn, để tôi suy nghĩ thêm đến mai nhé.',
      'Dùng khi ai đó cần câu trả lời quan trọng nhưng bạn muốn thêm thời gian cân nhắc.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000007',
      '11111111-1111-4111-8111-111111111111',
      'better late than never',
      '/ˈbetər leɪt ðæn ˈnevər/',
      'muộn còn hơn không',
      'You finally made it! Better late than never.',
      'Cuối cùng bạn cũng tới rồi! Muộn còn hơn không.',
      'Câu nói vui vẻ khi ai đó đến trễ hoặc hoàn thành việc gì đó muộn.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000008',
      '11111111-1111-4111-8111-111111111111',
      'up to you',
      '/ʌp tuː juː/',
      'tùy bạn quyết định đấy',
      'I''m fine with anything, so it''s totally up to you.',
      'Tôi sao cũng được hết, nên hoàn toàn tùy bạn quyết định đấy.',
      'Phản xạ cực nhanh khi được hỏi chọn món ăn, địa điểm hoặc phương án.',
      1, 0, 2.5, NOW(), NULL
    ),

    -- DECK 2: Tiếng Anh Công sở & Họp hành (8 cards)
    (
      '20000000-0000-4000-8000-000000000001',
      '22222222-2222-4222-8222-222222222222',
      'on the same page',
      '/ɑːn ðə seɪm peɪdʒ/',
      'cùng chung quan điểm / hiểu thống nhất',
      'Let''s make sure we are all on the same page before we start.',
      'Hãy đảm bảo tất cả chúng ta đều hiểu thống nhất trước khi bắt đầu nhé.',
      'Câu kinh điển trong các cuộc họp để xác nhận mọi người không hiểu lệch ý nhau.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000002',
      '22222222-2222-4222-8222-222222222222',
      'keep me in the loop',
      '/kiːp mi ɪn ðə luːp/',
      'cập nhật thông tin cho tôi với nhé',
      'Please keep me in the loop as the project progresses.',
      'Vui lòng cập nhật thông tin cho tôi khi dự án triển khai nhé.',
      'Dùng khi nhắn đồng nghiệp hoặc cấp dưới nhớ báo tình hình liên tục.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000003',
      '22222222-2222-4222-8222-222222222222',
      'wrap things up',
      '/ræp θɪŋz ʌp/',
      'tổng kết / khép lại công việc',
      'We''re running out of time, so let''s wrap things up.',
      'Chúng ta sắp hết giờ rồi, hãy khép lại buổi họp tại đây nhé.',
      'Dùng cuối buổi họp hoặc cuối ngày làm việc để kết thúc gọn gàng.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000004',
      '22222222-2222-4222-8222-222222222222',
      'swamped with work',
      '/swɑːmpt wɪð wɜːrk/',
      'bận ngập đầu với công việc',
      'I''d love to help, but I''m totally swamped with work today.',
      'Tôi rất muốn giúp nhưng hôm nay tôi bận ngập đầu với công việc rồi.',
      'Cách từ chối khéo khi đồng nghiệp nhờ thêm việc lúc bạn đang quá tải.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000005',
      '22222222-2222-4222-8222-222222222222',
      'touch base',
      '/tʌtʃ beɪs/',
      'trao đổi ngắn / cập nhật nhanh',
      'Let''s touch base tomorrow morning about the client proposal.',
      'Sáng mai chúng ta trao đổi nhanh về bản đề xuất cho khách hàng nhé.',
      'Rất phổ biến trong môi trường quốc tế khi muốn hẹn nói chuyện 5-10 phút.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000006',
      '22222222-2222-4222-8222-222222222222',
      'get the ball rolling',
      '/ɡet ðə bɔːl ˈroʊlɪŋ/',
      'bắt đầu khởi động công việc',
      'Everyone is here, so let''s get the ball rolling.',
      'Mọi người đều có mặt đủ rồi, chúng ta bắt đầu buổi họp thôi.',
      'Dùng để mở đầu cuộc họp hoặc khởi chạy một dự án mới đầy năng lượng.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000007',
      '22222222-2222-4222-8222-222222222222',
      'circle back',
      '/ˈsɜːrkəl bæk/',
      'quay lại bàn vấn đề này sau',
      'Let''s circle back to this issue after we have more data.',
      'Hãy quay lại bàn vấn đề này sau khi chúng ta có thêm dữ liệu nhé.',
      'Giúp cuộc họp không bị sa đà vào một chi tiết chưa có đủ thông tin.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000008',
      '22222222-2222-4222-8222-222222222222',
      'call it a day',
      '/kɔːl ɪt ə deɪ/',
      'nghỉ tay kết thúc ngày làm việc',
      'We''ve made great progress, let''s call it a day.',
      'Chúng ta đã đạt tiến độ rất tốt rồi, hôm nay nghỉ tay tại đây thôi.',
      'Câu nói thân thiện lúc tan tầm để rủ cả nhóm đóng máy nghỉ ngơi.',
      1, 0, 2.5, NOW(), NULL
    ),

    -- DECK 3: Du lịch & Sân bay (7 cards)
    (
      '30000000-0000-4000-8000-000000000001',
      '33333333-3333-4333-8333-333333333333',
      'aisle seat',
      '/aɪl siːt/',
      'ghế ngồi cạnh lối đi',
      'Could I get an aisle seat instead of a window seat, please?',
      'Cho tôi xin ghế ngồi cạnh lối đi thay vì ghế cửa sổ được không ạ?',
      'Lưu ý chữ "s" trong "aisle" là âm câm (/aɪl/). Dùng tại quầy check-in sân bay.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000002',
      '33333333-3333-4333-8333-333333333333',
      'carry-on luggage',
      '/ˈkæri ɑːn ˈlʌɡɪdʒ/',
      'hành lý xách tay',
      'I only have this backpack as my carry-on luggage.',
      'Tôi chỉ có chiếc ba lô này làm hành lý xách tay thôi.',
      'Phân biệt với "checked baggage" là hành lý ký gửi.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000003',
      '33333333-3333-4333-8333-333333333333',
      'boarding pass',
      '/ˈbɔːrdɪŋ pæs/',
      'thẻ lên máy bay',
      'Please have your passport and boarding pass ready.',
      'Xin vui lòng chuẩn bị sẵn hộ chiếu và thẻ lên máy bay của quý khách.',
      'Cụm từ bạn sẽ nghe liên tục ở cửa an ninh và cổng ra máy bay (boarding gate).',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000004',
      '33333333-3333-4333-8333-333333333333',
      'check in early',
      '/tʃek ɪn ˈɜːrli/',
      'nhận phòng sớm',
      'Is it possible to check in early if the room is ready?',
      'Liệu có thể nhận phòng sớm nếu phòng đã dọn xong không ạ?',
      'Hỏi lễ tân khách sạn khi chuyến bay của bạn hạ cánh sớm hơn giờ nhận phòng chuẩn.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000005',
      '33333333-3333-4333-8333-333333333333',
      'within walking distance',
      '/wɪˈðɪn ˈwɔːkɪŋ ˈdɪstəns/',
      'ở gần có thể đi bộ tới được',
      'Is the metro station within walking distance from here?',
      'Trạm tàu điện ngầm có ở gần đây để đi bộ tới được không bạn?',
      'Cực kỳ hữu ích khi hỏi đường người bản xứ hoặc lễ tân khách sạn.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000006',
      '33333333-3333-4333-8333-333333333333',
      'keep the change',
      '/kiːp ðə tʃeɪndʒ/',
      'cứ giữ lại tiền thừa nhé',
      'Here''s twenty dollars, please keep the change.',
      'Đây là 20 đô la, bạn cứ giữ lại tiền thừa nhé.',
      'Dùng khi trả tiền taxi hoặc thanh toán ở nhà hàng có văn hóa tiền tip.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000007',
      '33333333-3333-4333-8333-333333333333',
      'split the bill',
      '/splɪt ðə bɪl/',
      'chia đôi / chia đều hóa đơn',
      'Excuse me, could we split the bill, please?',
      'Xin lỗi, tụi mình có thể chia hóa đơn tính riêng được không ạ?',
      'Dùng khi đi ăn nhóm và muốn nhà hàng tách thanh toán cho từng người.',
      1, 0, 2.5, NOW(), NULL
    ),

    -- DECK 4: Small Talk & Kết bạn (7 cards)
    (
      '40000000-0000-4000-8000-000000000001',
      '44444444-4444-4444-8444-444444444444',
      'how have you been',
      '/haʊ hæv juː bɪn/',
      'dạo này bạn thế nào rồi',
      'Hey! Long time no see, how have you been?',
      'Chào! Lâu quá không gặp, dạo này bạn thế nào rồi?',
      'Dùng hỏi thăm người đã quen biết từ trước (khác với "How are you" dùng chung chung).',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000002',
      '44444444-4444-4444-8444-444444444444',
      'catch up over coffee',
      '/kætʃ ʌp ˈoʊvər ˈkɔːfi/',
      'đi cà phê hàn huyên cập nhật tình hình',
      'We should definitely catch up over coffee sometime soon.',
      'Hôm nào gần đây tụi mình nhất định phải đi cà phê hàn huyên nhé.',
      'Câu kết tuyệt vời khi gặp lại bạn cũ mà cả hai đang bận chưa nói chuyện lâu được.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000003',
      '44444444-4444-4444-8444-444444444444',
      'what brings you here',
      '/wʌt brɪŋz juː hɪr/',
      'cơn gió nào đưa bạn tới đây thế',
      'It''s great to meet you! What brings you here to Vietnam?',
      'Rất vui được gặp bạn! Điều gì đưa bạn đến với Việt Nam thế?',
      'Cách mở lời cực kỳ lịch sự và tự nhiên hơn hẳn câu "Why are you here?".',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000004',
      '44444444-4444-4444-8444-444444444444',
      'rings a bell',
      '/rɪŋz ə bel/',
      'nghe quen quen',
      'His name rings a bell, but I can''t remember where we met.',
      'Tên anh ấy nghe quen lắm, nhưng tôi không nhớ đã gặp ở đâu rồi.',
      'Dùng khi ai đó nhắc tới tên người hoặc địa điểm mà bạn thấy quen quen nhưng chưa nhớ rõ.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000005',
      '44444444-4444-4444-8444-444444444444',
      'have a lot in common',
      '/hæv ə lɑːt ɪn ˈkɑːmən/',
      'có nhiều điểm chung',
      'It turns out we have a lot in common!',
      'Hóa ra chúng mình lại có nhiều điểm chung đến vậy!',
      'Tạo thiện cảm ngay lập tức khi phát hiện cả hai cùng thích một sở thích hay quan điểm.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000006',
      '44444444-4444-4444-8444-444444444444',
      'do for fun',
      '/duː fɔːr fʌn/',
      'lúc rảnh thường làm gì cho vui',
      'Outside of work, what do you usually do for fun?',
      'Ngoài giờ làm việc ra, bạn thường làm gì để giải trí?',
      'Tự nhiên hơn rất nhiều so với câu hỏi sách giáo khoa "What is your hobby?".',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000007',
      '44444444-4444-4444-8444-444444444444',
      'stay in touch',
      '/steɪ ɪn tʌtʃ/',
      'giữ liên lạc nhé',
      'Let''s exchange numbers so we can stay in touch.',
      'Mình trao đổi số điện thoại đi để còn giữ liên lạc nhé.',
      'Dùng khi chia tay người mới quen tại sự kiện, hội thảo hoặc chuyến đi.',
      1, 0, 2.5, NOW(), NULL
    )
  ON CONFLICT (id) DO NOTHING;

  PERFORM pg_notify('pgrst', 'reload schema');
END $speakflow$;
