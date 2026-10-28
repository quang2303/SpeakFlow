export interface WordEvaluation {
  originalWord: string; // Preserves original casing & punctuation for display
  cleanWord: string; // Normalized word
  status: "correct" | "incorrect" | "missing";
  spokenAs?: string; // What the mic actually heard if mispronounced
  similarity: number; // 0 to 100 based on character Levenshtein distance
}

export interface PronunciationEvaluationResult {
  score: number; // 0 to 100: round((correctWords / totalWords) * 100)
  correctCount: number;
  totalCount: number;
  feedback: string;
  level: "excellent" | "good" | "retry";
  words: WordEvaluation[];
  wordBreakdown: WordEvaluation[]; // Alias for backwards compatibility
  normalizedTarget: string;
  normalizedSpoken: string;
}

// Keep legacy type aliases so any existing imports remain valid
export type WordCheckResult = WordEvaluation;
export type SpeechScoreResult = PronunciationEvaluationResult;

export type MicVisualState = "idle" | "listening" | "processing" | "error";

/**
 * Dictionary of English contractions mapped to their expanded forms
 * Used for bidirectional equivalence matching (e.g. "i'm" <-> "i am", "gonna" <-> "going to")
 */
const CONTRACTION_MAP: Record<string, string> = {
  "i'm": "i am",
  "im": "i am",
  "can't": "cannot",
  "cant": "cannot",
  "won't": "will not",
  "wont": "will not",
  "don't": "do not",
  "dont": "do not",
  "doesn't": "does not",
  "doesnt": "does not",
  "didn't": "did not",
  "didnt": "did not",
  "haven't": "have not",
  "havent": "have not",
  "hasn't": "has not",
  "hasnt": "has not",
  "hadn't": "had not",
  "hadnt": "had not",
  "couldn't": "could not",
  "couldnt": "could not",
  "shouldn't": "should not",
  "shouldnt": "should not",
  "wouldn't": "would not",
  "wouldnt": "would not",
  "isn't": "is not",
  "isnt": "is not",
  "aren't": "are not",
  "arent": "are not",
  "wasn't": "was not",
  "wasnt": "was not",
  "weren't": "were not",
  "werent": "were not",
  "let's": "let us",
  "lets": "let us",
  "it's": "it is",
  "that's": "that is",
  "thats": "that is",
  "there's": "there is",
  "theres": "there is",
  "what's": "what is",
  "whats": "what is",
  "here's": "here is",
  "heres": "here is",
  "we're": "we are",
  "you're": "you are",
  "youre": "you are",
  "they're": "they are",
  "theyre": "they are",
  "i'd": "i would",
  "you'd": "you would",
  "he'd": "he would",
  "she'd": "she would",
  "we'd": "we would",
  "they'd": "they would",
  "we've": "we have",
  "weve": "we have",
  "i've": "i have",
  "ive": "i have",
  "you've": "you have",
  "youve": "you have",
  "they've": "they have",
  "theyve": "they have",
  "i'll": "i will",
  "we'll": "we will",
  "you'll": "you will",
  "youll": "you will",
  "they'll": "they will",
  "theyll": "they will",
  "he's": "he is",
  "she's": "she is",
  "gonna": "going to",
  "wanna": "want to",
  "gotta": "got to",
};

/**
 * Strip punctuation (. , ! ? " ' -), convert to lowercase, and normalize whitespace
 */
