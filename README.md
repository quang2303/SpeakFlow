# ⚡ SpeakFlow — Ứng dụng Luyện Phản Xạ Giao Tiếp Tiếng Anh

**SpeakFlow** là ứng dụng Web Mobile-First giúp người Việt luyện **phản xạ giao tiếp tiếng Anh tốc độ cao** thay vì học ngữ pháp thụ động. Ứng dụng kết hợp 3 phương pháp ngôn ngữ học hiện đại:
1. **Chunking & Contextual Learning**: Học theo cụm từ (chunk) gắn liền với câu hội thoại tần suất cao và ngữ cảnh sử dụng thực tế.
2. **Active Recall + Spaced Repetition (Simplified SM-2)**: Mặt trước hiển thị tình huống tiếng Việt buộc não bộ chủ động bật ra câu tiếng Anh trước khi lật thẻ. Thuật toán SM-2 tự động tính toán thời điểm ôn tập tối ưu (`1p`, `1 ngày`, `3 ngày`, `7 ngày+`).
3. **Shadowing & Speech Practice (Web Speech API)**:
   - Nghe phát âm bản xứ ở tốc độ chuẩn (`1x`) và tốc độ chậm (`0.75x`).
   - Nhận diện giọng nói trực tiếp (`SpeechRecognition`), chấm điểm độ chính xác bằng khoảng cách **Levenshtein** và tô màu từng từ phát âm chuẩn (xanh) hoặc cần sửa (vàng).

---

## 🚀 Chạy ngay lập tức (Zero-Config LocalStorage Mode)

Ứng dụng được tích hợp sẵn **Unified Data Service Layer (`lib/dataService.ts`)** cùng **30 mẫu câu giao tiếp thực chiến** chia làm 4 chủ đề. Khi chưa cấu hình Supabase, ứng dụng tự động vận hành mượt mà trên `localStorage`:

```bash
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:3000` (khuyến nghị dùng Google Chrome, Edge hoặc Safari để trải nghiệm đầy đủ tính năng Micro nhận diện giọng nói).

---

## 🗄️ Hướng dẫn Kết nối Supabase & Deploy lên Vercel trong 3 Phút

### Bước 1: Tạo Database miễn phí trên Supabase (1 phút)
1. Truy cập [supabase.com](https://supabase.com) và tạo một Project mới (Free Tier).
2. Vào mục **SQL Editor** trên thanh menu trái -> Bấm **New Query**.
3. Copy toàn bộ nội dung file [`supabase/schema.sql`](./supabase/schema.sql) dán vào khung soạn thảo và bấm **Run**.
   - Script sẽ tự động tạo bảng `decks`, `cards`, thiết lập Row Level Security (RLS) và nạp sẵn 30 mẫu câu giao tiếp chất lượng cao.
4. Vào **Project Settings -> API** để lấy:
   - `Project URL` (`NEXT_PUBLIC_SUPABASE_URL`)
   - `anon public key` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### Bước 2: Cấu hình môi trường Local (Tuỳ chọn)
Tạo file `.env.local` ở thư mục gốc dự án (dựa theo `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-public-key
```

### Bước 3: Deploy lên Vercel (2 phút)
1. Đẩy source code lên GitHub repository của bạn.
2. Truy cập [vercel.com/new](https://vercel.com/new) và chọn repository vừa tạo.
3. Trong phần **Environment Variables**, thêm 2 biến:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   *(Nếu bạn để trống 2 biến này, bản deploy trên Vercel vẫn hoạt động 100% nhờ cơ chế fallback sang `localStorage`).*
4. Bấm **Deploy** -> Hoàn tất! Trên điện thoại iOS/Android, bạn có thể bấm **"Add to Home Screen" (Thêm vào màn hình chính)** để sử dụng như một ứng dụng độc lập (PWA).

---

## 📂 Cấu trúc Thư mục Chính

```text
├── app/
│   ├── layout.tsx          # Mobile container (max-w-md) + PWA metadata + BottomNav
│   ├── page.tsx            # Tab 1: Dashboard, Streak, Due Today CTA & Decks Grid
│   ├── study/page.tsx      # Tab 2: 3D Flipping Flashcard, Web Speech TTS/STT & SM-2 Bar
│   ├── reflex/page.tsx     # Tab 3: Thử thách Phản xạ 60 Giây (7s/câu)
│   └── manage/page.tsx     # Tab 4: Tạo thẻ mới, Nhập hàng loạt JSON/CSV & Quản lý kho thẻ
├── components/
│   └── BottomNav.tsx       # Thanh điều hướng cố định phía dưới chuẩn Mobile-First
├── lib/
│   ├── dataService.ts      # Tầng dữ liệu hợp nhất (Supabase + tự động fallback LocalStorage)
│   ├── seedData.ts         # 4 bộ chủ đề & 30 mẫu câu giao tiếp thực tế
│   ├── speech.ts           # Web Speech API (TTS 1x/0.75x, STT & thuật toán Levenshtein)
│   └── srs.ts              # Thuật toán Spaced Repetition SM-2 & tạo gợi ý chữ cái đầu
├── public/
│   ├── manifest.json       # Cấu hình PWA (Add to Home Screen)
│   └── icon.svg            # Biểu tượng ứng dụng SpeakFlow
└── supabase/
    └── schema.sql          # SQL tạo bảng, RLS policy & nạp 30 thẻ dữ liệu mẫu
```
