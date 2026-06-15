const appOrigin =
  typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:5173";
const defaultRedirectUri =
  appOrigin === "http://tauri.localhost"
    ? "http://127.0.0.1:43872/callback"
    : `${appOrigin}/callback`;
const CLIENT_ID_KEY = "noctune_spotify_client_id";

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
    window.localStorage.setItem(CLIENT_ID_KEY, normalized);
  } else {
    window.localStorage.removeItem(CLIENT_ID_KEY);
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
