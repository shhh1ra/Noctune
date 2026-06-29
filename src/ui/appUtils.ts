import { RAIL_COLLAPSED_KEY } from "../bootstrap";
import { PlaylistSummary, PlaylistTrack, SpotifyTrack, SpotifyUser } from "../spotify/api";
import { persistLocalStorageKey } from "../storage";
import { cachedTrackImage } from "./cache";

export type View = "now" | "playlists" | "search" | "devices" | "lyrics";

export function loadRailCollapsed() {
  return window.localStorage.getItem(RAIL_COLLAPSED_KEY) === "true";
}

export function saveRailCollapsed(collapsed: boolean) {
  persistLocalStorageKey(RAIL_COLLAPSED_KEY, String(collapsed));
}

export function formatTime(ms = 0) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function bestImage(track?: SpotifyTrack | null) {
  return cachedTrackImage(track);
}

export function playlistImage(playlist: PlaylistSummary) {
  return playlist.image;
}

export function playlistTrack(item: PlaylistTrack) {
  return item.track ?? item.item ?? null;
}

export function playlistStatusMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  return error.message;
}

export function profileInitial(profile?: SpotifyUser | null) {
  return (profile?.display_name?.trim()[0] ?? profile?.id?.trim()[0] ?? "?").toUpperCase();
}

export function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function getRuntimePlatform() {
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

export function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function isNativeSpaceTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("button, a, [role='button']"));
}
