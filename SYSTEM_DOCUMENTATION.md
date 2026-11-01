# TÀI LIỆU KIẾN TRÚC & HƯỚNG DẪN HỆ THỐNG SPEAKFLOW (SYSTEM DOCUMENTATION)

> **Dành cho AI / Kỹ sư phần mềm tiếp nhận nghiên cứu & phát triển tiếp theo.**  
> Tài liệu này tổng hợp toàn bộ bức tranh kiến trúc, cấu trúc thư mục, mô hình dữ liệu, các luồng nghiệp vụ cốt lõi, thuật toán và hướng dẫn mở rộng của hệ thống **SpeakFlow**.

---

## 1. TỔNG QUAN DỰ ÁN (EXECUTIVE OVERVIEW)

- **Tên dự án**: SpeakFlow
- **Mục tiêu**: Nền tảng học giao tiếp tiếng Anh qua phản xạ chủ động (**Active Recall**), lặp lại ngắt quãng (**Spaced Repetition System - SRS Leitner 5 hộp & SM-2**), luyện phát âm theo ngữ cảnh (**Shadowing**) bằng Web Speech API và thử thách phản xạ nhanh 60 giây (**60s Reflex Drill**).
- **Ngăn xếp công nghệ (Tech Stack)**:
  - **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React 18, TypeScript 5)
  - **Giao diện & Hoạt họa**: [Tailwind CSS 3](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/)
  - **Cơ sở dữ liệu & Xác thực**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Row Level Security - RLS)
  - **Kiến trúc dữ liệu**: **Offline-first Dual Storage** (hoạt động trơn tru cả khi không có mạng thông qua `localStorage`, tự động đồng bộ hai chiều với Supabase khi kết nối).
  - **Âm thanh & Giọng nói**: Web Speech Recognition API (chấm điểm phát âm trực tiếp từng từ), Web Speech Synthesis (Text-To-Speech đa tốc độ 1.0x & 0.75x).
  - **Analytics**: Google Analytics 4 (`G-DN1CBCYRJH`).

---

## 2. CẤU TRÚC THƯ MỤC VÀ TỆP TIN (PROJECT STRUCTURE)

