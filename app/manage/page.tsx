"use client";

import { useEffect, useMemo, useState } from "react";
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
  getStoredUserProfile,
  hasSupabaseEnv,
  importCardsBatch,
  isForceLocalMode,
  resetLocalToSeed,
  setForceLocalMode,
  StorageMode,
  UserProfile,
} from "@/lib/dataService";
import AccountLockScreen from "@/components/AccountLockScreen";
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
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
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
    setCurrentUser(getStoredUserProfile());
    refreshData();
    const handler = () => {
      setCurrentUser(getStoredUserProfile());
      refreshData();
    };
    window.addEventListener("speakflow-auth-changed", handler);
    return () => window.removeEventListener("speakflow-auth-changed", handler);
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
        "Chưa cấu hình Supabase Cloud. Dữ liệu đang được lưu trữ trên LocalStorage."
      );
      return;
    }
    const nextForceLocal = !forcedLocal;
    setForceLocalMode(nextForceLocal);
    await refreshData();
    showToast(
      nextForceLocal
        ? "Đã chuyển sang chế độ lưu trữ LocalStorage."
        : "Đã kết nối đồng bộ với Supabase Cloud!"
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
    showToast("Đã thêm mẫu câu mới thành công!");
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
        "Định dạng JSON/CSV chưa hợp lệ. Hãy bấm 'Mẫu JSON' để xem cấu trúc."
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
    showToast("Đã khôi phục danh sách mẫu câu gốc!");
  }

  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return cards;
    const q = searchQuery.toLowerCase();
    return cards.filter(
      (c) =>
        c.phrase_en.toLowerCase().includes(q) ||
        c.sentence_en.toLowerCase().includes(q) ||
        c.sentence_vi.toLowerCase().includes(q) ||
        c.meaning_vi.toLowerCase().includes(q)
    );
  }, [cards, searchQuery]);

  if (currentUser?.status === "locked") {
    return <AccountLockScreen user={currentUser} />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
      {/* Header & Storage Mode Status Toggle */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          {storageMode === "supabase" ? (
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                Kho thẻ phản xạ
              </h1>
              <span
                className={`w-2 h-2 rounded-full ${
                  storageMode === "supabase"
                    ? "bg-emerald-500"
                    : "bg-amber-400"
                }`}
              />
            </div>
            <p className="text-xs text-slate-500">
              {cards.length} mẫu câu trong {decks.length} chủ đề • {storageMode === "supabase" ? "Supabase Cloud" : "LocalStorage"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleStorageMode}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors shrink-0 self-start sm:self-auto"
        >
          {storageMode === "supabase"
            ? "Chuyển sang Local"
            : "Kết nối Cloud"}
        </button>
      </div>

      {/* Toast Feedback */}
      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-3.5 text-xs sm:text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Mobile Sub-navigation Tabs */}
      <div className="grid grid-cols-3 lg:hidden gap-1 bg-slate-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab("single")}
          className={`py-2 px-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "single"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          + Thêm câu
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("batch")}
          className={`py-2 px-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "batch"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Nhập file
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={`py-2 px-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "list"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Kho câu ({cards.length})
        </button>
      </div>

      {/* 2-Column Split View on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Create Single Phrase or Batch Import */}
        <div
          className={`lg:col-span-5 space-y-4 ${
            activeTab === "list" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Desktop Form Mode Switcher */}
          <div className="hidden lg:grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("single")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                activeTab !== "batch"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              + Tạo câu đơn lẻ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("batch")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === "batch"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Nhập JSON/CSV
            </button>
          </div>

          {activeTab !== "batch" ? (
            <form
              onSubmit={handleCreateSingleCard}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3.5 shadow-xs"
            >
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-brand-600" />
                <span>Tạo thẻ mẫu câu mới</span>
              </h2>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Bộ chủ đề
                </label>
                <select
                  value={deckId}
                  onChange={(e) => setDeckId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
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
                  <label className="text-xs font-semibold text-slate-700">
                    Cụm từ khóa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: make up my mind"
                    value={phraseEn}
                    onChange={(e) => setPhraseEn(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Phiên âm IPA
                  </label>
                  <input
                    type="text"
                    placeholder="VD: /meɪk ʌp maɪ maɪnd/"
                    value={ipa}
                    onChange={(e) => setIpa(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Nghĩa tiếng Việt của cụm từ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: đưa ra quyết định"
                  value={meaningVi}
                  onChange={(e) => setMeaningVi(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Câu tình huống Tiếng Việt *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Tôi vẫn chưa đưa ra quyết định nữa."
                  value={sentenceVi}
                  onChange={(e) => setSentenceVi(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Câu giao tiếp Tiếng Anh hoàn chỉnh *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: I haven't made up my mind yet."
                  value={sentenceEn}
                  onChange={(e) => setSentenceEn(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Ghi chú ngữ cảnh
                </label>
                <input
                  type="text"
                  placeholder="VD: Dùng khi đang phân vân..."
                  value={contextNote}
                  onChange={(e) => setContextNote(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Lưu vào Kho Thẻ</span>
              </button>
            </form>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-brand-600" />
                  <span>Nhập hàng loạt</span>
                </h2>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setBatchFormat("json");
                      setBatchText(SAMPLE_JSON_IMPORT);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      batchFormat === "json"
                        ? "bg-brand-50 text-brand-600 border border-brand-200"
                        : "bg-slate-100 text-slate-600"
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      batchFormat === "csv"
                        ? "bg-brand-50 text-brand-600 border border-brand-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Mẫu CSV
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Chọn bộ chủ đề đích
                </label>
                <select
                  value={deckId}
                  onChange={(e) => setDeckId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-500"
                placeholder="Dán nội dung JSON hoặc CSV vào đây..."
              />

              <button
                type="button"
                onClick={handleBatchImport}
                className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Nhập hàng loạt vào kho</span>
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Searchable Card Library */}
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
                placeholder="Tìm cụm từ hoặc câu trong kho..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-brand-500 shadow-xs"
              />
            </div>
            <button
              type="button"
              onClick={handleResetSeed}
              title="Khôi phục danh sách mẫu ban đầu"
              className="px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
            >
              <RefreshCcw className="w-4 h-4 text-amber-500" />
              <span className="font-medium hidden sm:inline">Khôi phục</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[680px] overflow-y-auto pr-1">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-2.5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-brand-600">
                        {card.phrase_en}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {card.ipa}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                      {card.meaning_vi}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => speakEnglish(card.sentence_en, 1.0)}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-brand-600 border border-slate-200"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 border border-slate-200"
                      title="Xóa thẻ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs space-y-0.5 pt-2 border-t border-slate-100">
                  <p className="text-slate-900 font-medium">{card.sentence_en}</p>
                  <p className="text-slate-500">{card.sentence_vi}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
