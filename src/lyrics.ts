import { persistLocalStorageKey } from "./storage";

export type LyricFormat = "plain" | "lrc";

export type LyricsTrack = {
  id?: string;
  uri: string;
  name: string;
  duration_ms: number;
  album: { name: string };
  artists: Array<{ name: string }>;
};

export type LyricLine = {
  timeMs: number | null;
  endTimeMs?: number | null;
  text: string;
};

export type LyricsEntry = {
  trackUri: string;
  trackName: string;
  artistName: string;
  fileName: string;
  localPath?: string | null;
  format: LyricFormat;
  content: string;
  lines: LyricLine[];
  synced: boolean;
  updatedAt: number;
};

export const LYRICS_CACHE_KEY = "noctune_lyrics_v2";
const TIMESTAMP_PATTERN = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?]/g;
const METADATA_PATTERN = /^\[[a-z]+:.*]$/i;

function normalizeFraction(value = "0") {
  return Number(value.padEnd(3, "0").slice(0, 3));
}

function timestampToMs(minutes: string, seconds: string, fraction?: string) {
  return Number(minutes) * 60_000 + Number(seconds) * 1000 + normalizeFraction(fraction);
}

function extensionFormat(fileName: string): LyricFormat {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith(".lrc")) return "lrc";
  return "plain";
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && quoted && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseTimedCsvLyrics(rawLines: string[]) {
  const header = parseCsvLine(rawLines[0]).map((value) => value.toLowerCase());
  const startIndex = header.indexOf("starttimems");
  const wordsIndex = header.indexOf("words");
  const endIndex = header.indexOf("endtimems");

  if (startIndex === -1 || wordsIndex === -1) return null;

  const lines: LyricLine[] = [];

  rawLines.slice(1).forEach((rawLine) => {
    const columns = parseCsvLine(rawLine);
    const timeMs = Number(columns[startIndex]);
    const endTimeMs = endIndex >= 0 ? Number(columns[endIndex]) : Number.NaN;

    if (!Number.isFinite(timeMs)) return;

    const text = columns[wordsIndex]?.trim() ?? "";
    if (!text) return;

    lines.push({
      timeMs,
      endTimeMs: Number.isFinite(endTimeMs) && endTimeMs > 0 ? endTimeMs : null,
      text,
    });
  });

  return lines;
}

export function parseLyricsContent(content: string, fileName: string) {
  const lines: LyricLine[] = [];
  const rawLines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmptyLines = rawLines.map((line) => line.trim()).filter(Boolean);
  const timedCsvLines = nonEmptyLines.length > 0 ? parseTimedCsvLyrics(nonEmptyLines) : null;

  if (timedCsvLines) {
    return {
      format: extensionFormat(fileName),
      lines: timedCsvLines.sort((first, second) => (first.timeMs ?? 0) - (second.timeMs ?? 0)),
      synced: timedCsvLines.length > 0,
    };
  }

  rawLines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || METADATA_PATTERN.test(line)) return;

    const timestamps = [...line.matchAll(TIMESTAMP_PATTERN)];
    const text = line.replace(TIMESTAMP_PATTERN, "").trim();

    if (timestamps.length === 0) {
      lines.push({ timeMs: null, text: line });
      return;
    }

    if (!text) return;

    timestamps.forEach((match) => {
      lines.push({
        timeMs: timestampToMs(match[1], match[2], match[3]),
        text,
      });
    });
  });

  const synced = lines.some((line) => line.timeMs !== null);
  const sortedLines = synced
    ? [...lines].sort((first, second) => (first.timeMs ?? Number.MAX_SAFE_INTEGER) - (second.timeMs ?? Number.MAX_SAFE_INTEGER))
    : lines;

  return {
    format: extensionFormat(fileName),
    lines: sortedLines,
    synced,
  };
}

export function activeLyricLineIndex(lines: LyricLine[], progressMs: number) {
  let activeIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const timeMs = lines[index].timeMs;
    if (timeMs === null || timeMs > progressMs) break;
    activeIndex = index;
  }

  return activeIndex;
}

export function loadLyricsCache() {
  try {
    const raw = window.localStorage.getItem(LYRICS_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LyricsEntry>;
  } catch {
    return {};
  }
}

export function saveLyricsCache(cache: Record<string, LyricsEntry>) {
  persistLocalStorageKey(LYRICS_CACHE_KEY, JSON.stringify(cache));
}
