"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, type RefObject } from "react";

interface youtube_player {
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  destroy: () => void;
}

interface youtube_event {
  target: youtube_player;
  data?: number;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          videoId: string;
          width?: number;
          height?: number;
          host?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: youtube_event) => void;
            onStateChange?: (event: youtube_event) => void;
            onError?: () => void;
          };
        },
      ) => youtube_player;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtube_api_promise: Promise<void> | null = null;

/**
 * Load the official IFrame API once per page.
 *
 * @returns A promise that resolves when `YT.Player` exists.
 */
function load_youtube_api(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.YT?.Player) {
    return Promise.resolve();
  }
  if (youtube_api_promise) {
    return youtube_api_promise;
  }
  youtube_api_promise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.body.appendChild(script);
  });
  return youtube_api_promise;
}

export interface youtube_controls {
  play: () => void;
  pause: () => void;
  set_volume: (value: number) => void;
  set_muted: (muted: boolean) => void;
}

export interface youtube_host_props {
  video_id: string;
  controls_ref: RefObject<youtube_controls | null>;
  on_playing_change: (playing: boolean) => void;
  on_error: (message: string) => void;
}

/**
 * Minimal YouTube player used only when a museum pastes a video link.
 * It stays visually hidden. Playback still waits for a user gesture.
 *
 * @param props - Video id, control handle, and status callbacks.
 * @returns The hidden player host.
 */
export function YoutubeHost({ video_id, controls_ref, on_playing_change, on_error }: youtube_host_props) {
  const host_ref = useRef<HTMLDivElement | null>(null);
  const player_ref = useRef<youtube_player | null>(null);
  const wants_play = useRef(false);
  const volume_ref = useRef(0.7);
  const muted_ref = useRef(false);
  const on_playing_ref = useRef(on_playing_change);
  const on_error_ref = useRef(on_error);

  useEffect(() => {
    on_playing_ref.current = on_playing_change;
    on_error_ref.current = on_error;
  }, [on_error, on_playing_change]);

  useEffect(() => {
    let cancelled = false;
    void load_youtube_api().then(() => {
      if (cancelled || !host_ref.current || !window.YT?.Player) {
        return;
      }
      player_ref.current = new window.YT.Player(host_ref.current, {
        videoId: video_id,
        width: 160,
        height: 90,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          loop: 1,
          playlist: video_id,
        },
        events: {
          onReady: (event) => {
            const level = muted_ref.current ? 0 : Math.round(volume_ref.current * 100);
            event.target.setVolume(level);
            if (wants_play.current) {
              event.target.playVideo();
            }
          },
          onStateChange: (event) => {
            if (event.data === 1) {
              on_playing_ref.current(true);
            }
            if (event.data === 0 || event.data === 2) {
              on_playing_ref.current(false);
            }
          },
          onError: () => on_error_ref.current("This YouTube track could not play."),
        },
      });
    });
    return () => {
      cancelled = true;
      player_ref.current?.destroy();
      player_ref.current = null;
    };
  }, [video_id]);

  const play = useCallback(() => {
    wants_play.current = true;
    player_ref.current?.playVideo();
  }, []);

  const pause = useCallback(() => {
    wants_play.current = false;
    player_ref.current?.pauseVideo();
  }, []);

  const set_volume = useCallback((value: number) => {
    volume_ref.current = value;
    if (!muted_ref.current) {
      player_ref.current?.setVolume(Math.round(value * 100));
    }
  }, []);

  const set_muted = useCallback((muted: boolean) => {
    muted_ref.current = muted;
    if (muted) {
      player_ref.current?.mute();
      return;
    }
    player_ref.current?.unMute();
    player_ref.current?.setVolume(Math.round(volume_ref.current * 100));
  }, []);

  useImperativeHandle(controls_ref, () => ({ play, pause, set_volume, set_muted }), [pause, play, set_muted, set_volume]);

  return <div className="youtube_host" ref={host_ref} />;
}
