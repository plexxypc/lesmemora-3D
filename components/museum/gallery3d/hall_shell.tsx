"use client";

import { useEffect, useMemo } from "react";
import { AdditiveBlending, Color, DoubleSide, PlaneGeometry } from "three";
import { HallDoor } from "@/components/museum/gallery3d/hall_door";
import type { gallery_tier } from "@/components/museum/gallery3d/quality";
import { floor_texture, glow_texture } from "@/components/museum/gallery3d/textures";
import { hall, type room_layout } from "@/lib/gallery_layout";
import type { theme_config } from "@/lib/types";

/**
 * Blend one color toward another.
 *
 * @param base - Starting color.
 * @param toward - Color to move toward.
 * @param amount - 0 keeps the base, 1 gives the other color.
 * @returns A CSS hex string.
 */
function tint(base: string, toward: string, amount: number): string {
  return `#${new Color(base).lerp(new Color(toward), amount).getHexString()}`;
}

export interface hall_shell_props {
  entry: room_layout;
  theme: theme_config;
  tier: gallery_tier;
  next_accent: string | null;
  is_first: boolean;
}

/**
 * Floor, walls, ceiling, light coves, and the doorway of one room.
 * Content (frames, props) is rendered by the parent.
 *
 * @param props - Room layout, theme, tier, and the next room's accent.
 * @returns The room's architecture and lights.
 */
export function HallShell({ entry, theme, tier, next_accent, is_first }: hall_shell_props) {
  const { palette } = theme;
  const width = hall.width;
  const height = hall.height;
  const t = hall.wall;
  const depth = entry.depth;
  const middle = (entry.z_near + entry.z_far) / 2;
  const floor = floor_texture(theme.frame_style, palette);
  const glow = glow_texture();

  const floor_geometry = useMemo(() => {
    const geometry = new PlaneGeometry(width, depth);
    const uv = geometry.attributes.uv;
    for (let index = 0; index < uv.count; index += 1) {
      uv.setXY(index, uv.getX(index) * (width / 2), uv.getY(index) * (depth / 2));
    }
    uv.needsUpdate = true;
    return geometry;
  }, [width, depth]);
  useEffect(() => () => floor_geometry.dispose(), [floor_geometry]);

  const half_door = hall.door_width / 2;
  const side_width = (width - hall.door_width) / 2;
  const wall_color = tint(palette.background, palette.accent_soft, 0.12);
  const ceiling_color = tint(palette.background_deep, palette.background, 0.6);
  const trim = palette.door;
  const lights = tier === "high" ? [0.28, 0.72] : [0.5];

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, middle]} geometry={floor_geometry}>
        <meshLambertMaterial map={floor} transparent={tier === "high"} opacity={tier === "high" ? 0.82 : 1} />
      </mesh>
      {tier === "high" ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.4, middle]}>
          <planeGeometry args={[width + 2, depth + 2]} />
          <meshBasicMaterial color={palette.background_deep} />
        </mesh>
      ) : null}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, middle]}>
        <planeGeometry args={[1.7, depth - 0.8]} />
        <meshBasicMaterial color={palette.door} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      {([-0.85, 0.85] as const).map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.014, middle]}>
          <planeGeometry args={[0.025, depth - 0.8]} />
          <meshBasicMaterial color={palette.accent_soft} transparent opacity={0.55} toneMapped={false} />
        </mesh>
      ))}

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, middle]}>
        <planeGeometry args={[width, depth]} />
        <meshLambertMaterial color={ceiling_color} />
      </mesh>

      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <mesh position={[side * (width / 2 + t / 2), height / 2, middle]}>
            <boxGeometry args={[t, height, depth + t]} />
            <meshLambertMaterial color={wall_color} />
          </mesh>
          <mesh position={[side * (width / 2 - 0.01), 0.45, middle]}>
            <boxGeometry args={[0.04, 0.9, depth]} />
            <meshLambertMaterial color={trim} />
          </mesh>
          <mesh position={[side * (width / 2 - 0.025), 0.93, middle]}>
            <boxGeometry args={[0.07, 0.04, depth]} />
            <meshBasicMaterial color={palette.accent_soft} toneMapped={false} />
          </mesh>
          <mesh position={[side * (width / 2 - 0.06), height - 0.07, middle]}>
            <boxGeometry args={[0.1, 0.05, depth]} />
            <meshBasicMaterial color={palette.accent_soft} toneMapped={false} />
          </mesh>
          <mesh rotation={[0, side * -Math.PI / 2, 0]} position={[side * (width / 2 - 0.4), height - 0.12, middle]}>
            <planeGeometry args={[depth, 0.8]} />
            <meshBasicMaterial map={glow} color={palette.accent_soft} transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {is_first ? (
        <mesh position={[0, height / 2, entry.z_near + t / 2]}>
          <boxGeometry args={[width + t * 2, height, t]} />
          <meshLambertMaterial color={wall_color} />
        </mesh>
      ) : null}

      {entry.has_door ? (
        <>
          <mesh position={[-(half_door + side_width / 2), height / 2, entry.z_far]}>
            <boxGeometry args={[side_width, height, t]} />
            <meshLambertMaterial color={wall_color} />
          </mesh>
          <mesh position={[half_door + side_width / 2, height / 2, entry.z_far]}>
            <boxGeometry args={[side_width, height, t]} />
            <meshLambertMaterial color={wall_color} />
          </mesh>
          <mesh position={[0, hall.door_height + (height - hall.door_height) / 2, entry.z_far]}>
            <boxGeometry args={[hall.door_width, height - hall.door_height, t]} />
            <meshLambertMaterial color={wall_color} />
          </mesh>
          <HallDoor z={entry.z_far} theme={theme} next_accent={next_accent ?? palette.accent} />
        </>
      ) : (
        <mesh position={[0, height / 2, entry.z_far]}>
          <boxGeometry args={[width + t * 2, height, t]} />
          <meshLambertMaterial color={wall_color} />
        </mesh>
      )}

      {lights.map((fraction) => (
        <pointLight
          key={fraction}
          position={[0, height - 0.5, entry.z_near - depth * fraction]}
          color={palette.accent_soft}
          intensity={tier === "high" ? 24 : 36}
          distance={16}
          decay={2}
        />
      ))}
    </group>
  );
}