```
E:\Code\Giao tiếp tiếng anh\
├── app\                                # Next.js 14 App Router
│   ├── layout.tsx                      # Root Layout tích hợp font, GA4, AppLayoutShell
│   ├── globals.css                     # Cấu hình Tailwind, CSS variables, animation 3D card
│   ├── page.tsx                        # Trang chủ Dashboard (Tiến độ hôm nay, Streak, Chủ đề)
│   ├── study\page.tsx                  # Màn hình học Flashcard 3D + Shadowing + SRS Rating
│   ├── reflex\page.tsx                 # Màn hình Luyện phản xạ 60 giây (Auto-listening 7s/câu)
│   ├── manage\page.tsx                 # Quản lý kho thẻ (Tạo câu lẻ, Import CSV/JSON, Lọc thẻ)
│   ├── deck\[id]\page.tsx              # Trang xem chi tiết bộ thẻ chia sẻ & Clone về kho cá nhân
│   ├── roleplay\page.tsx               # Màn hình thực hành giao tiếp theo vai (Roleplay scenarios)
│   ├── profile\page.tsx                # Hồ sơ cá nhân, biểu đồ năng lực, danh sách từ phát âm sai
│   ├── admin\page.tsx                  # Bảng điều khiển Quản trị viên (Quản lý học viên, khóa tài khoản)
│   ├── login\page.tsx                  # Đăng nhập (Google OAuth, Email/Password, Tài khoản Demo)
│   └── auth\callback\page.tsx          # Xử lý OAuth callback từ Supabase Auth
│
├── components\                         # Các thành phần giao diện tái sử dụng
│   ├── TopHeaderBar.tsx                # Thanh điều hướng trên cùng (Logo, Streak pill, Đổi theme, Avatar)
│   ├── BottomNav.tsx                   # Thanh điều hướng di động chân trang (5 tabs)
│   ├── AppLayoutShell.tsx              # Bọc bố cục Responsive (Header, Content, BottomNav)
│   ├── LevelSelectorModal.tsx          # Modal chọn trình độ CEFR (A1-C2 & 🎲 Lộn xộn)
│   ├── AuthModal.tsx                   # Modal đăng nhập nhanh
│   ├── AccountLockScreen.tsx           # Màn hình chặn truy cập khi tài khoản bị khóa
│   ├── admin\
│   │   └── StudentDetailModal.tsx      # Modal xem chi tiết phân tích học tập của học viên
│   └── manage\
│       ├── CreateDeckModal.tsx         # Modal tạo bộ thẻ cá nhân mới
│       └── DeckCardItem.tsx            # Card hiển thị bộ thẻ (Tiến độ, Phân quyền, Nút học)
│
├── lib\                                # Lớp xử lý dữ liệu và thuật toán cốt lõi
│   ├── dataService.ts                  # Toàn bộ dịch vụ CRUD dữ liệu, đồng bộ Supabase & LocalStorage
│   ├── srs.ts                          # Thuật toán Spaced Repetition (SuperMemo-2 + 5 Hộp Leitner)
│   ├── speech.ts                       # Nhận diện giọng nói, đo Levenshtein similarity, TTS âm thanh
│   └── seedData.ts                     # 108 câu mẫu chuẩn CEFR A1-C2, 6 bộ chủ đề hệ thống
│
├── scripts\
│   ├── fs-patch.cjs                    # Node.js fs monkey-patch tương thích Windows runtime
│   └── generate_seed_data.cjs          # Script sinh tự động seedData.ts & supabase/schema.sql
│
├── supabase\
│   └── schema.sql                      # SQL DDL tạo bảng, RLS, chỉ mục, dữ liệu mẫu ban đầu
│
├── package.json                        # Dependencies và Scripts chạy dự án
├── tailwind.config.js                  # Cấu hình màu sắc, theme (Emerald, Sky, Coral)
└── tsconfig.json                       # Cấu hình TypeScript
```

---

## 3. CÁC TÍNH NĂNG VÀ NGHIỆP VỤ CỐT LÕI (CORE FEATURES)

### 3.1. Hệ thống trình độ CEFR (A1 đến C2 & 🎲 Lộn xộn)
- **Chuẩn CEFR 6 cấp độ**:
  - `A1 - Cơ bản (Beginner)`: Mẫu câu sinh tồn & giao tiếp tối giản hàng ngày.
  - `A2 - Sơ cấp (Elementary)`: Câu tình huống thông dụng & trao đổi quen thuộc.
  - `B1 - Trung cấp (Intermediate)`: Giao tiếp công sở & xử lý tình huống tự nhiên.
  - `B2 - Trung cao cấp (Upper-Intermediate)`: Diễn đạt trôi chảy, sử dụng phrasal verbs tự nhiên.
  - `C1 - Cao cấp (Advanced)`: Cụm từ thành ngữ, sắc thái chuyên nghiệp, văn phong bản xứ.
  - `C2 - Thành thạo (Mastery)`: Thành ngữ phức tạp, sắc thái tinh tế ngang người bản ngữ.
- **🎲 Chế độ Lộn xộn (Mixed Shuffle)**:
  - Áp dụng thuật toán **Fisher-Yates shuffle** xáo trộn toàn bộ câu hỏi ngẫu nhiên mỗi lần bắt đầu hoặc khi bấm *"Ôn lại bộ này"*.
- **LevelSelectorModal (`components/LevelSelectorModal.tsx`)**:
  - Tự động bật lên khi người dùng bấm *"Bắt đầu học"*, *"Luyện phản xạ 60s"*, hoặc nhấp vào bất kỳ thẻ Chủ đề nào.
  - Đếm số lượng câu thực tế của từng cấp độ trong bộ thẻ (ví dụ `B1 (3 câu)`).
  - Tự động làm mờ và chặn các cấp độ có 0 câu, kèm nút bấm chuyển sang chế độ Lộn xộn để tránh màn hình trống.
