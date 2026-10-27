export interface WordCheckResult {
  word: string;
  matched: boolean;
}

export interface SpeechScoreResult {
  score: number; // 0 to 100
  feedback: string;
  level: "excellent" | "good" | "retry";
  wordBreakdown: WordCheckResult[];
}

/**
 * Normalize string for fair spoken comparison
 * Expands common contractions & strips punctuation
 */
export function normalizeSpeechText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/\bi'm\b/g, "i am")
    .replace(/\bcan't\b/g, "cannot")
    .replace(/\bwon't\b/g, "will not")
    .replace(/\bdon't\b/g, "do not")
    .replace(/\bdoesn't\b/g, "does not")
    .replace(/\bdidn't\b/g, "did not")
    .replace(/\bhaven't\b/g, "have not")
    .replace(/\bhasn't\b/g, "has not")
    .replace(/\blet's\b/g, "let us")
    .replace(/\bit's\b/g, "it is")
    .replace(/\bwe're\b/g, "we are")
    .replace(/\byou're\b/g, "you are")
    .replace(/\bthey're\b/g, "they are")
    .replace(/\bi'd\b/g, "i would")
    .replace(/\bwe've\b/g, "we have")
    .replace(/\bi've\b/g, "i have")
    .replace(/\bhere's\b/g, "here is")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Standard Levenshtein Distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Calculate speaking accuracy score using Levenshtein distance + word-by-word matching
 */
export function evaluateSpeechAccuracy(
  targetSentence: string,
  spokenTranscript: string
): SpeechScoreResult {
  const cleanTarget = normalizeSpeechText(targetSentence);
  const cleanSpoken = normalizeSpeechText(spokenTranscript);

  if (!cleanSpoken) {
    return {
      score: 0,
      feedback: "Chưa nghe rõ, bạn hãy thử đọc to hơn nhé!",
      level: "retry",
      wordBreakdown: targetSentence.split(" ").map((w) => ({
        word: w,
        matched: false,
      })),
    };
  }

  // Raw text without contraction expansion as well, take best of both
  const rawTarget = targetSentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const rawSpoken = spokenTranscript
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const distNormalized = levenshteinDistance(cleanTarget, cleanSpoken);
  const maxLenNormalized = Math.max(cleanTarget.length, cleanSpoken.length, 1);
  const simNormalized = Math.round(
    ((maxLenNormalized - distNormalized) / maxLenNormalized) * 100
  );

  const distRaw = levenshteinDistance(rawTarget, rawSpoken);
  const maxLenRaw = Math.max(rawTarget.length, rawSpoken.length, 1);
  const simRaw = Math.round(((maxLenRaw - distRaw) / maxLenRaw) * 100);

  // Word-by-word breakdown for visual highlighting
  const spokenWordsSet = new Set([
    ...cleanSpoken.split(" "),
    ...rawSpoken.split(" "),
  ]);

  const originalWords = targetSentence.split(" ");
  let matchedCount = 0;

  const wordBreakdown: WordCheckResult[] = originalWords.map((origWord) => {
    const stripped = origWord.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalizedWord = normalizeSpeechText(origWord);
    const isMatched =
      spokenWordsSet.has(stripped) ||
      normalizedWord.split(" ").every((w) => spokenWordsSet.has(w)) ||
      Array.from(spokenWordsSet).some(
        (sw) =>
          sw.length >= 3 &&
          stripped.length >= 3 &&
          levenshteinDistance(sw, stripped) <= 1
      );

    if (isMatched) matchedCount++;
    return {
      word: origWord,
      matched: isMatched,
    };
  });

  const wordRatioScore = Math.round(
    (matchedCount / Math.max(originalWords.length, 1)) * 100
  );

  // Combine character Levenshtein similarity and word match accuracy
  const bestCharSim = Math.max(simNormalized, simRaw);
  const score = Math.max(
    0,
    Math.min(100, Math.round(bestCharSim * 0.6 + wordRatioScore * 0.4))
  );

  let feedback = "Cần luyện thêm các từ màu vàng nhé!";
  let level: "excellent" | "good" | "retry" = "retry";

  if (score >= 85) {
    feedback = "Tuyệt vời! Phát âm rất chuẩn xác!";
    level = "excellent";
  } else if (score >= 65) {
    feedback = "Khá tốt! Chú ý các từ tô vàng để mượt hơn.";
    level = "good";
  }

  return {
    score,
    feedback,
    level,
    wordBreakdown,
  };
}

/**
 * Speak English text aloud using Web Speech API (window.speechSynthesis)
 */
export function speakEnglish(
  text: string,
  rate: number = 1.0,
  onEnd?: () => void
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  utterance.pitch = 1.0;

  // Prefer natural English voices if available on device
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice =
    voices.find(
      (v) =>
        v.lang.startsWith("en-US") &&
        (v.name.includes("Natural") ||
          v.name.includes("Google") ||
          v.name.includes("Samantha") ||
          v.name.includes("Guy"))
    ) ||
    voices.find((v) => v.lang.startsWith("en-US")) ||
    voices.find((v) => v.lang.startsWith("en"));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);
}

/**
 * Browser SpeechRecognition helper interface
 */
export interface SpeechRecognizerController {
  stop: () => void;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  );
}

/**
 * Start listening to user's voice using SpeechRecognition / webkitSpeechRecognition
 */
export function startSpeechRecognition(callbacks: {
  onInterimResult?: (transcript: string) => void;
  onFinalResult: (transcript: string) => void;
  onError?: (errorMsg: string) => void;
  onEnd?: () => void;
}): SpeechRecognizerController | null {
  if (typeof window === "undefined") return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognitionImpl =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionImpl) {
    callbacks.onError?.(
      "Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói (Hãy dùng Chrome, Edge hoặc Safari)."
    );
    return null;
  }

  const recognition = new SpeechRecognitionImpl();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let latestTranscript = "";
  let finalized = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onresult = (event: any) => {
    let interim = "";
    let finalStr = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcriptPiece = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalStr += transcriptPiece;
      } else {
        interim += transcriptPiece;
      }
    }

    if (finalStr) {
      latestTranscript = finalStr.trim();
      finalized = true;
      callbacks.onInterimResult?.(latestTranscript);
      callbacks.onFinalResult(latestTranscript);
    } else if (interim) {
      latestTranscript = interim.trim();
      callbacks.onInterimResult?.(latestTranscript);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onerror = (event: any) => {
    const errCode = event?.error || "unknown";
    if (errCode === "not-allowed") {
      callbacks.onError?.(
        "Vui lòng cấp quyền truy cập Micro trên trình duyệt để luyện nói."
      );
    } else if (errCode === "no-speech") {
      callbacks.onError?.("Không nhận diện được âm thanh. Hãy bấm mic và nói to hơn nhé!");
    } else if (errCode !== "aborted") {
      callbacks.onError?.(`Lỗi nhận diện giọng nói (${errCode}).`);
    }
  };

  recognition.onend = () => {
    if (!finalized && latestTranscript) {
      finalized = true;
      callbacks.onFinalResult(latestTranscript);
    }
    callbacks.onEnd?.();
  };

  try {
    recognition.start();
  } catch {
    callbacks.onError?.("Không thể khởi động Micro. Hãy thử lại.");
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    },
  };
}
