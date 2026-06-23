import { persistLocalStorageKey } from "../storage";

export const VOLUME_KEY = "noctune-volume";
const DEFAULT_VOLUME = 75;

export function clampVolume(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function loadStoredVolume() {
  const raw = window.localStorage.getItem(VOLUME_KEY);
  if (raw === null) return DEFAULT_VOLUME;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? clampVolume(parsed) : DEFAULT_VOLUME;
}

export function saveStoredVolume(value: number) {
  persistLocalStorageKey(VOLUME_KEY, String(clampVolume(value)));
}
