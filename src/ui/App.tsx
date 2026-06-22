import {
  ChevronRight,
  ListPlus,
  Laptop,
  LogOut,
  ListMusic,
  LogIn,
  Maximize2,
  Minus,
  MonitorSpeaker,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Rows3,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useMemo, useRef, useState } from "react";
import { RAIL_COLLAPSED_KEY } from "../bootstrap";
import { LyricsView } from "../features/lyrics/LyricsView";
import { useLyrics } from "../features/lyrics/useLyrics";
import {
  buildLoginUrl,
  clearTokens,
  exchangeCodeForTokens,
  getStoredTokens,
  SpotifyTokens,
} from "../spotify/auth";
import {
  addToQueue,
  addTracksToPlaylist,
  getDevices,
  getAllMyPlaylists,
  getMe,
  getPlaylistTracks,
  getPlaylistTracksByHref,
  getPlayback,
  getQueue,
  getSavedTracks,
  isSpotifyAuthError,
  isSpotifyRateLimitError,
  playContext,
  playTrack,
  playTracks,
  PlaylistSummary,
  PlaylistTrack,
  PlaybackState,
  QueueState,
  removeSavedTracks,
  removeTracksFromPlaylist,
  searchTracks,
  seekPlayback,
  setPlaybackVolume,
  setRepeat,
  setShuffle,
  skipNext,
  skipPrevious,
  SpotifyDevice,
  SpotifyTrack,
  SpotifyUser,
  togglePlayback,
  transferPlayback,
} from "../spotify/api";
import { createWebPlaybackDevice, WebPlaybackDevice } from "../spotify/webPlayback";
import {
  getSpotifyClientId,
  getStoredSpotifyClientId,
  saveSpotifyClientId,
  spotifyConfig,
} from "../spotify/config";
import {
  cacheImageBlob,
  cachedTrackImage,
  clearUiCache,
  getCachedImageObjectUrl,
  loadCachedPlaylists,
  loadCachedPlaylistTracks,
  mergeCachedPlaylistMetadata,
  rememberTrackImages,
  saveCachedPlaylists,
  saveCachedPlaylistTracks,
} from "./cache";
import { persistLocalStorageKey } from "../storage";
import { PlayerDock } from "./components/PlayerDock";
import { AppSettings, loadSettings, saveSettings } from "./settings";
import { preloadTrackAccent, useAccent } from "./useAccent";

type View = "now" | "playlists" | "search" | "devices" | "lyrics";
type TrackMenuState = {
  track: SpotifyTrack;
  sourcePlaylist?: PlaylistSummary | null;
  x: number;
  y: number;
} | null;

function loadRailCollapsed() {
  return window.localStorage.getItem(RAIL_COLLAPSED_KEY) === "true";
}

function saveRailCollapsed(collapsed: boolean) {
  persistLocalStorageKey(RAIL_COLLAPSED_KEY, String(collapsed));
}

function formatTime(ms = 0) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function bestImage(track?: SpotifyTrack | null) {
  return cachedTrackImage(track);
}

function playlistImage(playlist: PlaylistSummary) {
  return playlist.image;
}

function playlistTrack(item: PlaylistTrack) {
  return item.track ?? item.item ?? null;
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  if (/^[0-9a-f]{6}$/i.test(trimmed)) return `#${trimmed}`;
  return null;
}

function playlistStatusMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  return error.message;
}

function profileInitial(profile?: SpotifyUser | null) {
  return (profile?.display_name?.trim()[0] ?? profile?.id?.trim()[0] ?? "?").toUpperCase();
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getRuntimePlatform() {
  const desktopPlatform = window.desktop?.platform?.toLowerCase() ?? "";
  const navigatorPlatform = navigator.platform?.toLowerCase() ?? "";
  const userAgent = navigator.userAgent.toLowerCase();

  if (
    desktopPlatform.includes("darwin") ||
    desktopPlatform.includes("mac") ||
    navigatorPlatform.includes("mac") ||
    userAgent.includes("mac os")
  ) {
    return "macos";
  }

  return desktopPlatform || navigatorPlatform || "desktop";
}

const appWindow = getCurrentWindow();

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function isNativeSpaceTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("button, a, [role='button']"));
}

