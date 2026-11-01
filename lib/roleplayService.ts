import {
  RoleplayMessage,
  RoleplaySession,
  SessionSummary,
  TutorCorrection,
} from "./ai/types";
import { getStoredUserProfile, getSupabaseClient } from "./dataService";

const STORAGE_KEYS = {
  SESSIONS: "speakflow_roleplay_sessions_v1",
  MESSAGES: "speakflow_roleplay_messages_v1",
};

function getStoragePrefix(): string {
  const user = getStoredUserProfile();
  return user?.id ? `user_${user.id}_` : "guest_";
}

/**
 * Retrieve all roleplay sessions for the active user
 */
export function getStoredSessions(): RoleplaySession[] {
  if (typeof window === "undefined") return [];
  try {
    const key = `${getStoragePrefix()}${STORAGE_KEYS.SESSIONS}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const list = JSON.parse(raw) as RoleplaySession[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Save or update a roleplay session
 */
export async function saveSession(session: RoleplaySession): Promise<RoleplaySession> {
  const activeUser = getStoredUserProfile();
  const sessionWithUser: RoleplaySession = {
    ...session,
    user_id: activeUser ? activeUser.id : null,
  };

  // 1. Save locally
  if (typeof window !== "undefined") {
    const key = `${getStoragePrefix()}${STORAGE_KEYS.SESSIONS}`;
    const existing = getStoredSessions();
    const idx = existing.findIndex((s) => s.id === session.id);
    let updated: RoleplaySession[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = sessionWithUser;
    } else {
      updated = [sessionWithUser, ...existing];
    }
    window.localStorage.setItem(key, JSON.stringify(updated));
  }

  // 2. Sync to Supabase if authenticated
  const supabase = getSupabaseClient();
  if (supabase && activeUser) {
    try {
      await supabase.from("roleplay_sessions").upsert({
        id: sessionWithUser.id,
        user_id: activeUser.id,
        scenario_id: sessionWithUser.scenario_id,
        topic: sessionWithUser.topic,
        cefr_level: sessionWithUser.cefr_level,
        user_role: sessionWithUser.user_role,
        ai_role: sessionWithUser.ai_role,
        learning_mode: sessionWithUser.learning_mode,
        correction_mode: sessionWithUser.correction_mode,
        started_at: sessionWithUser.started_at,
        completed_at: sessionWithUser.completed_at,
        status: sessionWithUser.status,
        summary: sessionWithUser.summary,
      });
    } catch {
      // Offline fallback already stored locally
    }
  }

  return sessionWithUser;
}

/**
 * Retrieve messages for a specific session
 */
export function getStoredSessionMessages(sessionId: string): RoleplayMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const key = `${getStoragePrefix()}${STORAGE_KEYS.MESSAGES}_${sessionId}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const list = JSON.parse(raw) as RoleplayMessage[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Append a message to a session
 */
export async function saveSessionMessage(
  message: RoleplayMessage
): Promise<RoleplayMessage> {
  if (typeof window !== "undefined") {
    const key = `${getStoragePrefix()}${STORAGE_KEYS.MESSAGES}_${message.session_id}`;
    const existing = getStoredSessionMessages(message.session_id);
    const updated = [...existing, message];
    window.localStorage.setItem(key, JSON.stringify(updated));
  }

  const supabase = getSupabaseClient();
  const activeUser = getStoredUserProfile();
  if (supabase && activeUser) {
    try {
      await supabase.from("roleplay_messages").insert({
        id: message.id,
        session_id: message.session_id,
        role: message.role,
        content: message.content,
        content_vi: message.content_vi || null,
        tutor_correction: message.tutor_correction || null,
        suggested_replies: message.suggested_replies || null,
        is_voice: Boolean(message.is_voice),
        audio_match_score: message.audio_match_score || null,
        created_at: message.created_at,
      });
    } catch {
      // Ignore cloud error, local storage has it
    }
  }

  return message;
}

/**
 * Delete a session and all its messages
 */
export async function deleteSession(sessionId: string): Promise<void> {
  if (typeof window !== "undefined") {
    const prefix = getStoragePrefix();
    const sessionsKey = `${prefix}${STORAGE_KEYS.SESSIONS}`;
    const existing = getStoredSessions();
    const filtered = existing.filter((s) => s.id !== sessionId);
    window.localStorage.setItem(sessionsKey, JSON.stringify(filtered));

    const messagesKey = `${prefix}${STORAGE_KEYS.MESSAGES}_${sessionId}`;
    window.localStorage.removeItem(messagesKey);
  }

  const supabase = getSupabaseClient();
  const activeUser = getStoredUserProfile();
  if (supabase && activeUser) {
    try {
      await supabase.from("roleplay_messages").delete().eq("session_id", sessionId);
      await supabase.from("roleplay_sessions").delete().eq("id", sessionId);
    } catch {
      // Ignore
    }
  }
}
