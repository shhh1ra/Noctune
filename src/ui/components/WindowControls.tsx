import { Maximize2, Minus, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

function minimizeWindow() {
  void appWindow.minimize();
}

function toggleMaximizeWindow() {
  void appWindow.toggleMaximize();
}

function closeWindow() {
  void appWindow.close();
}

export function WindowsWindowControls() {
  return (
    <div className="window-controls windows-controls">
      <button type="button" title="Minimize" onClick={minimizeWindow}>
        <Minus size={16} />
      </button>
      <button type="button" title="Maximize" onClick={toggleMaximizeWindow}>
        <Maximize2 size={14} />
      </button>
      <button type="button" title="Close" className="close" onClick={closeWindow}>
        <X size={17} />
      </button>
    </div>
  );
}

export function MacWindowControls() {
  return (
    <div className="window-controls mac-controls" aria-label="Window controls">
      <button type="button" title="Close" className="mac-close" onClick={closeWindow} />
      <button type="button" title="Minimize" className="mac-minimize" onClick={minimizeWindow} />
      <button type="button" title="Zoom" className="mac-zoom" onClick={toggleMaximizeWindow} />
    </div>
  );
}
