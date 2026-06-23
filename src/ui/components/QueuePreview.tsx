import { ListPlus } from "lucide-react";
import { SpotifyTrack } from "../../spotify/api";

type QueuePreviewProps = {
  className: string;
  tracks: SpotifyTrack[];
  manualQueueUris: string[];
  busy: boolean;
  getTrackImage: (track: SpotifyTrack) => string | undefined;
  onPlayTrack: (track: SpotifyTrack, index: number) => void;
};

export function QueuePreview({
  className,
  tracks,
  manualQueueUris,
  busy,
  getTrackImage,
  onPlayTrack,
}: QueuePreviewProps) {
  return (
    <section className={className}>
      <div className="queue-preview-title">
        <span>Up next</span>
        {tracks.length > 0 && <small>{tracks.length}</small>}
      </div>
      {tracks.length > 0 ? (
        tracks.map((track, index) => {
          const image = getTrackImage(track);

          return (
            <button
              className="queue-preview-row"
              key={`${track.uri}-${index}`}
              onClick={() => onPlayTrack(track, index)}
              disabled={busy}
            >
              {image ? <img src={image} alt="" /> : <i />}
              <span>
                <strong>{track.name}</strong>
                <small>
                  {manualQueueUris.includes(track.uri) && (
                    <ListPlus className="queue-source-icon" size={13} />
                  )}
                  {track.artists.map((artist) => artist.name).join(", ")}
                </small>
              </span>
            </button>
          );
        })
      ) : (
        <p className="queue-empty">No queue yet</p>
      )}
    </section>
  );
}
