import { LyricsTrack } from "./lyrics";

const LRCLIB_GET_ENDPOINT = "https://lrclib.net/api/get";
const LRCLIB_SEARCH_ENDPOINT = "https://lrclib.net/api/search";
const LRCLIB_TIMEOUT_MS = 8000;

type LrclibLyricsResponse = {
  id?: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
};

function withTimeout() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), LRCLIB_TIMEOUT_MS);

  return {
    signal: controller.signal,
    done: () => window.clearTimeout(timeout),
  };
}

function secondsFromMs(ms?: number) {
  if (!ms || !Number.isFinite(ms)) return undefined;
  return Math.max(1, Math.round(ms / 1000));
}

function primaryArtist(track: LyricsTrack) {
  return track.artists[0]?.name ?? "";
}

function lyricsPayloadToFile(track: LyricsTrack, payload?: LrclibLyricsResponse | null) {
  const syncedLyrics = payload?.syncedLyrics?.trim();
  const plainLyrics = payload?.plainLyrics?.trim();

  if (syncedLyrics) {
    return {
      fileName: `${track.id ?? "track"}.lrc`,
      content: syncedLyrics,
    };
  }

  if (plainLyrics) {
    return {
      fileName: `${track.id ?? "track"}.txt`,
      content: plainLyrics,
    };
  }

  return null;
}

async function fetchJson<T>(url: string) {
  const request = withTimeout();

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: request.signal,
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`LRCLIB lyrics request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    request.done();
  }
}

async function fetchExactLyrics(track: LyricsTrack) {
  const params = new URLSearchParams({
    track_name: track.name,
    artist_name: primaryArtist(track),
    album_name: track.album.name,
  });
  const duration = secondsFromMs(track.duration_ms);

  if (duration) {
    params.set("duration", String(duration));
  }

  return fetchJson<LrclibLyricsResponse>(`${LRCLIB_GET_ENDPOINT}?${params.toString()}`);
}

async function searchLyrics(track: LyricsTrack) {
  const params = new URLSearchParams({
    track_name: track.name,
    artist_name: primaryArtist(track),
    album_name: track.album.name,
  });
  const duration = secondsFromMs(track.duration_ms);

  if (duration) {
    params.set("duration", String(duration));
  }

  const results = await fetchJson<LrclibLyricsResponse[]>(
    `${LRCLIB_SEARCH_ENDPOINT}?${params.toString()}`,
  );

  return results?.find((result) => result.syncedLyrics || result.plainLyrics) ?? null;
}

export async function fetchLyricsFromLrclib(track: LyricsTrack) {
  const exactMatch = await fetchExactLyrics(track);
  const exactLyrics = lyricsPayloadToFile(track, exactMatch);
  if (exactLyrics) return exactLyrics;

  return lyricsPayloadToFile(track, await searchLyrics(track));
}
