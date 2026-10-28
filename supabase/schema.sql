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

  -- 5. SEED DATA: 4 CONVERSATIONAL DECKS + 100 HIGH-UTILITY REFLEX CARDS (25 PER DECK)
  INSERT INTO public.decks (id, title, description, icon, created_at) VALUES
    ('11111111-1111-4111-8111-111111111111', 'Phản xạ Giao tiếp Hàng ngày', 'Các cụm từ tự nhiên dùng mỗi ngày giúp bạn bật ra ý ngay lập tức, bày tỏ quan điểm, đồng tình và nhờ giúp đỡ.', 'Zap', NOW()),
    ('22222222-2222-4222-8222-222222222222', 'Tiếng Anh Công sở & Họp hành', 'Cụm từ chuyên nghiệp để báo cáo tiến độ, làm rõ vấn đề, thương lượng deadline và nhờ vả khéo léo.', 'Briefcase', NOW()),
    ('33333333-3333-4333-8333-333333333333', 'Du lịch, Ăn uống & Sân bay', 'Tình huống thực tế khi làm thủ tục bay, nhận phòng khách sạn, gọi món nhà hàng, hỏi đường và xử lý sự cố.', 'Plane', NOW()),
    ('44444444-4444-4444-8444-444444444444', 'Small Talk & Kết bạn', 'Phá băng tự nhiên, trò chuyện về sở thích, duy trì mạch hội thoại thú vị và kết nối bạn bè quốc tế.', 'Users', NOW())
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon;

  INSERT INTO public.cards (
    id, deck_id, phrase_en, ipa, meaning_vi, sentence_en, sentence_vi, context_note, box, interval_days, ease_factor, next_review_at, last_practiced_at
  ) VALUES
    -- ==========================================================================
    -- DECK 1: Phản xạ Giao tiếp Hàng ngày (25 cards)
    -- ==========================================================================
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
    (
      '10000000-0000-4000-8000-000000000009',
      '11111111-1111-4111-8111-111111111111',
      'I couldn''t agree more',
      '/aɪ ˈkʊdənt əˈɡriː mɔːr/',
      'tôi hoàn toàn đồng ý',
      'I couldn''t agree more with what you just said.',
      'Tôi hoàn toàn đồng ý với những gì bạn vừa nói.',
      'Cách nhấn mạnh sự đồng tình tuyệt đối, tự nhiên hơn nhiều so với "I very agree".',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000010',
      '11111111-1111-4111-8111-111111111111',
      'see where you''re coming from',
      '/siː wer jʊr ˈkʌmɪŋ frʌm/',
      'hiểu ý / thông cảm với góc nhìn của bạn',
      'I see where you''re coming from, but I think it''s too risky.',
      'Tôi hiểu góc nhìn của bạn, nhưng tôi nghĩ làm vậy hơi mạo hiểm.',
      'Dùng để đệm trước khi phản biện, giúp người nghe thấy được tôn trọng và không bị mất lòng.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000011',
      '11111111-1111-4111-8111-111111111111',
      'give me a hand',
      '/ɡɪv mi ə hænd/',
      'giúp tôi một tay',
      'Could you give me a hand with these heavy boxes?',
      'Bạn giúp tôi một tay bê mấy cái thùng nặng này được không?',
      'Người bản xứ rất chuộng cụm này thay vì nói "help me" khi nhờ việc vặt hàng ngày.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000012',
      '11111111-1111-4111-8111-111111111111',
      'do me a favor',
      '/duː mi ə ˈfeɪvər/',
      'giúp tôi một việc nhé',
      'Hey, could you do me a quick favor?',
      'Này, bạn giúp tôi một việc nhỏ xíu được không?',
      'Câu mở lời lịch sự trước khi nhờ bạn bè hoặc người thân làm giúp việc gì đó.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000013',
      '11111111-1111-4111-8111-111111111111',
      'don''t get me wrong',
      '/doʊnt ɡet mi rɔːŋ/',
      'đừng hiểu lầm ý tôi nhé',
      'Don''t get me wrong, I really like the idea, it just needs more time.',
      'Đừng hiểu lầm ý tôi nhé, tôi rất thích ý tưởng đó, chỉ là cần thêm thời gian thôi.',
      'Dùng để rào trước khi bạn chuẩn bị góp ý hoặc nói chữ ''nhưng'' để tránh gây hiểu nhầm.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000014',
      '11111111-1111-4111-8111-111111111111',
      'be right back',
      '/biː raɪt bæk/',
      'quay lại ngay đây',
      'Hold on a second, I''ll be right back.',
      'Đợi một chút nhé, tôi sẽ quay lại ngay đây.',
      'Dùng khi bạn cần đứng dậy nghe điện thoại hoặc đi lấy đồ một lát rồi quay lại liền.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000015',
      '11111111-1111-4111-8111-111111111111',
      'running a bit late',
      '/ˈrʌnɪŋ ə bɪt leɪt/',
      'đang tới trễ một chút',
      'Sorry, traffic is terrible so I''m running a bit late.',
      'Xin lỗi nha, kẹt xe kinh khủng quá nên tôi tới trễ một chút.',
      'Cụm cố định để nhắn tin hoặc gọi báo khi bạn đang trên đường tới điểm hẹn nhưng bị muộn.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000016',
      '11111111-1111-4111-8111-111111111111',
      'count me in',
      '/kaʊnt mi ɪn/',
      'cho tôi tham gia với',
      'You guys are going camping this weekend? Count me in!',
      'Cuối tuần này mọi người đi cắm trại hả? Cho tôi tham gia với!',
      'Ngược lại nếu không tham gia được thì bạn chỉ cần nói "Count me out".',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000017',
      '11111111-1111-4111-8111-111111111111',
      'not my cup of tea',
      '/nɑːt maɪ kʌp əv tiː/',
      'không phải gu của tôi',
      'Horror movies are really not my cup of tea.',
      'Phim kinh dị thực sự không phải là gu của tôi.',
      'Cách nói lịch sự và tinh tế thay vì chê thẳng "I don''t like it".',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000018',
      '11111111-1111-4111-8111-111111111111',
      'that makes sense',
      '/ðæt meɪks sens/',
      'nghe hợp lý đấy / thảo nào',
      'Oh, that makes sense! Now I understand why he left early.',
      'À, nghe hợp lý đấy! Giờ thì tôi hiểu sao anh ấy lại về sớm rồi.',
      'Câu phản hồi tần suất cực cao khi đối phương vừa giải thích một lý do và bạn đã hiểu ra.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000019',
      '11111111-1111-4111-8111-111111111111',
      'take your time',
      '/teɪk jʊr taɪm/',
      'cứ từ từ thôi, không cần vội',
      'There''s no rush at all, just take your time.',
      'Không có gì phải vội cả đâu, bạn cứ thong thả từ từ nhé.',
      'Dùng để trấn an ai đó khi họ đang cuống lên hoặc sợ bắt bạn phải chờ đợi.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000020',
      '11111111-1111-4111-8111-111111111111',
      'if I were in your shoes',
      '/ɪf aɪ wɜːr ɪn jʊr ʃuːz/',
      'nếu tôi ở trong hoàn cảnh của bạn',
      'If I were in your shoes, I''d probably talk to her directly.',
      'Nếu tôi ở trong hoàn cảnh của bạn, có lẽ tôi sẽ nói chuyện trực tiếp với cô ấy.',
      'Cấu trúc đưa ra lời khuyên rất tự nhiên và giàu sự đồng cảm.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000021',
      '11111111-1111-4111-8111-111111111111',
      'my bad',
      '/maɪ bæd/',
      'lỗi của tôi / tôi nhầm đấy',
      'Oops, my bad! I sent you the wrong link.',
      'Ối, lỗi của tôi! Tôi gửi nhầm đường link cho bạn mất rồi.',
      'Cách nhận lỗi nhẹ nhàng, thân mật trong giao tiếp hàng ngày khi mắc sai sót nhỏ.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000022',
      '11111111-1111-4111-8111-111111111111',
      'no big deal',
      '/noʊ bɪɡ diːl/',
      'không có gì to tát đâu',
      'Don''t worry about it, it''s really no big deal.',
      'Đừng bận tâm chuyện đó làm gì, thực sự không có gì to tát đâu.',
      'Dùng đáp lại lời xin lỗi hoặc lời cảm ơn của người khác để họ thấy thoải mái.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000023',
      '11111111-1111-4111-8111-111111111111',
      'I''m on my way',
      '/aɪm ɑːn maɪ weɪ/',
      'tôi đang trên đường tới rồi',
      'Save me a seat, I''m on my way right now!',
      'Giữ chỗ cho tôi nhé, giờ tôi đang trên đường tới rồi!',
      'Đừng nói "I am coming there", người bản xứ luôn nói "I''m on my way".',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000024',
      '11111111-1111-4111-8111-111111111111',
      'let me know',
      '/let mi noʊ/',
      'báo cho tôi biết nhé',
      'Just let me know if you need anything else.',
      'Cứ báo cho tôi biết nếu bạn cần thêm bất cứ thứ gì nhé.',
      'Cụm từ vạn năng dùng ở cuối cuộc trò chuyện hoặc tin nhắn hàng ngày.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '10000000-0000-4000-8000-000000000025',
      '11111111-1111-4111-8111-111111111111',
      'fingers crossed',
      '/ˈfɪŋɡərz krɔːst/',
      'cầu mong mọi chuyện suôn sẻ',
      'I have my job interview tomorrow morning—fingers crossed!',
      'Sáng mai tôi có buổi phỏng vấn xin việc rồi, cầu mong mọi chuyện suôn sẻ!',
      'Bắt nguồn từ cử chỉ đan chéo hai ngón tay để cầu may mắn ở phương Tây.',
      1, 0, 2.5, NOW(), NULL
    ),

    -- ==========================================================================
    -- DECK 2: Tiếng Anh Công sở & Họp hành (25 cards)
    -- ==========================================================================
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
    (
      '20000000-0000-4000-8000-000000000009',
      '22222222-2222-4222-8222-222222222222',
      'bring you up to speed',
      '/brɪŋ juː ʌp tə spiːd/',
      'cập nhật nhanh tình hình mới nhất cho bạn',
      'Let me bring you up to speed on what happened in yesterday''s meeting.',
      'Để tôi cập nhật nhanh cho bạn những gì đã diễn ra trong cuộc họp hôm qua nhé.',
      'Dùng khi có thành viên mới vào dự án hoặc đồng nghiệp vừa nghỉ phép quay lại.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000010',
      '22222222-2222-4222-8222-222222222222',
      'push back the deadline',
      '/pʊʃ bæk ðə ˈdedlaɪn/',
      'lùi hạn chót (deadline)',
      'Can we push back the deadline by a couple of days?',
      'Chúng ta có thể lùi thời hạn hoàn thành lại vài ngày được không?',
      'Dùng khi thương lượng xin dời lịch nộp bài hoặc giao dự án vì phát sinh việc.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000011',
      '22222222-2222-4222-8222-222222222222',
      'have a lot on my plate',
      '/hæv ə lɑːt ɑːn maɪ pleɪt/',
      'đang ôm nhiều việc quá',
      'I already have a lot on my plate this week.',
      'Tuần này tôi đã đang ôm quá nhiều việc cần giải quyết rồi.',
      'Cách diễn đạt hình ảnh và chuyên nghiệp khi báo cáo khối lượng công việc hiện tại.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000012',
      '22222222-2222-4222-8222-222222222222',
      'run this by you',
      '/rʌn ðɪs baɪ juː/',
      'tham khảo ý kiến bạn về việc này một chút',
      'Do you have a minute? I''d like to run this idea by you.',
      'Bạn có rảnh một phút không? Tôi muốn tham khảo ý kiến bạn về ý tưởng này.',
      'Cực kỳ hữu ích khi muốn trình bày nhanh với sếp hoặc đồng nghiệp để xin phản hồi.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000013',
      '22222222-2222-4222-8222-222222222222',
      'get back to you',
      '/ɡet bæk tə juː/',
      'phản hồi lại cho bạn sau',
      'Let me double-check the numbers and get back to you this afternoon.',
      'Để tôi kiểm tra kỹ lại các con số rồi sẽ phản hồi cho bạn vào chiều nay nhé.',
      'Câu cứu cánh chuyên nghiệp khi được hỏi thông tin bạn chưa nắm chắc ngay trong cuộc họp.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000014',
      '22222222-2222-4222-8222-222222222222',
      'walk me through',
      '/wɔːk mi θruː/',
      'hướng dẫn / giải thích từng bước giúp tôi',
      'Could you walk me through how this new workflow operates?',
      'Bạn có thể giải thích từng bước giúp tôi quy trình mới này vận hành thế nào không?',
      'Hay hơn rất nhiều so với "explain to me" khi nhờ đồng nghiệp chỉ dẫn quy trình, báo cáo hay code.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000015',
      '22222222-2222-4222-8222-222222222222',
      'on track',
      '/ɑːn træk/',
      'đúng tiến độ / đi đúng hướng',
      'Everything is on track for the product launch next month.',
      'Mọi thứ đều đang đúng tiến độ cho đợt ra mắt sản phẩm vào tháng tới.',
      'Ngược lại với đúng tiến độ là "off track" hoặc "behind schedule".',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000016',
      '22222222-2222-4222-8222-222222222222',
      'put on the back burner',
      '/pʊt ɑːn ðə bæk ˈbɜːrnər/',
      'tạm gác lại (để ưu tiên việc khác)',
      'We''ll have to put this feature on the back burner for now.',
      'Hiện tại chúng ta sẽ phải tạm gác tính năng này lại để ưu tiên việc khác trước.',
      'Dùng trong họp kế hoạch khi quyết định hoãn một hạng mục chưa cấp bách.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000017',
      '22222222-2222-4222-8222-222222222222',
      'give the green light',
      '/ɡɪv ðə ɡriːn laɪt/',
      'bật đèn xanh / phê duyệt cho làm',
      'Management finally gave us the green light to start hiring.',
      'Ban giám đốc cuối cùng đã bật đèn xanh cho phép chúng ta bắt đầu tuyển dụng.',
      'Dùng khi sếp hoặc khách hàng chính thức duyệt ngân sách hoặc kế hoạch.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000018',
      '22222222-2222-4222-8222-222222222222',
      'iron out the details',
      '/ˈaɪərn aʊt ðə ˈdiːteɪlz/',
      'thống nhất và giải quyết nốt các chi tiết nhỏ',
      'The main contract is ready, we just need to iron out the details.',
      'Hợp đồng chính đã xong xuôi, chúng ta chỉ cần thống nhất nốt mấy chi tiết nhỏ thôi.',
      'Hình ảnh chiếc bàn ủi làm phẳng các nếp nhăn (vướng mắc nhỏ) cuối cùng của thỏa thuận.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000019',
      '22222222-2222-4222-8222-222222222222',
      'cut corners',
      '/kʌt ˈkɔːrnərz/',
      'làm ẩu / đốt cháy giai đoạn để tiết kiệm',
      'We shouldn''t cut corners when it comes to security.',
      'Chúng ta tuyệt đối không nên làm ẩu đốt cháy giai đoạn đối với vấn đề bảo mật.',
      'Dùng khi cảnh báo đội ngũ không vì chạy theo thời gian hay chi phí mà làm giảm chất lượng.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000020',
      '22222222-2222-4222-8222-222222222222',
      'from scratch',
      '/frʌm skrætʃ/',
      'làm lại từ đầu / từ con số 0',
      'The old code was too messy, so we built the app from scratch.',
      'Mã nguồn cũ rối rắm quá nên chúng tôi đã xây dựng lại ứng dụng từ con số 0.',
      'Rất hay dùng trong công nghệ, kinh doanh và cả nấu ăn (tự làm từ nguyên liệu thô).',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000021',
      '22222222-2222-4222-8222-222222222222',
      'take the lead',
      '/teɪk ðə liːd/',
      'đứng ra dẫn dắt / chịu trách nhiệm chính',
      'Would you be willing to take the lead on this new campaign?',
      'Bạn có sẵn sàng đứng ra chịu trách nhiệm chính cho chiến dịch mới này không?',
      'Dùng khi phân công người chủ trì dự án hoặc nhiệm vụ trong nhóm.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000022',
      '22222222-2222-4222-8222-222222222222',
      'keep it brief',
      '/kiːp ɪt briːf/',
      'nói ngắn gọn thôi',
      'I know everyone is busy, so I''ll keep it brief.',
      'Tôi biết mọi người đều bận cả nên tôi sẽ trình bày ngắn gọn thôi.',
      'Câu mở đầu bài phát biểu hoặc báo cáo giúp người nghe tập trung và thiện cảm ngay.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000023',
      '22222222-2222-4222-8222-222222222222',
      'up in the air',
      '/ʌp ɪn ðə er/',
      'vẫn còn bỏ ngỏ / chưa chốt được',
      'The exact launch date is still up in the air.',
      'Ngày ra mắt chính xác hiện tại vẫn còn bỏ ngỏ chưa chốt được.',
      'Dùng khi một kế hoạch hoặc quyết định vẫn đang chờ duyệt, chưa có kết luận.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000024',
      '22222222-2222-4222-8222-222222222222',
      'bottleneck',
      '/ˈbɑːtəlnek/',
      'điểm nghẽn làm chậm tiến độ',
      'Waiting for legal approval is our biggest bottleneck right now.',
      'Việc chờ bên pháp chế phê duyệt đang là điểm nghẽn lớn nhất của chúng ta lúc này.',
      'Thuật ngữ quản lý dự án cực kỳ phổ biến khi báo cáo nguyên nhân gây tắc nghẽn quy trình.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '20000000-0000-4000-8000-000000000025',
      '22222222-2222-4222-8222-222222222222',
      'give you a heads-up',
      '/ɡɪv juː ə ˈhedz ʌp/',
      'báo trước một tiếng để bạn chuẩn bị',
      'Just wanted to give you a heads-up that the client might join the call.',
      'Tôi chỉ muốn báo trước cho bạn một tiếng là khách hàng có thể sẽ tham gia cuộc gọi đấy.',
      'Dùng khi nhắn tin hoặc nói nhỏ báo trước cho đồng nghiệp một thông tin quan trọng.',
      1, 0, 2.5, NOW(), NULL
    ),

    -- ==========================================================================
    -- DECK 3: Du lịch, Ăn uống & Sân bay (25 cards)
    -- ==========================================================================
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
    (
      '30000000-0000-4000-8000-000000000008',
      '33333333-3333-4333-8333-333333333333',
      'table for two',
      '/ˈteɪbəl fɔːr tuː/',
      'bàn cho hai người',
      'Hi, could we get a table for two near the window?',
      'Chào bạn, cho tụi mình xin một bàn hai người gần cửa sổ được không?',
      'Câu đầu tiên nói với nhân viên đón khách (host) khi bước vào nhà hàng.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000009',
      '33333333-3333-4333-8333-333333333333',
      'what do you recommend',
      '/wʌt duː juː ˌrekəˈmend/',
      'bạn gợi ý món nào ngon nhất',
      'It''s my first time here—what do you recommend?',
      'Lần đầu tiên tôi đến quán này, bạn gợi ý món nào ngon nhất?',
      'Giúp bạn chọn được món tủ (signature dish) của nhà hàng địa phương khi đi du lịch.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000010',
      '33333333-3333-4333-8333-333333333333',
      'have it to go',
      '/hæv ɪt tə ɡoʊ/',
      'mua mang đi',
      'Could I have this coffee to go, please?',
      'Cho tôi ly cà phê này mang đi nhé?',
      'Ở Mỹ dùng "for here or to go?", còn ở Anh/Úc thường dùng "eat in or takeaway?".',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000011',
      '33333333-3333-4333-8333-333333333333',
      'on the side',
      '/ɑːn ðə saɪd/',
      'để riêng ra bên cạnh',
      'Could I have the salad with the dressing on the side?',
      'Cho tôi gọi món salad nhưng phần nước sốt để riêng ra nhé?',
      'Rất tiện khi gọi món mà bạn muốn tự gia giảm nước sốt, ớt hoặc đá riêng.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000012',
      '33333333-3333-4333-8333-333333333333',
      'I''ll have the same',
      '/aɪl hæv ðə seɪm/',
      'cho tôi món giống hệt vậy',
      'That pasta sounds delicious, I''ll have the same.',
      'Món mì Ý đó nghe ngon đấy, cho tôi một phần giống hệt vậy nhé.',
      'Cách gọi món cực nhanh khi bạn đi cùng vừa chọn xong món bạn cũng thích.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000013',
      '33333333-3333-4333-8333-333333333333',
      'allergic to',
      '/əˈlɜːrdʒɪk tuː/',
      'bị dị ứng với',
      'Does this dish contain peanuts? I''m severely allergic to them.',
      'Món này có đậu phộng không ạ? Tôi bị dị ứng nặng với đậu phộng.',
      'Cấu trúc quan trọng để bảo vệ sức khỏe khi ăn uống ở nước ngoài.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000014',
      '33333333-3333-4333-8333-333333333333',
      'grab the check',
      '/ɡræb ðə tʃek/',
      'lấy hóa đơn thanh toán',
      'Excuse me, could we grab the check whenever you''re ready?',
      'Xin lỗi, khi nào tiện bạn cho tụi mình xin hóa đơn thanh toán nhé?',
      'Người Mỹ dùng "check", người Anh dùng "bill". Kèm câu "whenever you''re ready" nghe cực kỳ lịch sự.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000015',
      '33333333-3333-4333-8333-333333333333',
      'leave my bags here',
      '/liːv maɪ bæɡz hɪr/',
      'gửi tạm hành lý ở đây',
      'Can I leave my bags here for a few hours after checking out?',
      'Sau khi trả phòng tôi có thể gửi tạm hành lý ở đây vài tiếng được không ạ?',
      'Dùng ở quầy lễ tân khách sạn khi bạn trả phòng buổi trưa nhưng tối mới ra sân bay.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000016',
      '33333333-3333-4333-8333-333333333333',
      'complimentary breakfast',
      '/ˌkɑːmplɪˈmentri ˈbrekfəst/',
      'bữa sáng miễn phí đi kèm phòng',
      'What time is the complimentary breakfast served in the morning?',
      'Bữa sáng miễn phí của khách sạn được phục vụ lúc mấy giờ sáng vậy ạ?',
      'Khách sạn quốc tế luôn dùng từ "complimentary" thay cho "free".',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000017',
      '33333333-3333-4333-8333-333333333333',
      'acting up',
      '/ˈæktɪŋ ʌp/',
      'bị giở chứng / hoạt động chập chờn',
      'The air conditioner in my room is acting up again.',
      'Cái máy lạnh trong phòng tôi lại bị giở chứng chập chờn nữa rồi.',
      'Dùng khi báo lễ tân về thiết bị (Wi-Fi, điều hòa, khóa từ) hoạt động không ổn định.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000018',
      '33333333-3333-4333-8333-333333333333',
      'connecting flight',
      '/kəˈnektɪŋ flaɪt/',
      'chuyến bay nối chuyến',
      'We need to hurry or we''re going to miss our connecting flight!',
      'Chúng ta phải nhanh lên nếu không sẽ bị lỡ chuyến bay nối chuyến mất!',
      'Dùng khi quá cảnh (layover/transit) ở sân bay quốc tế để bay tiếp chặng thứ hai.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000019',
      '33333333-3333-4333-8333-333333333333',
      'baggage claim',
      '/ˈbæɡɪdʒ kleɪm/',
      'khu vực băng chuyền nhận hành lý',
      'Could you tell me which way it is to the baggage claim area?',
      'Bạn cho tôi hỏi lối nào đi ra khu vực băng chuyền nhận hành lý ký gửi ạ?',
      'Điểm đến ngay sau khi bạn làm xong thủ tục nhập cảnh (immigration).',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000020',
      '33333333-3333-4333-8333-333333333333',
      'drop me off',
      '/drɑːp mi ɔːf/',
      'cho tôi xuống xe ở...',
      'You can just drop me off right in front of that coffee shop.',
      'Bác tài cứ cho tôi xuống xe ngay trước quán cà phê kia là được ạ.',
      'Dùng khi đi taxi/Uber. Đón lên xe là "pick me up", cho xuống xe là "drop me off".',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000021',
      '33333333-3333-4333-8333-333333333333',
      'headed the right way',
      '/ˈhedɪd ðə raɪt weɪ/',
      'đang đi đúng hướng',
      'Excuse me, am I headed the right way for the central museum?',
      'Xin lỗi cho tôi hỏi, tôi đang đi hướng này tới bảo tàng trung tâm có đúng không ạ?',
      'Câu hỏi xác nhận phương hướng cực nhanh khi bạn đang vừa đi bộ vừa dò bản đồ.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000022',
      '33333333-3333-4333-8333-333333333333',
      'get off at the next stop',
      '/ɡet ɔːf æt ðə nekst stɑːp/',
      'xuống xe ở trạm tiếp theo',
      'Get ready, we need to get off at the next stop.',
      'Chuẩn bị nhé, chúng mình cần xuống tàu ở trạm tiếp theo đấy.',
      'Đi tàu điện, xe buýt thì lên xe là "get on", xuống xe là "get off".',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000023',
      '33333333-3333-4333-8333-333333333333',
      'tourist trap',
      '/ˈtʊrɪst træp/',
      'chỗ chặt chém khách du lịch',
      'Let''s avoid that street, it''s a total tourist trap.',
      'Mình né con phố đó ra đi, toàn là mấy quán chặt chém khách du lịch thôi.',
      'Cụm từ người bản xứ dùng chỉ nơi đông khách du lịch nhưng giá đắt và kém chất lượng.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000024',
      '33333333-3333-4333-8333-333333333333',
      'off the beaten path',
      '/ɔːf ðə ˈbiːtən pæθ/',
      'nơi hoang sơ ít khách du lịch biết tới',
      'I prefer exploring small towns that are off the beaten path.',
      'Tôi thích khám phá những thị trấn nhỏ yên bình ít khách du lịch biết tới hơn.',
      'Dùng khi nhờ người địa phương giới thiệu những quán ăn hoặc địa điểm ẩn mình thú vị.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '30000000-0000-4000-8000-000000000025',
      '33333333-3333-4333-8333-333333333333',
      'make a reservation',
      '/meɪk ə ˌrezərˈveɪʃən/',
      'đặt bàn / đặt chỗ trước',
      'Do we need to make a reservation in advance for Friday night?',
      'Tối thứ Sáu tụi mình có cần phải đặt bàn trước không bạn?',
      'Trong nhà hàng dùng "make a reservation", nếu đã đặt rồi thì nói "I have a reservation under [tên]".',
      1, 0, 2.5, NOW(), NULL
    ),

    -- ==========================================================================
    -- DECK 4: Small Talk & Kết bạn (25 cards)
    -- ==========================================================================
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
    ),
    (
      '40000000-0000-4000-8000-000000000008',
      '44444444-4444-4444-8444-444444444444',
      'what do you do for a living',
      '/wʌt duː juː duː fɔːr ə ˈlɪvɪŋ/',
      'bạn làm nghề gì',
      'So, what do you do for a living?',
      'Thế hiện tại bạn đang làm công việc gì?',
      'Lịch sự và tự nhiên hơn rất nhiều so với câu hỏi cụt lủn "What is your job?".',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000009',
      '44444444-4444-4444-8444-444444444444',
      'really into',
      '/ˈrɪəli ˈɪntuː/',
      'rất đam mê / cực kỳ thích',
      'Lately, I''ve been really into trail running and photography.',
      'Dạo gần đây tôi cực kỳ đam mê chạy bộ địa hình và nhiếp ảnh.',
      'Dùng "I''m really into..." để kể về sở thích nghe hiện đại và tràn đầy hào hứng.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000010',
      '44444444-4444-4444-8444-444444444444',
      'small world',
      '/smɔːl wɜːrld/',
      'trái đất tròn thật đấy',
      'You went to the same university as my sister? What a small world!',
      'Bạn học cùng trường đại học với chị gái tôi á? Đúng là trái đất tròn thật!',
      'Câu cảm thán kinh điển khi phát hiện sự trùng hợp bất ngờ lúc làm quen.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000011',
      '44444444-4444-4444-8444-444444444444',
      'how was your weekend',
      '/haʊ wəz jʊr ˈwiːkend/',
      'cuối tuần vừa rồi của bạn thế nào',
      'Morning! How was your weekend? Did you do anything fun?',
      'Chào buổi sáng! Cuối tuần vừa rồi của bạn thế nào, có đi đâu chơi vui không?',
      'Câu mở đầu small talk hoàn hảo vào sáng thứ Hai với đồng nghiệp hoặc đối tác.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000012',
      '44444444-4444-4444-8444-444444444444',
      'can''t complain',
      '/kænt kəmˈpleɪn/',
      'mọi thứ vẫn ổn cả, không có gì phàn nàn',
      'Things have been pretty busy, but I can''t complain.',
      'Mọi thứ cũng khá bận rộn, nhưng nhìn chung vẫn ổn cả.',
      'Cách trả lời khiêm tốn, tích cực của người bản xứ khi được hỏi thăm sức khỏe và công việc.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000013',
      '44444444-4444-4444-8444-444444444444',
      'hit it off',
      '/hɪt ɪt ɔːf/',
      'nói chuyện hợp cạ ngay từ đầu',
      'We met at a conference and immediately hit it off.',
      'Tụi mình gặp nhau ở một buổi hội thảo và nói chuyện hợp cạ ngay từ đầu.',
      'Dùng để miêu tả hai người vừa mới gặp lần đầu đã cực kỳ ăn ý và thân thiết.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000014',
      '44444444-4444-4444-8444-444444444444',
      'speaking of which',
      '/ˈspiːkɪŋ əv wɪtʃ/',
      'nhân tiện nhắc tới chuyện đó',
      'I love Japanese food! Speaking of which, have you tried that new ramen place?',
      'Tôi mê đồ Nhật lắm! Nhân tiện nhắc tới chuyện đó, bạn đã thử quán ramen mới mở chưa?',
      'Cầu nối tuyệt vời để chuyển ý mượt mà và giữ cho cuộc trò chuyện không bị ngắt quãng.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000015',
      '44444444-4444-4444-8444-444444444444',
      'that reminds me',
      '/ðæt rɪˈmaɪndz mi/',
      'bạn nói làm tôi mới nhớ ra',
      'Oh, that reminds me—I have a book I wanted to lend you.',
      'Ồ, bạn nói làm tôi mới nhớ ra là tôi có cuốn sách muốn cho bạn mượn.',
      'Dùng khi lời nói của đối phương vô tình gợi cho bạn nhớ tới một câu chuyện liên quan.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000016',
      '44444444-4444-4444-8444-444444444444',
      'born and raised',
      '/bɔːrn ænd reɪzd/',
      'sinh ra và lớn lên',
      'I was born and raised in Hanoi, then moved to Saigon for work.',
      'Tôi sinh ra và lớn lên ở Hà Nội, sau đó chuyển vào Sài Gòn làm việc.',
      'Cụm từ cố định rất hay khi giới thiệu bản thân và quê quán với bạn mới.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000017',
      '44444444-4444-4444-8444-444444444444',
      'night owl',
      '/naɪt aʊl/',
      'cú đêm / người hay thức khuya',
      'I''m definitely a night owl—I do my best work after midnight.',
      'Tôi đích thị là một cú đêm, tôi làm việc hiệu quả nhất là sau nửa đêm.',
      'Trái nghĩa với "night owl" là "early bird" (người thích dậy sớm).',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000018',
      '44444444-4444-4444-8444-444444444444',
      'binge-watch',
      '/ˈbɪndʒ wɑːtʃ/',
      'cày phim liền tù tì nhiều tập',
      'I stayed home all Sunday and binge-watched a new series on Netflix.',
      'Tôi ở nhà nguyên ngày Chủ nhật để cày liền tù tì một bộ phim mới trên Netflix.',
      'Chủ đề phim ảnh luôn là cách dễ nhất để bắt chuyện với bạn bè quốc tế.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000019',
      '44444444-4444-4444-8444-444444444444',
      'blow off some steam',
      '/bloʊ ɔːf sʌm stiːm/',
      'xả hơi / giải tỏa căng thẳng',
      'I usually go to the gym after work to blow off some steam.',
      'Sau giờ làm tôi thường đến phòng tập gym để giải tỏa căng thẳng.',
      'Dùng khi chia sẻ về cách bạn thư giãn sau những giờ làm việc áp lực.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000020',
      '44444444-4444-4444-8444-444444444444',
      'tell me more about',
      '/tel mi mɔːr əˈbaʊt/',
      'kể thêm cho tôi nghe về... đi',
      'That sounds fascinating! Tell me more about your trip to Japan.',
      'Nghe cuốn hút thật đấy! Kể thêm cho tôi nghe về chuyến đi Nhật của bạn đi.',
      'Bí quyết vàng trong giao tiếp: khuyến khích người đối diện chia sẻ thêm về điều họ hào hứng.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000021',
      '44444444-4444-4444-8444-444444444444',
      'good for you',
      '/ɡʊd fɔːr juː/',
      'mừng cho bạn quá / bạn giỏi thật đấy',
      'You finally started your own business? Good for you!',
      'Cuối cùng bạn cũng mở công ty riêng rồi hả? Mừng cho bạn quá!',
      'Câu khen ngợi và chúc mừng chân thành khi nghe bạn bè khoe một thành tựu mới.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000022',
      '44444444-4444-4444-8444-444444444444',
      'how did you get into',
      '/haʊ dɪd juː ɡet ˈɪntuː/',
      'cơ duyên nào đưa bạn đến với...',
      'How did you get into software engineering in the first place?',
      'Cơ duyên nào lúc đầu lại đưa bạn đến với ngành kỹ sư phần mềm thế?',
      'Câu hỏi sâu sắc giúp cuộc trò chuyện vượt qua mức xã giao thông thường.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000023',
      '44444444-4444-4444-8444-444444444444',
      'are you on Instagram',
      '/ɑːr juː ɑːn ˈɪnstəɡræm/',
      'bạn có dùng Instagram không',
      'Hey, are you on Instagram or LinkedIn? Let''s connect!',
      'Này, bạn có dùng Instagram hay LinkedIn không? Mình kết nối nhé!',
      'Người bản xứ dùng giới từ "on" cho mạng xã hội ("on Facebook", "on LinkedIn") thay vì "use".',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000024',
      '44444444-4444-4444-8444-444444444444',
      'lost track of time',
      '/lɔːst træk əv taɪm/',
      'mải mê quá quên cả giờ giấc',
      'We were having such a great chat that I completely lost track of time!',
      'Tụi mình nói chuyện vui quá làm tôi hoàn toàn quên béng cả giờ giấc!',
      'Lời khen gián tiếp cực kỳ duyên dáng khi bạn cần kết thúc cuộc trò chuyện vì đã muộn.',
      1, 0, 2.5, NOW(), NULL
    ),
    (
      '40000000-0000-4000-8000-000000000025',
      '44444444-4444-4444-8444-444444444444',
      'it was great talking to you',
      '/ɪt wəz ɡreɪt ˈtɔːkɪŋ tə juː/',
      'nói chuyện với bạn thật sự rất vui',
      'I have to head out now, but it was great talking to you!',
      'Giờ tôi phải đi rồi, nhưng nói chuyện với bạn hôm nay thật sự rất vui!',
      'Lưu ý dùng thì quá khứ "It was..." ở cuối buổi gặp để khép lại cuộc hội thoại một cách lịch thiệp.',
      1, 0, 2.5, NOW(), NULL
    )
  ON CONFLICT (id) DO UPDATE SET
    phrase_en = EXCLUDED.phrase_en,
    ipa = EXCLUDED.ipa,
    meaning_vi = EXCLUDED.meaning_vi,
    sentence_en = EXCLUDED.sentence_en,
    sentence_vi = EXCLUDED.sentence_vi,
    context_note = EXCLUDED.context_note;

  PERFORM pg_notify('pgrst', 'reload schema');
END $speakflow$;
