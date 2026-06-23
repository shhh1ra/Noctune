import { ChevronRight, ListPlus, Trash2 } from "lucide-react";
import { PlaylistSummary, SpotifyTrack } from "../../spotify/api";

export type TrackMenuState = {
  track: SpotifyTrack;
  sourcePlaylist?: PlaylistSummary | null;
  x: number;
  y: number;
} | null;

type TrackContextMenuProps = {
  menu: NonNullable<TrackMenuState>;
  targetPlaylists: PlaylistSummary[];
  busy: boolean;
  onAddToPlaylist: (track: SpotifyTrack, playlist: PlaylistSummary) => void;
  onAddToQueue: (track: SpotifyTrack) => void;
  onRemoveFromSource: (track: SpotifyTrack, playlist: PlaylistSummary) => void;
};

export function TrackContextMenu({
  menu,
  targetPlaylists,
  busy,
  onAddToPlaylist,
  onAddToQueue,
  onRemoveFromSource,
}: TrackContextMenuProps) {
  return (
    <div
      className="track-context-menu"
      style={{ left: menu.x, top: menu.y }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="track-context-group has-submenu">
        <button disabled={targetPlaylists.length === 0 || busy}>
          <ListPlus size={16} />
          Add to playlist
          <ChevronRight size={16} />
        </button>
        <div className="track-context-submenu">
          {targetPlaylists.length > 0 ? (
            targetPlaylists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => onAddToPlaylist(menu.track, playlist)}
                disabled={busy}
              >
                {playlist.name}
              </button>
            ))
          ) : (
            <span>No editable playlists</span>
          )}
        </div>
      </div>
      <button onClick={() => onAddToQueue(menu.track)} disabled={busy}>
        <ListPlus size={16} />
        Add to queue
      </button>
      {menu.sourcePlaylist &&
        (menu.sourcePlaylist.kind === "liked" || menu.sourcePlaylist.editable) && (
          <button
            onClick={() => onRemoveFromSource(menu.track, menu.sourcePlaylist!)}
            disabled={busy}
          >
            <Trash2 size={16} />
            {menu.sourcePlaylist.kind === "liked"
              ? "Remove from your Liked Songs"
              : "Remove from this playlist"}
          </button>
        )}
    </div>
  );
}
