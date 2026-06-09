import { SpotifyTokens, refreshTokens } from "./auth";

const API_ROOT = "https://api.spotify.com/v1";

export async function spotifyFetch<T>(
  path: string,
  tokens: SpotifyTokens,
  init: RequestInit = {},
): Promise<T> {
  const usableTokens =
    tokens.expiresAt - Date.now() < 60_000 ? await refreshTokens(tokens) : tokens;

  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${usableTokens.accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (response.status === 204) return undefined as T;
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Spotify request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type SpotifyImage = { url: string; width: number; height: number };
export type SpotifyTrack = {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  album: { name: string; images: SpotifyImage[] };
  artists: Array<{ name: string }>;
};

export type PlaybackState = {
  is_playing: boolean;
  progress_ms: number;
  item: SpotifyTrack | null;
  device: { id: string; name: string; type: string; is_active: boolean } | null;
};

export async function getPlayback(tokens: SpotifyTokens) {
  return spotifyFetch<PlaybackState>("/me/player", tokens);
}

export async function getDevices(tokens: SpotifyTokens) {
  return spotifyFetch<{
    devices: Array<{ id: string; name: string; type: string; is_active: boolean }>;
  }>("/me/player/devices", tokens);
}

export async function transferPlayback(tokens: SpotifyTokens, deviceId: string) {
  return spotifyFetch<void>("/me/player", tokens, {
    method: "PUT",
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
  });
}

export async function togglePlayback(tokens: SpotifyTokens, isPlaying: boolean) {
  return spotifyFetch<void>(isPlaying ? "/me/player/pause" : "/me/player/play", tokens, {
    method: "PUT",
  });
}

export async function skipNext(tokens: SpotifyTokens) {
  return spotifyFetch<void>("/me/player/next", tokens, { method: "POST" });
}

export async function skipPrevious(tokens: SpotifyTokens) {
  return spotifyFetch<void>("/me/player/previous", tokens, { method: "POST" });
}