- **Thanh Quick-Filter CEFR trong phiên học**:
  - Đặt ngay trên đầu màn hình học, cho phép học viên đổi cấp độ tức thì kèm số câu theo thời gian thực.
  - Huy hiệu CEFR hiển thị màu sắc đồng bộ trên cả 2 mặt thẻ flashcard.

### 3.2. Màn hình học Flashcard 3D & Shadowing (`/study`)
- **Mặt trước (Active Recall)**:
  - Hiển thị nghĩa tiếng Việt và cụm từ trọng tâm.
  - Ẩn câu tiếng Anh, buộc người dùng tự nhớ lại và nói to.
  - Phím tắt `H`: Gợi ý chữ cái đầu của câu và cụm từ trọng tâm (`generateFirstLetterHint`).
  - Phím tắt `Space`: Lật thẻ 3D xem đáp án.
- **Mặt sau (Đáp án, Audio & Shadowing)**:
  - Tự động phát âm thanh bản xứ tốc độ chuẩn 1.0x khi lật.
  - Nút phát chậm 0.75x (Phím `S`) và phát chuẩn 1.0x (Phím `R`).
  - Đánh dấu từ trọng tâm (`renderHighlightedSentence`), kèm phiên âm IPA, ghi chú ngữ cảnh và các biến thể giao tiếp.
- **Phòng thu Shadowing (Luyện phát âm giọng nói)**:
  - Bấm phím `M` để bật mic thu âm. Hỗ trợ hiển thị kết quả nhận diện thời gian thực (Interim results).
  - Phân tích từ nối tiếp: Báo **Xanh lá** cho từ phát âm chuẩn, **Đỏ gạch chân lượn sóng** cho từ phát âm sai hoặc bị sót.
  - **Chạm vào từng từ màu đỏ** để nghe hệ thống đọc chậm riêng từ đó.
- **Đánh giá SRS 4 mức độ (Phím 1–4)**:
  - `1. Quên (Again)`: Chuyển về Hộp 1, ôn lại trong 10 phút.
  - `2. Ngập ngừng (Hard)`: Giảm hệ số Ease, giữ khoảng cách ôn tập ngắn.
  - `3. Nhớ được (Good)`: Tăng khoảng cách ôn tập theo chu kỳ Leitner.
  - `4. Phản xạ ngay (Easy)`: Tăng mạnh khoảng cách ôn tập và tăng hộp nhớ.

### 3.3. Thử thách phản xạ nhanh 60 giây (`/reflex`)
- Bộ đếm ngược toàn phiên 60 giây + Đếm ngược 7 giây cho mỗi câu.
- Hệ thống tự động kích hoạt Micro ngay khi câu mới xuất hiện.
- Nếu học viên nói đúng trên 70% độ chính xác: Hệ thống tự động nhảy câu tiếp theo ngay lập tức.
- Bảng tổng kết chi tiết: Số câu đạt, tốc độ phản xạ trung bình (giây/câu), tỷ lệ chính xác, và danh sách phân tích từng từ để nghe lại.

### 3.4. Cơ chế Streak (Chuỗi ngày học liên tiếp)
- **Chuẩn Duolingo với 3 trạng thái**:
  - `active_today`: Đã học hôm nay (`lastStudyDate === today`). Ngọn lửa vàng rực 🔥.
  - `at_risk`: Đã học hôm qua, hôm nay chưa học (`lastStudyDate === yesterday`). Giữ nguyên chuỗi cũ nhưng phát tín hiệu cảnh báo cần học trước 24:00 để không bị mất chuỗi.
  - `broken`: **Bỏ lỡ 1 ngày trở lên** (`lastStudyDate < yesterday`). **Mất toàn bộ chuỗi -> Reset về 0 ngày**. Khi học lại, chuỗi bắt đầu từ 1 ngày.
