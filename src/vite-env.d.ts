/// <reference types="vite/client" />

interface Window {
  onSpotifyWebPlaybackSDKReady?: () => void;
  Spotify?: typeof Spotify;
  desktop?: {
    platform: string;
  };
}

declare namespace Spotify {
  interface PlayerInit {
    name: string;
    getOAuthToken: (callback: (token: string) => void) => void;
    volume?: number;
  }

  interface WebPlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: {
      current_track: {
        id: string;
        name: string;
        uri: string;
        album: {
          name: string;
          images: Array<{ url: string; height: number; width: number }>;
        };
        artists: Array<{ name: string; uri: string }>;
      };
    };
  }

  class Player {
    constructor(options: PlayerInit);
    connect(): Promise<boolean>;
    disconnect(): void;
    addListener(event: string, callback: (...args: any[]) => void): boolean;
    removeListener(event: string): boolean;
    getCurrentState(): Promise<WebPlaybackState | null>;
    togglePlay(): Promise<void>;
    previousTrack(): Promise<void>;
    nextTrack(): Promise<void>;
    setVolume(volume: number): Promise<void>;
  }
}
