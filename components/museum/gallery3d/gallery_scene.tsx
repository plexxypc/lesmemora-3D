"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PointLight } from "three";
import { Atmosphere, Signature } from "@/components/museum/gallery3d/atmosphere";
import { ExhibitFrame } from "@/components/museum/gallery3d/exhibit_frame";
import { HallShell } from "@/components/museum/gallery3d/hall_shell";
import { Plaque } from "@/components/museum/gallery3d/plaque";
import type { gallery_tier } from "@/components/museum/gallery3d/quality";
import { RoomProps } from "@/components/museum/gallery3d/room_props";
import { dispose_shared_textures, ensure_font, read_font_family } from "@/components/museum/gallery3d/textures";
import type { gallery_layout } from "@/lib/gallery_layout";
import type { museum, theme_config } from "@/lib/types";

/**
 * Two lights that travel with the camera. The number of lights never changes while
 * the visitor walks, so the graphics card does not have to rebuild its shaders at every door.
 * The low tier uses none and relies on glows painted onto the walls instead.
 *
 * @param props - Light color.
 * @returns The lights.
 */
function LightPool({ color }: { color: string }) {
  const near = useRef<PointLight>(null);
  const far = useRef<PointLight>(null);
  useFrame((state) => {
    const z = state.camera.position.z;
    near.current?.position.set(0, 3.2, z - 1.5);
    far.current?.position.set(0, 3.2, z - 7.5);
  });
  return (
    <>
      <pointLight ref={near} color={color} intensity={26} distance={15} decay={2} position={[0, 3.2, 0]} />
      <pointLight ref={far} color={color} intensity={20} distance={15} decay={2} position={[0, 3.2, -6]} />
    </>
  );
}

/**
 * Mount children a moment late. The room ahead is built while the visitor is still
 * several seconds away from it, so making its textures never lands on a doorway.
 * Once mounted it stays mounted. A delay of 0 mounts at once.
 *
 * @param props - Delay in milliseconds and the content.
 * @returns The content, or nothing until the delay has passed.
 */
function Deferred({ ms, children }: { ms: number; children: ReactNode }) {
  const [ready, set_ready] = useState(false);
  useEffect(() => {
    if (ready) {
      return;
    }
    const timer = window.setTimeout(() => set_ready(true), ms);
    return () => window.clearTimeout(timer);
  }, [ms, ready]);
  return ready || ms === 0 ? <>{children}</> : null;
}

export interface gallery_scene_props {
  layout: gallery_layout;
  museum: museum;
  theme: theme_config;
  tier: gallery_tier;
  reduce_motion: boolean;
  active_room: number;
  letter_open: boolean;
  on_inspect: (id: string) => void;
  on_open_letter: () => void;
}

/**
 * The hall. Only the active room and its neighbors are mounted, so a long museum
 * keeps the same memory cost as a short one.
 *
 * @param props - Layout, museum, theme, and interaction handlers.
 * @returns Lights, rooms, and particles.
 */
export function GalleryScene({
  layout,
  museum,
  theme,
  tier,
  reduce_motion,
  active_room,
  letter_open,
  on_inspect,
  on_open_letter,
}: gallery_scene_props) {
  const { palette } = theme;
  const [family, set_family] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const resolved = read_font_family(theme.fonts.display);
    void ensure_font(resolved).then(() => {
      if (alive) {
        set_family(resolved);
      }
    });
    return () => {
      alive = false;
    };
  }, [theme.fonts.display]);

  useEffect(() => dispose_shared_textures, []);

  return (
    <>
      <color attach="background" args={[palette.background_deep]} />
      <fog attach="fog" args={[palette.background_deep, 9, 24]} />
      <ambientLight intensity={tier === "low" ? 1.5 : 1.0} color={palette.text} />
      <hemisphereLight args={[palette.accent_soft, palette.background, tier === "low" ? 1.25 : 0.9]} />
      {tier === "high" ? <LightPool color={palette.accent_soft} /> : null}

      {layout.rooms.map((entry) => {
        if (Math.abs(entry.index - active_room) > 1) {
          return null;
        }
        const next = layout.rooms[entry.index + 1];
        const next_theme_accent = next ? palette.accent_soft : null;
        return (
          <Deferred key={entry.room.id} ms={entry.index === active_room ? 0 : 450}>
          <group>
            <HallShell entry={entry} theme={theme} tier={tier} next_accent={next_theme_accent} is_first={entry.index === 0} />
            {entry.frames.map((frame) =>
              frame.kind === "photo" ? (
                <ExhibitFrame key={frame.id} frame={frame} theme={theme} tier={tier} on_inspect={on_inspect} />
              ) : family ? (
                <Plaque key={frame.id} frame={frame} theme={theme} tier={tier} family={family} on_inspect={on_inspect} />
              ) : null,
            )}
            {family ? (
              <RoomProps
                entry={entry}
                museum={museum}
                theme={theme}
                tier={tier}
                family={family}
                letter_open={letter_open}
                on_open_letter={on_open_letter}
              />
            ) : null}
            <Signature entry={entry} theme={theme} tier={tier} reduce_motion={reduce_motion} />
          </group>
          </Deferred>
        );
      })}

      <Atmosphere theme={theme} tier={tier} reduce_motion={reduce_motion} layout={layout} />
    </>
  );
}
