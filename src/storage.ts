import { invoke } from "@tauri-apps/api/core";

const JSON_FOLDER = "json";
const IMAGE_FOLDER = "images";

export type PortableStorageInfo = {
  root: string;
  portable: boolean;
};

function hasTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}

function jsonFileName(key: string) {
  return `${key}.json`;
}

async function readText(folder: string, key: string) {
  if (!hasTauriRuntime()) return null;
  return invoke<string | null>("storage_read_text", { folder, key });
}

async function writeText(folder: string, key: string, content: string) {
  if (!hasTauriRuntime()) return;
  await invoke("storage_write_text", { folder, key, content });
}

async function removeText(folder: string, key: string) {
  if (!hasTauriRuntime()) return;
  await invoke("storage_remove_text", { folder, key });
}

export async function getPortableStorageInfo() {
  if (!hasTauriRuntime()) return null;
  return invoke<PortableStorageInfo>("storage_info");
}

export async function hydrateLocalStorageKeys(keys: string[]) {
  if (!hasTauriRuntime()) return;

  await Promise.all(
    keys.map(async (key) => {
      const fileName = jsonFileName(key);
      const fileValue = await readText(JSON_FOLDER, fileName).catch(() => null);
      const localValue = window.localStorage.getItem(key);

      if (fileValue !== null) {
        window.localStorage.setItem(key, fileValue);
        return;
      }

      if (localValue !== null) {
        await writeText(JSON_FOLDER, fileName, localValue).catch(() => undefined);
      }
    }),
  );
}

export function persistLocalStorageKey(key: string, value: string | null) {
  if (value === null) {
    window.localStorage.removeItem(key);
    void removeText(JSON_FOLDER, jsonFileName(key)).catch(() => undefined);
    return;
  }

  window.localStorage.setItem(key, value);
  void writeText(JSON_FOLDER, jsonFileName(key), value).catch(() => undefined);
}

export async function readStoredImage(url: string) {
  return readText(IMAGE_FOLDER, `${hashString(url)}.dataurl`).catch(() => null);
}

export async function writeStoredImage(url: string, dataUrl: string) {
  await writeText(IMAGE_FOLDER, `${hashString(url)}.dataurl`, dataUrl);
}

export async function writeLyricsFile(trackKey: string, fileName: string, content: string) {
  if (!hasTauriRuntime()) return null;
  return invoke<string>("storage_write_lyrics_file", { trackKey, fileName, content });
}

export async function readLyricsFile(trackKey: string) {
  if (!hasTauriRuntime()) return null;
  const result = await invoke<[string, string, string] | null>("storage_read_lyrics_file", { trackKey });
  if (!result) return null;

  return {
    fileName: result[0],
    localPath: result[1],
    content: result[2],
  };
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Image read failed"));
    reader.readAsDataURL(blob);
  });
}

function hashString(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(16);
}
