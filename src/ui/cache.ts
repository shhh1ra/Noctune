import { PlaylistSummary, SpotifyTrack } from "../spotify/api";

const UI_CACHE_KEY = "custom_spotify_ui_cache_v1";
const IMAGE_CACHE_NAME = "custom-spotify-images-v1";

type UiCache = {
  playlists: PlaylistSummary[];
  trackImages: Record<string, string>;
  updatedAt: number;
};

function readCache(): UiCache {
  const empty: UiCache = { playlists: [], trackImages: {}, updatedAt: 0 };
  const raw = localStorage.getItem(UI_CACHE_KEY);
  if (!raw) return empty;

  try {
    return { ...empty, ...(JSON.parse(raw) as Partial<UiCache>) };
  } catch {
    localStorage.removeItem(UI_CACHE_KEY);
    return empty;
  }
}

function writeCache(cache: UiCache) {
  localStorage.setItem(UI_CACHE_KEY, JSON.stringify({ ...cache, updatedAt: Date.now() }));
}

export function loadCachedPlaylists() {
  return readCache().playlists;
}

export function clearUiCache() {
  localStorage.removeItem(UI_CACHE_KEY);
}

export function saveCachedPlaylists(playlists: PlaylistSummary[]) {
  writeCache({ ...readCache(), playlists });
  void warmImageCache(playlists.map((playlist) => playlist.image));
}

export function rememberTrackImages(tracks: Array<SpotifyTrack | null | undefined>) {
  const cache = readCache();
  let changed = false;

  for (const track of tracks) {
    const image = track?.album.images?.[0]?.url;
    if (!track?.id || !image || cache.trackImages[track.id] === image) continue;
    cache.trackImages[track.id] = image;
    changed = true;
  }

  if (changed) writeCache(cache);
  void warmImageCache(tracks.map((track) => track?.album.images?.[0]?.url));
}

export function cachedTrackImage(track?: SpotifyTrack | null) {
  if (!track) return undefined;
  return track.album.images?.[0]?.url ?? readCache().trackImages[track.id];
}

export async function warmImageCache(urls: Array<string | null | undefined>) {
  const uniqueUrls = [...new Set(urls.filter((url): url is string => Boolean(url)))].slice(0, 80);
  if (!("caches" in window) || uniqueUrls.length === 0) return;

  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);

    for (const url of uniqueUrls) {
      try {
        const request = new Request(url, { mode: "no-cors" });
        const cached = await cache.match(request);
        if (cached) continue;

        const response = await fetch(request);
        await cache.put(request, response);
      } catch {
        // Image warmup is best-effort; the UI can still load the source URL normally.
      }
    }
  } catch {
    // Cache API can be unavailable in some renderer contexts.
  }
}