- **Banner cảnh báo trực quan trên Trang chủ**:
  - Hiển thị banner cam cảnh báo khi chuỗi có nguy cơ mất.
  - Hiển thị banner đỏ thông báo đứt chuỗi và mời bắt đầu lại.
- **Đồng bộ sự kiện thời gian thực**:
  - Bất kỳ thao tác chấm điểm flashcard hoặc phản xạ 60s nào đều phát sự kiện `speakflow-auth-changed`, cập nhật ngọn lửa trên Header Bar và Dashboard ngay tức thì.

### 3.5. Quản lý bộ thẻ & Chia sẻ cộng đồng (`/manage`, `/deck/[id]`)
- **Phân loại bộ thẻ**:
  - **Bộ chuẩn hệ thống (`is_system: true`)**: Gồm 6 chủ đề mặc định với 108 câu. Được bảo vệ an toàn: học viên thông thường không thể sửa hoặc xóa.
  - **Bộ thẻ cá nhân**: Người dùng tự tạo, phân loại theo chủ đề, chỉnh sửa hoặc xóa tự do.
- **Tạo câu lẻ & Nhập hàng loạt (Batch Import)**:
  - Hỗ trợ tạo câu đơn lẻ kèm chọn cấp độ CEFR (`A1`–`C2`).
  - Hỗ trợ Import file CSV hoặc JSON hàng loạt với trình phân tích cú pháp tự động làm sạch dữ liệu.
- **Chia sẻ & Fork bộ thẻ**:
  - Mỗi bộ thẻ có đường dẫn chia sẻ công khai: `/deck/[id]`.
  - Người khác mở link có thể học thử ngay hoặc bấm *"Lưu vào kho thẻ của tôi"* (Forking) để sao chép toàn bộ sang tài khoản cá nhân.

### 3.6. Hệ thống phân quyền & Quản trị học viên (`/admin`)
- **Vai trò**: `admin` và `student`.
- **Tài khoản Demo tích hợp sẵn**:
  1. `admin@speakflow.vn` (Quản trị viên hệ thống)
  2. `chamchi@speakflow.vn` (Học viên chăm chỉ, Streak 14 ngày, 80 câu thành thạo)
  3. `phatamyeu@speakflow.vn` (Học viên phát âm yếu, nhiều từ đỏ cần khắc phục)
  4. `bikhoa@speakflow.vn` (Tài khoản vi phạm, hiển thị màn hình khóa)
  5. `thutrang@speakflow.vn` (Học viên mới bắt đầu, trình độ A1)
- **Bảng điều khiển Admin**:
  - Thống kê thời gian thực toàn bộ học viên.
  - Tìm kiếm, lọc theo tình trạng, sắp xếp theo: Gần đây, Phát âm, Tiến độ, Streak.
  - Khóa / Mở khóa tài khoản ngay lập tức.
  - Reset tiến trình học tập của học viên.
  - Xem chi tiết từng học viên qua `StudentDetailModal`: 5 hộp ghi nhớ, nhật ký học tập, danh sách từ hay đọc sai.

---

## 4. MÔ HÌNH DỮ LIỆU & SCHEMA DATABASE (DATA MODELS)

### 4.1. TypeScript Core Interfaces (`lib/seedData.ts` & `lib/dataService.ts`)

