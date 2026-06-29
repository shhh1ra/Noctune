import { Laptop, MonitorSpeaker } from "lucide-react";
import { SpotifyDevice } from "../../spotify/api";
import { WebPlaybackDevice } from "../../spotify/webPlayback";

type DevicesViewProps = {
  devices: SpotifyDevice[];
  webDevice: WebPlaybackDevice | null;
  webPlaybackDeviceActive: boolean;
  signedIn: boolean;
  busy: boolean;
  onTransfer: (deviceId: string, play?: boolean) => void;
};

export function DevicesView({
  devices,
  webDevice,
  webPlaybackDeviceActive,
  signedIn,
  busy,
  onTransfer,
}: DevicesViewProps) {
  return (
    <section className="devices-view">
      {webDevice && (
        <button
          className={webPlaybackDeviceActive ? "device-row active" : "device-row"}
          onClick={() => onTransfer(webDevice.deviceId, false)}
          disabled={busy}
        >
          <Laptop size={22} />
          <span>
            <strong>Noctune</strong>
            <small>Web Playback SDK device</small>
          </span>
        </button>
      )}
      {devices.map((device) => (
        <button
          key={device.id}
          className={device.is_active ? "device-row active" : "device-row"}
          onClick={() => onTransfer(device.id, false)}
          disabled={busy || device.is_restricted}
        >
          <MonitorSpeaker size={22} />
          <span>
            <strong>{device.name}</strong>
            <small>
              {device.type}
              {device.is_restricted ? " - restricted" : ""}
            </small>
          </span>
        </button>
      ))}
      {signedIn && devices.length === 0 && !webDevice && (
        <p className="empty">Open Spotify on another device or wait for in-app playback.</p>
      )}
    </section>
  );
}
