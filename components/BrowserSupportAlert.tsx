"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Chrome, X } from "lucide-react";

export default function BrowserSupportAlert() {
  const [unsupported, setUnsupported] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Only check in browser
    if (typeof window === "undefined") return;

    try {
      const isDismissed =
        window.sessionStorage.getItem("speakflow_browser_alert_dismissed") === "true";
      if (isDismissed) {
        setDismissed(true);
        return;
      }

      const hasRecognition =
        "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
      if (!hasRecognition) {
        setUnsupported(true);
        setDismissed(false);
      }
    } catch {
      // ignore
    }
  }, []);

  if (!unsupported || dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    try {
      window.sessionStorage.setItem("speakflow_browser_alert_dismissed", "true");
    } catch {
      // ignore
    }
  }

  return (
    <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-3 text-amber-900 transition-all">
      <div className="max-w-5xl mx-auto flex items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-start sm:items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
          <p className="leading-snug">
            <strong className="font-semibold text-amber-950">
              Mẹo phát âm:
            </strong>{" "}
            Trình duyệt hiện tại chưa mở tính năng Nhận diện giọng nói (Web Speech). Bạn vẫn có thể học Flashcard & nghe audio bình thường, hoặc mở bằng{" "}
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 underline decoration-emerald-500 underline-offset-2">
              <Chrome className="w-3.5 h-3.5" /> Google Chrome / MS Edge
            </span>{" "}
            để luyện Shadowing & Phản xạ chuẩn nhất.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-amber-700 hover:text-amber-950 p-1 rounded-lg hover:bg-amber-100/60 transition-colors shrink-0"
          title="Đóng thông báo"
          aria-label="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
