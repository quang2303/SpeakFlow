"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  Zap,
  Heart,
  Sparkles,
  Plane,
  Terminal,
  Award,
  MessageSquare,
  Coffee,
  Compass,
  FileText,
  Lock,
  Globe,
  Share2,
  Copy,
  Check,
  Trash2,
  Play,
  CopyPlus,
  Users,
} from "lucide-react";
import { Deck } from "@/lib/seedData";

interface DeckCardItemProps {
  deck: Deck;
  cardCount: number;
  isOwner: boolean;
  isAdmin: boolean;
  onClone?: (deck: Deck) => void;
  onDelete?: (deck: Deck) => void;
  onToggleShare?: (deck: Deck, nextPublic: boolean) => void;
  onCopyLinkSuccess?: (link: string) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Briefcase,
  Terminal,
  MessageSquare,
  Plane,
  Sparkles,
  Zap,
  Award,
  Coffee,
  Compass,
  Heart,
  FileText,
  Users,
};

export default function DeckCardItem({
  deck,
  cardCount,
  isOwner,
  isAdmin,
  onClone,
  onDelete,
  onToggleShare,
  onCopyLinkSuccess,
}: DeckCardItemProps) {
  const [copied, setCopied] = useState(false);
  const IconComp = ICON_MAP[deck.icon] || BookOpen;

  function handleCopyShareLink(e: React.MouseEvent) {
    e.stopPropagation();
    const shareId = deck.share_code || deck.id;
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://speak-flow-kappa.vercel.app";
    const shareUrl = `${origin}/deck/${shareId}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopyLinkSuccess?.(shareUrl);
    }
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-brand-300 hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Top Badges & Icon */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100 group-hover:scale-105 transition-transform">
            <IconComp className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {deck.is_system ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                <Lock className="w-3 h-3" />
                <span>Chuẩn hệ thống</span>
              </span>
            ) : isOwner ? (
              <button
                type="button"
                onClick={() => onToggleShare?.(deck, !deck.is_public)}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                  deck.is_public
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/70 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                }`}
                title="Bấm để đổi trạng thái chia sẻ"
              >
                {deck.is_public ? (
                  <>
                    <Globe className="w-3 h-3 text-emerald-600" />
                    <span>Đang chia sẻ</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-slate-500" />
                    <span>Riêng tư</span>
                  </>
                )}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <Globe className="w-3 h-3" />
                <span>Cộng đồng</span>
              </span>
            )}

            {/* Author tag if not system */}
            {!deck.is_system && deck.author_name && (
              <span className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">
                bởi {deck.author_name}
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
          {deck.title}
        </h3>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">
          {deck.description || "Bộ thẻ phản xạ tiếng Anh thực chiến."}
        </p>

        {/* Card Count Pill */}
        <div className="mt-3 text-xs font-semibold text-slate-600 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          <span>{cardCount} mẫu câu phản xạ</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        {/* Study Button */}
        <Link
          href={`/study?deck_id=${deck.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold border border-brand-200/60 transition-colors"
        >
          <Play className="w-3.5 h-3.5 fill-brand-600 text-brand-600" />
          <span>Học ngay</span>
        </Link>

        <div className="flex items-center gap-1">
          {/* Share Link button if owner or public */}
          {(!deck.is_system || isOwner) && (
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
              title="Sao chép liên kết chia sẻ bộ thẻ này"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Clone/Fork button */}
          {(deck.is_system || !isOwner) && onClone && (
            <button
              type="button"
              onClick={() => onClone(deck)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              title="Sao chép toàn bộ câu về kho cá nhân để chỉnh sửa"
            >
              <CopyPlus className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Lưu về kho</span>
            </button>
          )}

          {/* Delete button (Only for Owner or Admin) */}
          {(isOwner || (isAdmin && !deck.is_system)) && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(deck)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Xóa bộ thẻ này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