```typescript
// Trình độ chuẩn CEFR
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

// Cấu trúc một thẻ học / mẫu câu giao tiếp
export interface Card {
  id: string;                      // UUID
  deck_id: string;                 // FK -> Deck
  phrase_en: string;               // Cụm từ khóa tiếng Anh
  sentence_en: string;             // Câu giao tiếp hoàn chỉnh tiếng Anh
  ipa: string;                     // Phiên âm chuẩn quốc tế
  meaning_vi: string;              // Nghĩa tiếng Việt của cụm từ khóa
  sentence_vi: string;             // Nghĩa tiếng Việt của cả câu
  context_note?: string;           // Ngữ cảnh giao tiếp thực tế
  variations?: string[];           // Các cách nói tương đương
  level: CEFRLevel;                // Cấp độ CEFR (Mặc định: 'B1')
  
  // Thuộc tính phục vụ thuật toán Spaced Repetition (SRS)
  box: number;                     // Hộp Leitner (1 - 5)
  ease_factor: number;             // Hệ số dễ (Mặc định: 2.5)
  interval_days: number;           // Khoảng cách ngày đến lần ôn kế tiếp
  next_review_at: string;          // ISO Date chu kỳ ôn tập tiếp theo
  last_practiced_at: string | null;// ISO Date lần ôn tập gần nhất
}

// Bộ thẻ chủ đề
export interface Deck {
  id: string;                      // UUID hoặc chuỗi định danh
  code: string;                    // Mã chủ đề duy nhất (daily_life, office, ...)
  title: string;                   // Tiêu đề hiển thị
  description: string;             // Mô tả chi tiết
  icon: string;                    // Tên icon Lucide (Zap, Briefcase, Plane, ...)
  is_system?: boolean;             // true = Bộ mẫu chuẩn không cho phép xóa
  user_id?: string;                // ID tác giả sở hữu
  author_name?: string;            // Tên tác giả hiển thị
  created_at?: string;
  updated_at?: string;
}

// Chuỗi ngày học liên tiếp
export interface StreakData {
  currentStreak: number;           // Số ngày liên tiếp
  lastStudyDate: string | null;    // Định dạng YYYY-MM-DD
  todayReviewedCount: number;      // Số câu đã ôn trong ngày hôm nay
  isStreakActiveToday?: boolean;   // Đã hoàn thành câu nào hôm nay chưa
  streakStatus?: 'active_today' | 'at_risk' | 'broken';
}

// Hồ sơ người dùng
export interface UserProfile {
  id: string;                      // UUID
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'student';
  status: 'active' | 'locked';
  provider?: 'google' | 'credentials' | 'demo';
  persona_label?: string;
  last_synced_at?: string;
}

// Nhật ký phiên học tập
export interface StudyActivityLog {
  id: string;
  user_id: string;
  mode: 'study' | 'shadowing' | 'reflex';
  card_id: string;
  phrase_en: string;
  sentence_en: string;
  spoken_text: string;
  score: number;                   // 0 - 100
  rating?: 'again' | 'hard' | 'good' | 'easy';
  mispronounced_words: string[];
  created_at: string;
}
```

### 4.2. Supabase PostgreSQL Schema (`supabase/schema.sql`)

Hệ thống sử dụng các bảng PostgreSQL với RLS đã được thiết lập:

1. **`public.decks`**: Lưu thông tin bộ chủ đề.
   - Cột: `id (UUID PK)`, `code (TEXT UNIQUE)`, `title`, `description`, `icon`, `is_system (BOOLEAN)`, `user_id (UUID)`, `author_name`, `created_at`, `updated_at`.
2. **`public.cards`**: Lưu trữ toàn bộ mẫu câu.
   - Cột: `id (UUID PK)`, `deck_id (FK)`, `phrase_en`, `sentence_en`, `ipa`, `meaning_vi`, `sentence_vi`, `context_note`, `variations (JSONB)`, `level (VARCHAR(5) DEFAULT 'B1')`, `box (INT DEFAULT 1)`, `ease_factor (FLOAT DEFAULT 2.5)`, `interval_days (INT DEFAULT 0)`, `next_review_at (TIMESTAMPTZ)`, `last_practiced_at (TIMESTAMPTZ)`.
   - Chỉ mục: `idx_cards_deck_id`, `idx_cards_level`, `idx_cards_next_review_at`.
3. **`public.user_card_progress`**: Lưu tiến trình SRS riêng của từng học viên cho từng thẻ.
   - Khóa chính: `PRIMARY KEY (user_id, card_id)`.
   - Cột: `box`, `ease_factor`, `interval_days`, `next_review_at`, `last_practiced_at`.
