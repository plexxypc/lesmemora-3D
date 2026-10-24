"use client";

import { useEffect, useMemo } from "react";
import { AdditiveBlending, DoubleSide, Quaternion, Vector3, type CanvasTexture } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { set_pointer } from "@/components/museum/gallery3d/exhibit_frame";
import { beam_texture, glow_texture, plaque_texture } from "@/components/museum/gallery3d/textures";
import { hall, type placed_frame } from "@/lib/gallery_layout";
import { format_exhibit_date } from "@/lib/format";
import type { theme_config } from "@/lib/types";

export interface plaque_props {
  frame: placed_frame;
  theme: theme_config;
  family: string;
  on_inspect: (id: string) => void;
}

/**
 * A timeline milestone: a printed card on the wall, a lit floor marker, and a spotlight.
 *
 * @param props - Frame placement, theme, loaded font family, and inspect handler.
 * @returns The plaque group and its floor marker.
 */
export function Plaque({ frame, theme, family, on_inspect }: plaque_props) {
  const { palette } = theme;
  const texture = useMemo<CanvasTexture>(
    () =>
      plaque_texture({
        date: frame.exhibit.date ? format_exhibit_date(frame.exhibit.date) : null,
        title: frame.exhibit.caption,
        body: frame.exhibit.body,
        family,
        palette,
        width: 1024,
        height: Math.round(1024 * (frame.height / frame.width)),
      }),
    [frame.exhibit.date, frame.exhibit.caption, frame.exhibit.body, frame.height, frame.width, family, palette],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  const glow = glow_texture();
  const beam = beam_texture();
  const cone = useMemo(() => {
    const lamp = new Vector3(0, hall.height - 0.14 - frame.position.y, 1.25);
    const target = new Vector3(0, 0, 0.08);
    const direction = lamp.clone().sub(target);
    return {
      length: direction.length(),
      quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize()),
      middle: lamp.clone().add(target).multiplyScalar(0.5),
      lamp,
    };
  }, [frame.position.y]);

  const click = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 8) {
      return;
    }
    event.stopPropagation();
    on_inspect(frame.id);
  };

  return (
    <>
      <group position={[frame.position.x, frame.position.y, frame.position.z]} rotation={[0, frame.rotation_y, 0]}>
        <mesh position={[0, 0, 0.006]} renderOrder={1}>
          <planeGeometry args={[frame.width * 2, frame.height * 2.1]} />
          <meshBasicMaterial map={glow} color={palette.accent_soft} transparent opacity={0.18} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <boxGeometry args={[frame.width + 0.12, frame.height + 0.12, 0.05]} />
          <meshLambertMaterial color={palette.door} />
        </mesh>
        <mesh position={[0, 0, 0.054]} onClick={click} onPointerOver={set_pointer("pointer")} onPointerOut={set_pointer("")}>
          <planeGeometry args={[frame.width, frame.height]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
        <group position={cone.middle.toArray()} quaternion={cone.quaternion}>
          <mesh renderOrder={2}>
            <cylinderGeometry args={[0.05, 0.9, cone.length, 24, 1, true]} />
            <meshBasicMaterial color={palette.accent_soft} alphaMap={beam} transparent opacity={0.09} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
          </mesh>
        </group>
        <mesh position={cone.lamp.toArray()}>
          <sphereGeometry args={[0.07, 12, 8]} />
          <meshBasicMaterial color={palette.accent_soft} toneMapped={false} />
        </mesh>
      </group>

      <group position={[0, 0.025, frame.position.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh renderOrder={3}>
          <ringGeometry args={[0.28, 0.34, 40]} />
          <meshBasicMaterial color={palette.accent_soft} transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh renderOrder={3}>
          <circleGeometry args={[0.8, 32]} />
          <meshBasicMaterial map={glow} color={palette.accent} transparent opacity={0.45} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}
