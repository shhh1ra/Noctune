import { PlaylistSummary, PlaylistTrack, SpotifyTrack } from "../spotify/api";
import {
  blobToDataUrl,
  persistLocalStorageKey,
  readStoredImage,
  writeStoredImage,
} from "../storage";

export const UI_CACHE_KEY = "custom_spotify_ui_cache_v1";

type UiCache = {
  playlists: PlaylistSummary[];
  playlistTracks: Record<string, CachedPlaylistTracks>;
  trackImages: Record<string, string>;
  trackAccents: Record<string, CachedTrackAccent>;
  updatedAt: number;
};

export type CachedAccent = {
  primary: string;
  muted: string;
  text: string;
};

type CachedTrackAccent = {
  imageUrl?: string;
  accent: CachedAccent;
  updatedAt: number;
};

type CachedPlaylistTracks = {
  snapshotId?: string;
  total: number;
  items: PlaylistTrack[];
  updatedAt: number;
};

function readCache(): UiCache {
  const empty: UiCache = {
    playlists: [],
    playlistTracks: {},
    trackImages: {},
    trackAccents: {},
    updatedAt: 0,
  };
  const raw = localStorage.getItem(UI_CACHE_KEY);
  if (!raw) return empty;

  try {
    return { ...empty, ...(JSON.parse(raw) as Partial<UiCache>) };
  } catch {
    persistLocalStorageKey(UI_CACHE_KEY, null);
    return empty;
  }
}

function writeCache(cache: UiCache) {
  persistLocalStorageKey(UI_CACHE_KEY, JSON.stringify({ ...cache, updatedAt: Date.now() }));
}

export function loadCachedPlaylists() {
  return readCache().playlists;
}

export function clearUiCache() {
  persistLocalStorageKey(UI_CACHE_KEY, null);
}

export function saveCachedPlaylists(playlists: PlaylistSummary[]) {
  writeCache({ ...readCache(), playlists });
  void warmImageCache(playlists.map((playlist) => playlist.image));
}

function playlistCacheKey(playlist: PlaylistSummary) {
  return `${playlist.kind}:${playlist.id}`;
}

export function mergeCachedPlaylistMetadata(playlists: PlaylistSummary[]) {
  const cachedPlaylists = readCache().playlists;

  return playlists.map((playlist) => {
    const cached = cachedPlaylists.find(
      (item) => item.kind === playlist.kind && item.id === playlist.id,
    );
    if (!cached) return playlist;

    const sameSnapshot =
      playlist.kind === "playlist" && playlist.snapshotId && playlist.snapshotId === cached.snapshotId;
    if (!sameSnapshot) return playlist;

    return {
      ...playlist,
      total: cached.total || playlist.total,
      image: playlist.image ?? cached.image,
      tracksHref: playlist.tracksHref ?? cached.tracksHref,
    };
  });
}

export function loadCachedPlaylistTracks(playlist: PlaylistSummary) {
  const cached = readCache().playlistTracks[playlistCacheKey(playlist)];
  if (!cached) return null;
  if (playlist.kind === "playlist" && playlist.snapshotId && cached.snapshotId !== playlist.snapshotId) {
    return null;
  }
  return cached;
}

export function saveCachedPlaylistTracks(
  playlist: PlaylistSummary,
  items: PlaylistTrack[],
  total: number,
) {
  const cache = readCache();
  cache.playlistTracks[playlistCacheKey(playlist)] = {
    snapshotId: playlist.snapshotId,
    total,
    items,
    updatedAt: Date.now(),
  };
  writeCache(cache);
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

const imageDataUrls = new Map<string, string>();

export async function getCachedImageObjectUrl(url?: string | null) {
  if (!url) return null;
  const existing = imageDataUrls.get(url);
  if (existing) return existing;

  const dataUrl = await readStoredImage(url);
  if (!dataUrl) return null;

  imageDataUrls.set(url, dataUrl);
  return dataUrl;
}

export async function cacheImageBlob(url?: string | null) {
  if (!url) return null;

  const cached = await getCachedImageObjectUrl(url);
  if (cached) return cached;

  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) throw new Error("Image download failed");

  const dataUrl = await blobToDataUrl(await response.blob());
  await writeStoredImage(url, dataUrl);

  imageDataUrls.set(url, dataUrl);
  return dataUrl;
}

export function loadCachedTrackAccent(trackId?: string | null, imageUrl?: string) {
  if (!trackId) return null;

  const cached = readCache().trackAccents[trackId];
  if (!cached) return null;
  if (imageUrl && cached.imageUrl && cached.imageUrl !== imageUrl) return null;

  return cached.accent;
}

export function saveCachedTrackAccent(
  trackId: string | undefined | null,
  imageUrl: string | undefined,
  accent: CachedAccent,
) {
  if (!trackId) return;

  const cache = readCache();
  cache.trackAccents[trackId] = {
    imageUrl,
    accent,
    updatedAt: Date.now(),
  };
  writeCache(cache);
}

export async function warmImageCache(urls: Array<string | null | undefined>) {
  const uniqueUrls = [...new Set(urls.filter((url): url is string => Boolean(url)))].slice(0, 80);
  if (uniqueUrls.length === 0) return;

  for (const url of uniqueUrls) {
    try {
      await cacheImageBlob(url);
    } catch {
      // Image warmup is best-effort; the UI can still load the source URL normally.
    }
  }
}
