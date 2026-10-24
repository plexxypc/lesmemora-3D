"use client";

import Link from "next/link";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type RefObject } from "react";
import { MuteIcon, PauseIcon, PlayIcon, VolumeIcon } from "@/components/museum/icons";
import { YoutubeHost, type youtube_controls } from "@/components/museum/youtube_audio";
import type { library_track, music_config } from "@/lib/types";

export interface music_player_handle {
  play: () => void;
  pause: () => void;
}

export interface music_player_props {
  music: music_config;
  track: library_track | null;
  handle_ref: RefObject<music_player_handle | null>;
}

/**
 * Persistent play, pause, volume, mute, and title.
 * Playback starts only after a tap. Library audio never comes from an upload.
 *
 * @param props - Music config, resolved library track, and an imperative handle.
 * @returns The mini player.
 */
export function MusicPlayer({ music, track, handle_ref }: music_player_props) {
  const audio_ref = useRef<HTMLAudioElement | null>(null);
  const youtube_ref = useRef<youtube_controls | null>(null);
  const [playing, set_playing] = useState(false);
  const [volume, set_volume_state] = useState(0.7);
  const [muted, set_muted_state] = useState(false);
  const [missing, set_missing] = useState(false);
  const [youtube_error, set_youtube_error] = useState<string | null>(null);
  const volume_ref = useRef(volume);
  const muted_ref = useRef(muted);
  const video_id = music.source === "youtube" ? music.video_id : null;
  const embed_url = music.source === "spotify" || music.source === "apple" ? music.embed_url : null;
  const embed_height = music.source === "apple" ? 152 : 80;

  useEffect(() => {
    volume_ref.current = volume;
    muted_ref.current = muted;
  }, [muted, volume]);

  const apply_level = useCallback(() => {
    const level = muted_ref.current ? 0 : volume_ref.current;
    if (audio_ref.current) {
      audio_ref.current.volume = level;
    }
    youtube_ref.current?.set_volume(volume_ref.current);
    youtube_ref.current?.set_muted(muted_ref.current);
  }, []);

  const play = useCallback(() => {
    apply_level();
    if (embed_url) {
      return;
    }
    if (video_id) {
      youtube_ref.current?.play();
      set_playing(true);
      return;
    }
    const audio = audio_ref.current;
    if (!audio || missing) {
      return;
    }
    void audio.play().catch(() => set_playing(false));
  }, [apply_level, embed_url, missing, video_id]);

  const pause = useCallback(() => {
    audio_ref.current?.pause();
    youtube_ref.current?.pause();
    set_playing(false);
  }, []);

  useImperativeHandle(handle_ref, () => ({ play, pause }), [pause, play]);

  useEffect(() => {
    function on_hide() {
      if (document.hidden) {
        pause();
      }
    }
    document.addEventListener("visibilitychange", on_hide);
    return () => document.removeEventListener("visibilitychange", on_hide);
  }, [pause]);

  const title = music.source === "library" ? (track?.title ?? "Track unavailable") : music.title;
  const note = missing ? "This track is not in the library yet." : youtube_error;

  if (embed_url) {
    return (
      <div className="player player_embed" role="region" aria-label="Music">
        <iframe
          src={embed_url}
          title={title}
          height={embed_height}
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
        <p className="embed_note">Full songs play only when logged in to Spotify/Apple Music.</p>
        <Link className="credits_link" href="/credits">
          Credits
        </Link>
      </div>
    );
  }

  return (
    <div className="player" role="region" aria-label="Music">
      {!video_id && track ? (
        <audio
          ref={audio_ref}
          src={track.file}
          loop
          preload="none"
          onPlay={() => set_playing(true)}
          onPause={() => set_playing(false)}
          onError={() => set_missing(true)}
        />
      ) : null}
      {video_id ? (
        <YoutubeHost
          video_id={video_id}
          controls_ref={youtube_ref}
          on_playing_change={set_playing}
          on_error={set_youtube_error}
        />
      ) : null}
      <button type="button" onClick={playing ? pause : play} aria-label={playing ? "Pause" : "Play"} disabled={missing}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <p className="track_title">{note ?? title}</p>
      <button
        type="button"
        className="quiet_control"
        aria-pressed={muted}
        aria-label={muted ? "Unmute" : "Mute"}
        onClick={() => {
          const next = !muted;
          set_muted_state(next);
          muted_ref.current = next;
          apply_level();
        }}
      >
        {muted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
      </button>
      <label className="sr_only" htmlFor="museum_volume">
        Volume
      </label>
      <input
        id="museum_volume"
        className="volume"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={muted ? 0 : volume}
        onChange={(event) => {
          const next = Number(event.target.value);
          set_volume_state(next);
          set_muted_state(next === 0);
          volume_ref.current = next;
          muted_ref.current = next === 0;
          apply_level();
        }}
      />
      <Link className="credits_link" href="/credits">
        Credits
      </Link>
    </div>
  );
}
