# LRCGet

Standalone Tauri + Vue utility for searching LRCLIB by track, artist, and album.

```powershell
npm install
npm run dev
npm run build:portable
```

The portable executable is written to `src-tauri/target/release/lrcget.exe`. Downloaded lyrics are stored in a `Lyrics` directory beside the executable. End users do not need Node.js, npm, or Rust; Windows 10/11 provides the WebView2 runtime used by Tauri.
