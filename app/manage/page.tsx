"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  FolderPlus,
  Layers,
  Lock,
  Globe,
  Share2,
  CopyPlus,
  Play,
  Shield,
  Sparkles,
  AlertTriangle,
  FolderGit2,
  Users,
} from "lucide-react";
import {
  addCard,
  deleteCard,
  deleteCustomDeck,
  cloneDeckToMyLibrary,
  toggleDeckSharing,
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
import { Card, Deck, isSystemDeck, isSystemCard } from "@/lib/seedData";
import { speakEnglish } from "@/lib/speech";
import CreateDeckModal from "@/components/manage/CreateDeckModal";
import DeckCardItem from "@/components/manage/DeckCardItem";

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

  // Main Section Tab: "my-decks" | "system-decks" | "community-decks"
  const [mainTab, setMainTab] = useState<
    "my-decks" | "system-decks" | "community-decks"
  >("my-decks");

  // Sub Tab for adding cards: null | "single" | "batch"
  const [addingMode, setAddingMode] = useState<"single" | "batch" | null>(null);
  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Single Card Form State
  const [targetDeckId, setTargetDeckId] = useState("");
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
  const [selectedDeckFilter, setSelectedDeckFilter] = useState<string>("all");

  const refreshData = useCallback(async () => {
    const [loadedDecks, loadedCards] = await Promise.all([
      getDecks(),
      getCards(),
    ]);
    setDecks(loadedDecks);
    setCards(loadedCards);

    setSupabaseConfigured(hasSupabaseEnv());
    setForcedLocal(isForceLocalMode());
    setStorageMode(getActiveStorageMode());
  }, []);

  useEffect(() => {
    setCurrentUser(getStoredUserProfile());
    void refreshData();
    const handler = () => {
      setCurrentUser(getStoredUserProfile());
      void refreshData();
    };
    window.addEventListener("speakflow-auth-changed", handler);
    return () => window.removeEventListener("speakflow-auth-changed", handler);
  }, [refreshData]);

  function showToast(msg: string) {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(null);
    }, 3500);
  }

  const isAdmin = currentUser?.role === "admin";

  // Decks partitioned by ownership
  const myDecks = useMemo(() => {
    return decks.filter(
      (d) =>
        !d.is_system &&
        (d.user_id === currentUser?.id || (!currentUser && !d.user_id))
    );
  }, [decks, currentUser]);

  const systemDecks = useMemo(() => {
    return decks.filter((d) => d.is_system);
  }, [decks]);

  const communityDecks = useMemo(() => {
    return decks.filter(
      (d) =>
        !d.is_system &&
        d.is_public &&
        d.user_id !== currentUser?.id
    );
  }, [decks, currentUser]);

  // Set default target deck for new cards
  useEffect(() => {
    if (!targetDeckId) {
      if (myDecks.length > 0) {
        setTargetDeckId(myDecks[0].id);
      } else if (decks.length > 0) {
        setTargetDeckId(decks[0].id);
      }
    }
  }, [myDecks, decks, targetDeckId]);

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

    // Safety check: if target deck is a system deck and user is NOT admin, encourage creating personal deck
    if (isSystemDeck(targetDeckId) && !isAdmin) {
      showToast(
        "Không thể thêm câu vào bộ thẻ chuẩn của hệ thống. Vui lòng tạo bộ thẻ cá nhân để lưu từ vựng của bạn!"
      );
      setIsCreateDeckOpen(true);
      return;
    }

    await addCard({
      deck_id: targetDeckId || (myDecks[0]?.id ?? decks[0]?.id),
      phrase_en: phraseEn.trim(),
      ipa: ipa.trim() || "/.../",
      meaning_vi: meaningVi.trim() || sentenceVi.trim(),
      sentence_en: sentenceEn.trim(),
      sentence_vi: sentenceVi.trim(),
      context_note:
        contextNote.trim() || "Mẫu câu thực chiến tự thêm.",
    });

    setPhraseEn("");
    setIpa("");
    setMeaningVi("");
    setSentenceEn("");
    setSentenceVi("");
    setContextNote("");

    await refreshData();
    showToast("Đã thêm mẫu câu thành công vào kho của bạn!");
    setAddingMode(null);
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

      if (isSystemDeck(targetDeckId) && !isAdmin) {
        showToast(
          "Không thể nhập vào bộ thẻ chuẩn hệ thống. Vui lòng chọn hoặc tạo bộ thẻ cá nhân!"
        );
        return;
      }

      const created = await importCardsBatch(
        parsedItems,
        targetDeckId || (myDecks[0]?.id ?? decks[0]?.id)
      );

      if (created.length === 0) {
        showToast(
          "Không tìm thấy dữ liệu hợp lệ. Hãy kiểm tra các trường phrase_en, sentence_en, sentence_vi."
        );
        return;
      }

      await refreshData();
      showToast(`Đã nhập thành công ${created.length} mẫu câu mới!`);
      setAddingMode(null);
    } catch {
      showToast(
        "Định dạng JSON/CSV chưa hợp lệ. Hãy kiểm tra lại cú pháp."
      );
    }
  }

  async function handleDeleteCard(id: string) {
    const res = await deleteCard(id);
    if (res.success) {
      await refreshData();
      showToast("Đã xóa thẻ khỏi kho từ.");
    } else {
      showToast(res.message || "Không thể xóa thẻ học này.");
    }
  }

  async function handleDeleteDeck(deck: Deck) {
    if (!confirm(`Bạn có chắc muốn xóa bộ thẻ "${deck.title}" và toàn bộ câu trong bộ này?`)) {
      return;
    }
    const res = await deleteCustomDeck(deck.id);
    if (res.success) {
      await refreshData();
      showToast(`Đã xóa bộ thẻ "${deck.title}".`);
    } else {
      showToast(res.message || "Không thể xóa bộ thẻ này.");
    }
  }

  async function handleCloneDeck(deck: Deck) {
    try {
      const res = await cloneDeckToMyLibrary(deck.id);
      await refreshData();
      showToast(
        `Đã sao chép thành công bộ thẻ "${res.deck.title}" (${res.cardCount} mẫu câu) về kho cá nhân của bạn!`
      );
      setMainTab("my-decks");
    } catch {
      showToast("Có lỗi xảy ra khi sao chép bộ thẻ.");
    }
  }

  async function handleToggleShare(deck: Deck, nextPublic: boolean) {
    await toggleDeckSharing(deck.id, nextPublic);
    await refreshData();
    showToast(
      nextPublic
        ? `Bộ thẻ "${deck.title}" hiện đã được chia sẻ qua liên kết!`
        : `Bộ thẻ "${deck.title}" đã chuyển về chế độ Riêng tư.`
    );
  }

  async function handleResetSeed() {
    if (
      confirm(
        "Thao tác này sẽ khôi phục lại 6 bộ thẻ chuẩn hệ thống với 136 mẫu câu gốc. Tiếp tục?"
      )
    ) {
      resetLocalToSeed();
      await refreshData();
      showToast("Đã khôi phục danh sách mẫu câu gốc!");
    }
  }

  // Filtered Cards based on current active tab and search
  const visibleCards = useMemo(() => {
    let list: Card[] = [];
    if (mainTab === "my-decks") {
      const myDeckIds = new Set(myDecks.map((d) => d.id));
      list = cards.filter(
        (c) =>
          myDeckIds.has(c.deck_id) ||
          (c.user_id && c.user_id === currentUser?.id)
      );
    } else if (mainTab === "system-decks") {
      list = cards.filter((c) => isSystemCard(c) || isSystemDeck(c.deck_id));
    } else {
      const communityDeckIds = new Set(communityDecks.map((d) => d.id));
      list = cards.filter((c) => communityDeckIds.has(c.deck_id));
    }

    if (selectedDeckFilter !== "all") {
      list = list.filter((c) => c.deck_id === selectedDeckFilter);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (c) =>
        c.phrase_en.toLowerCase().includes(q) ||
        c.sentence_en.toLowerCase().includes(q) ||
        c.sentence_vi.toLowerCase().includes(q) ||
        c.meaning_vi.toLowerCase().includes(q)
    );
  }, [mainTab, cards, myDecks, communityDecks, currentUser, selectedDeckFilter, searchQuery]);

  if (currentUser?.status === "locked") {
    return <AccountLockScreen user={currentUser} />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Header & Storage Mode Status Toggle */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          {storageMode === "supabase" ? (
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Database className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 border border-amber-100">
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
              {cards.length} mẫu câu trong {decks.length} bộ chủ đề •{" "}
              {storageMode === "supabase" ? "Supabase Cloud" : "LocalStorage"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={handleResetSeed}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5"
              title="Khôi phục lại dữ liệu mẫu câu mặc định"
            >
              <RefreshCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Khôi phục gốc</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleStorageMode}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors shrink-0"
          >
            {storageMode === "supabase"
              ? "Chuyển sang Local"
              : "Kết nối Cloud"}
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs: Kho của tôi vs Kho Hệ Thống vs Khám phá Cộng đồng */}
      <div className="flex items-center justify-between border-b border-slate-200 gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setMainTab("my-decks");
              setSelectedDeckFilter("all");
            }}
            className={`pb-3 px-3.5 font-bold text-xs sm:text-sm border-b-2 transition-colors flex items-center gap-2 ${
              mainTab === "my-decks"
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FolderGit2 className="w-4 h-4" />
            <span>Kho của tôi</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600 font-semibold">
              {myDecks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMainTab("system-decks");
              setSelectedDeckFilter("all");
            }}
            className={`pb-3 px-3.5 font-bold text-xs sm:text-sm border-b-2 transition-colors flex items-center gap-2 ${
              mainTab === "system-decks"
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Shield className="w-4 h-4 text-indigo-500" />
            <span>Kho chuẩn Hệ thống</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-indigo-50 text-indigo-700 font-semibold">
              {systemDecks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMainTab("community-decks");
              setSelectedDeckFilter("all");
            }}
            className={`pb-3 px-3.5 font-bold text-xs sm:text-sm border-b-2 transition-colors flex items-center gap-2 ${
              mainTab === "community-decks"
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-500" />
            <span>Khám phá Cộng đồng</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 font-semibold">
              {communityDecks.length}
            </span>
          </button>
        </div>

        {/* Quick Action in Header */}
        <div className="pb-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateDeckOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Tạo bộ thẻ mới</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: KHO CỦA TÔI ================= */}
      {mainTab === "my-decks" && (
        <div className="space-y-6">
          {/* Sub-bar: Add Card toggles */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setAddingMode((prev) => (prev === "single" ? null : "single"))
                }
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  addingMode === "single"
                    ? "bg-brand-50 text-brand-700 border border-brand-200"
                    : "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-brand-600" />
                <span>Thêm câu đơn lẻ</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setAddingMode((prev) => (prev === "batch" ? null : "batch"))
                }
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  addingMode === "batch"
                    ? "bg-brand-50 text-brand-700 border border-brand-200"
                    : "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Nhập JSON / CSV</span>
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Bạn có {myDecks.length} bộ thẻ cá nhân
            </p>
          </div>

          {/* ADD SINGLE CARD DRAWER / FORM */}
          {addingMode === "single" && (
            <div className="bg-white border border-brand-200 rounded-3xl p-6 shadow-md animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-brand-600" />
                  <span>Tạo thẻ mẫu câu mới vào kho cá nhân</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setAddingMode(null)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Đóng
                </button>
              </div>

              <form onSubmit={handleCreateSingleCard} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Lưu vào bộ thẻ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetDeckId}
                    onChange={(e) => setTargetDeckId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-hidden focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  >
                    {myDecks.length > 0 ? (
                      myDecks.map((d) => (
                        <option key={d.id} value={d.id}>
                          📂 {d.title}
                        </option>
                      ))
                    ) : (
                      <option value="">
                        (Chưa có bộ thẻ cá nhân - Tạo mới bên dưới)
                      </option>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Cụm từ khóa *
                    </label>
                    <input
                      type="text"
                      value={phraseEn}
                      onChange={(e) => setPhraseEn(e.target.value)}
                      placeholder="VD: bring to the table"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-hidden focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Phiên âm IPA
                    </label>
                    <input
                      type="text"
                      value={ipa}
                      onChange={(e) => setIpa(e.target.value)}
                      placeholder="VD: /brɪŋ tuː ðə ˈteɪbl/"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-hidden focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nghĩa tiếng Việt của cụm từ *
                  </label>
                  <input
                    type="text"
                    value={meaningVi}
                    onChange={(e) => setMeaningVi(e.target.value)}
                    placeholder="VD: đóng góp giá trị độc đáo"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-hidden focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Câu tình huống Tiếng Việt *
                  </label>
                  <input
                    type="text"
                    value={sentenceVi}
                    onChange={(e) => setSentenceVi(e.target.value)}
                    placeholder="VD: Bạn có thể đóng góp giá trị gì cho dự án mới này?"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-hidden focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Câu giao tiếp Tiếng Anh hoàn chỉnh *
                  </label>
                  <input
                    type="text"
                    value={sentenceEn}
                    onChange={(e) => setSentenceEn(e.target.value)}
                    placeholder="VD: What unique value do you bring to the table for this project?"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-hidden focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Ghi chú ngữ cảnh
                  </label>
                  <input
                    type="text"
                    value={contextNote}
                    onChange={(e) => setContextNote(e.target.value)}
                    placeholder="VD: Cụm từ rất chuộng trong phỏng vấn và họp hành."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-hidden focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAddingMode(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs transition-colors"
                  >
                    Thêm vào kho
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* BATCH IMPORT DRAWER */}
          {addingMode === "batch" && (
            <div className="bg-white border border-brand-200 rounded-3xl p-6 shadow-md animate-in fade-in slide-in-from-top-2 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-brand-600" />
                  <span>Nhập hàng loạt câu từ JSON hoặc CSV</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setAddingMode(null)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Đóng
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBatchFormat("json");
                      setBatchText(SAMPLE_JSON_IMPORT);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                      batchFormat === "json"
                        ? "bg-brand-500 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBatchFormat("csv");
                      setBatchText(SAMPLE_CSV_IMPORT);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                      batchFormat === "csv"
                        ? "bg-brand-500 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    CSV
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Vào bộ:
                  </label>
                  <select
                    value={targetDeckId}
                    onChange={(e) => setTargetDeckId(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white"
                  >
                    {myDecks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <textarea
                rows={8}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                className="w-full px-3 py-2 font-mono text-xs rounded-xl border border-slate-200 text-slate-800 focus:outline-hidden focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddingMode(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleBatchImport}
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs transition-colors"
                >
                  Xác nhận nhập
                </button>
              </div>
            </div>
          )}

          {/* MY DECKS GRID */}
          {myDecks.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-8 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center border border-brand-100">
                <FolderPlus className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Bạn chưa có bộ thẻ cá nhân nào
                </h3>
                <p className="text-xs text-slate-500">
                  Tạo bộ thẻ của riêng bạn hoặc sao chép một bộ thẻ từ Kho chuẩn
                  hệ thống để tự do thêm từ vựng và câu phản xạ yêu thích!
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateDeckOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs transition-colors"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Tạo bộ thẻ đầu tiên</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMainTab("system-decks")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  <Shield className="w-4 h-4 text-indigo-500" />
                  <span>Khám phá kho hệ thống</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myDecks.map((deck) => {
                const count = cards.filter((c) => c.deck_id === deck.id).length;
                return (
                  <DeckCardItem
                    key={deck.id}
                    deck={deck}
                    cardCount={count}
                    isOwner={true}
                    isAdmin={isAdmin}
                    onDelete={handleDeleteDeck}
                    onToggleShare={handleToggleShare}
                    onCopyLinkSuccess={(link) =>
                      showToast(`Đã sao chép link chia sẻ: ${link}`)
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: KHO CHUẨN HỆ THỐNG ================= */}
      {mainTab === "system-decks" && (
        <div className="space-y-6">
          {/* Security Banner */}
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-900 space-y-1">
              <p className="font-bold">
                Giáo trình chuẩn SpeakFlow (Chỉ đọc & Bảo vệ toàn vẹn)
              </p>
              <p className="text-indigo-700 leading-relaxed">
                Gồm 6 bộ đề phản xạ 136 câu giao tiếp thực chiến được kiểm duyệt
                chặt chẽ. Nhằm bảo vệ chất lượng chung, học viên không thể xóa
                hoặc chỉnh sửa trực tiếp các thẻ này. Bạn có thể bấm nút{" "}
                <strong className="underline">&ldquo;Lưu về kho&rdquo;</strong> để sao chép
                toàn bộ sang kho cá nhân và tự do chỉnh sửa!
              </p>
            </div>
          </div>

          {/* System Decks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemDecks.map((deck) => {
              const count = cards.filter((c) => c.deck_id === deck.id).length;
              return (
                <DeckCardItem
                  key={deck.id}
                  deck={deck}
                  cardCount={count}
                  isOwner={false}
                  isAdmin={isAdmin}
                  onClone={handleCloneDeck}
                  onCopyLinkSuccess={(link) =>
                    showToast(`Đã sao chép link chia sẻ: ${link}`)
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: KHÁM PHÁ CỘNG ĐỒNG ================= */}
      {mainTab === "community-decks" && (
        <div className="space-y-6">
          {/* Community Info Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3">
            <Globe className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 space-y-1">
              <p className="font-bold">Thư viện Bộ thẻ Cộng đồng SpeakFlow</p>
              <p className="text-emerald-700 leading-relaxed">
                Các bộ thẻ hữu ích do người học khác chia sẻ công khai. Bạn có
                thể bấm <strong>&ldquo;Lưu về kho&rdquo;</strong> để sao chép bộ thẻ này vào
                tài khoản của mình và bắt đầu chu trình ôn luyện SM-2 độc lập.
              </p>
            </div>
          </div>

          {/* Community Decks Grid */}
          {communityDecks.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-8 text-center space-y-2 shadow-xs">
              <Users className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">
                Chưa có bộ thẻ cộng đồng nào khác
              </h3>
              <p className="text-xs text-slate-500">
                Hãy là người đầu tiên chia sẻ bộ thẻ cá nhân của bạn lên cộng
                đồng bằng cách bật công tắc &ldquo;Đang chia sẻ&rdquo;!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {communityDecks.map((deck) => {
                const count = cards.filter((c) => c.deck_id === deck.id).length;
                return (
                  <DeckCardItem
                    key={deck.id}
                    deck={deck}
                    cardCount={count}
                    isOwner={false}
                    isAdmin={isAdmin}
                    onClone={handleCloneDeck}
                    onCopyLinkSuccess={(link) =>
                      showToast(`Đã sao chép link chia sẻ: ${link}`)
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= CARD LIST & SEARCH SECTION ================= */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">
              Danh sách mẫu câu (
              {visibleCards.length})
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter by deck */}
            <select
              value={selectedDeckFilter}
              onChange={(e) => setSelectedDeckFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white"
            >
              <option value="all">Tất cả chủ đề</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.is_system ? "🏛️ " : "📂 "}
                  {d.title}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm cụm từ, câu..."
                className="pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 w-48 sm:w-60 focus:outline-hidden focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Card Grid */}
        {visibleCards.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Không tìm thấy mẫu câu nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {visibleCards.map((card) => {
              const isSys = isSystemCard(card) || isSystemDeck(card.deck_id);
              return (
                <div
                  key={card.id}
                  className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-brand-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-emerald-600">
                          {card.phrase_en}
                        </h4>
                        <p className="text-xs text-slate-400 font-mono">
                          {card.ipa}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => speakEnglish(card.sentence_en)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>

                        {/* DELETE BUTTON: ONLY for non-system cards OR if user is admin */}
                        {!isSys || isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteCard(card.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Xóa thẻ khỏi kho"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span
                            className="p-1.5 text-slate-300 cursor-not-allowed"
                            title="Thẻ học chuẩn hệ thống (Chỉ đọc)"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-slate-700">
                      {card.meaning_vi}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                    <p className="text-slate-900 font-medium">
                      {card.sentence_en}
                    </p>
                    <p className="text-slate-500">{card.sentence_vi}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE DECK MODAL */}
      <CreateDeckModal
        isOpen={isCreateDeckOpen}
        onClose={() => setIsCreateDeckOpen(false)}
        onSuccess={(newDeck) => {
          setTargetDeckId(newDeck.id);
          void refreshData();
          showToast(`Đã tạo thành công bộ thẻ "${newDeck.title}"!`);
          setMainTab("my-decks");
        }}
      />
    </div>
  );
}
