import { Download, LogIn, X } from "lucide-react";
import type { AvailableUpdate } from "../../update-check";

type AuthExpiredDialogProps = {
  onLogin: () => void;
};

type ClientIdDialogProps = {
  canClose: boolean;
  draft: string;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onSaveAndConnect: () => void;
};

type UpdateAvailableDialogProps = {
  update: AvailableUpdate;
  onClose: () => void;
  onOpenRelease: () => void;
};

export function AuthExpiredDialog({ onLogin }: AuthExpiredDialogProps) {
  return (
    <div className="settings-overlay session-overlay">
      <section className="settings-dialog session-dialog">
        <header className="settings-header">
          <div>
            <span>Spotify API</span>
            <h2>Reconnect controls</h2>
          </div>
        </header>
        <p className="session-copy">
          Spotify says the API authorization key is no longer valid. In-app playback may keep
          playing, but controls, playlists, search, and queue need a fresh connection.
        </p>
        <button className="hero-action session-action" onClick={onLogin}>
          <LogIn size={18} />
          Reconnect Spotify
        </button>
      </section>
    </div>
  );
}

export function ClientIdDialog({
  canClose,
  draft,
  onClose,
  onDraftChange,
  onSaveAndConnect,
}: ClientIdDialogProps) {
  return (
    <div className="settings-overlay session-overlay">
      <section className="settings-dialog session-dialog client-id-dialog">
        <header className="settings-header">
          <div>
            <span>Noctune setup</span>
            <h2>Spotify Client ID</h2>
          </div>
          {canClose && (
            <button className="settings-close" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          )}
        </header>
        <p className="session-copy">
          Paste your Spotify app Client ID. Noctune stores it locally and will use it for login.
        </p>
        <label className="client-id-field">
          <span>Client ID</span>
          <input
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="Spotify client id"
            autoFocus
          />
        </label>
        <button className="hero-action session-action" onClick={onSaveAndConnect}>
          <LogIn size={18} />
          Save and connect
        </button>
      </section>
    </div>
  );
}

export function UpdateAvailableDialog({
  update,
  onClose,
  onOpenRelease,
}: UpdateAvailableDialogProps) {
  return (
    <div className="settings-overlay session-overlay" onClick={onClose}>
      <section
        className="settings-dialog session-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-header">
          <div>
            <span>Update available</span>
            <h2>{update.name}</h2>
          </div>
          <button className="settings-close" onClick={onClose} title="Later">
            <X size={18} />
          </button>
        </header>
        <p className="session-copy">
          Noctune {update.latestVersion} is available. You are currently using version{" "}
          {update.currentVersion}.
        </p>
        <div className="session-actions">
          <button className="ghost" onClick={onClose}>
            Later
          </button>
          <button className="hero-action session-action" onClick={onOpenRelease}>
            <Download size={18} />
            Open release
          </button>
        </div>
      </section>
    </div>
  );
}
