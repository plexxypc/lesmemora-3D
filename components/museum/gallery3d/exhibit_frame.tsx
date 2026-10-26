"use client";

import { useMemo } from "react";
import { AdditiveBlending, DoubleSide, Quaternion, Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { beam_texture, glow_texture, placeholder_texture, reflection_fade_texture } from "@/components/museum/gallery3d/textures";
import type { gallery_tier } from "@/components/museum/gallery3d/quality";
import { photo_max_px } from "@/components/museum/gallery3d/quality";
import { usePhoto } from "@/components/museum/gallery3d/use_photo";
import { hall, type placed_frame } from "@/lib/gallery_layout";
import type { frame_style, theme_config } from "@/lib/types";

export interface exhibit_frame_props {
  frame: placed_frame;
  theme: theme_config;
  tier: gallery_tier;
  on_inspect: (id: string) => void;
}

interface frame_look {
  outer: string;
  mat: string | null;
  border: number;
  metal: boolean;
  corner: boolean;
  card: boolean;
}

/**
 * Colors and thickness for a frame style.
 *
 * @param style - Theme frame style.
 * @param theme - Theme colors.
 * @returns How the frame should look.
 */
function look_for(style: frame_style, theme: theme_config): frame_look {
  const { palette } = theme;
  switch (style) {
    case "ornate":
      return { outer: palette.frame, mat: palette.frame_inner, border: 0.1, metal: false, corner: true, card: false };
    case "gilded":
      return { outer: "#c9a24b", mat: palette.frame_inner, border: 0.11, metal: true, corner: true, card: false };
    case "wood":
      return { outer: "#6d4a30", mat: palette.frame_inner, border: 0.09, metal: false, corner: false, card: false };
    case "modern":
      return { outer: "#14110f", mat: "#f6f3ee", border: 0.035, metal: false, corner: false, card: false };
    case "polaroid":
      return { outer: "#fbf8f1", mat: null, border: 0.07, metal: false, corner: false, card: true };
    default:
      return { outer: palette.frame, mat: null, border: 0.045, metal: false, corner: false, card: false };
  }
}

/**
 * Fit a picture inside a box without changing its shape.
 *
 * @param aspect - Picture width over height.
 * @param box_w - Box width.
 * @param box_h - Box height.
 * @returns Width and height of the picture.
 */
export function fit_inside(aspect: number, box_w: number, box_h: number): { width: number; height: number } {
  if (aspect >= box_w / box_h) {
    return { width: box_w, height: box_w / aspect };
  }
  return { width: box_h * aspect, height: box_h };
}

/**
 * A framed photo on a wall, with a wall wash, a spotlight cone, and a faint floor reflection.
 *
 * @param props - Frame placement, theme, and the inspect handler.
 * @returns The frame group.
 */
export function ExhibitFrame({ frame, theme, tier, on_inspect }: exhibit_frame_props) {
  const { palette } = theme;
  const photo = usePhoto(frame.exhibit.image_src, photo_max_px(tier));
  const fitted = fit_inside(photo.aspect, frame.width, frame.height);
  const look = useMemo(() => look_for(theme.frame_style, theme), [theme]);
  const glow = glow_texture();
  const beam = beam_texture();
  const fade = reflection_fade_texture();
  const map = photo.texture ?? placeholder_texture(palette);
  const card_extra = look.card ? 0.1 : 0;
  const mat_pad = look.mat ? 0.07 : 0;
  const slab_w = fitted.width + (mat_pad + look.border) * 2;
  const slab_h = fitted.height + (mat_pad + look.border) * 2 + card_extra;
  const photo_dy = look.card ? card_extra / 2 : 0;

  const cone = useMemo(() => {
    // Local space: +z points out of the wall into the hall, +y is up.
    const lamp = new Vector3(0, hall.height - 0.14 - frame.position.y, 1.25);
    const target = new Vector3(0, 0, 0.08);
    const direction = lamp.clone().sub(target);
    const length = direction.length();
    const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize());
    const middle = lamp.clone().add(target).multiplyScalar(0.5);
    return { length, quaternion, middle, lamp };
  }, [frame.position.y]);

  const click = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 8) {
      return;
    }
    event.stopPropagation();
    on_inspect(frame.id);
  };

  return (
    <group position={[frame.position.x, frame.position.y, frame.position.z]} rotation={[0, frame.rotation_y, 0]}>
      <mesh position={[0, 0, 0.006]} renderOrder={1}>
        <planeGeometry args={[frame.width * (tier === "high" ? 2.1 : 1.7), frame.height * (tier === "high" ? 2.1 : 1.7)]} />
        <meshBasicMaterial
          map={glow}
          color={palette.accent_soft}
          transparent
          opacity={0.2}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[slab_w, slab_h, 0.06]} />
        {look.metal && tier === "high" ? (
          <meshStandardMaterial color={look.outer} metalness={0.85} roughness={0.32} />
        ) : (
          <meshLambertMaterial color={look.outer} />
        )}
      </mesh>
      {look.mat ? (
        <mesh position={[0, photo_dy, 0.064]}>
          <planeGeometry args={[fitted.width + mat_pad * 2, fitted.height + mat_pad * 2]} />
          <meshLambertMaterial color={look.mat} />
        </mesh>
      ) : null}
      {look.corner
        ? ([-1, 1] as const).flatMap((sx) =>
            ([-1, 1] as const).map((sy) => (
              <mesh key={`${sx}${sy}`} position={[(slab_w / 2) * sx * 0.97, (slab_h / 2) * sy * 0.97, 0.075]}>
                <sphereGeometry args={[0.035, 10, 8]} />
                {look.metal && tier === "high" ? (
                  <meshStandardMaterial color="#e6c673" metalness={0.9} roughness={0.25} />
                ) : (
                  <meshLambertMaterial color={palette.accent} />
                )}
              </mesh>
            )),
          )
        : null}

      <mesh position={[0, photo_dy, 0.068]} onClick={click} onPointerOver={set_pointer("pointer")} onPointerOut={set_pointer("")}>
        <planeGeometry args={[fitted.width, fitted.height]} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>

      {look.card ? (
        <mesh position={[slab_w * 0.32, slab_h / 2, 0.075]} rotation={[0, 0, -0.35]}>
          <planeGeometry args={[0.3, 0.1]} />
          <meshBasicMaterial color={palette.accent_soft} transparent opacity={0.72} />
        </mesh>
      ) : null}

      {tier === "high" ? (
      <group position={cone.middle.toArray()} quaternion={cone.quaternion}>
        <mesh renderOrder={2}>
          <cylinderGeometry args={[0.05, 0.95, cone.length, 24, 1, true]} />
          <meshBasicMaterial
            color={palette.accent_soft}
            alphaMap={beam}
            transparent
            opacity={0.1}
            blending={AdditiveBlending}
            depthWrite={false}
            side={DoubleSide}
            toneMapped={false}
          />
        </mesh>
      </group>
      ) : null}
      <mesh position={cone.lamp.toArray()}>
        <sphereGeometry args={[0.07, 12, 8]} />
        <meshBasicMaterial color={palette.accent_soft} toneMapped={false} />
      </mesh>

      {tier === "high" ? (
        <mesh position={[0, -2 * frame.position.y - photo_dy, 0.068]} scale={[1, -1, 1]}>
          <planeGeometry args={[fitted.width, fitted.height]} />
          <meshBasicMaterial map={map} alphaMap={fade} transparent opacity={0.28} side={DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
}

/**
 * Hand cursor over something tappable.
 *
 * @param value - CSS cursor name, or empty to reset.
 * @returns A pointer handler.
 */
export function set_pointer(value: string) {
  return () => {
    document.body.style.cursor = value;
  };
}
