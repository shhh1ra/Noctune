import {
  ListMusic,
  Mic2,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";

type PlayerDockProps = {
  cover?: string;
  trackName: string;
  artists: string;
  shuffle: boolean;
  playing: boolean;
  repeat: "off" | "context" | "track";
  progressMs: number;
  durationMs: number;
  volume: number;
  busy: boolean;
  playbackAvailable: boolean;
  volumeAvailable: boolean;
  queueVisible: boolean;
  queueAvailable: boolean;
  lyricsActive: boolean;
  lyricsAvailable: boolean;
  onToggleShuffle: () => void;
  onPrevious: () => void;
  onTogglePlayback: () => void;
  onNext: () => void;
  onCycleRepeat: () => void;
  onProgressPreview: (value: number) => void;
  onSeek: (value: number) => void;
  onToggleQueue: () => void;
  onToggleLyrics: () => void;
  onVolumePreview: (value: number) => void;
  onVolumeCommit: (value: number) => void;
};

function formatTime(ms = 0) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function rangeStyle(percent: number) {
  return { "--range-fill": `${Math.min(100, Math.max(0, percent))}%` } as React.CSSProperties;
}

export function PlayerDock(props: PlayerDockProps) {
  const progressPercent = props.durationMs ? (props.progressMs / props.durationMs) * 100 : 0;

  return (
    <footer className="player">
      <div className="mini-track">
        {props.cover ? <img src={props.cover} alt="" /> : <span />}
        <div>
          <strong>{props.trackName}</strong>
          <small>{props.artists}</small>
        </div>
      </div>

      <div className="transport">
        <div className="transport-buttons">
          <button
            className={props.shuffle ? "active-icon" : ""}
            onClick={props.onToggleShuffle}
            title="Shuffle"
            disabled={!props.playbackAvailable || props.busy}
          >
            <Shuffle size={18} />
          </button>
          <button onClick={props.onPrevious} title="Previous" disabled={!props.playbackAvailable || props.busy}>
            <SkipBack size={22} />
          </button>
          <button
            className="play"
            onClick={props.onTogglePlayback}
            title={props.playing ? "Pause" : "Play"}
            disabled={!props.playbackAvailable || props.busy}
          >
            {props.playing ? <Pause size={26} /> : <Play size={26} />}
          </button>
          <button onClick={props.onNext} title="Next" disabled={!props.playbackAvailable || props.busy}>
            <SkipForward size={22} />
          </button>
          <button
            className={props.repeat !== "off" ? "active-icon" : ""}
            onClick={props.onCycleRepeat}
            title="Repeat"
            aria-label={props.repeat === "track" ? "Repeat one" : "Repeat"}
            disabled={!props.playbackAvailable || props.busy}
          >
            <Repeat size={18} />
          </button>
        </div>

        <div className="progress">
          <span>{formatTime(props.progressMs)}</span>
          <input
            type="range"
            min={0}
            max={props.durationMs || 1}
            value={Math.min(props.progressMs, props.durationMs || 1)}
            onChange={(event) => props.onProgressPreview(Number(event.target.value))}
            onMouseUp={(event) => props.onSeek(Number(event.currentTarget.value))}
            onKeyUp={(event) => props.onSeek(Number(event.currentTarget.value))}
            disabled={!props.lyricsAvailable || props.busy}
            style={rangeStyle(progressPercent)}
          />
          <span>{formatTime(props.durationMs)}</span>
        </div>
      </div>

      <div className="volume compact-volume">
        <button
          className={props.queueVisible ? "queue-toggle active-icon" : "queue-toggle"}
          onClick={props.onToggleQueue}
          title={props.queueVisible ? "Hide queue" : "Show queue"}
          disabled={!props.queueAvailable}
        >
          <ListMusic size={18} />
        </button>
        <button
          className={props.lyricsActive ? "lyrics-toggle active-icon" : "lyrics-toggle"}
          onClick={props.onToggleLyrics}
          title="Lyrics"
          disabled={!props.lyricsAvailable}
        >
          <Mic2 size={18} />
        </button>
        <Volume2 size={18} />
        <input
          type="range"
          min={0}
          max={100}
          value={props.volume}
          onChange={(event) => props.onVolumePreview(Number(event.target.value))}
          onMouseUp={(event) => props.onVolumeCommit(Number(event.currentTarget.value))}
          onTouchEnd={(event) => props.onVolumeCommit(Number(event.currentTarget.value))}
          onKeyUp={(event) => props.onVolumeCommit(Number(event.currentTarget.value))}
          disabled={!props.volumeAvailable || props.busy}
          style={rangeStyle(props.volume)}
        />
      </div>
    </footer>
  );
}
