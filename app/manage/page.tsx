"use client";

import { useEffect, useState } from "react";
import {
  Database,
  HardDrive,
  PlusCircle,
  Upload,
  Trash2,
  Volume2,
  CheckCircle2,
  RefreshCcw,
  FileJson,
  Search,
} from "lucide-react";
import {
  addCard,
  deleteCard,
  getActiveStorageMode,
  getCards,
  getDecks,
  hasSupabaseEnv,
  importCardsBatch,
  isForceLocalMode,
  resetLocalToSeed,
  setForceLocalMode,
  StorageMode,
} from "@/lib/dataService";
import { Card, Deck } from "@/lib/seedData";
import { speakEnglish } from "@/lib/speech";

const SAMPLE_JSON_IMPORT = JSON.stringify(
  [
    {
      phrase_en: "figure it out",
      ipa: "/ˈfɪɡjər ɪt aʊt/",
      meaning_vi: "tìm ra cách giải quyết",
      sentence_en: "Don't worry, we will figure it out together.",
      sentence_vi: "Đừng lo, chúng ta sẽ cùng nhau tìm ra cách giải quyết.",
      context_note:
        "Dùng để trấn an đồng nghiệp hoặc bạn bè khi gặp vấn đề khó.",
    },
    {
      phrase_en: "give it a shot",
      ipa: "/ɡɪv ɪt ə ʃɑːt/",
      meaning_vi: "thử một phen xem sao",
      sentence_en: "I've never tried surfing, but I'll give it a shot!",
      sentence_vi:
        "Tôi chưa từng lướt ván bao giờ, nhưng tôi sẽ thử một phen xem sao!",
      context_note: "Tự nhiên hơn rất nhiều so với 'I will try it'.",
    },
  ],
  null,
  2
);

const SAMPLE_CSV_IMPORT = `phrase_en,ipa,meaning_vi,sentence_en,sentence_vi,context_note
count me in,/kaʊnt mi ɪn/,cho tôi tham gia với,Are you guys going for karaoke? Count me in!,Mọi người đi hát karaoke hả? Cho tôi tham gia với nhé!,Dùng khi muốn hưởng ứng lời rủ rê của bạn bè ngay lập tức.
on my way,/ɑːn maɪ weɪ/,đang trên đường tới rồi,Hang on five minutes, I'm on my way!,Đợi 5 phút nhé, tôi đang trên đường tới rồi!,Câu trả lời cực nhanh khi bạn bè hỏi bạn đang ở đâu.`;

function parseCsvBatch(csvText: string) {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const startIndex = lines[0].toLowerCase().includes("phrase_en") ? 1 : 0;
  const results = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim());
    if (parts.length >= 5) {
      results.push({
        phrase_en: parts[0],
        ipa: parts[1] || "/.../",
        meaning_vi: parts[2],
        sentence_en: parts[3],
        sentence_vi: parts[4],
        context_note:
          parts.slice(5).join(", ") || "Mẫu câu phản xạ tự thêm.",
      });
    }
  }
  return results;
}

