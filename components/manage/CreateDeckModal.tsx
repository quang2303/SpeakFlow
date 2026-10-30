"use client";

import { useState } from "react";
import {
  X,
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
  Lock,
  Globe,
} from "lucide-react";
import { createCustomDeck } from "@/lib/dataService";
import { Deck } from "@/lib/seedData";

const AVAILABLE_ICONS = [
  { name: "BookOpen", label: "Sách", Icon: BookOpen },
  { name: "Briefcase", label: "Công sở", Icon: Briefcase },
  { name: "Terminal", label: "Kỹ thuật", Icon: Terminal },
  { name: "MessageSquare", label: "Giao tiếp", Icon: MessageSquare },
  { name: "Plane", label: "Du lịch", Icon: Plane },
  { name: "Sparkles", label: "Đặc biệt", Icon: Sparkles },
  { name: "Zap", label: "Phản xạ", Icon: Zap },
  { name: "Award", label: "Thành tựu", Icon: Award },
  { name: "Coffee", label: "Đời sống", Icon: Coffee },
  { name: "Compass", label: "Định hướng", Icon: Compass },
  { name: "Heart", label: "Yêu thích", Icon: Heart },
];

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDeck: Deck) => void;
}

export default function CreateDeckModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateDeckModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("BookOpen");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Vui lòng nhập tên bộ thẻ.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const deck = await createCustomDeck({
        title: title.trim(),
        description: description.trim(),
        icon: selectedIcon,
        is_public: isPublic,
      });
      setTitle("");
      setDescription("");
      setIsPublic(false);
      onSuccess(deck);
      onClose();
    } catch {
      setError("Có lỗi xảy ra khi tạo bộ thẻ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Tạo bộ thẻ cá nhân mới
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự tổ chức từ vựng & mẫu câu phản xạ theo chuyên ngành của bạn
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tên bộ thẻ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Tiếng Anh Phỏng vấn Visa, Chuyên ngành Marketing..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Mô tả ngắn
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Tập hợp các mẫu câu phản xạ cần thiết khi trả lời câu hỏi của nhân viên lãnh sự."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none"
            />
          </div>

          {/* Icon Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Biểu tượng đại diện
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
              {AVAILABLE_ICONS.map((item) => {
                const IconComponent = item.Icon;
                const isSelected = selectedIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedIcon(item.name)}
                    className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-brand-500 text-white shadow-xs scale-105"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70"
                    }`}
                    title={item.label}
                  >
                    <IconComponent className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Quyền riêng tư & Chia sẻ
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-colors ${
                  !isPublic
                    ? "bg-brand-50/80 border-brand-300 text-brand-900"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Lock className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold">Riêng tư</p>
                  <p className="text-[11px] text-slate-500">
                    Chỉ bạn mới có thể xem và học
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-colors ${
                  isPublic
                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-900"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Globe className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold">Chia sẻ công khai</p>
                  <p className="text-[11px] text-slate-500">
                    Ai có link đều có thể xem và lưu
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5"
            >
              {loading ? "Đang tạo..." : "Tạo bộ thẻ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
