import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  activeLyricLineIndex,
  loadLyricsCache,
  LyricsEntry,
  LyricsTrack,
  parseLyricsContent,
  saveLyricsCache,
} from "../../lyrics";
import { fetchLyricsFromLrclib } from "../../lyricsProvider";
import { readLyricsFile, writeLyricsFile } from "../../storage";

type UseLyricsOptions = {
  track: LyricsTrack | null;
  progressMs: number;
  active: boolean;
  onStatus: (message: string) => void;
};

export type LyricsFeature = {
  entry: LyricsEntry | null;
  activeLineIndex: number;
  activeLineRef: RefObject<HTMLParagraphElement | null>;
  loading: boolean;
  importFile: (file: File) => Promise<void>;
  remove: () => void;
};

function createLyricsEntry(
  track: LyricsTrack,
  content: string,
  fileName: string,
  localPath: string | null,
): LyricsEntry {
  const parsed = parseLyricsContent(content, fileName);

  return {
    trackUri: track.uri,
    trackName: track.name,
    artistName: track.artists.map((artist) => artist.name).join(", "),
    fileName,
    localPath,
    format: parsed.format,
    content,
    lines: parsed.lines,
    synced: parsed.synced,
    updatedAt: Date.now(),
  };
}

export function useLyrics({ track, progressMs, active, onStatus }: UseLyricsOptions): LyricsFeature {
  const [cache, setCache] = useState<Record<string, LyricsEntry>>(() => loadLyricsCache());
  const [loading, setLoading] = useState(false);
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);
  const loadingFor = useRef<string | null>(null);
  const missingFor = useRef<Set<string>>(new Set());

  const entry = track?.uri ? cache[track.uri] ?? null : null;
  const activeLineIndex = useMemo(
    () => (entry?.synced ? activeLyricLineIndex(entry.lines, progressMs) : -1),
    [entry, progressMs],
  );

  const saveEntry = useCallback((trackUri: string, nextEntry: LyricsEntry | null) => {
    setCache((current) => {
      const next = { ...current };
      if (nextEntry) next[trackUri] = nextEntry;
      else delete next[trackUri];
      saveLyricsCache(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!active || activeLineIndex < 0) return;

    const line = activeLineRef.current;
    const container = line?.parentElement;
    if (!line || !container) return;

    const lineBounds = line.getBoundingClientRect();
    const containerBounds = container.getBoundingClientRect();
    const readingLineTop =
      container.scrollTop +
      (lineBounds.top - containerBounds.top) -
      container.clientHeight * 0.3;
    container.scrollTo({
      top: Math.max(0, readingLineTop),
      behavior: "smooth",
    });
  }, [active, activeLineIndex]);

  useEffect(() => {
    if (
      !active ||
      !track?.uri ||
      entry ||
      loadingFor.current === track.uri ||
      missingFor.current.has(track.uri)
    ) {
      return;
    }

    const targetTrack = track;
    let mounted = true;
    loadingFor.current = targetTrack.uri;
    setLoading(true);

    async function load() {
      const localLyrics = await readLyricsFile(targetTrack.uri).catch(() => null);
      if (!mounted) return;

      if (localLyrics) {
        saveEntry(
          targetTrack.uri,
          createLyricsEntry(
            targetTrack,
            localLyrics.content,
            localLyrics.fileName,
            localLyrics.localPath,
          ),
        );
        onStatus("Lyrics loaded from disk");
        return;
      }

      const remoteLyrics = await fetchLyricsFromLrclib(targetTrack).catch((error) => {
        onStatus(error instanceof Error ? error.message : "Lyrics unavailable");
        return null;
      });
      if (!mounted) return;

      if (!remoteLyrics) {
        missingFor.current.add(targetTrack.uri);
        onStatus("Lyrics not found");
        return;
      }

      const localPath = await writeLyricsFile(
        targetTrack.uri,
        remoteLyrics.fileName,
        remoteLyrics.content,
      ).catch(() => null);
      if (!mounted) return;

      saveEntry(
        targetTrack.uri,
        createLyricsEntry(targetTrack, remoteLyrics.content, remoteLyrics.fileName, localPath),
      );
      onStatus("Lyrics saved from LRCLIB");
    }

    void load()
      .catch((error) => {
        if (mounted) onStatus(error instanceof Error ? error.message : "Lyrics unavailable");
      })
      .finally(() => {
        if (!mounted) return;
        loadingFor.current = null;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [active, entry, onStatus, saveEntry, track]);

  const importFile = useCallback(
    async (file: File) => {
      if (!track?.uri) return;

      const content = await file.text();
      const localPath = await writeLyricsFile(track.uri, file.name, content).catch(() => null);
      missingFor.current.delete(track.uri);
      saveEntry(track.uri, createLyricsEntry(track, content, file.name, localPath));
    },
    [saveEntry, track],
  );

  const remove = useCallback(() => {
    if (!track?.uri) return;
    saveEntry(track.uri, null);
    missingFor.current.delete(track.uri);
  }, [saveEntry, track?.uri]);

  return { entry, activeLineIndex, activeLineRef, loading, importFile, remove };
}