export default function ManageCardsPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [storageMode, setStorageMode] = useState<StorageMode>("local");
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [forcedLocal, setForcedLocal] = useState(false);

  const [activeTab, setActiveTab] = useState<"single" | "batch" | "list">(
    "single"
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Single Card Form State
  const [deckId, setDeckId] = useState("");
  const [phraseEn, setPhraseEn] = useState("");
  const [ipa, setIpa] = useState("");
  const [meaningVi, setMeaningVi] = useState("");
  const [sentenceEn, setSentenceEn] = useState("");
  const [sentenceVi, setSentenceVi] = useState("");
  const [contextNote, setContextNote] = useState("");

  // Batch Import State
  const [batchFormat, setBatchFormat] = useState<"json" | "csv">("json");
  const [batchText, setBatchText] = useState(SAMPLE_JSON_IMPORT);

  // Search / Filter for Card List
  const [searchQuery, setSearchQuery] = useState("");

  async function refreshData() {
    const [loadedDecks, loadedCards] = await Promise.all([
      getDecks(),
      getCards(),
    ]);
    setDecks(loadedDecks);
    setCards(loadedCards);
    if (loadedDecks.length > 0 && !deckId) {
      setDeckId(loadedDecks[0].id);
    }
    setSupabaseConfigured(hasSupabaseEnv());
    setForcedLocal(isForceLocalMode());
    setStorageMode(getActiveStorageMode());
  }

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(msg: string) {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(null);
    }, 3500);
  }

  async function handleToggleStorageMode() {
    if (!supabaseConfigured) {
      showToast(
        "Chưa cấu hình biến môi trường NEXT_PUBLIC_SUPABASE_URL. Ứng dụng đang chạy mượt trên LocalStorage!"
      );
      return;
    }
    const nextForceLocal = !forcedLocal;
    setForceLocalMode(nextForceLocal);
    await refreshData();
    showToast(
      nextForceLocal
        ? "Đã chuyển sang chế độ lưu trữ LocalStorage trên trình duyệt."
        : "Đã kết nối đồng bộ với Supabase Cloud PostgreSQL!"
    );
  }

  async function handleCreateSingleCard(e: React.FormEvent) {
    e.preventDefault();
    if (!phraseEn.trim() || !sentenceEn.trim() || !sentenceVi.trim()) {
      showToast("Vui lòng điền đủ Cụm từ, Câu tiếng Anh và Câu tiếng Việt.");
      return;
    }

    await addCard({
      deck_id: deckId || decks[0]?.id,
      phrase_en: phraseEn.trim(),
      ipa: ipa.trim() || "/.../",
      meaning_vi: meaningVi.trim() || sentenceVi.trim(),
      sentence_en: sentenceEn.trim(),
      sentence_vi: sentenceVi.trim(),
      context_note:
        contextNote.trim() ||
        "Hãy đọc to cả câu để ghi nhớ ngữ cảnh phản xạ.",
    });

    setPhraseEn("");
    setIpa("");
    setMeaningVi("");
    setSentenceEn("");
    setSentenceVi("");
    setContextNote("");
    await refreshData();
    showToast("Đã thêm mẫu câu phản xạ mới thành công!");
  }

  async function handleBatchImport() {
    if (!batchText.trim()) return;
    try {
      let parsedItems = [];
      if (batchFormat === "json") {
        const json = JSON.parse(batchText);
        parsedItems = Array.isArray(json) ? json : [json];
      } else {
        parsedItems = parseCsvBatch(batchText);
      }

      const created = await importCardsBatch(
        parsedItems,
        deckId || decks[0]?.id
      );

      if (created.length === 0) {
        showToast(
          "Không tìm thấy dữ liệu hợp lệ. Hãy kiểm tra các trường phrase_en, sentence_en, sentence_vi."
        );
        return;
      }

      await refreshData();
      showToast(`Đã nhập thành công ${created.length} mẫu câu mới!`);
      setActiveTab("list");
    } catch {
      showToast(
        "Định dạng JSON/CSV chưa hợp lệ. Hãy bấm 'Mẫu JSON' để xem cấu trúc chuẩn."
      );
    }
  }

  async function handleDeleteCard(id: string) {
    await deleteCard(id);
    await refreshData();
    showToast("Đã xóa thẻ khỏi kho từ.");
  }

  async function handleResetSeed() {
    resetLocalToSeed();
    await refreshData();
    showToast("Đã khôi phục 30 mẫu câu gốc ban đầu!");
  }

  const filteredCards = cards.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.phrase_en.toLowerCase().includes(q) ||
      c.sentence_en.toLowerCase().includes(q) ||
      c.sentence_vi.toLowerCase().includes(q) ||
      c.meaning_vi.toLowerCase().includes(q)
    );
  });

  return (
    <div className="px-4 md:px-8 pt-5 md:pt-8 pb-8 space-y-6">
      {/* Header & Storage Mode Status Toggle */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          {storageMode === "supabase" ? (
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5 text-amber-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-extrabold text-white">
                {storageMode === "supabase"
                  ? "Kho Thẻ Phản Xạ — Đồng bộ Supabase Cloud"
                  : "Kho Thẻ Phản Xạ — Chế độ LocalStorage"}
              </h1>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  storageMode === "supabase"
                    ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                    : "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                }`}
              />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tổng cộng {cards.length} mẫu câu trong {decks.length} bộ chủ đề
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleStorageMode}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 shrink-0 self-start sm:self-auto"
        >
          {storageMode === "supabase"
            ? "Chuyển sang Local"
            : "Kết nối Supabase Cloud"}
        </button>
      </div>

      {/* Toast Feedback */}
      {statusMessage && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 rounded-2xl p-3.5 text-xs md:text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Mobile Sub-navigation Tabs (Hidden on lg because lg shows 2-column side-by-side) */}
      <div className="grid grid-cols-3 lg:hidden gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("single")}
          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "single"
              ? "bg-sky-500 text-slate-950 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          + Thêm câu mới
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("batch")}
          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "batch"
              ? "bg-sky-500 text-slate-950 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Nhập JSON/CSV
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "list"
              ? "bg-sky-500 text-slate-950 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Kho câu ({cards.length})
        </button>
      </div>

      {/* Desktop 12-Col Split View / Mobile Tabbed View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN ON PC (5 Cols): Create Single Phrase or Batch Import */}
        <div
          className={`lg:col-span-5 space-y-4 ${
            activeTab === "list" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Desktop Form Mode Switcher */}
          <div className="hidden lg:grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("single")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab !== "batch"
                  ? "bg-sky-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              + Tạo câu đơn lẻ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("batch")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "batch"
                  ? "bg-sky-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Nhập hàng loạt JSON/CSV
            </button>
          </div>

          {activeTab !== "batch" ? (
            <form
              onSubmit={handleCreateSingleCard}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-lg"
            >
              <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-sky-400" />
                <span>Tạo thẻ Phản xạ Giao tiếp mới</span>
              </h2>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Bộ chủ đề (Deck)
                </label>
                <select
                  value={deckId}
                  onChange={(e) => setDeckId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Cụm từ khóa (Chunk) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: make up my mind"
                    value={phraseEn}
                    onChange={(e) => setPhraseEn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Phiên âm IPA
                  </label>
                  <input
                    type="text"
                    placeholder="VD: /meɪk ʌp maɪ maɪnd/"
                    value={ipa}
                    onChange={(e) => setIpa(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Nghĩa tiếng Việt của cụm từ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: đưa ra quyết định"
                  value={meaningVi}
                  onChange={(e) => setMeaningVi(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Câu gợi ý Tiếng Việt (Hiện ở mặt trước thẻ) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Tôi vẫn chưa đưa ra quyết định nữa."
                  value={sentenceVi}
                  onChange={(e) => setSentenceVi(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Câu giao tiếp Tiếng Anh hoàn chỉnh (Mặt sau) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: I haven't made up my mind yet."
                  value={sentenceEn}
                  onChange={(e) => setSentenceEn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Ghi chú ngữ cảnh sử dụng
                </label>
                <input
                  type="text"
                  placeholder="VD: Dùng khi đang phân vân giữa các lựa chọn..."
                  value={contextNote}
                  onChange={(e) => setContextNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Lưu vào Kho Thẻ Phản Xạ</span>
              </button>
            </form>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-sky-400" />
                  <span>Nhập hàng loạt (JSON / CSV)</span>
                </h2>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setBatchFormat("json");
                      setBatchText(SAMPLE_JSON_IMPORT);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                      batchFormat === "json"
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    Mẫu JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBatchFormat("csv");
                      setBatchText(SAMPLE_CSV_IMPORT);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                      batchFormat === "csv"
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    Mẫu CSV
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Chọn bộ chủ đề đích
                </label>
                <select
                  value={deckId}
                  onChange={(e) => setDeckId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                rows={8}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                placeholder="Dán nội dung JSON hoặc CSV vào đây..."
              />

              <button
                type="button"
                onClick={handleBatchImport}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <Upload className="w-4 h-4" />
                <span>Nhập hàng loạt vào bộ thẻ</span>
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN ON PC (7 Cols): Searchable Card Library */}
        <div
          className={`lg:col-span-7 space-y-3.5 ${
            activeTab === "list" ? "block" : "hidden lg:block"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm cụm từ hoặc câu giao tiếp trong kho..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs md:text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <button
              type="button"
              onClick={handleResetSeed}
              title="Khôi phục 30 câu mẫu ban đầu"
              className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center gap-1.5 shrink-0"
            >
              <RefreshCcw className="w-4 h-4 text-amber-400" />
              <span className="font-medium">Reset 30 câu</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[680px] overflow-y-auto pr-1">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs md:text-sm font-extrabold text-sky-400">
                        {card.phrase_en}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {card.ipa}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                      {card.meaning_vi}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => speakEnglish(card.sentence_en, 1.0)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                      title="Xóa thẻ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs space-y-1 pt-2 border-t border-slate-800/80">
                  <p className="text-white font-medium">{card.sentence_en}</p>
                  <p className="text-slate-400">{card.sentence_vi}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
