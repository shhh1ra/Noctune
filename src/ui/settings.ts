const SETTINGS_KEY = "custom_spotify_settings_v1";

export type AppSettings = {
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
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
