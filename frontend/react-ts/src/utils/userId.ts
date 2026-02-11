// src/utils/userId.ts
export const USER_ID_STORAGE_KEY = "mahjong:userId:v1";

function genUserId(): string {
  const anyCrypto = (globalThis as any).crypto;
  if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
  return `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function normalizeUserId(input: string | null | undefined): string | null {
  const s = (input ?? "").trim();
  return s.length > 0 ? s : null;
}

export function getOrCreateUserId(): string {
  try {
    const existing = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (existing && existing.trim()) return existing.trim();
  } catch {
    // ignore
  }

  const uid = genUserId();
  try {
    localStorage.setItem(USER_ID_STORAGE_KEY, uid);
  } catch {
    // ignore
  }
  return uid;
}
