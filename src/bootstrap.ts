import { LYRICS_CACHE_KEY } from "./lyrics";
import { TOKEN_KEY, VERIFIER_KEY } from "./spotify/auth";
import { CLIENT_ID_KEY } from "./spotify/config";
import { hydrateLocalStorageKeys } from "./storage";
import { UI_CACHE_KEY } from "./ui/cache";
import { SETTINGS_KEY } from "./ui/settings";
import { VOLUME_KEY } from "./ui/volume";

export const RAIL_COLLAPSED_KEY = "custom-spotify-rail-collapsed";

const PERSISTED_KEYS = [
  TOKEN_KEY,
  VERIFIER_KEY,
  CLIENT_ID_KEY,
  SETTINGS_KEY,
  UI_CACHE_KEY,
  LYRICS_CACHE_KEY,
  RAIL_COLLAPSED_KEY,
  VOLUME_KEY,
];

export async function initializeAppStorage() {
  await hydrateLocalStorageKeys(PERSISTED_KEYS);
}
