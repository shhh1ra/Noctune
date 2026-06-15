const appOrigin =
  typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:5173";
const defaultRedirectUri =
  appOrigin === "http://tauri.localhost"
    ? "http://127.0.0.1:43872/callback"
    : `${appOrigin}/callback`;

export const spotifyConfig = {
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? "",
  redirectUri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI ?? defaultRedirectUri,
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
