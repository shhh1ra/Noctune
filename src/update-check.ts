import { getVersion } from "@tauri-apps/api/app";

const LATEST_RELEASE_API = "https://api.github.com/repos/shhh1ra/Noctune/releases/latest";

type GitHubRelease = {
  tag_name?: string;
  html_url?: string;
  name?: string | null;
};

export type AvailableUpdate = {
  currentVersion: string;
  latestVersion: string;
  name: string;
  url: string;
};

function versionParts(version: string) {
  return version
    .trim()
    .replace(/^v/i, "")
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

export function isNewerVersion(candidate: string, current: string) {
  const candidateParts = versionParts(candidate);
  const currentParts = versionParts(current);
  const length = Math.max(candidateParts.length, currentParts.length);

  for (let index = 0; index < length; index += 1) {
    const candidatePart = candidateParts[index] ?? 0;
    const currentPart = currentParts[index] ?? 0;

    if (candidatePart > currentPart) return true;
    if (candidatePart < currentPart) return false;
  }

  return false;
}

export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  const currentVersion = await getVersion();
  const response = await fetch(LATEST_RELEASE_API, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const release = (await response.json()) as GitHubRelease;
  const latestVersion = release.tag_name?.trim();
  const url = release.html_url?.trim();

  if (!latestVersion || !url || !isNewerVersion(latestVersion, currentVersion)) {
    return null;
  }

  return {
    currentVersion,
    latestVersion: latestVersion.replace(/^v/i, ""),
    name: release.name?.trim() || `Noctune ${latestVersion}`,
    url,
  };
}
