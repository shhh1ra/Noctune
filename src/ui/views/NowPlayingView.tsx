import { LogIn } from "lucide-react";
import { SpotifyTrack } from "../../spotify/api";

type NowPlayingViewProps = {
  floatingQueueActive: boolean;
  cover?: string;
  track: SpotifyTrack | null;
  artists: string;
  signedIn: boolean;
  onLogin: () => void;
  onOpenMetadataMenu: (event: React.MouseEvent) => void;
};

export function NowPlayingView({
  floatingQueueActive,
  cover,
  track,
  artists,
  signedIn,
  onLogin,
  onOpenMetadataMenu,
}: NowPlayingViewProps) {
  return (
    <section
      className={floatingQueueActive ? "now-playing" : "now-playing queue-hidden"}
      onContextMenu={onOpenMetadataMenu}
    >
      <div className="cover-wrap">
        {cover ? <img src={cover} alt="" /> : <div className="cover-placeholder" />}
      </div>
      <div className="track-copy">
        <p>{track?.album.name ?? "No album selected"}</p>
        <h1>{track?.name ?? "Play something in Spotify"}</h1>
        <h2>{artists}</h2>
        {!signedIn && (
          <button className="hero-action" onClick={onLogin}>
            <LogIn size={18} />
            Connect Spotify
          </button>
        )}
      </div>
    </section>
  );
}