4. **`public.user_stats`**: Lưu thông số tổng hợp và chuỗi ngày học của học viên.
   - Khóa chính: `user_id (UUID PK)`.
   - Cột: `current_streak (INT DEFAULT 0)`, `last_study_date (TEXT)`, `today_reviewed_count (INT DEFAULT 0)`, `email`, `full_name`, `avatar_url`, `updated_at`.
5. **`public.study_logs`**: Nhật ký hoạt động phát âm và lịch sử câu trả lời.
   - Cột: `id`, `user_id`, `card_id`, `mode`, `phrase_en`, `sentence_en`, `spoken_text`, `score`, `rating`, `mispronounced_words (JSONB)`, `created_at`.

---

## 5. THUẬT TOÁN & LOGIC CỐT LÕI (ALGORITHMS & LOGIC)

### 5.1. Thuật toán Lặp lại ngắt quãng SRS (`lib/srs.ts`)
Dựa trên nguyên lý kết hợp giữa **SuperMemo-2 (SM-2)** và **5 Hộp ghi nhớ Leitner**:
- **Hộp 1**: Ôn hàng ngày (`interval = 1 ngày`).
- **Hộp 2**: Ôn cách 2–3 ngày (`interval = 3 ngày`).
- **Hộp 3**: Ôn cách 1 tuần (`interval = 7 ngày`).
- **Hộp 4**: Ôn cách 2 tuần (`interval = 14 ngày`).
- **Hộp 5 (Thành thạo)**: Ôn cách 1 tháng (`interval = 30 ngày`).

Khi người dùng đánh giá thẻ:
- **`again` (Quên)**: `box = 1`, `interval = 1`, giảm hệ số `ease_factor = Math.max(1.3, ease_factor - 0.2)`.
- **`hard` (Ngập ngừng)**: Giữ nguyên hộp hoặc lùi 1 hộp, `interval = Math.max(1, Math.round(interval * 1.2))`, `ease_factor = Math.max(1.3, ease_factor - 0.15)`.
- **`good` (Nhớ được)**: `box = Math.min(5, box + 1)`, `interval = Math.round(interval * ease_factor)`.
- **`easy` (Phản xạ ngay)**: `box = Math.min(5, box + 1)`, `interval = Math.round(interval * ease_factor * 1.3)`, `ease_factor += 0.15`.

### 5.2. Thuật toán Đánh giá Phát âm & Chấm điểm từ (`lib/speech.ts`)
- Sử dụng độ tương đồng chuỗi **Levenshtein Distance** sau khi chuẩn hóa (bỏ dấu câu, chuyển chữ thường, xử lý từ co gọn tiếng Anh như `I'm -> i am`, `don't -> do not`).
- Đối soát từng token giữa câu mẫu (`sentence_en`) và văn bản nhận diện qua giọng nói (`spoken_text`):
  - Độ tương đồng từ $\ge 0.82$: Đạt chuẩn (`status: "correct"` - Xanh lá).
  - Độ tương đồng từ $< 0.82$: Sai phát âm (`status: "mispronounced"` - Đỏ).
  - Bị người học bỏ qua không đọc: Bỏ sót (`status: "missing"` - Đỏ).
- Điểm tổng quát $\text{Score} = \text{round}\left(\frac{\text{Số từ đúng}}{\text{Tổng số từ}} \times 100\right)$.

### 5.3. Thuật toán Xáo trộn Fisher-Yates (`fisherYatesShuffle`)
Được áp dụng khi chọn chế độ **🎲 Lộn xộn** nhằm bảo đảm xác suất xuất hiện của mọi câu ở các trình độ $A1 \to C2$ là ngẫu nhiên đồng đều:
```typescript
function fisherYatesShuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
```

---

## 6. KIẾN TRÚC ĐỒNG BỘ DỮ LIỆU HAI CHIỀU (SYNC STRATEGY)

