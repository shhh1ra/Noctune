import { persistLocalStorageKey } from "../storage";
import { normalizeThemeId, ThemeId } from "./themes";

export const SETTINGS_KEY = "custom_spotify_settings_v1";

export type AppSettings = {
  themeId: ThemeId;
  rateLimitGuardEnabled: boolean;
  customAccentEnabled: boolean;
  customAccentColor: string;
  bordersEnabled: boolean;
  borderDockEnabled: boolean;
  borderAppEnabled: boolean;
  borderProfileEnabled: boolean;
  borderActiveNavEnabled: boolean;
  borderQueueEnabled: boolean;
};

export const defaultSettings: AppSettings = {
  themeId: "noctune",
  rateLimitGuardEnabled: true,
  customAccentEnabled: false,
  customAccentColor: "#1ed760",
  bordersEnabled: true,
  borderDockEnabled: true,
  borderAppEnabled: true,
  borderProfileEnabled: true,
  borderActiveNavEnabled: true,
  borderQueueEnabled: true,
};

export function loadSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const settings = { ...defaultSettings, ...JSON.parse(raw) };
    return { ...settings, themeId: normalizeThemeId(settings.themeId) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings) {
  persistLocalStorageKey(SETTINGS_KEY, JSON.stringify(settings));
}
