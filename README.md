## GitHub Releases

[![Noctune latest](https://img.shields.io/github/v/release/shhh1ra/Noctune?label=Noctune&logo=github)](https://github.com/shhh1ra/Noctune/releases/latest)

[![LRCGET portable](https://img.shields.io/badge/LRCGET-Portable%20ZIP-brightgreen?logo=github)](https://github.com/shhh1ra/LRCGET/releases/latest)

# Noctune

Noctune is an open-source, cross-platform Spotify desktop client with a custom React interface and a lightweight Tauri shell. It can play music inside the application through Spotify Web Playback SDK or control another Spotify Connect device when local playback is unavailable.

Noctune never accesses raw Spotify audio files. Playback and library operations use Spotify's official SDK and Web API.

## Features

- In-app playback through Spotify Web Playback SDK with Spotify Connect fallback.
- Playback controls: play/pause, previous/next, seek, volume, shuffle, repeat, and device transfer.
- Global track search and full-playlist local search.
- Liked Songs and Spotify playlist browsing with paginated track loading.
- Track context menu with queue, playlist, Liked Songs, and removal actions where Spotify permits them.
- Compact five-track queue preview with optimistic updates and later Spotify synchronization.
- Dynamic album-art accent color or a persistent custom accent selected in Settings.
- Ambient background glow, artwork preloading, and optimistic track transitions.
- Collapsible sidebar, custom Windows titlebar controls, and macOS traffic-light controls.
- Optional accent borders for the application, dock, profile, navigation, and queue.
- Synced `.lrc` and plain-text lyrics with automatic scrolling.
- Local lyrics import and automatic lookup through [LRCLIB](https://lrclib.net/).
- Disk caching for settings, Spotify authorization data, playlist metadata, artwork, colors, and lyrics.
- Windows media-session metadata with the current title, artist, artwork, and transport controls.
- No client secret and no `.env` file required.

## Stack

- [Tauri 2](https://tauri.app/) and Rust for the native desktop shell and filesystem bridge.
- React 19, TypeScript, and Vite 6 for the interface.
- Spotify Web API, Web Playback SDK, Connect, and PKCE OAuth.
- LRCLIB for optional lyrics lookup.
- Lucide React for interface icons.

## Requirements

- Node.js LTS and npm.
- Rust with `rustc` and `cargo` available in `PATH`.
- Platform requirements from the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/).
- A Spotify account. In-app Web Playback SDK playback normally requires Spotify Premium; Connect controller mode can still target another available device.
- A Spotify developer application.

## Spotify Setup

1. Create an application in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Enable **Web API** and **Web Playback SDK**.
3. Add both redirect URIs:

   ```text
   http://127.0.0.1:5173/callback
   http://127.0.0.1:43872/callback
   ```

   Port `5173` is used during development. Packaged Tauri builds use a small local callback server on port `43872`, which forwards the completed login into Noctune.

4. Copy the Spotify **Client ID**. Noctune asks for it on first launch and stores it locally. A client secret is neither requested nor used.

If OAuth scopes change, sign out inside Noctune and connect Spotify again.

## Development

Install dependencies:

```bash
npm install
```

Run the complete Tauri application:

```bash
npm run dev
```

Run only the browser interface when native APIs are not needed:

```bash
npm run web:dev
```

Validate the TypeScript and Vite production build:

```bash
npm run build
```

## Keyboard Shortcuts

Shortcuts work while the Noctune window is focused. Letter shortcuts use physical key positions, so they behave consistently with any keyboard layout.

| Shortcut | Action |
| --- | --- |
| `Space` | Play or pause |
| `Ctrl+P` / `Cmd+P` | Open Settings |
| `Ctrl+K` / `Cmd+K` | Open global search and focus the search field |
| `Ctrl+L` / `Cmd+L` | Toggle between lyrics and the player |
| `Ctrl+Up` / `Cmd+Up` | Increase volume by 5% |
| `Ctrl+Down` / `Cmd+Down` | Decrease volume by 5% |
| `Alt+Left` | Previous track |
| `Alt+Right` | Next track |
| `Esc` | Close the active settings, profile, or track menu |

Playback shortcuts do not fire while typing in an input, textarea, select, or editable text area. `Space` also preserves the native behavior of focused buttons and links.

## Desktop Builds

Build the Windows NSIS installer:

```bash
npm run dist:win
```

The installer is written to:

```text
src-tauri/target/release/bundle/nsis/Noctune_<version>_x64-setup.exe
```

For macOS, clone the repository on a Mac, install the Tauri prerequisites, and run:

```bash
npx tauri build
```

Tauri applications must be built on the target operating system. Code signing and notarization are not configured yet.

## Lyrics

### LRCGet utility

The repository includes `lrclib-tool`, a standalone portable Tauri + Vue utility for finding lyrics through LRCLIB and saving them as `.lrc` or `.txt` files. It can be used independently from Noctune when you only need to search for song lyrics. A future version will add manual timestamp synchronization similar to Musixmatch.

Lyrics are resolved in this order:

1. A saved local `.lrc` or `.txt` file.
2. An exact LRCLIB request using track, artist, album, and duration metadata.
3. An LRCLIB search request as fallback.

Successful LRCLIB responses are written to disk. Synced LRC timestamps drive the active-line animation and scroll only the lyrics container, leaving the application layout fixed. Empty timed LRC rows are ignored so instrumental markers do not create large blank areas.

The LRCLIB request implementation lives in `src/lyricsProvider.ts`; parsing and cache formats live in `src/lyrics.ts`; feature state and UI live in `src/features/lyrics/`.

## Local Data

Noctune first tries to create a writable `NoctuneData` directory beside the executable:

```text
NoctuneData/
  images/
  json/
  lyrics/
```

When the installation directory is not writable, which is common for per-machine installs under `Program Files`, Noctune falls back to the operating system application-data directory and creates `NoctuneData` there.

- `json/` stores settings, the Client ID, PKCE authorization state, UI cache, and sidebar state.
- `images/` stores cached artwork as data URLs.
- `lyrics/` stores imported or downloaded `.lrc` and `.txt` files.

Authorization tokens are local application data. Do not publish the `NoctuneData` directory or include it in release archives.

## Architecture

The project is being split into small feature and platform boundaries:

```text
src/
  bootstrap.ts              persisted-state initialization
  spotify/                  OAuth, Web API, and playback integration
  features/lyrics/          lyrics state and presentation
  ui/components/            reusable interface components
  ui/App.tsx                application orchestration and navigation
  storage.ts                typed frontend storage bridge
  lyrics.ts                 LRC/plain-text parsing and cache models
  lyricsProvider.ts         LRCLIB HTTP integration
src-tauri/
  src/lib.rs                native storage and OAuth callback commands
```

Feature modules depend on narrow domain types rather than the complete Spotify API model where possible. `App.tsx` remains the coordinator for shared playback and navigation state while isolated features own their loading and presentation logic.

## Spotify Limitations

- Spotify does not provide raw audio files to third-party clients.
- Web Playback SDK availability and account eligibility are controlled by Spotify.
- Spotify may rate-limit playlist and search endpoints independently from playback endpoints.
- Playlist modification is subject to Spotify ownership and collaboration rules, even when a playlist is visible in the user's library.
- Queue contents and Connect device state are eventually consistent; Noctune uses optimistic UI and later reconciles with Spotify.

## License

MIT
