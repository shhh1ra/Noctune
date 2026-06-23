import { ReactNode } from "react";
import {
  ListMusic,
  LogIn,
  LogOut,
  MonitorSpeaker,
  PanelLeftClose,
  PanelLeftOpen,
  Rows3,
  Search,
  Settings,
} from "lucide-react";

type View = "now" | "playlists" | "search" | "devices" | "lyrics";

type SidebarProps = {
  collapsed: boolean;
  view: View;
  signedIn: boolean;
  queueVisible: boolean;
  profileMenuOpen: boolean;
  profileImage?: string;
  profileInitial: string;
  profileName: string;
  renderQueuePreview: (className: string) => ReactNode;
  onToggleCollapsed: () => void;
  onNavigateNow: () => void;
  onNavigatePlaylists: () => void;
  onNavigateSearch: () => void;
  onNavigateDevices: () => void;
  onToggleProfileMenu: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  onLogin: () => void;
};

export function Sidebar({
  collapsed,
  view,
  signedIn,
  queueVisible,
  profileMenuOpen,
  profileImage,
  profileInitial,
  profileName,
  renderQueuePreview,
  onToggleCollapsed,
  onNavigateNow,
  onNavigatePlaylists,
  onNavigateSearch,
  onNavigateDevices,
  onToggleProfileMenu,
  onOpenSettings,
  onSignOut,
  onLogin,
}: SidebarProps) {
  return (
    <aside className={collapsed ? "rail collapsed" : "rail"}>
      <button
        className="rail-toggle"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={onToggleCollapsed}
      >
        {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
      </button>
      <button
        className={view === "now" ? "nav active" : "nav"}
        title="Now playing"
        onClick={onNavigateNow}
      >
        <ListMusic size={20} />
        <span>Now</span>
      </button>
      <button
        className={view === "playlists" ? "nav active" : "nav"}
        title="Playlists"
        onClick={onNavigatePlaylists}
      >
        <Rows3 size={20} />
        <span>Playlists</span>
      </button>
      <button
        className={view === "search" ? "nav active" : "nav"}
        title="Search"
        onClick={onNavigateSearch}
      >
        <Search size={20} />
        <span>Search</span>
      </button>
      <button
        className={view === "devices" ? "nav active" : "nav"}
        title="Devices"
        onClick={onNavigateDevices}
      >
        <MonitorSpeaker size={20} />
        <span>Devices</span>
      </button>
      <div className="rail-footer">
        {signedIn &&
          !collapsed &&
          renderQueuePreview(
            queueVisible
              ? "queue-preview rail-queue-preview visible"
              : "queue-preview rail-queue-preview",
          )}
        {signedIn ? (
          <div className="profile-menu-wrap">
            {profileMenuOpen && (
              <div className="profile-menu">
                <button onClick={onOpenSettings}>
                  <Settings size={16} />
                  Settings
                </button>
                <button onClick={onSignOut}>
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
            <button className="profile-pill" onClick={onToggleProfileMenu}>
              {profileImage ? <img src={profileImage} alt="" /> : <span>{profileInitial}</span>}
              <strong>{profileName}</strong>
            </button>
          </div>
        ) : (
          <button className="primary" onClick={onLogin}>
            <LogIn size={18} />
            Connect Spotify
          </button>
        )}
      </div>
    </aside>
  );
}
