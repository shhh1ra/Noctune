export const spotifyConfig = {
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? "",
  redirectUri:
    import.meta.env.VITE_SPOTIFY_REDIRECT_URI ?? "http://127.0.0.1:5173/callback",
  scopes: [
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "user-library-read",
    "playlist-read-private",
    "playlist-read-collaborative",
  ],
};