export function App() {
  const [tokens, setTokens] = useState<SpotifyTokens | null>(() => getStoredTokens());
  const [profile, setProfile] = useState<SpotifyUser | null>(null);
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [webDevice, setWebDevice] = useState<WebPlaybackDevice | null>(null);
  const autoSelectedWebDeviceId = useRef<string | null>(null);
  const globalSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState("Ready");
  const [view, setView] = useState<View>("now");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>(() => loadCachedPlaylists());
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistSummary | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrack[]>([]);
  const [playlistTrackQuery, setPlaylistTrackQuery] = useState("");
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [loadingMoreTracks, setLoadingMoreTracks] = useState(false);
  const [playlistHasMore, setPlaylistHasMore] = useState(false);
  const [playlistOffset, setPlaylistOffset] = useState(0);
  const [playlistScrolled, setPlaylistScrolled] = useState(false);
  const [localVolume, setLocalVolume] = useState(75);
  const [busy, setBusy] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authExpiredOpen, setAuthExpiredOpen] = useState(false);
  const [trackMenu, setTrackMenu] = useState<TrackMenuState>(null);
  const [railCollapsed, setRailCollapsed] = useState(() => loadRailCollapsed());
  const [queueVisible, setQueueVisible] = useState(true);
  const [pocketQueueTracks, setPocketQueueTracks] = useState<SpotifyTrack[]>([]);
  const [manualQueueUris, setManualQueueUris] = useState<string[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadSettings());
  const runtimePlatform = useMemo(() => getRuntimePlatform(), []);
  const isMacOs = runtimePlatform === "macos";
  const [spotifyClientId, setSpotifyClientId] = useState(() => getStoredSpotifyClientId());
  const [spotifyClientIdDraft, setSpotifyClientIdDraft] = useState(
    () => getStoredSpotifyClientId() || getSpotifyClientId(),
  );
  const [clientIdPromptOpen, setClientIdPromptOpen] = useState(() => !getSpotifyClientId());
  const [localProgress, setLocalProgress] = useState(0);
  const [cachedImageUrls, setCachedImageUrls] = useState<Record<string, string>>({});
  const playlistLoadVersion = useRef(0);
  const libraryRateLimitUntil = useRef(0);
  const previousGlowTrackUri = useRef<string | null>(null);
  const preloadedVisualTrackUris = useRef<Set<string>>(new Set());
  const optimisticTransitionFromUri = useRef<string | null>(null);
  const pocketQueueLockedUntil = useRef(0);
  const profileExpandedRail = useRef(false);
  const [glowEntering, setGlowEntering] = useState(false);

  const track = playback?.item ?? null;
  const rawCover = bestImage(track);
  const cover = rawCover ? cachedImageUrls[rawCover] ?? rawCover : undefined;
  const accent = useAccent(rawCover, track?.id);
  const customAccent = normalizeHexColor(appSettings.customAccentColor);
  const activeAccent =
    appSettings.customAccentEnabled && customAccent
      ? { primary: customAccent, muted: customAccent }
      : accent;
  const activeControlAccent =
    appSettings.customAccentEnabled && customAccent ? customAccent : "#1ed760";

  const artists = useMemo(
    () => track?.artists.map((artist) => artist.name).join(", ") ?? "No active track",
    [track],
  );
  const lyrics = useLyrics({
    track,
    progressMs: localProgress,
    active: view === "lyrics",
    onStatus: setStatus,
  });

  useEffect(() => {
    document.title = track ? `${track.name} - ${artists}` : "Noctune";

    if (!("mediaSession" in navigator)) return;

    if (!track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "Noctune",
        artist: "No active track",
      });
      return;
    }

    const artwork = cover
      ? [
          { src: cover, sizes: "96x96", type: "image/jpeg" },
          { src: cover, sizes: "128x128", type: "image/jpeg" },
          { src: cover, sizes: "256x256", type: "image/jpeg" },
          { src: cover, sizes: "512x512", type: "image/jpeg" },
        ]
      : undefined;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: artists,
      album: track.album.name,
      artwork,
    });
  }, [artists, cover, track]);

  const activeDeviceId = playback?.device?.id ?? devices.find((device) => device.is_active)?.id;
  const targetDeviceId = webDevice?.deviceId ?? activeDeviceId;
  const webPlaybackDeviceActive = Boolean(
    webDevice &&
      (activeDeviceId === webDevice.deviceId ||
        playback?.device?.id === "web-playback" ||
        devices.some((device) => device.id === webDevice.deviceId && device.is_active)),
  );
  const visibleDevices = useMemo(
    () => devices.filter((device) => device.id !== webDevice?.deviceId),
    [devices, webDevice?.deviceId],
  );
  const volume = playback?.device?.volume_percent ?? localVolume;
  const duration = track?.duration_ms ?? 0;
  const remainingMs = duration ? Math.max(0, duration - localProgress) : 0;
  const glowOutroStartMs = 8000;
  const glowOutroEndMs = 3000;
  const glowFadeMs = 500;
  const outroProgress =
    playback?.is_playing && duration && remainingMs <= glowOutroStartMs
      ? Math.min(
          1,
          (glowOutroStartMs - remainingMs) / (glowOutroStartMs - glowOutroEndMs),
        )
      : 0;
  const glowScale = Math.max(0.06, 1 - outroProgress * 0.94);
  const glowOpacity =
    playback?.is_playing && duration && remainingMs <= glowOutroEndMs + glowFadeMs
      ? Math.max(0, Math.min(1, (remainingMs - glowOutroEndMs) / glowFadeMs))
      : 1;
  const profileImage = profile?.images?.[0]?.url;
  const nextQueueTracks = pocketQueueTracks.slice(0, 5);
  const targetPlaylists = useMemo(
    () => playlists.filter((playlist) => playlist.kind === "playlist" && playlist.editable),
    [playlists],
  );
  const visiblePlaylistTracks = useMemo(() => {
    const normalizedQuery = playlistTrackQuery.trim().toLowerCase();
    if (!normalizedQuery) return playlistTracks;

    return playlistTracks.filter((item) => {
      const itemTrack = playlistTrack(item);
      if (!itemTrack) return false;

      const haystack = [
        itemTrack.name,
        itemTrack.album.name,
        ...itemTrack.artists.map((artist) => artist.name),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [playlistTrackQuery, playlistTracks]);

  function displayTrackImage(displayTrack?: SpotifyTrack | null) {
    const imageUrl = bestImage(displayTrack);
    return imageUrl ? cachedImageUrls[imageUrl] ?? imageUrl : undefined;
  }

  function rememberLocalImage(sourceUrl: string, localUrl: string | null) {
    if (!localUrl || localUrl === cachedImageUrls[sourceUrl]) return;
    setCachedImageUrls((current) =>
      current[sourceUrl] === localUrl ? current : { ...current, [sourceUrl]: localUrl },
    );
  }

  function queueTracksFromState(state?: QueueState | null, currentUri?: string | null) {
    return (
      state?.queue.filter(
        (item) => item?.uri && (!currentUri || item.uri !== currentUri),
      ) ?? []
    );
  }

  function syncPocketQueue(state?: QueueState | null, force = false, currentUri?: string | null) {
    if (force) pocketQueueLockedUntil.current = 0;
    if (!force && Date.now() < pocketQueueLockedUntil.current) return;
    setPocketQueueTracks(queueTracksFromState(state, currentUri));
  }

  function isLibraryRateLimited() {
    return appSettings.rateLimitGuardEnabled && Date.now() < libraryRateLimitUntil.current;
  }

  function handleLibraryRateLimit(
    error: unknown,
    fallback = "Spotify is rate limiting playlists. Using cached library.",
  ) {
    if (!isSpotifyRateLimitError(error)) return false;

    if (!appSettings.rateLimitGuardEnabled) {
      setStatus("Rate limit guard is off, but Spotify still rejected this request.");
      return true;
    }

    libraryRateLimitUntil.current = Math.max(
      libraryRateLimitUntil.current,
      Date.now() + error.retryAfterMs,
    );
    setStatus(fallback);
    return true;
  }

  function updateSettings(nextSettings: AppSettings, message?: string) {
    setAppSettings(nextSettings);
    saveSettings(nextSettings);
    if (message) setStatus(message);
  }

  function saveClientIdFromDraft(message = "Spotify client id saved") {
    const normalized = spotifyClientIdDraft.trim();
    if (!normalized) {
      setStatus("Spotify client id is required");
      return false;
    }

    saveSpotifyClientId(normalized);
    setSpotifyClientId(normalized);
    setSpotifyClientIdDraft(normalized);
    setClientIdPromptOpen(false);
    setStatus(message);
    return true;
  }

  function setRailCollapsedPersisted(collapsed: boolean) {
    profileExpandedRail.current = false;
    setRailCollapsed(collapsed);
    saveRailCollapsed(collapsed);
  }

  function closeProfileMenu() {
    setProfileMenuOpen(false);
    if (profileExpandedRail.current) {
      profileExpandedRail.current = false;
      setRailCollapsed(true);
    }
  }

  function toggleProfileMenu() {
    if (profileMenuOpen) {
      closeProfileMenu();
      return;
    }

    if (railCollapsed) {
      profileExpandedRail.current = true;
      setRailCollapsed(false);
    }
    setProfileMenuOpen(true);
  }

  function prepareTrackVisuals(nextTrack?: SpotifyTrack | null) {
    const nextImage = bestImage(nextTrack);
    if (!nextTrack?.id || !nextTrack.uri || !nextImage) return;
    if (preloadedVisualTrackUris.current.has(nextTrack.uri)) return;

    preloadedVisualTrackUris.current.add(nextTrack.uri);
    rememberTrackImages([nextTrack]);
    void getCachedImageObjectUrl(nextImage)
      .then((localUrl) => rememberLocalImage(nextImage, localUrl))
      .catch(() => undefined);
    void cacheImageBlob(nextImage)
      .then((localUrl) => {
        rememberLocalImage(nextImage, localUrl);
        return preloadTrackAccent(nextTrack.id, nextImage, localUrl);
      })
      .catch(() => {
        preloadedVisualTrackUris.current.delete(nextTrack.uri);
        return preloadTrackAccent(nextTrack.id, nextImage);
      })
      .catch(() => preloadedVisualTrackUris.current.delete(nextTrack.uri));
  }

  function applyOptimisticNext(syncAfterMs = 0, queueLockMs = syncAfterMs) {
    if (!track?.uri) return null;

    const currentPocketQueue =
      pocketQueueTracks.length > 0 ? pocketQueueTracks : queueTracksFromState(queueState, track.uri);
    const nextTrack = currentPocketQueue[0];
    if (!nextTrack?.uri) return null;

    optimisticTransitionFromUri.current = track.uri;
    if (queueLockMs > 0) {
      pocketQueueLockedUntil.current = Date.now() + queueLockMs;
    }
    prepareTrackVisuals(nextTrack);
    prepareTrackVisuals(currentPocketQueue[1]);

    setPlayback((current) =>
      current
        ? {
            ...current,
            item: nextTrack,
            progress_ms: 0,
            is_playing: true,
          }
        : current,
    );
    setLocalProgress(0);
    setPocketQueueTracks(currentPocketQueue.slice(1));
    setQueueState((current) =>
      current
        ? {
            currently_playing: nextTrack,
            queue: current.queue.slice(1),
          }
        : current,
    );

    if (!tokens || syncAfterMs <= 0) return [];

    const syncTimers = [
      window.setTimeout(() => {
        void refreshState(tokens, false).catch((error) => {
          if (handleAuthExpired(error)) return;
          setStatus(error instanceof Error ? error.message : "Waiting for Spotify");
        });
      }, syncAfterMs),
    ];

    if (queueLockMs > syncAfterMs) {
      syncTimers.push(
        window.setTimeout(() => {
          void refreshState(tokens, true).catch((error) => {
            if (handleAuthExpired(error)) return;
            setStatus(error instanceof Error ? error.message : "Waiting for Spotify");
          });
        }, queueLockMs),
      );
    }

    return syncTimers;
  }

  function applyOptimisticTrackSelection(
    nextTrack: SpotifyTrack,
    nextQueue: SpotifyTrack[] = [],
    queueLockMs = 2500,
  ) {
    optimisticTransitionFromUri.current = track?.uri ?? null;
    pocketQueueLockedUntil.current = Date.now() + queueLockMs;
    prepareTrackVisuals(nextTrack);
    prepareTrackVisuals(nextQueue[0]);

    setPlayback((current) =>
      current
        ? {
            ...current,
            item: nextTrack,
            progress_ms: 0,
            is_playing: true,
          }
        : {
            is_playing: true,
            progress_ms: 0,
            repeat_state: playback?.repeat_state,
            shuffle_state: playback?.shuffle_state,
            item: nextTrack,
            device: playback?.device ?? null,
          },
    );
    setLocalProgress(0);
    setPocketQueueTracks(nextQueue);
  }

  async function restoreShuffleLater(shouldRestore: boolean) {
    if (!tokens || !shouldRestore) return;
    await delay(1200);
    await setShuffle(tokens, true);
  }

  async function ensurePlaybackDevice() {
    if (!tokens) return targetDeviceId;
    const deviceId = webDevice?.deviceId ?? targetDeviceId;
    if (webDevice?.deviceId && activeDeviceId !== webDevice.deviceId) {
      await transferPlayback(tokens, webDevice.deviceId, false);
      await delay(250);
      return webDevice.deviceId;
    }
    return deviceId;
  }

  function resetSession(clearCache = false) {
    clearTokens();
    setTokens(null);
    setProfile(null);
    setPlayback(null);
    setQueueState(null);
    setPocketQueueTracks([]);
    setDevices([]);
    setWebDevice(null);
    setSelectedPlaylist(null);
    setPlaylistTracks([]);
    setPlaylistTrackQuery("");
    closeProfileMenu();
    if (clearCache) {
      setPlaylists([]);
      clearUiCache();
    }
  }

  function handleAuthExpired(error: unknown) {
    if (!isSpotifyAuthError(error)) return false;

    resetSession(false);
    setAuthExpiredOpen(true);
    setStatus("Spotify session expired");
    return true;
  }

  function spotifyErrorMessage(error: unknown, fallback: string) {
    if (isSpotifyRateLimitError(error)) return error.message;
    if (error instanceof Error) return error.message;
    return fallback;
  }

  async function refreshState(nextTokens = tokens, forcePocketQueueSync = false) {
    if (!nextTokens) return;
    const [nextPlayback, nextDevices, nextQueue] = await Promise.all([
      getPlayback(nextTokens),
      getDevices(nextTokens),
      getQueue(nextTokens).catch(() => null),
    ]);
    setPlayback(nextPlayback ?? null);
    setDevices(nextDevices.devices);
    setQueueState(nextQueue);
    syncPocketQueue(nextQueue, forcePocketQueueSync, nextPlayback?.item?.uri);
    setLocalProgress(nextPlayback?.progress_ms ?? 0);
    rememberTrackImages([nextPlayback?.item, ...(nextQueue?.queue ?? [])]);
    if (nextPlayback?.device?.volume_percent !== null && nextPlayback?.device?.volume_percent !== undefined) {
      setLocalVolume(nextPlayback.device.volume_percent);
    }
    setStatus(nextPlayback?.device ? "Connected" : "Choose a Spotify device");
  }

  async function loadPlaylists(nextTokens = tokens, force = false, profileOverride = profile) {
    if (!nextTokens || (!force && isLibraryRateLimited())) return;
    const currentProfile = profileOverride;
    const loadVersion = playlistLoadVersion.current + 1;
    playlistLoadVersion.current = loadVersion;
    const hasCachedPlaylists = playlists.length > 0;
    setLoadingPlaylists(!hasCachedPlaylists);
    try {
      const [savedTracks, myPlaylists] = await Promise.all([
        getSavedTracks(nextTokens, 1),
        getAllMyPlaylists(nextTokens),
      ]);
      if (playlistLoadVersion.current !== loadVersion) return;

      const playlistItems = myPlaylists?.items ?? [];

      const likedSongs: PlaylistSummary = {
        id: "liked",
        name: "Liked Songs",
        description: "Saved tracks",
        owner: currentProfile?.display_name ?? "You",
        total: savedTracks?.total ?? 0,
        kind: "liked",
      };

      const nextPlaylists = [
        likedSongs,
        ...playlistItems.map((playlist) => ({
          id: playlist.id,
          name: playlist.name,
          uri: playlist.uri,
          description: playlist.description,
          image: playlist.images?.[0]?.url,
          owner: playlist.owner?.display_name ?? playlist.owner?.id ?? "Unknown",
          ownerId: playlist.owner?.id,
          total: playlist.tracks?.total ?? 0,
          snapshotId: playlist.snapshot_id,
          tracksHref: playlist.tracks?.href,
          collaborative: Boolean(playlist.collaborative),
          editable: playlist.owner?.id === currentProfile?.id || Boolean(playlist.collaborative),
          kind: "playlist" as const,
        })),
      ];
      const mergedPlaylists = mergeCachedPlaylistMetadata(nextPlaylists);

      setPlaylists(mergedPlaylists);
      saveCachedPlaylists(mergedPlaylists);
    } catch (error) {
      if (handleAuthExpired(error)) return;
      if (handleLibraryRateLimit(error)) return;
      setStatus(
        playlists.length > 0
          ? "Spotify is rate limiting. Using cached library."
          : error instanceof Error
            ? error.message
            : "Playlists unavailable",
      );
    } finally {
      if (playlistLoadVersion.current === loadVersion) {
        setLoadingPlaylists(false);
      }
    }
  }

  async function openPlaylist(playlist: PlaylistSummary) {
    if (!tokens) return;
    setSelectedPlaylist(playlist);
    setView("playlists");
    setLoadingPlaylists(true);
    setPlaylistScrolled(false);
    setPlaylistTrackQuery("");
    setPlaylistOffset(0);
    setPlaylistHasMore(false);
    try {
      const cachedTracks = loadCachedPlaylistTracks(playlist);
      if (cachedTracks) {
        setSelectedPlaylist((current) =>
          current ? { ...current, total: cachedTracks.total } : current,
        );
        setPlaylistTracks(cachedTracks.items);
        setPlaylistOffset(cachedTracks.items.length);
        setPlaylistHasMore(false);
        rememberTrackImages(cachedTracks.items.map((item) => playlistTrack(item)));
        setLoadingPlaylists(false);
        return;
      }

      const { items, total } = await loadAllPlaylistTracks(playlist);
      setSelectedPlaylist((current) => (current ? { ...current, total } : current));
      setPlaylists((current) =>
        {
          const next = current.map((item) =>
            item.kind === playlist.kind && item.id === playlist.id ? { ...item, total } : item,
          );
          saveCachedPlaylists(next);
          return next;
        },
      );
      rememberTrackImages(items.map((item) => playlistTrack(item)));
      setPlaylistTracks(items);
      setPlaylistOffset(items.length);
      setPlaylistHasMore(false);
      saveCachedPlaylistTracks(playlist, items, total);
    } catch (error) {
      if (handleAuthExpired(error)) return;
      setStatus(playlistStatusMessage(error, "Playlist tracks unavailable"));
      setPlaylistTracks([]);
    } finally {
      setLoadingPlaylists(false);
    }
  }

  async function loadPlaylistTrackPage(playlist: PlaylistSummary, offset: number) {
    if (playlist.kind === "liked") {
      return getSavedTracks(tokens!, 50, offset);
    }

    if (playlist.tracksHref) {
      return getPlaylistTracksByHref(tokens!, playlist.tracksHref, 50, offset);
    }

    return getPlaylistTracks(tokens!, playlist.id, 50, offset);
  }

  async function loadAllPlaylistTracks(playlist: PlaylistSummary) {
    const allItems: PlaylistTrack[] = [];
    let offset = 0;
    let total = playlist.total;
    let hasNext = true;

    while (hasNext) {
      const response = await loadPlaylistTrackPage(playlist, offset);
      const pageItems = response?.items ?? [];
      const playableItems = pageItems.filter((item) => playlistTrack(item)?.uri);
      allItems.push(...playableItems);
      total = response?.total ?? total;
      offset += pageItems.length;
      hasNext = Boolean(response?.next) && pageItems.length > 0;
    }

    return { items: allItems, total };
  }

  async function loadMorePlaylistTracks() {
    if (!tokens || !selectedPlaylist || loadingPlaylists || loadingMoreTracks || !playlistHasMore) {
      return;
    }

    setLoadingMoreTracks(true);
    try {
      const response = await loadPlaylistTrackPage(selectedPlaylist, playlistOffset);
      const items = response?.items ?? [];
      const playableItems = items.filter((item) => playlistTrack(item)?.uri);
      rememberTrackImages(playableItems.map((item) => playlistTrack(item)));
      setPlaylistTracks((current) => [
        ...current,
        ...playableItems,
      ]);
      setPlaylistOffset((current) => current + items.length);
      setPlaylistHasMore(Boolean(response?.next));
    } catch (error) {
      if (handleAuthExpired(error)) return;
      setStatus(playlistStatusMessage(error, "More tracks unavailable"));
    } finally {
      setLoadingMoreTracks(false);
    }
  }

  function handlePlaylistScroll(event: React.UIEvent<HTMLElement>) {
    const target = event.currentTarget;
    setPlaylistScrolled(target.scrollTop > 180);

    if (target.scrollHeight - target.scrollTop - target.clientHeight < 420) {
      void loadMorePlaylistTracks();
    }
  }

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code || tokens) return;

    exchangeCodeForTokens(code)
      .then(async (nextTokens) => {
        setTokens(nextTokens);
        window.history.replaceState({}, document.title, "/");
        const nextProfile = await getMe(nextTokens);
        setProfile(nextProfile);
        await loadPlaylists(nextTokens, false, nextProfile);
        await refreshState(nextTokens);
      })
      .catch((error) => {
        if (handleAuthExpired(error)) return;
        if (!handleLibraryRateLimit(error, "Spotify is rate limiting playlists. Login finished, waiting.")) {
          setStatus(error instanceof Error ? error.message : "Login failed");
        }
      });
  }, [tokens]);

  useEffect(() => {
    if (!tokens) return;

    let active = true;
    void (async () => {
      const nextProfile = await getMe(tokens);
      if (!active) return;
      setProfile(nextProfile);
      await loadPlaylists(tokens, false, nextProfile);
    })().catch((error) => {
      if (!active || handleAuthExpired(error)) return;
      if (!handleLibraryRateLimit(error)) setStatus(spotifyErrorMessage(error, "Profile unavailable"));
    });

    const poll = async () => {
      try {
        await refreshState(tokens);
      } catch (error) {
        if (!active) return;
        if (handleAuthExpired(error)) return;
        setStatus(error instanceof Error ? error.message : "Waiting for Spotify");
      }
    };

    poll();
    const timer = window.setInterval(poll, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [tokens]);

  useEffect(() => {
    if (!playback?.is_playing || !duration) return;

    const timer = window.setInterval(() => {
      setLocalProgress((progress) => Math.min(duration, progress + 250));
    }, 250);
    return () => window.clearInterval(timer);
  }, [duration, playback?.is_playing]);

  useEffect(() => {
    const currentUri = track?.uri ?? null;
    if (!currentUri || previousGlowTrackUri.current === currentUri) return;

    previousGlowTrackUri.current = currentUri;
    optimisticTransitionFromUri.current = null;
    preloadedVisualTrackUris.current.clear();
    setGlowEntering(false);
    const startTimer = window.setTimeout(() => setGlowEntering(true), 0);
    const endTimer = window.setTimeout(() => setGlowEntering(false), 700);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(endTimer);
    };
  }, [track?.uri]);

  useEffect(() => {
    const nextTrack = pocketQueueTracks[0] ?? queueState?.queue.find((item) => item?.uri);
    prepareTrackVisuals(track);
    prepareTrackVisuals(nextTrack);
  }, [pocketQueueTracks, queueState, track?.uri]);

  useEffect(() => {
    if (!playback?.is_playing || !duration || remainingMs > 30000) return;

    prepareTrackVisuals(pocketQueueTracks[0] ?? queueState?.queue.find((item) => item?.uri));
  }, [duration, playback?.is_playing, pocketQueueTracks, queueState, remainingMs]);

  useEffect(() => {
    if (!tokens || !playback?.is_playing || !track?.uri || !duration) return;
    if (playback.repeat_state === "track" || remainingMs > 350) return;
    if (optimisticTransitionFromUri.current === track.uri) return;

    const syncTimers = applyOptimisticNext(2500, 3500);
    if (!syncTimers) return;

    return () => syncTimers.forEach((timer) => window.clearTimeout(timer));
  }, [duration, playback?.is_playing, playback?.repeat_state, pocketQueueTracks, queueState, remainingMs, tokens, track?.uri]);

  useEffect(() => {
    if (!tokens || webDevice) return;

    createWebPlaybackDevice(tokens, (state) => {
      const current = state.track_window.current_track;
      setPlayback((previous) => ({
        is_playing: !state.paused,
        progress_ms: state.position,
        repeat_state: previous?.repeat_state,
        shuffle_state: previous?.shuffle_state,
        item: {
          id: current.id,
          name: current.name,
          uri: current.uri,
          duration_ms: state.duration,
          album: current.album,
          artists: current.artists,
        },
        device: {
          id: "web-playback",
          name: "This app",
          type: "Computer",
          volume_percent: volume,
          is_active: true,
        },
      }));
      rememberTrackImages([
        {
          id: current.id,
          name: current.name,
          uri: current.uri,
          duration_ms: state.duration,
          album: current.album,
          artists: current.artists,
        },
      ]);
      setLocalProgress(state.position);
    })
      .then((device) => {
        setWebDevice(device);
        setStatus("In-app playback ready");
      })
      .catch(() => setStatus("Connect fallback ready"));
  }, [tokens, volume, webDevice]);

  useEffect(() => {
    if (!tokens || !webDevice?.deviceId || webPlaybackDeviceActive) return;
    if (autoSelectedWebDeviceId.current === webDevice.deviceId) return;

    let cancelled = false;
    autoSelectedWebDeviceId.current = webDevice.deviceId;
    setStatus("Selecting in-app playback");

    transferPlayback(tokens, webDevice.deviceId, false)
      .then(() => delay(350))
      .then(() => {
        if (!cancelled) void refreshState(tokens);
      })
      .catch(() => {
        if (!cancelled) setStatus("Connect fallback ready");
      });

    return () => {
      cancelled = true;
    };
  }, [tokens, webDevice?.deviceId, webPlaybackDeviceActive]);

  useEffect(() => {
    if (!tokens || query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    if (isLibraryRateLimited()) {
      setSearching(false);
      return;
    }

    let active = true;
    setSearching(true);
    const timer = window.setTimeout(() => {
      searchTracks(tokens, query.trim())
        .then((response) => {
          if (active) {
            rememberTrackImages(response.tracks.items);
            setResults(response.tracks.items);
          }
        })
        .catch((error) => {
          if (!active || handleAuthExpired(error)) return;
          if (!handleLibraryRateLimit(error, "Spotify is rate limiting search.")) {
            setStatus(spotifyErrorMessage(error, "Search unavailable"));
          }
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, tokens]);

  useEffect(() => {
    if (!trackMenu) return;

    const close = () => setTrackMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [trackMenu]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const commandKey = event.ctrlKey || event.metaKey;

      if (event.key === "Escape") {
        if (trackMenu) {
          event.preventDefault();
          setTrackMenu(null);
          return;
        }
        if (settingsOpen) {
          event.preventDefault();
          setSettingsOpen(false);
          return;
        }
        if (profileMenuOpen) {
          event.preventDefault();
          closeProfileMenu();
        }
        return;
      }

      if (commandKey && event.code === "KeyP") {
        event.preventDefault();
        closeProfileMenu();
        setSettingsOpen(true);
        return;
      }

      if (commandKey && event.code === "KeyK") {
        event.preventDefault();
        setView("search");
        window.setTimeout(() => globalSearchInputRef.current?.focus(), 0);
        return;
      }

      if (commandKey && event.code === "KeyL") {
        event.preventDefault();
        if (track) setView((current) => (current === "lyrics" ? "now" : "lyrics"));
        return;
      }

      if (isEditableShortcutTarget(event.target)) return;

      if (commandKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        event.preventDefault();
        const direction = event.key === "ArrowUp" ? 5 : -5;
        changeVolume(Math.min(100, Math.max(0, localVolume + direction)));
        return;
      }

      if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        control("previous");
        return;
      }

      if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        control("next");
        return;
      }

      if (
        event.code === "Space" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isNativeSpaceTarget(event.target)
      ) {
        event.preventDefault();
        control("toggle");
      }
    }

    window.addEventListener("keydown", handleShortcut, true);
    return () => window.removeEventListener("keydown", handleShortcut, true);
  }, [localVolume, playback, profileMenuOpen, settingsOpen, track, trackMenu]);

  async function login() {
    if (!getSpotifyClientId()) {
      setClientIdPromptOpen(true);
      setStatus("Add Spotify client id");
      return;
    }
    setAuthExpiredOpen(false);
    window.location.href = await buildLoginUrl();
  }

  function signOut() {
    setAuthExpiredOpen(false);
    resetSession(true);
  }

  async function run(action: () => Promise<void>, message = "Updating playback", refreshAfter = true) {
    if (!tokens) return;
    setBusy(true);
    setStatus(message);
    try {
      await action();
      if (refreshAfter) await refreshState(tokens);
    } catch (error) {
      if (handleAuthExpired(error)) return;
      setStatus(error instanceof Error ? error.message : "Spotify command failed");
    } finally {
      setBusy(false);
    }
  }

  function control(action: "toggle" | "next" | "previous") {
    if (!tokens || !playback) return;

    if (action === "next") {
      applyOptimisticNext(2500, 3500);
      void run(() => skipNext(tokens), "Skipping track", false);
      return;
    }

    void run(async () => {
      if (action === "toggle") await togglePlayback(tokens, playback.is_playing);
      if (action === "previous") await skipPrevious(tokens);
    });
  }

  function transfer(deviceId: string, play = false) {
    if (!tokens) return;
    void run(() => transferPlayback(tokens, deviceId, play), "Switching device");
  }

  function play(trackToPlay: SpotifyTrack) {
    if (!tokens) return;
    applyOptimisticTrackSelection(trackToPlay);
    void run(
      async () => {
        const deviceId = await ensurePlaybackDevice();
        await playTrack(tokens, trackToPlay.uri, deviceId);
      },
      `Playing ${trackToPlay.name}`,
      false,
    );
    window.setTimeout(() => void refreshState(tokens, true), 2500);
    setView("now");
  }

  function updatePlaylistAfterTrackChange(
    playlist: PlaylistSummary,
    nextTotal: number,
    snapshotId?: string,
  ) {
    setSelectedPlaylist((current) =>
      current?.kind === playlist.kind && current.id === playlist.id
        ? { ...current, total: nextTotal, snapshotId: snapshotId ?? current.snapshotId }
        : current,
    );
    setPlaylists((current) => {
      const next = current.map((item) =>
        item.kind === playlist.kind && item.id === playlist.id
          ? { ...item, total: nextTotal, snapshotId: snapshotId ?? item.snapshotId }
          : item,
      );
      saveCachedPlaylists(next);
      return next;
    });
  }

  function openTrackMenu(
    event: React.MouseEvent,
    trackToOpen: SpotifyTrack,
    sourcePlaylist?: PlaylistSummary | null,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setTrackMenu({
      track: trackToOpen,
      sourcePlaylist,
      x: Math.max(12, Math.min(event.clientX, window.innerWidth - 540)),
      y: Math.max(12, Math.min(event.clientY, window.innerHeight - 360)),
    });
  }

  function queueTrack(trackToQueue: SpotifyTrack) {
    if (!tokens || !trackToQueue.uri) return;
    setTrackMenu(null);
    void run(
      async () => {
        await addToQueue(tokens, trackToQueue.uri);
        setManualQueueUris((current) => [...current, trackToQueue.uri]);
      },
      `Added ${trackToQueue.name} to queue`,
    );
  }

  function addTrackToPlaylist(trackToAdd: SpotifyTrack, playlist: PlaylistSummary) {
    if (!tokens || !trackToAdd.uri) return;
    setTrackMenu(null);
    void run(
      async () => {
        const result = await addTracksToPlaylist(tokens, playlist.id, [trackToAdd.uri]);
        const nextTotal = playlist.total + 1;
        updatePlaylistAfterTrackChange(playlist, nextTotal, result.snapshot_id);
        if (selectedPlaylist?.kind === "playlist" && selectedPlaylist.id === playlist.id) {
          const nextTracks = [...playlistTracks, { track: trackToAdd }];
          setPlaylistTracks(nextTracks);
          saveCachedPlaylistTracks(
            { ...playlist, total: nextTotal, snapshotId: result.snapshot_id },
            nextTracks,
            nextTotal,
          );
        }
      },
      `Added ${trackToAdd.name} to ${playlist.name}`,
    );
  }

  function removeTrackFromSource(trackToRemove: SpotifyTrack, playlist: PlaylistSummary) {
    if (!tokens || !trackToRemove.uri) return;
    setTrackMenu(null);
    void run(
      async () => {
        if (playlist.kind === "liked") {
          await removeSavedTracks(tokens, [trackToRemove.id]);
        } else {
          const result = await removeTracksFromPlaylist(tokens, playlist.id, [trackToRemove.uri]);
          playlist = { ...playlist, snapshotId: result.snapshot_id };
        }

        const removeOne = (items: PlaylistTrack[]) => {
          let removed = false;
          return items.filter((item) => {
            if (removed || playlistTrack(item)?.uri !== trackToRemove.uri) return true;
            removed = true;
            return false;
          });
        };

        const nextTracks =
          selectedPlaylist?.kind === playlist.kind && selectedPlaylist.id === playlist.id
            ? removeOne(playlistTracks)
            : playlistTracks;
        const nextTotal = Math.max(0, playlist.total - 1);
        updatePlaylistAfterTrackChange(playlist, nextTotal, playlist.snapshotId);
        if (nextTracks !== playlistTracks) {
          setPlaylistTracks(nextTracks);
          saveCachedPlaylistTracks({ ...playlist, total: nextTotal }, nextTracks, nextTotal);
        }
      },
      `Removed ${trackToRemove.name} from ${playlist.name}`,
    );
  }

  function playQueueItem(queueTrack: SpotifyTrack, index: number) {
    if (!tokens || !queueTrack.uri) return;
    void run(
      async () => {
        for (let step = 0; step <= index; step += 1) {
          await skipNext(tokens);
        }
      },
      `Playing ${queueTrack.name}`,
    );
    setView("now");
  }

  function playPlaylistTrack(trackToPlay: SpotifyTrack, index: number) {
    if (!tokens || !selectedPlaylist) return;
    const nextTracks = playlistTracks
      .slice(index + 1, index + 6)
      .map((item) => playlistTrack(item))
      .filter((item): item is SpotifyTrack => Boolean(item?.uri));

    applyOptimisticTrackSelection(trackToPlay, nextTracks, 3500);
    void run(
      async () => {
        const deviceId = await ensurePlaybackDevice();

        const restoreShuffle = Boolean(playback?.shuffle_state);
        if (restoreShuffle) {
          await setShuffle(tokens, false);
        }

        const nextUris = playlistTracks
          .slice(index)
          .map((item) => playlistTrack(item)?.uri)
          .filter((uri): uri is string => Boolean(uri));

        if (nextUris.length > 1) {
          await playTracks(tokens, nextUris.slice(0, 100), deviceId);
          await restoreShuffleLater(restoreShuffle);
          return;
        }

        await playTrack(tokens, trackToPlay.uri, deviceId);
        await restoreShuffleLater(restoreShuffle);
      },
      `Playing ${trackToPlay.name}`,
      false,
    );
    window.setTimeout(() => void refreshState(tokens, false), 2500);
    window.setTimeout(() => void refreshState(tokens, true), 3500);
    setView("now");
  }

  function playPlaylist(playlist: PlaylistSummary) {
    if (!tokens) return;
    void run(
      async () => {
        if (webDevice?.deviceId && activeDeviceId !== webDevice.deviceId) {
          await transferPlayback(tokens, webDevice.deviceId, false);
        }

        if (playlist.kind === "playlist" && playlist.uri) {
          await playContext(tokens, playlist.uri, targetDeviceId);
          return;
        }

        const firstSaved = playlistTracks
          .map((item) => playlistTrack(item))
          .find((item) => item?.uri);
        if (firstSaved) await playTrack(tokens, firstSaved.uri, targetDeviceId);
      },
      `Playing ${playlist.name}`,
    );
    setView("now");
  }

  function seek(value: number) {
    if (!tokens) return;
    setLocalProgress(value);
    void run(() => seekPlayback(tokens, value), "Seeking");
  }

  function changeVolume(value: number) {
    if (!tokens) return;
    setLocalVolume(value);
    setPlayback((previous) =>
      previous?.device
        ? { ...previous, device: { ...previous.device, volume_percent: value } }
        : previous,
    );
    void run(() => setPlaybackVolume(tokens, value), "Changing volume");
  }

  function cycleRepeat() {
    if (!tokens || !playback) return;
    const next =
      playback.repeat_state === "off"
        ? "context"
        : playback.repeat_state === "context"
          ? "track"
          : "off";
    void run(() => setRepeat(tokens, next), "Changing repeat");
  }

  function minimizeWindow() {
    void appWindow.minimize();
  }

  function toggleMaximizeWindow() {
    void appWindow.toggleMaximize();
  }

  function closeWindow() {
    void appWindow.close();
  }

  const windowsWindowControls = (
    <div className="window-controls windows-controls">
      <button type="button" title="Minimize" onClick={minimizeWindow}>
        <Minus size={16} />
      </button>
      <button type="button" title="Maximize" onClick={toggleMaximizeWindow}>
        <Maximize2 size={14} />
      </button>
      <button type="button" title="Close" className="close" onClick={closeWindow}>
        <X size={17} />
      </button>
    </div>
  );

  const macWindowControls = (
    <div className="window-controls mac-controls" aria-label="Window controls">
      <button type="button" title="Close" className="mac-close" onClick={closeWindow} />
      <button type="button" title="Minimize" className="mac-minimize" onClick={minimizeWindow} />
      <button type="button" title="Zoom" className="mac-zoom" onClick={toggleMaximizeWindow} />
    </div>
  );

  const signedIn = Boolean(tokens);
  const floatingQueueActive = signedIn && view === "now" && railCollapsed && queueVisible;
  const renderQueuePreview = (className: string) => (
    <section className={className}>
      <div className="queue-preview-title">
        <span>Up next</span>
        {nextQueueTracks.length > 0 && <small>{nextQueueTracks.length}</small>}
      </div>
      {nextQueueTracks.length > 0 ? (
        nextQueueTracks.map((queueTrack, index) => (
          <button
            className="queue-preview-row"
            key={`${queueTrack.uri}-${index}`}
            onClick={() => playQueueItem(queueTrack, index)}
            disabled={busy}
          >
            {displayTrackImage(queueTrack) ? <img src={displayTrackImage(queueTrack)} alt="" /> : <i />}
            <span>
              <strong>{queueTrack.name}</strong>
              <small>
                {manualQueueUris.includes(queueTrack.uri) && (
                  <ListPlus className="queue-source-icon" size={13} />
                )}
                {queueTrack.artists.map((artist) => artist.name).join(", ")}
              </small>
            </span>
          </button>
        ))
      ) : (
        <p className="queue-empty">No queue yet</p>
      )}
    </section>
  );
  const shellClass = [
    "shell",
    glowEntering ? "glow-enter" : "",
    railCollapsed ? "rail-collapsed" : "",
    appSettings.bordersEnabled && appSettings.borderAppEnabled ? "border-app" : "",
    appSettings.bordersEnabled && appSettings.borderDockEnabled ? "border-dock" : "",
    appSettings.bordersEnabled && appSettings.borderProfileEnabled ? "border-profile" : "",
    appSettings.bordersEnabled && appSettings.borderActiveNavEnabled ? "border-active-nav" : "",
    appSettings.bordersEnabled && appSettings.borderQueueEnabled ? "border-queue" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main
      className={shellClass}
      style={
        {
          "--accent": activeAccent.primary,
          "--accent-muted": activeAccent.muted,
          "--control-active": activeControlAccent,
          "--glow-scale": String(glowScale),
          "--glow-opacity": String(glowOpacity),
        } as React.CSSProperties
      }
    >
      <aside className={railCollapsed ? "rail collapsed" : "rail"}>
        <button
          className="rail-toggle"
          title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setRailCollapsedPersisted(!railCollapsed)}
        >
          {railCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
        <button
          className={view === "now" ? "nav active" : "nav"}
          title="Now playing"
          onClick={() => setView("now")}
        >
          <ListMusic size={20} />
          <span>Now</span>
        </button>
        <button
          className={view === "playlists" ? "nav active" : "nav"}
          title="Playlists"
          onClick={() => {
            setView("playlists");
            setSelectedPlaylist(null);
            setPlaylistTrackQuery("");
          }}
        >
          <Rows3 size={20} />
          <span>Playlists</span>
        </button>
        <button
          className={view === "search" ? "nav active" : "nav"}
          title="Search"
          onClick={() => setView("search")}
        >
          <Search size={20} />
          <span>Search</span>
        </button>
        <button
          className={view === "devices" ? "nav active" : "nav"}
          title="Devices"
          onClick={() => setView("devices")}
        >
          <MonitorSpeaker size={20} />
          <span>Devices</span>
        </button>
        <div className="rail-footer">
          {signedIn &&
            !railCollapsed &&
            renderQueuePreview(
              queueVisible
                ? "queue-preview rail-queue-preview visible"
                : "queue-preview rail-queue-preview",
            )}
          {signedIn ? (
            <div className="profile-menu-wrap">
              {profileMenuOpen && (
                <div className="profile-menu">
                  <button
                    onClick={() => {
                      setSettingsOpen(true);
                      closeProfileMenu();
                    }}
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      closeProfileMenu();
                      signOut();
                    }}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
              <button className="profile-pill" onClick={toggleProfileMenu}>
                {profileImage ? (
                  <img src={profileImage} alt="" />
                ) : (
                  <span>{profileInitial(profile)}</span>
                )}
                <strong>{profile?.display_name ?? profile?.id ?? "Profile"}</strong>
              </button>
            </div>
          ) : (
            <button className="primary" onClick={login}>
              <LogIn size={18} />
              Connect Spotify
            </button>
          )}
        </div>
      </aside>

      <section className="stage">
        <header className={isMacOs ? "topbar macos" : "topbar"}>
          {isMacOs && macWindowControls}
          <div className="topbar-left" data-tauri-drag-region>
            <div className="app-brand">
              <span className="brand-mark" />
              <strong>Noctune</strong>
            </div>
            <span>{status}</span>
          </div>
          <div className="topbar-drag-spacer" data-tauri-drag-region />
          <div className="topbar-right">
            <span data-tauri-drag-region>{playback?.device?.name ?? runtimePlatform}</span>
            {!isMacOs && windowsWindowControls}
          </div>
        </header>

        {view === "now" && (
          <section className={floatingQueueActive ? "now-playing" : "now-playing queue-hidden"}>
            <div className="cover-wrap">
              {cover ? <img src={cover} alt="" /> : <div className="cover-placeholder" />}
            </div>
            <div className="track-copy">
              <p>{track?.album.name ?? "No album selected"}</p>
              <h1>{track?.name ?? "Play something in Spotify"}</h1>
              <h2>{artists}</h2>
              {!signedIn && (
                <button className="hero-action" onClick={login}>
                  <LogIn size={18} />
                  Connect Spotify
                </button>
              )}
            </div>
          </section>
        )}

        {view === "playlists" && (
          <section className="playlists-view">
            {!selectedPlaylist ? (
              <>
                <div className="section-heading">
                  <div>
                    <p>Library</p>
                    <h2>Playlists</h2>
                  </div>
                  <button
                    className="ghost compact"
                    onClick={() => void loadPlaylists(tokens, true)}
                    disabled={!signedIn || loadingPlaylists}
                  >
                    Refresh
                  </button>
                </div>
                <div className="playlist-grid">
                  {playlists.map((playlist) => (
                    <button
                      className={
                        playlist.kind === "liked" ? "playlist-card liked" : "playlist-card"
                      }
                      key={`${playlist.kind}-${playlist.id}`}
                      onClick={() => void openPlaylist(playlist)}
                      disabled={loadingPlaylists && playlists.length === 0}
                    >
                      {playlistImage(playlist) ? (
                        <img src={playlistImage(playlist)} alt="" />
                      ) : (
                        <span className="playlist-art">
                          <ListMusic size={32} />
                        </span>
                      )}
                      <strong>{playlist.name}</strong>
                      <small>
                        {playlist.total} tracks - {playlist.owner}
                      </small>
                    </button>
                  ))}
                  {signedIn && !loadingPlaylists && playlists.length === 0 && (
                    <p className="empty">No playlists found</p>
                  )}
                  {loadingPlaylists && <p className="empty">Loading playlists...</p>}
                </div>
              </>
            ) : (
              <div className="playlist-detail" onScroll={handlePlaylistScroll}>
                <div className={playlistScrolled ? "playlist-sticky visible" : "playlist-sticky"}>
                  <strong>{selectedPlaylist.name}</strong>
                  <button
                    className="playlist-play compact-play"
                    onClick={() => playPlaylist(selectedPlaylist)}
                    disabled={busy || playlistTracks.length === 0}
                  >
                    <Play size={16} />
                    Play
                  </button>
                </div>
                <div className="playlist-hero">
                  {playlistImage(selectedPlaylist) ? (
                    <img src={playlistImage(selectedPlaylist)} alt="" />
                  ) : (
                    <span className="playlist-art large">
                      <ListMusic size={52} />
                    </span>
                  )}
                  <div>
                    <button
                      className="text-button"
                      onClick={() => {
                        setSelectedPlaylist(null);
                        setPlaylistTrackQuery("");
                      }}
                    >
                      Back to playlists
                    </button>
                    <p>{selectedPlaylist.kind === "liked" ? "Saved tracks" : "Playlist"}</p>
                    <div className="playlist-title-row">
                      <h2>{selectedPlaylist.name}</h2>
                      <button
                        className="hero-action playlist-play"
                        onClick={() => playPlaylist(selectedPlaylist)}
                        disabled={busy || playlistTracks.length === 0}
                      >
                        <Play size={18} />
                        Play
                      </button>
                    </div>
                    <small>
                      {selectedPlaylist.total} tracks - {selectedPlaylist.owner}
                    </small>
                  </div>
                </div>
                <label className="search-box playlist-search">
                  <Search size={18} />
                  <input
                    value={playlistTrackQuery}
                    onChange={(event) => setPlaylistTrackQuery(event.target.value)}
                    placeholder="Search in this playlist"
                    disabled={playlistTracks.length === 0}
                  />
                </label>
                <div className="track-list">
                  {visiblePlaylistTracks.map((item) => {
                    const savedTrack = playlistTrack(item);
                    const trackIndex = playlistTracks.findIndex(
                      (candidate) => playlistTrack(candidate)?.uri === savedTrack?.uri,
                    );
                    return savedTrack ? (
                      <button
                        className="track-row"
                        key={`${savedTrack.uri}-${trackIndex}`}
                        onClick={() => playPlaylistTrack(savedTrack, trackIndex)}
                        onContextMenu={(event) => openTrackMenu(event, savedTrack, selectedPlaylist)}
                        disabled={busy}
                      >
                        <span>{trackIndex + 1}</span>
                        {displayTrackImage(savedTrack) ? <img src={displayTrackImage(savedTrack)} alt="" /> : <i />}
                        <span>
                          <strong>{savedTrack.name}</strong>
                          <small>{savedTrack.artists.map((artist) => artist.name).join(", ")}</small>
                        </span>
                        <small>{savedTrack.album.name}</small>
                        <small>{formatTime(savedTrack.duration_ms)}</small>
                      </button>
                    ) : null;
                  })}
                  {loadingPlaylists && <p className="empty">Loading tracks...</p>}
                  {loadingMoreTracks && <p className="empty">Loading more tracks...</p>}
                  {!loadingPlaylists && playlistTracks.length === 0 && (
                    <p className="empty">No playable tracks here</p>
                  )}
                  {!loadingPlaylists && playlistTracks.length > 0 && visiblePlaylistTracks.length === 0 && (
                    <p className="empty">No tracks match this search</p>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {view === "search" && (
          <section className="search-view">
            <label className="search-box">
              <Search size={20} />
              <input
                ref={globalSearchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Spotify tracks"
                disabled={!signedIn}
              />
            </label>
            <div className="results">
              {searching && <p className="empty">Searching...</p>}
              {!searching &&
                results.map((result) => (
                  <button
                    className="result"
                    key={result.uri}
                    onClick={() => play(result)}
                    onContextMenu={(event) => openTrackMenu(event, result)}
                    disabled={busy}
                  >
                    {displayTrackImage(result) ? <img src={displayTrackImage(result)} alt="" /> : <span />}
                    <span>
                      <strong>{result.name}</strong>
                      <small>
                        {result.artists.map((artist) => artist.name).join(", ")} -{" "}
                        {result.album.name}
                      </small>
                    </span>
                    <Play size={18} />
                  </button>
                ))}
              {!searching && signedIn && query.length > 1 && results.length === 0 && (
                <p className="empty">No tracks found</p>
              )}
            </div>
          </section>
        )}

        {view === "devices" && (
          <section className="devices-view">
            {webDevice && (
              <button
                className={webPlaybackDeviceActive ? "device-row active" : "device-row"}
                onClick={() => transfer(webDevice.deviceId, false)}
                disabled={busy}
              >
                <Laptop size={22} />
                <span>
                  <strong>Noctune</strong>
                  <small>Web Playback SDK device</small>
                </span>
              </button>
            )}
            {visibleDevices.map((device) => (
              <button
                key={device.id}
                className={device.is_active ? "device-row active" : "device-row"}
                onClick={() => transfer(device.id, false)}
                disabled={busy || device.is_restricted}
              >
                <MonitorSpeaker size={22} />
                <span>
                  <strong>{device.name}</strong>
                  <small>
                    {device.type}
                    {device.is_restricted ? " - restricted" : ""}
                  </small>
                </span>
              </button>
            ))}
            {signedIn && visibleDevices.length === 0 && !webDevice && (
              <p className="empty">Open Spotify on another device or wait for in-app playback.</p>
            )}
          </section>
        )}

        {view === "lyrics" && (
          <LyricsView
            track={track}
            artists={artists}
            lyrics={lyrics}
            onBackToPlayer={() => setView("now")}
          />
        )}

        {signedIn &&
          view === "now" &&
          railCollapsed &&
          renderQueuePreview(
            queueVisible
              ? "queue-preview stage-queue-preview visible"
              : "queue-preview stage-queue-preview",
          )}

        <PlayerDock
          cover={cover}
          trackName={track?.name ?? "Nothing playing"}
          artists={artists}
          shuffle={Boolean(playback?.shuffle_state)}
          playing={Boolean(playback?.is_playing)}
          repeat={playback?.repeat_state ?? "off"}
          progressMs={localProgress}
          durationMs={duration}
          volume={localVolume}
          busy={busy}
          playbackAvailable={Boolean(playback)}
          volumeAvailable={Boolean(playback?.device)}
          queueVisible={queueVisible}
          queueAvailable={signedIn}
          lyricsActive={view === "lyrics"}
          lyricsAvailable={Boolean(track)}
          onToggleShuffle={() => {
            if (tokens && playback) {
              void run(() => setShuffle(tokens, !playback.shuffle_state), "Changing shuffle");
            }
          }}
          onPrevious={() => control("previous")}
          onTogglePlayback={() => control("toggle")}
          onNext={() => control("next")}
          onCycleRepeat={cycleRepeat}
          onProgressPreview={setLocalProgress}
          onSeek={seek}
          onToggleQueue={() => setQueueVisible((visible) => !visible)}
          onToggleLyrics={() => setView(view === "lyrics" ? "now" : "lyrics")}
          onVolumePreview={setLocalVolume}
          onVolumeCommit={changeVolume}
        />
      </section>

      {settingsOpen && (
        <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
          <section className="settings-dialog" onClick={(event) => event.stopPropagation()}>
            <header className="settings-header">
              <div>
                <span>Noctune</span>
                <h2>Settings</h2>
              </div>
              <button className="settings-close" onClick={() => setSettingsOpen(false)} title="Close">
                <X size={18} />
              </button>
            </header>

            <label className="settings-row">
              <span>
                <strong>Spotify Client ID</strong>
                <small>Stored locally on this device. Used for Spotify login.</small>
              </span>
              <button
                className="settings-mini-button"
                onClick={() => {
                  setSpotifyClientIdDraft(spotifyClientId || getSpotifyClientId());
                  setClientIdPromptOpen(true);
                }}
                type="button"
              >
                Edit
              </button>
            </label>

            <label className="settings-row">
              <span>
                <strong>Rate limit guard</strong>
                <small>Pause playlist and search requests when Spotify returns too many requests.</small>
              </span>
              <input
                type="checkbox"
                checked={appSettings.rateLimitGuardEnabled}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  if (!enabled) libraryRateLimitUntil.current = 0;
                  updateSettings(
                    {
                      ...appSettings,
                      rateLimitGuardEnabled: enabled,
                    },
                    enabled ? "Rate limit guard enabled" : "Rate limit guard disabled",
                  );
                }}
              />
              <i />
            </label>

            <label className="settings-row">
              <span>
                <strong>Custom accent color</strong>
                <small>Override album colors throughout the app, including the background glow.</small>
              </span>
              <input
                type="checkbox"
                checked={appSettings.customAccentEnabled}
                onChange={(event) =>
                  updateSettings(
                    {
                      ...appSettings,
                      customAccentEnabled: event.target.checked,
                    },
                    event.target.checked ? "Custom accent enabled" : "Dynamic accent enabled",
                  )
                }
              />
              <i />
            </label>

            <div className={appSettings.customAccentEnabled ? "accent-settings visible" : "accent-settings"}>
              <span
                className="accent-preview"
                style={{ background: customAccent ?? "#1ed760" }}
              />
              <input
                className="accent-picker"
                type="color"
                value={customAccent ?? "#1ed760"}
                onChange={(event) =>
                  updateSettings({
                    ...appSettings,
                    customAccentColor: event.target.value,
                  })
                }
                tabIndex={appSettings.customAccentEnabled ? 0 : -1}
              />
              <label>
                <span>HEX</span>
                <input
                  value={appSettings.customAccentColor}
                  onChange={(event) =>
                    updateSettings({
                      ...appSettings,
                      customAccentColor: event.target.value,
                    })
                  }
                  onBlur={() => {
                    const nextColor = normalizeHexColor(appSettings.customAccentColor) ?? "#1ed760";
                    updateSettings(
                      {
                        ...appSettings,
                        customAccentColor: nextColor,
                      },
                      "Accent color updated",
                    );
                  }}
                  placeholder="#1ed760"
                  tabIndex={appSettings.customAccentEnabled ? 0 : -1}
                />
              </label>
            </div>

            <label className="settings-row">
              <span>
                <strong>Borders</strong>
                <small>Enable accent borders on selected parts of the interface.</small>
              </span>
              <input
                type="checkbox"
                checked={appSettings.bordersEnabled}
                onChange={(event) =>
                  updateSettings(
                    {
                      ...appSettings,
                      bordersEnabled: event.target.checked,
                    },
                    event.target.checked ? "Borders enabled" : "Borders disabled",
                  )
                }
              />
              <i />
            </label>

            <div className={appSettings.bordersEnabled ? "border-settings visible" : "border-settings"}>
              <label className="settings-row border-option">
                <span>
                  <strong>App border</strong>
                  <small>Outline the whole application window.</small>
                </span>
                <input
                  type="checkbox"
                  checked={appSettings.borderAppEnabled}
                  onChange={(event) =>
                    updateSettings({
                      ...appSettings,
                      borderAppEnabled: event.target.checked,
                    })
                  }
                  tabIndex={appSettings.bordersEnabled ? 0 : -1}
                />
                <i />
              </label>
              <label className="settings-row border-option">
                <span>
                  <strong>Dock border</strong>
                  <small>Outline the bottom player dock.</small>
                </span>
                <input
                  type="checkbox"
                  checked={appSettings.borderDockEnabled}
                  onChange={(event) =>
                    updateSettings({
                      ...appSettings,
                      borderDockEnabled: event.target.checked,
                    })
                  }
                  tabIndex={appSettings.bordersEnabled ? 0 : -1}
                />
                <i />
              </label>
              <label className="settings-row border-option">
                <span>
                  <strong>Profile border</strong>
                  <small>Outline the profile button in the sidebar.</small>
                </span>
                <input
                  type="checkbox"
                  checked={appSettings.borderProfileEnabled}
                  onChange={(event) =>
                    updateSettings({
                      ...appSettings,
                      borderProfileEnabled: event.target.checked,
                    })
                  }
                  tabIndex={appSettings.bordersEnabled ? 0 : -1}
                />
                <i />
              </label>
              <label className="settings-row border-option">
                <span>
                  <strong>Active sidebar button</strong>
                  <small>Outline the selected sidebar navigation button.</small>
                </span>
                <input
                  type="checkbox"
                  checked={appSettings.borderActiveNavEnabled}
                  onChange={(event) =>
                    updateSettings({
                      ...appSettings,
                      borderActiveNavEnabled: event.target.checked,
                    })
                  }
                  tabIndex={appSettings.bordersEnabled ? 0 : -1}
                />
                <i />
              </label>
              <label className="settings-row border-option">
                <span>
                  <strong>Queue border</strong>
                  <small>Outline the queue panel in the sidebar and floating mode.</small>
                </span>
                <input
                  type="checkbox"
                  checked={appSettings.borderQueueEnabled}
                  onChange={(event) =>
                    updateSettings({
                      ...appSettings,
                      borderQueueEnabled: event.target.checked,
                    })
                  }
                  tabIndex={appSettings.bordersEnabled ? 0 : -1}
                />
                <i />
              </label>
            </div>
          </section>
        </div>
      )}

      {authExpiredOpen && (
        <div className="settings-overlay session-overlay">
          <section className="settings-dialog session-dialog">
            <header className="settings-header">
              <div>
                <span>Spotify session</span>
                <h2>Sign in again</h2>
              </div>
            </header>
            <p className="session-copy">
              Spotify says the authorization key is no longer valid. Connect your account again to continue.
            </p>
            <button className="hero-action session-action" onClick={login}>
              <LogIn size={18} />
              Connect Spotify
            </button>
          </section>
        </div>
      )}

      {clientIdPromptOpen && (
        <div className="settings-overlay session-overlay">
          <section className="settings-dialog session-dialog client-id-dialog">
            <header className="settings-header">
              <div>
                <span>Noctune setup</span>
                <h2>Spotify Client ID</h2>
              </div>
              {getSpotifyClientId() && (
                <button
                  className="settings-close"
                  onClick={() => setClientIdPromptOpen(false)}
                  title="Close"
                >
                  <X size={18} />
                </button>
              )}
            </header>
            <p className="session-copy">
              Paste your Spotify app Client ID. Noctune stores it locally and will use it for login.
            </p>
            <label className="client-id-field">
              <span>Client ID</span>
              <input
                value={spotifyClientIdDraft}
                onChange={(event) => setSpotifyClientIdDraft(event.target.value)}
                placeholder="Spotify client id"
                autoFocus
              />
            </label>
            <button
              className="hero-action session-action"
              onClick={() => {
                if (saveClientIdFromDraft()) void login();
              }}
            >
              <LogIn size={18} />
              Save and connect
            </button>
          </section>
        </div>
      )}

      {trackMenu && (
        <div
          className="track-context-menu"
          style={{ left: trackMenu.x, top: trackMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="track-context-group has-submenu">
            <button disabled={targetPlaylists.length === 0 || busy}>
              <ListPlus size={16} />
              Add to playlist
              <ChevronRight size={16} />
            </button>
            <div className="track-context-submenu">
              {targetPlaylists.length > 0 ? (
                targetPlaylists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => addTrackToPlaylist(trackMenu.track, playlist)}
                    disabled={busy}
                  >
                    {playlist.name}
                  </button>
                ))
              ) : (
                <span>No editable playlists</span>
              )}
            </div>
          </div>
          <button onClick={() => queueTrack(trackMenu.track)} disabled={busy}>
            <ListPlus size={16} />
            Add to queue
          </button>
          {trackMenu.sourcePlaylist &&
            (trackMenu.sourcePlaylist.kind === "liked" || trackMenu.sourcePlaylist.editable) && (
              <button
                onClick={() => removeTrackFromSource(trackMenu.track, trackMenu.sourcePlaylist!)}
                disabled={busy}
              >
                <Trash2 size={16} />
                {trackMenu.sourcePlaylist.kind === "liked"
                  ? "Remove from your Liked Songs"
                  : "Remove from this playlist"}
              </button>
            )}
        </div>
      )}
    </main>
  );
}
