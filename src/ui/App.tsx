import { Laptop, ListMusic, LogIn, MonitorSpeaker, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buildLoginUrl, clearTokens, exchangeCodeForTokens, getStoredTokens, SpotifyTokens } from "../spotify/auth";
import { getDevices, getPlayback, PlaybackState, skipNext, skipPrevious, togglePlayback, transferPlayback } from "../spotify/api";
import { createWebPlaybackDevice, WebPlaybackDevice } from "../spotify/webPlayback";
import { spotifyConfig } from "../spotify/config";
import { useAccent } from "./useAccent";

export function App() {
  const [tokens, setTokens] = useState<SpotifyTokens | null>(() => getStoredTokens());
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [devices, setDevices] = useState<Array<{ id: string; name: string; type: string; is_active: boolean }>>([]);
  const [webDevice, setWebDevice] = useState<WebPlaybackDevice | null>(null);
  const [status, setStatus] = useState("Ready");

  const track = playback?.item ?? null;
  const cover = track?.album.images[0]?.url;
  const accent = useAccent(cover);

  const artists = useMemo(
    () => track?.artists.map((artist) => artist.name).join(", ") ?? "No active track",
    [track],
  );

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code || tokens) return;

    exchangeCodeForTokens(code)
      .then((nextTokens) => {
        setTokens(nextTokens);
        window.history.replaceState({}, document.title, "/");
      })
      .catch(() => setStatus("Login failed"));
  }, [tokens]);

  useEffect(() => {
    if (!tokens) return;

    let active = true;
    const poll = async () => {
      try {
        const [nextPlayback, nextDevices] = await Promise.all([
          getPlayback(tokens),
          getDevices(tokens),
        ]);
        if (!active) return;
        setPlayback(nextPlayback);
        setDevices(nextDevices.devices);
        setStatus(nextPlayback?.device ? "Connected" : "Connect fallback ready");
      } catch {
        if (active) setStatus("Waiting for Spotify");
      }
    };

    poll();
    const timer = window.setInterval(poll, 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [tokens]);

  useEffect(() => {
    if (!tokens || webDevice) return;

    createWebPlaybackDevice(tokens, (state) => {
      const current = state.track_window.current_track;
      setPlayback({
        is_playing: !state.paused,
        progress_ms: state.position,
        item: {
          id: current.id,
          name: current.name,
          uri: current.uri,
          duration_ms: state.duration,
          album: current.album,
          artists: current.artists,
        },
        device: { id: "web-playback", name: "This app", type: "Computer", is_active: true },
      });
    })
      .then((device) => {
        setWebDevice(device);
        setStatus("In-app playback ready");
      })
      .catch(() => setStatus("Connect fallback ready"));
  }, [tokens, webDevice]);

  async function login() {
    if (!spotifyConfig.clientId) {
      setStatus("Add Spotify client id to .env");
      return;
    }
    window.location.href = await buildLoginUrl();
  }

  async function control(action: "toggle" | "next" | "previous") {
    if (!tokens || !playback) return;
    if (action === "toggle") await togglePlayback(tokens, playback.is_playing);
    if (action === "next") await skipNext(tokens);
    if (action === "previous") await skipPrevious(tokens);
    setPlayback(await getPlayback(tokens));
  }

  async function transfer(deviceId: string) {
    if (!tokens) return;
    await transferPlayback(tokens, deviceId);
    setPlayback(await getPlayback(tokens));
  }

  return (
    <main
      className="shell"
      style={{
        "--accent": accent.primary,
        "--accent-muted": accent.muted,
      } as React.CSSProperties}
    >
      <aside className="rail">
        <div className="brand">
          <span className="brand-mark" />
          <span>Custom Spotify</span>
        </div>
        <button className="nav active" title="Library">
          <ListMusic size={20} />
          Library
        </button>
        <button className="nav" title="Devices">
          <MonitorSpeaker size={20} />
          Devices
        </button>
        <div className="rail-footer">
          {tokens ? (
            <button
              className="ghost"
              onClick={() => {
                clearTokens();
                setTokens(null);
              }}
            >
              Sign out
            </button>
          ) : (
            <button className="primary" onClick={login}>
              <LogIn size={18} />
              Connect Spotify
            </button>
          )}
        </div>
      </aside>

      <section className="stage">
        <header className="topbar">
          <span>{status}</span>
          <span>{window.desktop?.platform ?? "desktop"}</span>
        </header>

        <section className="now-playing">
          <div className="cover-wrap">
            {cover ? <img src={cover} alt="" /> : <div className="cover-placeholder" />}
          </div>
          <div className="track-copy">
            <p>{track?.album.name ?? "No album selected"}</p>
            <h1>{track?.name ?? "Play something in Spotify"}</h1>
            <h2>{artists}</h2>
          </div>
        </section>

        <section className="controls" aria-label="Playback controls">
          <button onClick={() => control("previous")} title="Previous">
            <SkipBack size={22} />
          </button>
          <button className="play" onClick={() => control("toggle")} title={playback?.is_playing ? "Pause" : "Play"}>
            {playback?.is_playing ? <Pause size={28} /> : <Play size={28} />}
          </button>
          <button onClick={() => control("next")} title="Next">
            <SkipForward size={22} />
          </button>
        </section>

        <section className="device-strip">
          <div>
            <Laptop size={18} />
            <span>{webDevice ? "In-app player available" : "Using Spotify Connect fallback"}</span>
          </div>
          {devices.map((device) => (
            <button
              key={device.id}
              className={device.is_active ? "device active" : "device"}
              onClick={() => transfer(device.id)}
            >
              {device.name}
            </button>
          ))}
        </section>
      </section>
    </main>
  );
}
