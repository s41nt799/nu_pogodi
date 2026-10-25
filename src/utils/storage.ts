import { gameConfig } from '../game/config';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadHighScore(): number {
  const storage = getStorage();
  if (!storage) return 0;

  try {
    const raw = storage.getItem(gameConfig.highScoreStorageKey);
    if (!raw) return 0;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;

    return Math.floor(parsed);
  } catch {
    return 0;
  }
}

export function saveHighScore(score: number): void {
  const storage = getStorage();
  if (!storage) return;

  const value = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;

  try {
    storage.setItem(gameConfig.highScoreStorageKey, String(value));
  } catch {}
}
