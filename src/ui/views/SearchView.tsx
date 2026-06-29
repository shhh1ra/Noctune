import { Play, Search } from "lucide-react";
import { SpotifyTrack } from "../../spotify/api";

type SearchViewProps = {
  query: string;
  results: SpotifyTrack[];
  searching: boolean;
  signedIn: boolean;
  busy: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  getTrackImage: (track: SpotifyTrack) => string | undefined;
  onQueryChange: (query: string) => void;
  onPlayTrack: (track: SpotifyTrack) => void;
  onOpenTrackMenu: (event: React.MouseEvent, track: SpotifyTrack) => void;
};

export function SearchView({
  query,
  results,
  searching,
  signedIn,
  busy,
  inputRef,
  getTrackImage,
  onQueryChange,
  onPlayTrack,
  onOpenTrackMenu,
}: SearchViewProps) {
  return (
    <section className="search-view">
      <label className="search-box">
        <Search size={20} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search Spotify tracks"
          disabled={!signedIn}
        />
      </label>
      <div className="results">
        {searching && <p className="empty">Searching...</p>}
        {!searching &&
          results.map((result) => (
            <button
              className="result"
              key={result.uri}
              onClick={() => onPlayTrack(result)}
              onContextMenu={(event) => onOpenTrackMenu(event, result)}
              disabled={busy}
            >
              {getTrackImage(result) ? <img src={getTrackImage(result)} alt="" /> : <span />}
              <span>
                <strong>{result.name}</strong>
                <small>
                  {result.artists.map((artist) => artist.name).join(", ")} - {result.album.name}
                </small>
              </span>
              <Play size={18} />
            </button>
          ))}
        {!searching && signedIn && query.length > 1 && results.length === 0 && (
          <p className="empty">No tracks found</p>
        )}
      </div>
    </section>
  );
}
