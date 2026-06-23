import { Album, Copy, Music, UserRound } from "lucide-react";

export type MetadataMenuState = {
  x: number;
  y: number;
} | null;

type MetadataContextMenuProps = {
  menu: NonNullable<MetadataMenuState>;
  trackName: string;
  artists: string;
  albumName: string;
  onCopy: (label: string, value: string) => void;
};

export function MetadataContextMenu({
  menu,
  trackName,
  artists,
  albumName,
  onCopy,
}: MetadataContextMenuProps) {
  return (
    <div
      className="track-context-menu metadata-context-menu"
      style={{ left: menu.x, top: menu.y }}
      onClick={(event) => event.stopPropagation()}
    >
      <button onClick={() => onCopy("track title", trackName)}>
        <Music size={16} />
        <span>
          Copy track title
          <small>{trackName}</small>
        </span>
      </button>
      <button onClick={() => onCopy("artist", artists)}>
        <UserRound size={16} />
        <span>
          Copy artist
          <small>{artists}</small>
        </span>
      </button>
      <button onClick={() => onCopy("album", albumName)}>
        <Album size={16} />
        <span>
          Copy album
          <small>{albumName}</small>
        </span>
      </button>
      <button onClick={() => onCopy("metadata", `${artists} - ${trackName}`)}>
        <Copy size={16} />
        <span>
          Copy artist - title
          <small>{artists} - {trackName}</small>
        </span>
      </button>
    </div>
  );
}
