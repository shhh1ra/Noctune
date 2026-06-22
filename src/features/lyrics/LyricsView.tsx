import { ListMusic, Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import { LyricsTrack } from "../../lyrics";
import { LyricsFeature } from "./useLyrics";

type LyricsViewProps = {
  track: LyricsTrack | null;
  artists: string;
  lyrics: LyricsFeature;
  onBackToPlayer: () => void;
};

export function LyricsView({ track, artists, lyrics, onBackToPlayer }: LyricsViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void lyrics.importFile(file);
  }

  return (
    <section className="lyrics-view">
      <div className="lyrics-header">
        <div>
          <p>Lyrics</p>
          <h2>{track?.name ?? "Nothing playing"}</h2>
          <small>{artists}</small>
        </div>
        <div className="lyrics-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".lrc,.txt,text/plain"
            onChange={handleFileChange}
          />
          <button className="ghost compact" onClick={() => fileInputRef.current?.click()} disabled={!track}>
            <Upload size={17} />
            Import
          </button>
          {lyrics.entry && (
            <button className="ghost compact icon-only" onClick={lyrics.remove} title="Remove lyrics">
              <Trash2 size={17} />
            </button>
          )}
          <button className="ghost compact lyrics-now-button" onClick={onBackToPlayer}>
            <ListMusic size={17} />
            Player
          </button>
        </div>
      </div>

      <div className={lyrics.entry ? "lyrics-panel has-lyrics" : "lyrics-panel"}>
        {lyrics.entry ? (
          <>
            <div className="lyrics-meta">
              <span>{lyrics.entry.synced ? "Synced lyrics" : "Plain lyrics"}</span>
              <small>{lyrics.entry.fileName}</small>
            </div>
            <div className={lyrics.entry.synced ? "lyrics-lines synced" : "lyrics-lines plain"}>
              {lyrics.entry.lines.map((line, index) => (
                <p
                  ref={lyrics.entry?.synced && index === lyrics.activeLineIndex ? lyrics.activeLineRef : undefined}
                  className={lyrics.entry?.synced && index === lyrics.activeLineIndex ? "active" : ""}
                  key={`${line.timeMs ?? "plain"}-${index}-${line.text}`}
                >
                  {line.text || "\u00a0"}
                </p>
              ))}
            </div>
          </>
        ) : (
          <>
            <p>{lyrics.loading ? "Looking for lyrics" : "Lyrics unavailable"}</p>
            <span>
              {lyrics.loading
                ? "Checking local files first, then LRCLIB if nothing is saved on disk."
                : "Import a local .lrc or .txt file, or let Noctune fetch lyrics from LRCLIB."}
            </span>
          </>
        )}
      </div>
    </section>
  );
}