Hệ thống hoạt động theo mô hình **Optimistic UI + Offline-first Cache**:
1. Mọi tương tác của người dùng ghi trực tiếp vào `localStorage` trước (độ trễ microsecond, hoạt động ngay cả khi rớt mạng).
2. Hàm `syncAccountDataWithSupabase()` tự động chạy ngầm:
   - Đọc dữ liệu `user_card_progress` từ Supabase.
   - Hợp nhất (Merge) tiến trình: Giữ trạng thái của bên có `box` cao hơn hoặc có `last_practiced_at` mới hơn.
   - Đẩy ngược những thay đổi mới nhất từ LocalStorage lên Supabase bằng câu lệnh `upsert`.
3. Khi người dùng đăng xuất hoặc chuyển đổi sang tài khoản Demo, bộ đệm bộ nhớ RAM (`memoryCachedCards`, `memoryCachedDecks`) tự động bị hủy (`invalidateMemorySeedCache`) để nạp dữ liệu sạch tương ứng với tài khoản mới.

---

## 7. HƯỚNG DẪN MÔI TRƯỜNG & VẬN HÀNH (SETUP & RUN)

### 7.1. Cài đặt & Chạy ứng dụng
```bash
# Cài đặt các gói phụ thuộc
npm install

# Khởi chạy máy chủ phát triển (Dev Server)
npm run dev

# Kiểm tra kiểu TypeScript & Đóng gói sản phẩm (Production Build)
npm run build

# Khởi chạy môi trường Production
npm start
```

> **Lưu ý trên môi trường Windows**: Dự án có script `scripts/fs-patch.cjs` được cấu hình tự động chèn trước lệnh thực thi Next.js (`-r ./scripts/fs-patch.cjs`) để sửa triệt để lỗi phân quyền tệp tin và lock file đặc thù trên hệ điều hành Windows.

### 7.2. Biến môi trường (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://ncfudvrowukvppppexcf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_R4qlwEYBtVqTCeNHKH6HdQ_29XF8ceW
```
*(Nếu không có Supabase URL, ứng dụng tự động chạy ở chế độ Local Guest Mode với đầy đủ tính năng)*.

---

## 8. ĐỊNH HƯỚNG & KHUYẾN NGHỊ PHÁT TRIỂN TIẾP THEO (ROADMAP)

Dành cho AI hoặc kỹ sư phần mềm phát triển các phiên bản tiếp theo:

1. **AI Chatbot / Voice Roleplay thời gian thực**:
   - Mở rộng `/roleplay`: Tích hợp Gemini API hoặc Live Audio API để đàm thoại 2 chiều qua giọng nói tự nhiên với AI gia sư (thay thế cho kịch bản tĩnh).
2. **Âm thanh thực từ người bản ngữ (Real Human Audio CDN)**:
   - Bổ sung URL file âm thanh `.mp3` chất lượng cao ghi âm sẵn cho 108 câu mẫu, giữ Web Speech Synthesis làm phương án dự phòng (fallback).
3. **PWA & Thông báo đẩy (Push Notifications)**:
   - Thêm `manifest.json` và Service Worker để cài đặt app lên màn hình chính điện thoại (iOS / Android).
   - Gửi thông báo đẩy vào 20:00 hàng ngày nhắc nhở người dùng học để bảo vệ Streak khi trạng thái là `at_risk`.
4. **Hệ thống Gamification & Bảng xếp hạng (Leaderboard)**:
   - Bổ sung bảng xếp hạng tuần theo điểm XP tích lũy từ các buổi học và phản xạ 60 giây.
   - Thêm tính năng "Đóng băng Streak" (Streak Freeze) có thể đổi bằng điểm học tập.
5. **Xuất bản đề thi chuẩn hóa**:
   - Thêm chế độ thi thử trắc nghiệm nhanh phân loại trình độ đầu vào (CEFR Placement Test) để gợi ý người dùng nên bắt đầu từ A1 hay B1.
