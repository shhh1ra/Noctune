import { ListMusic, Play, Search } from "lucide-react";
import { PlaylistSummary, PlaylistTrack, SpotifyTrack } from "../../spotify/api";
import { formatTime, playlistImage, playlistTrack } from "../appUtils";

type PlaylistsViewProps = {
  playlists: PlaylistSummary[];
  selectedPlaylist: PlaylistSummary | null;
  playlistTracks: PlaylistTrack[];
  visiblePlaylistTracks: PlaylistTrack[];
  playlistTrackQuery: string;
  signedIn: boolean;
  busy: boolean;
  loadingPlaylists: boolean;
  loadingMoreTracks: boolean;
  playlistScrolled: boolean;
  getTrackImage: (track: SpotifyTrack) => string | undefined;
  onRefresh: () => void;
  onOpenPlaylist: (playlist: PlaylistSummary) => void;
  onBackToPlaylists: () => void;
  onPlaylistTrackQueryChange: (query: string) => void;
  onPlayPlaylist: (playlist: PlaylistSummary) => void;
  onPlayPlaylistTrack: (track: SpotifyTrack, index: number) => void;
  onOpenTrackMenu: (
    event: React.MouseEvent,
    track: SpotifyTrack,
    sourcePlaylist?: PlaylistSummary,
  ) => void;
  onScroll: (event: React.UIEvent<HTMLElement>) => void;
};

export function PlaylistsView({
  playlists,
  selectedPlaylist,
  playlistTracks,
  visiblePlaylistTracks,
  playlistTrackQuery,
  signedIn,
  busy,
  loadingPlaylists,
  loadingMoreTracks,
  playlistScrolled,
  getTrackImage,
  onRefresh,
  onOpenPlaylist,
  onBackToPlaylists,
  onPlaylistTrackQueryChange,
  onPlayPlaylist,
  onPlayPlaylistTrack,
  onOpenTrackMenu,
  onScroll,
}: PlaylistsViewProps) {
  return (
    <section className="playlists-view">
      {!selectedPlaylist ? (
        <>
          <div className="section-heading">
            <div>
              <p>Library</p>
              <h2>Playlists</h2>
            </div>
            <button
              className="ghost compact"
              onClick={onRefresh}
              disabled={!signedIn || loadingPlaylists}
            >
              Refresh
            </button>
          </div>
          <div className="playlist-grid">
            {playlists.map((playlist) => (
              <button
                className={playlist.kind === "liked" ? "playlist-card liked" : "playlist-card"}
                key={`${playlist.kind}-${playlist.id}`}
                onClick={() => onOpenPlaylist(playlist)}
                disabled={loadingPlaylists && playlists.length === 0}
              >
                {playlistImage(playlist) ? (
                  <img src={playlistImage(playlist)} alt="" />
                ) : (
                  <span className="playlist-art">
                    <ListMusic size={32} />
                  </span>
                )}
                <strong>{playlist.name}</strong>
                <small>
                  {playlist.total} tracks - {playlist.owner}
                </small>
              </button>
            ))}
            {signedIn && !loadingPlaylists && playlists.length === 0 && (
              <p className="empty">No playlists found</p>
            )}
            {loadingPlaylists && <p className="empty">Loading playlists...</p>}
          </div>
        </>
      ) : (
        <div className="playlist-detail" onScroll={onScroll}>
          <div className={playlistScrolled ? "playlist-sticky visible" : "playlist-sticky"}>
            <strong>{selectedPlaylist.name}</strong>
            <button
              className="playlist-play compact-play"
              onClick={() => onPlayPlaylist(selectedPlaylist)}
              disabled={busy || playlistTracks.length === 0}
            >
              <Play size={16} />
              Play
            </button>
          </div>
          <div className="playlist-hero">
            {playlistImage(selectedPlaylist) ? (
              <img src={playlistImage(selectedPlaylist)} alt="" />
            ) : (
              <span className="playlist-art large">
                <ListMusic size={52} />
              </span>
            )}
            <div>
              <button className="text-button" onClick={onBackToPlaylists}>
                Back to playlists
              </button>
              <p>{selectedPlaylist.kind === "liked" ? "Saved tracks" : "Playlist"}</p>
              <div className="playlist-title-row">
                <h2>{selectedPlaylist.name}</h2>
                <button
                  className="hero-action playlist-play"
                  onClick={() => onPlayPlaylist(selectedPlaylist)}
                  disabled={busy || playlistTracks.length === 0}
                >
                  <Play size={18} />
                  Play
                </button>
              </div>
              <small>
                {selectedPlaylist.total} tracks - {selectedPlaylist.owner}
              </small>
            </div>
          </div>
          <label className="search-box playlist-search">
            <Search size={18} />
            <input
              value={playlistTrackQuery}
              onChange={(event) => onPlaylistTrackQueryChange(event.target.value)}
              placeholder="Search in this playlist"
              disabled={playlistTracks.length === 0}
            />
          </label>
          <div className="track-list">
            {visiblePlaylistTracks.map((item) => {
              const savedTrack = playlistTrack(item);
              const trackIndex = playlistTracks.findIndex(
                (candidate) => playlistTrack(candidate)?.uri === savedTrack?.uri,
              );

              return savedTrack ? (
                <button
                  className="track-row"
                  key={`${savedTrack.uri}-${trackIndex}`}
                  onClick={() => onPlayPlaylistTrack(savedTrack, trackIndex)}
                  onContextMenu={(event) => onOpenTrackMenu(event, savedTrack, selectedPlaylist)}
                  disabled={busy}
                >
                  <span>{trackIndex + 1}</span>
                  {getTrackImage(savedTrack) ? <img src={getTrackImage(savedTrack)} alt="" /> : <i />}
                  <span>
                    <strong>{savedTrack.name}</strong>
                    <small>{savedTrack.artists.map((artist) => artist.name).join(", ")}</small>
                  </span>
                  <small>{savedTrack.album.name}</small>
                  <small>{formatTime(savedTrack.duration_ms)}</small>
                </button>
              ) : null;
            })}
            {loadingPlaylists && <p className="empty">Loading tracks...</p>}
            {loadingMoreTracks && <p className="empty">Loading more tracks...</p>}
            {!loadingPlaylists && playlistTracks.length === 0 && (
              <p className="empty">No playable tracks here</p>
            )}
            {!loadingPlaylists && playlistTracks.length > 0 && visiblePlaylistTracks.length === 0 && (
              <p className="empty">No tracks match this search</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
