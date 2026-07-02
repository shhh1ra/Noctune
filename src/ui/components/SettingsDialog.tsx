import { X } from "lucide-react";
import { normalizeHexColor } from "../color";
import { AppSettings } from "../settings";
import { normalizeThemeId, themes } from "../themes";

type SettingsDialogProps = {
  appSettings: AppSettings;
  customAccent: string | null;
  onClose: () => void;
  onEditClientId: () => void;
  onDisableRateLimitGuard: () => void;
  onUpdateSettings: (nextSettings: AppSettings, message?: string) => void;
};

export function SettingsDialog({
  appSettings,
  customAccent,
  onClose,
  onEditClientId,
  onDisableRateLimitGuard,
  onUpdateSettings,
}: SettingsDialogProps) {
  const accentColor = customAccent ?? "#1ed760";

  return (
    <div className="settings-overlay" onClick={onClose}>
      <section className="settings-dialog" onClick={(event) => event.stopPropagation()}>
        <header className="settings-header">
          <div>
            <span>Noctune</span>
            <h2>Settings</h2>
          </div>
          <button className="settings-close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </header>

        <label className="settings-row">
          <span>
            <strong>Spotify Client ID</strong>
            <small>Stored locally on this device. Used for Spotify login.</small>
          </span>
          <button className="settings-mini-button" onClick={onEditClientId} type="button">
            Edit
          </button>
        </label>

        <label className="settings-row settings-select-row">
          <span>
            <strong>Theme</strong>
            <small>{themes.find((theme) => theme.id === appSettings.themeId)?.description}</small>
          </span>
          <select
            value={appSettings.themeId}
            onChange={(event) => {
              const themeId = normalizeThemeId(event.target.value);
              const themeName = themes.find((theme) => theme.id === themeId)?.name ?? "Theme";
              onUpdateSettings(
                {
                  ...appSettings,
                  themeId,
                },
                `${themeName} theme enabled`,
              );
            }}
          >
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </label>

        <label className="settings-row">
          <span>
            <strong>Rate limit guard</strong>
            <small>Pause playlist and search requests when Spotify returns too many requests.</small>
          </span>
          <input
            type="checkbox"
            checked={appSettings.rateLimitGuardEnabled}
            onChange={(event) => {
              const enabled = event.target.checked;
              if (!enabled) onDisableRateLimitGuard();
              onUpdateSettings(
                {
                  ...appSettings,
                  rateLimitGuardEnabled: enabled,
                },
                enabled ? "Rate limit guard enabled" : "Rate limit guard disabled",
              );
            }}
          />
          <i />
        </label>

        <label className="settings-row">
          <span>
            <strong>Custom accent color</strong>
            <small>Override album colors throughout the app, including the background glow.</small>
          </span>
          <input
            type="checkbox"
            checked={appSettings.customAccentEnabled}
            onChange={(event) =>
              onUpdateSettings(
                {
                  ...appSettings,
                  customAccentEnabled: event.target.checked,
                },
                event.target.checked ? "Custom accent enabled" : "Dynamic accent enabled",
              )
            }
          />
          <i />
        </label>

        <div className={appSettings.customAccentEnabled ? "accent-settings visible" : "accent-settings"}>
          <span className="accent-preview" style={{ background: accentColor }} />
          <input
            className="accent-picker"
            type="color"
            value={accentColor}
            onChange={(event) =>
              onUpdateSettings({
                ...appSettings,
                customAccentColor: event.target.value,
              })
            }
            tabIndex={appSettings.customAccentEnabled ? 0 : -1}
          />
          <label>
            <span>HEX</span>
            <input
              value={appSettings.customAccentColor}
              onChange={(event) =>
                onUpdateSettings({
                  ...appSettings,
                  customAccentColor: event.target.value,
                })
              }
              onBlur={() => {
                const nextColor = normalizeHexColor(appSettings.customAccentColor) ?? "#1ed760";
                onUpdateSettings(
                  {
                    ...appSettings,
                    customAccentColor: nextColor,
                  },
                  "Accent color updated",
                );
              }}
              placeholder="#1ed760"
              tabIndex={appSettings.customAccentEnabled ? 0 : -1}
            />
          </label>
        </div>

        <label className="settings-row">
          <span>
            <strong>Borders</strong>
            <small>Enable accent borders on selected parts of the interface.</small>
          </span>
          <input
            type="checkbox"
            checked={appSettings.bordersEnabled}
            onChange={(event) =>
              onUpdateSettings(
                {
                  ...appSettings,
                  bordersEnabled: event.target.checked,
                },
                event.target.checked ? "Borders enabled" : "Borders disabled",
              )
            }
          />
          <i />
        </label>

        <div className={appSettings.bordersEnabled ? "border-settings visible" : "border-settings"}>
          <label className="settings-row border-option">
            <span>
              <strong>App border</strong>
              <small>Outline the whole application window.</small>
            </span>
            <input
              type="checkbox"
              checked={appSettings.borderAppEnabled}
              onChange={(event) =>
                onUpdateSettings({
                  ...appSettings,
                  borderAppEnabled: event.target.checked,
                })
              }
              tabIndex={appSettings.bordersEnabled ? 0 : -1}
            />
            <i />
          </label>
          <label className="settings-row border-option">
            <span>
              <strong>Dock border</strong>
              <small>Outline the bottom player dock.</small>
            </span>
            <input
              type="checkbox"
              checked={appSettings.borderDockEnabled}
              onChange={(event) =>
                onUpdateSettings({
                  ...appSettings,
                  borderDockEnabled: event.target.checked,
                })
              }
              tabIndex={appSettings.bordersEnabled ? 0 : -1}
            />
            <i />
          </label>
          <label className="settings-row border-option">
            <span>
              <strong>Profile border</strong>
              <small>Outline the profile button in the sidebar.</small>
            </span>
            <input
              type="checkbox"
              checked={appSettings.borderProfileEnabled}
              onChange={(event) =>
                onUpdateSettings({
                  ...appSettings,
                  borderProfileEnabled: event.target.checked,
                })
              }
              tabIndex={appSettings.bordersEnabled ? 0 : -1}
            />
            <i />
          </label>
          <label className="settings-row border-option">
            <span>
              <strong>Active sidebar button</strong>
              <small>Outline the selected sidebar navigation button.</small>
            </span>
            <input
              type="checkbox"
              checked={appSettings.borderActiveNavEnabled}
              onChange={(event) =>
                onUpdateSettings({
                  ...appSettings,
                  borderActiveNavEnabled: event.target.checked,
                })
              }
              tabIndex={appSettings.bordersEnabled ? 0 : -1}
            />
            <i />
          </label>
          <label className="settings-row border-option">
            <span>
              <strong>Queue border</strong>
              <small>Outline the queue panel in the sidebar and floating mode.</small>
            </span>
            <input
              type="checkbox"
              checked={appSettings.borderQueueEnabled}
              onChange={(event) =>
                onUpdateSettings({
                  ...appSettings,
                  borderQueueEnabled: event.target.checked,
                })
              }
              tabIndex={appSettings.bordersEnabled ? 0 : -1}
            />
            <i />
          </label>
        </div>
      </section>
    </div>
  );
}