export function stripWordPunctuation(word: string): string {
  return word
    .toLowerCase()
    .replace(/['’`]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Expand contraction for a single token if applicable (e.g., "haven't" -> "have not")
 */
export function expandTokenContraction(rawWord: string): string {
  const lower = rawWord
    .toLowerCase()
    .replace(/['’`]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
  if (CONTRACTION_MAP[lower]) {
    return CONTRACTION_MAP[lower];
  }
  const noApostrophe = lower.replace(/'/g, "");
  if (CONTRACTION_MAP[noApostrophe]) {
    return CONTRACTION_MAP[noApostrophe];
  }
  return noApostrophe.replace(/[^a-z0-9]/g, "");
}

/**
 * Normalize full string for fair spoken comparison
 */
export function normalizeSpeechText(text: string): string {
  const cleaned = text
    .toLowerCase()
    .replace(/['’`]/g, "'")
    .replace(/[—–-]/g, " ")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((token) => expandTokenContraction(token))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Collapse two-word expanded forms in spoken tokens when the target uses a contraction,
 * or expand contractions in spoken tokens when the target uses the two-word form.
 */
function harmonizeSpokenTokensWithTarget(
  targetTokens: Array<{ originalWord: string; cleanWord: string; expanded: string }>,
  rawSpokenWords: string[]
): string[] {
  // First normalize spoken words keeping contractions intact where possible
  const spokenLower = rawSpokenWords
    .map((w) =>
      w
        .toLowerCase()
        .replace(/['’`]/g, "'")
        .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "")
    )
    .filter(Boolean);

  // Build reverse lookup: "i am" -> "im", "have not" -> "havent", "going to" -> "gonna"
  const targetCleanSet = new Set(targetTokens.map((t) => t.cleanWord));
  const targetExpandedForms = new Map<string, string>();
  for (const t of targetTokens) {
    if (t.expanded.includes(" ")) {
      targetExpandedForms.set(t.expanded, t.cleanWord);
    }
  }

  const harmonized: string[] = [];
  let i = 0;

  while (i < spokenLower.length) {
    const current = spokenLower[i];
    const next = i + 1 < spokenLower.length ? spokenLower[i + 1] : null;

    // Case A: User said 2 words (e.g. "have not" or "going to") and target has 1 contraction ("haven't" or "gonna")
    if (next) {
      const pair = `${current.replace(/[^a-z0-9]/g, "")} ${next.replace(
        /[^a-z0-9]/g,
        ""
      )}`;
      if (targetExpandedForms.has(pair)) {
        harmonized.push(targetExpandedForms.get(pair)!);
        i += 2;
        continue;
      }
    }

    // Case B: User said 1 contraction (e.g. "i'm" / "don't" / "gonna") and target has 2 separate words ("i am" / "do not" / "going to")
    const expandedCurrent = CONTRACTION_MAP[current] || CONTRACTION_MAP[current.replace(/'/g, "")];
    if (expandedCurrent && !targetCleanSet.has(current.replace(/[^a-z0-9]/g, ""))) {
      const parts = expandedCurrent.split(" ");
      if (parts.some((p) => targetCleanSet.has(p))) {
        harmonized.push(...parts);
        i += 1;
        continue;
      }
    }

    const stripped = current.replace(/[^a-z0-9]/g, "");
    if (stripped) {
      harmonized.push(stripped);
    }
    i += 1;
  }

  return harmonized;
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
 * Compute character-level Levenshtein similarity (0 to 100) between two words,
 * also checking contraction equivalence.
 */
export function calculateWordSimilarity(
  targetClean: string,
  targetExpanded: string,
  spokenClean: string
): number {
  if (!targetClean || !spokenClean) return 0;
  if (targetClean === spokenClean) return 100;

  const spokenExpanded = expandTokenContraction(spokenClean);
  if (targetExpanded && spokenExpanded && targetExpanded === spokenExpanded) {
    return 100;
  }

  // Common number words equivalence
  const numberMap: Record<string, string> = {
    "0": "zero",
    "1": "one",
    "2": "two",
    "3": "three",
    "4": "four",
    "5": "five",
    "6": "six",
    "7": "seven",
    "8": "eight",
    "9": "nine",
    "10": "ten",
    "20": "twenty",
  };
  const normT = numberMap[targetClean] || targetClean;
  const normS = numberMap[spokenClean] || spokenClean;
  if (normT === normS) return 100;

  const dist = levenshteinDistance(normT, normS);
  const maxLen = Math.max(normT.length, normS.length, 1);
  return Math.max(0, Math.round(((maxLen - dist) / maxLen) * 100));
}

/**
 * Dynamic Programming Sequence Alignment (Needleman-Wunsch / LCS approach)
 * Aligns `targetWords` with `spokenWords` so skipping or inserting a word never shifts the rest of the sentence.
 */
export function evaluatePronunciation(
  targetSentence: string,
  spokenTranscript: string
): PronunciationEvaluationResult {
  // Split target sentence while keeping compound hyphenated words split cleanly if needed, or keeping original tokens
  const rawTargetTokens = targetSentence
    .replace(/—/g, " — ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const targetTokens = rawTargetTokens
    .map((orig) => {
      const clean = stripWordPunctuation(orig);
      const expanded = expandTokenContraction(orig);
      return {
        originalWord: orig,
        cleanWord: clean,
        expanded,
      };
    })
    .filter((t) => t.cleanWord.length > 0);

  const rawSpokenTokens = spokenTranscript
    .replace(/[—–-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const spokenWords = harmonizeSpokenTokensWithTarget(
    targetTokens,
    rawSpokenTokens
  );

  const m = targetTokens.length;
  const n = spokenWords.length;

  if (m === 0) {
    return {
      score: 100,
      correctCount: 0,
      totalCount: 0,
      feedback: "Tuyệt vời!",
      level: "excellent",
      words: [],
      wordBreakdown: [],
      normalizedTarget: "",
      normalizedSpoken: "",
    };
  }

  if (n === 0) {
    const missingWords: WordEvaluation[] = targetTokens.map((t) => ({
      originalWord: t.originalWord,
      cleanWord: t.cleanWord,
      status: "missing",
      similarity: 0,
    }));
    return {
      score: 0,
      correctCount: 0,
      totalCount: m,
      feedback: "Chưa nghe rõ, bạn hãy thử đọc to hơn nhé!",
      level: "retry",
      words: missingWords,
      wordBreakdown: missingWords,
      normalizedTarget: normalizeSpeechText(targetSentence),
      normalizedSpoken: "",
    };
  }

  // Needleman-Wunsch DP Matrix
  // Scores:
  // - Exact / >=85% match: +100 + similarity * 0.2
  // - Partial / substitution alignment: similarity - 45 (only preferred over gap if similarity >= 30%)
  // - Gap penalty (skipping a target word or extra spoken word): -20
  const GAP_PENALTY = -20;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  const ptr: Array<Array<"ALIGN" | "SKIP_TARGET" | "SKIP_SPOKEN">> = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill("SKIP_TARGET")
  );

  for (let i = 1; i <= m; i++) {
    dp[i][0] = i * GAP_PENALTY;
    ptr[i][0] = "SKIP_TARGET";
  }
  for (let j = 1; j <= n; j++) {
    dp[0][j] = j * GAP_PENALTY;
    ptr[0][j] = "SKIP_SPOKEN";
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const t = targetTokens[i - 1];
      const s = spokenWords[j - 1];
      const sim = calculateWordSimilarity(t.cleanWord, t.expanded, s);

      let pairScore: number;
      if (sim >= 85) {
        pairScore = 100 + sim * 0.2;
      } else if (sim >= 35) {
        pairScore = sim - 35;
      } else {
        // Still allow aligning a single substituted word in place (better than 2 gaps = -40)
        pairScore = -30 + sim * 0.2;
      }

      const scoreAlign = dp[i - 1][j - 1] + pairScore;
      const scoreSkipTarget = dp[i - 1][j] + GAP_PENALTY;
      const scoreSkipSpoken = dp[i][j - 1] + GAP_PENALTY;

      if (scoreAlign >= scoreSkipTarget && scoreAlign >= scoreSkipSpoken) {
        dp[i][j] = scoreAlign;
        ptr[i][j] = "ALIGN";
      } else if (scoreSkipTarget >= scoreSkipSpoken) {
        dp[i][j] = scoreSkipTarget;
        ptr[i][j] = "SKIP_TARGET";
      } else {
        dp[i][j] = scoreSkipSpoken;
        ptr[i][j] = "SKIP_SPOKEN";
      }
    }
  }

  // Backtrack from (m, n) to (0, 0) to get exact alignment for each target word
  const alignedSpokenIndex: Array<number | null> = new Array(m).fill(null);
  let ci = m;
  let cj = n;

  while (ci > 0 || cj > 0) {
    if (ci > 0 && cj > 0 && ptr[ci][cj] === "ALIGN") {
      alignedSpokenIndex[ci - 1] = cj - 1;
      ci -= 1;
      cj -= 1;
    } else if (ci > 0 && (cj === 0 || ptr[ci][cj] === "SKIP_TARGET")) {
      alignedSpokenIndex[ci - 1] = null;
      ci -= 1;
    } else {
      cj -= 1;
    }
  }

  let correctCount = 0;

  const words: WordEvaluation[] = targetTokens.map((t, idx) => {
    const sIdx = alignedSpokenIndex[idx];
    if (sIdx === null || sIdx === undefined) {
      return {
        originalWord: t.originalWord,
        cleanWord: t.cleanWord,
        status: "missing",
        similarity: 0,
      };
    }

    const spokenWord = spokenWords[sIdx];
    const sim = calculateWordSimilarity(t.cleanWord, t.expanded, spokenWord);

    if (sim >= 85) {
      correctCount += 1;
      return {
        originalWord: t.originalWord,
        cleanWord: t.cleanWord,
        status: "correct",
        similarity: sim,
      };
    }

    return {
      originalWord: t.originalWord,
      cleanWord: t.cleanWord,
      status: "incorrect",
      spokenAs: spokenWord,
      similarity: sim,
    };
  });

  const score = Math.round((correctCount / Math.max(m, 1)) * 100);

  let feedback = "Chạm vào các chữ màu ĐỎ bên dưới để nghe phát âm chuẩn từng từ nhé!";
  let level: "excellent" | "good" | "retry" = "retry";

  if (score >= 85) {
    feedback = "Tuyệt vời! Bạn phát âm rất chuẩn xác!";
    level = "excellent";
  } else if (score >= 60) {
    feedback = "Khá tốt! Hãy chạm vào các từ màu ĐỎ để sửa phát âm nhé.";
    level = "good";
  }

  return {
    score,
    correctCount,
    totalCount: m,
    feedback,
    level,
    words,
    wordBreakdown: words,
    normalizedTarget: normalizeSpeechText(targetSentence),
    normalizedSpoken: normalizeSpeechText(spokenTranscript),
  };
}

/**
 * Alias for backwards compatibility across components
 */
export function evaluateSpeechAccuracy(
  targetSentence: string,
  spokenTranscript: string
): PronunciationEvaluationResult {
  return evaluatePronunciation(targetSentence, spokenTranscript);
}

// ============================================================================
// HARDENED TEXT-TO-SPEECH (TTS) FOR MOBILE BROWSERS (iOS SAFARI & ANDROID CHROME)
// ============================================================================

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesListenerInitialized = false;

/**
 * Select the highest-quality native English voice available.
 * Explicitly excludes Vietnamese voices (`vi` / `Vietnamese`) so English text
 * is never read with a Vietnamese TTS engine.
 */
function selectBestEnglishVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // Strictly filter for English voices only (en-US, en-GB, en_US, en_GB, etc.) and exclude any Vietnamese voice
  const englishVoices = voices.filter((v) => {
    const lang = (v.lang || "").replace("_", "-").toLowerCase();
    const name = (v.name || "").toLowerCase();
    if (lang.startsWith("vi") || name.includes("vietnam")) return false;
    return (
      lang.startsWith("en-us") ||
      lang.startsWith("en-gb") ||
      lang.startsWith("en")
    );
  });

  if (englishVoices.length === 0) return null;

  // Priority 1: Explicit top-tier mobile/desktop voices (Google US English, Samantha on iOS, Daniel on iOS/macOS)
  const priorityNames = [
    "google us english",
    "samantha",
    "daniel",
    "alex",
    "karen",
    "moira",
    "rishi",
    "natural",
    "premium",
    "enhanced",
    "siri",
    "microsoft aria",
    "microsoft guy",
    "microsoft jenny",
    "google uk english female",
    "google uk english male",
  ];

  for (const targetName of priorityNames) {
    const match = englishVoices.find((v) =>
      v.name.toLowerCase().includes(targetName)
    );
    if (match) return match;
  }

  // Priority 2: Any native en-US voice (prefer localService for zero latency on mobile)
  const enUsLocal = englishVoices.find(
    (v) =>
      v.lang.replace("_", "-").toLowerCase().startsWith("en-us") &&
      v.localService
  );
  if (enUsLocal) return enUsLocal;

  const enUsAny = englishVoices.find((v) =>
    v.lang.replace("_", "-").toLowerCase().startsWith("en-us")
  );
  if (enUsAny) return enUsAny;

  // Priority 3: Any native en-GB voice
  const enGbAny = englishVoices.find((v) =>
    v.lang.replace("_", "-").toLowerCase().startsWith("en-gb")
  );
  if (enGbAny) return enGbAny;

  // Priority 4: Any remaining English voice
  return englishVoices[0];
}

/**
 * Ensure voices are loaded (handles iOS Safari & Android Chrome async `onvoiceschanged` quirk)
 */
function ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }

  const synth = window.speechSynthesis;
  const current = synth.getVoices();
  if (current && current.length > 0) {
    cachedVoices = current;
    return Promise.resolve(current);
  }

  if (cachedVoices.length > 0) {
    return Promise.resolve(cachedVoices);
  }

  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      const loaded = synth.getVoices();
      if (loaded && loaded.length > 0) {
        cachedVoices = loaded;
      }
      resolve(cachedVoices);
    };

    const handleVoicesChanged = () => {
      synth.removeEventListener?.("voiceschanged", handleVoicesChanged);
      finish();
    };

    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", handleVoicesChanged);
    } else {
      synth.onvoiceschanged = handleVoicesChanged;
    }

    // Fallback timeout so iOS Safari never hangs if voiceschanged already fired or is delayed
    setTimeout(finish, 250);
  });
}

// Pre-warm voices listener in browser environment
if (
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  !voicesListenerInitialized
) {
  voicesListenerInitialized = true;
  try {
    cachedVoices = window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
    };
  } catch {
    // ignore
  }
}

let activeSpeechSafetyTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Speak English text aloud using Web Speech API (window.speechSynthesis)
 * Hardened for iOS Safari & Android Chrome:
 * - Cancels ongoing speech before starting new playback
 * - Resolves async `onvoiceschanged` voices list
 * - Forces native `en-US` / `en-GB` voice and never falls back to a Vietnamese voice
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

  const synth = window.speechSynthesis;

  if (activeSpeechSafetyTimer) {
    clearTimeout(activeSpeechSafetyTimer);
    activeSpeechSafetyTimer = null;
  }

  // Immediately cancel any queued or currently playing utterance so rapid taps don't queue up
  try {
    synth.cancel();
  } catch {
    // ignore
  }

  ensureVoicesLoaded().then((voices) => {
    try {
      // Cancel once more right before speaking in case another tap happened during voice resolution
      synth.cancel();

      // iOS Safari quirk: sometimes speechSynthesis gets stuck in a paused state
      if (synth.paused) {
        synth.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const bestVoice = selectBestEnglishVoice(voices);

      if (bestVoice) {
        utterance.voice = bestVoice;
        // Normalize lang tag (Android Chrome sometimes returns `en_US` with underscore)
        utterance.lang = bestVoice.lang.replace("_", "-") || "en-US";
      } else {
        utterance.lang = "en-US";
      }

      utterance.rate = rate;
      utterance.pitch = 1.0;

      let ended = false;
      const triggerEnd = () => {
        if (ended) return;
        ended = true;
        if (activeSpeechSafetyTimer) {
          clearTimeout(activeSpeechSafetyTimer);
          activeSpeechSafetyTimer = null;
        }
        onEnd?.();
      };

      utterance.onend = triggerEnd;
      utterance.onerror = triggerEnd;

      // Safety fallback timeout in case mobile browser drops the onend event
      const estimatedDurationMs = Math.max(
        2500,
        Math.ceil((text.length / 10) * (1000 / Math.max(rate, 0.5))) + 2000
      );
      activeSpeechSafetyTimer = setTimeout(triggerEnd, estimatedDurationMs);

      synth.speak(utterance);
    } catch {
      onEnd?.();
    }
  });
}

/**
 * Pronounce a single word or sentence at the specified rate (e.g. speakText(word.cleanWord, 0.7))
 */
export function speakText(
  text: string,
  rate: number = 0.7,
  onEnd?: () => void
): void {
  speakEnglish(text, rate, onEnd);
}

// ============================================================================
// HARDENED SPEECH RECOGNITION (STT / SHADOWING) FOR MOBILE & DESKTOP
// ============================================================================

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

// Track active recognition instance globally so starting a new one cleanly aborts any lingering session
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activeRecognitionInstance: any = null;

/**
 * Start listening to user's voice using SpeechRecognition / webkitSpeechRecognition
 */
export function startSpeechRecognition(callbacks: {
  onStateChange?: (state: MicVisualState) => void;
  onInterimResult?: (transcript: string) => void;
  onFinalResult: (transcript: string) => void;
  onError?: (errorMsg: string) => void;
  onEnd?: () => void;
}): SpeechRecognizerController | null {
  if (typeof window === "undefined") return null;

  // Cancel any ongoing TTS audio so the microphone doesn't record the speaker
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore
  }

  // Stop any previous active recognition instance
  if (activeRecognitionInstance) {
    try {
      activeRecognitionInstance.abort();
    } catch {
      // ignore
    }
    activeRecognitionInstance = null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognitionImpl =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionImpl) {
    callbacks.onStateChange?.("error");
    callbacks.onError?.(
      "Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói. Hãy mở bằng Safari (iOS) hoặc Chrome (Android/PC) nhé!"
    );
    return null;
  }

  const recognition = new SpeechRecognitionImpl();
  activeRecognitionInstance = recognition;

  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let latestTranscript = "";
  let finalized = false;
  let hasError = false;

  recognition.onstart = () => {
    callbacks.onStateChange?.("listening");
  };

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
      callbacks.onStateChange?.("processing");
      callbacks.onInterimResult?.(latestTranscript);
      callbacks.onFinalResult(latestTranscript);
      callbacks.onStateChange?.("idle");
    } else if (interim) {
      latestTranscript = interim.trim();
      callbacks.onInterimResult?.(latestTranscript);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onerror = (event: any) => {
    const errCode = event?.error || "unknown";
    if (errCode === "aborted") {
      if (!finalized) {
        callbacks.onStateChange?.("idle");
      }
      return;
    }

    hasError = true;
    callbacks.onStateChange?.("error");

    if (errCode === "not-allowed" || errCode === "service-not-allowed") {
      callbacks.onError?.(
        "Chưa có quyền truy cập Micro. Bạn hãy bấm vào biểu tượng ổ khóa / cài đặt trên thanh địa chỉ trình duyệt để Cho phép (Allow) Micro nhé!"
      );
    } else if (errCode === "no-speech") {
      callbacks.onError?.(
        "Không nghe thấy giọng nói. Hãy đưa điện thoại lại gần và nói to, rõ ràng hơn nhé!"
      );
    } else if (errCode === "audio-capture") {
      callbacks.onError?.(
        "Không tìm thấy thiết bị Micro hoặc Micro đang được ứng dụng khác sử dụng."
      );
    } else if (errCode === "network") {
      callbacks.onError?.(
        "Kết nối mạng bị gián đoạn khi xử lý giọng nói. Vui lòng kiểm tra Wi-Fi/4G và thử lại."
      );
    } else {
      callbacks.onError?.(
        `Không thể nhận diện giọng nói lúc này (${errCode}). Bạn hãy bấm thử lại nhé!`
      );
    }
  };

  recognition.onend = () => {
    if (activeRecognitionInstance === recognition) {
      activeRecognitionInstance = null;
    }
    if (!finalized && !hasError) {
      if (latestTranscript) {
        finalized = true;
        callbacks.onStateChange?.("processing");
        callbacks.onFinalResult(latestTranscript);
        callbacks.onStateChange?.("idle");
      } else {
        callbacks.onStateChange?.("idle");
      }
    }
    callbacks.onEnd?.();
  };

  try {
    callbacks.onStateChange?.("listening");
    recognition.start();
  } catch {
    hasError = true;
    callbacks.onStateChange?.("error");
    callbacks.onError?.(
      "Không thể khởi động Micro. Hãy tải lại trang hoặc kiểm tra quyền Micro trên trình duyệt."
    );
  }

  return {
    stop: () => {
      try {
        if (!finalized && latestTranscript) {
          callbacks.onStateChange?.("processing");
        }
        recognition.stop();
      } catch {
        // ignore
      }
    },
  };
}
