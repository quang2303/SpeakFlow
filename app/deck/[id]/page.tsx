"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CopyPlus,
  Play,
  Volume2,
  Share2,
  Check,
  Globe,
  Lock,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  cloneDeckToMyLibrary,
  getDeckWithCards,
  getStoredUserProfile,
} from "@/lib/dataService";
import { Card, Deck } from "@/lib/seedData";
import { speakEnglish } from "@/lib/speech";

export default function SharedDeckPage() {
  const params = useParams();
  const router = useRouter();
  const deckIdOrCode = params?.id as string;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadShared() {
      if (!deckIdOrCode) return;
      setLoading(true);
      const res = await getDeckWithCards(deckIdOrCode);
      if (res) {
        setDeck(res.deck);
        setCards(res.cards);
      }
      setLoading(false);
    }
    void loadShared();
  }, [deckIdOrCode]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  function handlePlayAudio(phrase: string) {
    setPlayingWord(phrase);
    speakEnglish(phrase);
    setTimeout(() => setPlayingWord(null), 1500);
  }

  function handleCopyLink() {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Đã sao chép liên kết chia sẻ vào bộ nhớ tạm!");
    }
  }

  async function handleClone() {
    if (!deck) return;
    setCloning(true);
    try {
      const res = await cloneDeckToMyLibrary(deck.id);
      showToast(
        `Đã lưu thành công bộ thẻ "${res.deck.title}" (${res.cardCount} mẫu câu) vào kho của bạn!`
      );
      setTimeout(() => {
        router.push("/manage");
      }, 1200);
    } catch {
      showToast("Có lỗi xảy ra khi lưu bộ thẻ. Vui lòng thử lại.");
    } finally {
      setCloning(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">
          Đang tải thông tin bộ thẻ...
        </p>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Không tìm thấy bộ thẻ
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Liên kết chia sẻ này có thể đã hết hạn hoặc đã bị xóa bởi tác giả.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-xs shadow-xs hover:bg-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về trang chủ SpeakFlow</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/manage"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Kho thẻ</span>
        </Link>

        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Đã sao chép link</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Chia sẻ</span>
            </>
          )}
        </button>
      </div>

      {/* Hero Deck Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center font-bold text-lg shadow-xs">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {deck.title}
                  </h1>
                  {deck.is_system ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      <Lock className="w-3 h-3" />
                      <span>Chuẩn hệ thống</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <Globe className="w-3 h-3" />
                      <span>Được chia sẻ</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Tác giả:{" "}
                  <span className="font-semibold text-slate-700">
                    {deck.author_name || (deck.is_system ? "SpeakFlow Curriculum" : "Học viên")}
                  </span>{" "}
                  • {cards.length} mẫu câu phản xạ
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href={`/study?deck_id=${deck.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
              >
                <Play className="w-4 h-4 fill-slate-700 text-slate-700" />
                <span>Học thử ngay</span>
              </Link>

              <button
                type="button"
                onClick={handleClone}
                disabled={cloning}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <CopyPlus className="w-4 h-4" />
                <span>{cloning ? "Đang lưu..." : "Lưu vào kho thẻ của tôi"}</span>
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
            {deck.description || "Bộ mẫu câu phản xạ thực chiến được cộng đồng chia sẻ."}
          </p>
        </div>
      </div>

      {/* Card Sample List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600" />
            <span>Danh sách mẫu câu trong bộ ({cards.length})</span>
          </h2>
          <span className="text-xs text-slate-500">
            Bấm vào loa để nghe phát âm giọng bản xứ
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {cards.map((card, idx) => (
            <div
              key={card.id || idx}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-brand-200 transition-all flex flex-col justify-between gap-3 group"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-emerald-600">
                      {card.phrase_en}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {card.ipa}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePlayAudio(card.sentence_en)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    title="Nghe phát âm"
                  >
                    <Volume2
                      className={`w-4 h-4 ${
                        playingWord === card.sentence_en
                          ? "text-brand-600 animate-pulse"
                          : ""
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs font-semibold text-slate-700">
                  {card.meaning_vi}
                </p>
              </div>

              <div className="pt-2.5 border-t border-slate-100 space-y-1 text-xs">
                <p className="font-medium text-slate-900">{card.sentence_en}</p>
                <p className="text-slate-500">{card.sentence_vi}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
