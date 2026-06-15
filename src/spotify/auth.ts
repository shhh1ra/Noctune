import { getSpotifyClientId, spotifyConfig } from "./config";
import { createCodeChallenge, createCodeVerifier } from "./pkce";

const TOKEN_KEY = "spotify_tokens";
const VERIFIER_KEY = "spotify_pkce_verifier";

export type SpotifyTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes?: string[];
};

function parseScopeList(scope?: string) {
  return scope?.split(" ").filter(Boolean) ?? [];
}

function hasRequiredScopes(tokens: SpotifyTokens) {
  const grantedScopes = new Set(tokens.scopes ?? []);
  return spotifyConfig.scopes.every((scope) => grantedScopes.has(scope));
}

export function getStoredTokens(): SpotifyTokens | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;

  try {
    const tokens = JSON.parse(raw) as SpotifyTokens;
    if (!hasRequiredScopes(tokens)) {
      clearTokens();
      return null;
    }
    return tokens;
  } catch {
    clearTokens();
    return null;
  }
}

export function storeTokens(tokens: SpotifyTokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function buildLoginUrl() {
  const clientId = getSpotifyClientId();
  if (!clientId) throw new Error("Missing Spotify client id.");

  const verifier = createCodeVerifier();
  const challenge = await createCodeChallenge(verifier);
  localStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: spotifyConfig.scopes.join(" "),
    redirect_uri: spotifyConfig.redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    show_dialog: "true",
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const clientId = getSpotifyClientId();
  if (!clientId) throw new Error("Missing Spotify client id.");

  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error("Missing PKCE verifier.");

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: spotifyConfig.redirectUri,
    code_verifier: verifier,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) throw new Error("Spotify token exchange failed.");
  const payload = await response.json();

  const tokens: SpotifyTokens = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
    scopes: parseScopeList(payload.scope),
  };

  if (!hasRequiredScopes(tokens)) {
    clearTokens();
    throw new Error("Spotify did not grant all required permissions.");
  }

  storeTokens(tokens);
  localStorage.removeItem(VERIFIER_KEY);
  return tokens;
}

export async function refreshTokens(tokens: SpotifyTokens) {
  const clientId = getSpotifyClientId();
  if (!clientId) throw new Error("Missing Spotify client id.");

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) throw new Error("Spotify token refresh failed.");
  const payload = await response.json();

  const nextTokens: SpotifyTokens = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? tokens.refreshToken,
    expiresAt: Date.now() + payload.expires_in * 1000,
    scopes: payload.scope ? parseScopeList(payload.scope) : tokens.scopes,
  };

  storeTokens(nextTokens);
  return nextTokens;
}
