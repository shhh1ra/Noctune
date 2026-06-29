import { isTauri } from "@tauri-apps/api/core";
import { persistLocalStorageKey } from "../storage";

const appOrigin =
  typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:5173";
const defaultRedirectUri =
  isTauri()
    ? "http://127.0.0.1:43872/callback"
    : `${appOrigin}/callback`;
export const CLIENT_ID_KEY = "noctune_spotify_client_id";

export function getStoredSpotifyClientId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(CLIENT_ID_KEY)?.trim() ?? "";
}

export function getSpotifyClientId() {
  return getStoredSpotifyClientId();
}

export function saveSpotifyClientId(clientId: string) {
  if (typeof window === "undefined") return;
  const normalized = clientId.trim();
  if (normalized) {
    persistLocalStorageKey(CLIENT_ID_KEY, normalized);
  } else {
    persistLocalStorageKey(CLIENT_ID_KEY, null);
  }
}

export const spotifyConfig = {
  redirectUri: defaultRedirectUri,
  scopes: [
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "user-library-read",
    "user-library-modify",
    "playlist-read-private",
    "playlist-read-collaborative",
    "playlist-modify-private",
    "playlist-modify-public",
  ],
};
