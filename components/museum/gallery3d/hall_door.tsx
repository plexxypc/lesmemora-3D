"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, type Group, type Mesh, type MeshBasicMaterial } from "three";
import { glow_texture } from "@/components/museum/gallery3d/textures";
import { smoothstep } from "@/lib/gallery_tour";
import { hall } from "@/lib/gallery_layout";
import type { theme_config } from "@/lib/types";

export interface hall_door_props {
  z: number;
  theme: theme_config;
  /** Accent of the room behind the door, so the seam of light matches it. */
  next_accent: string;
}

/**
 * A pair of doors in the far wall. They swing open as the camera nears,
 * so the opening depends only on where the camera is.
 *
 * @param props - Wall Z, theme, and the light color behind the door.
 * @returns The door frame, leaves, and the light seam.
 */
export function HallDoor({ z, theme, next_accent }: hall_door_props) {
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const light = useRef<Mesh>(null);
  const open_ref = useRef(0);
  const glow = glow_texture();
  const { palette } = theme;
  const half = hall.door_width / 2;
  const t = hall.wall;

  useFrame((state, delta) => {
    const distance = Math.abs(state.camera.position.z - z);
    const target = smoothstep((4.4 - distance) / 2.6);
    open_ref.current += (target - open_ref.current) * Math.min(1, delta * 7);
    const angle = open_ref.current * 1.75;
    if (left.current) {
      left.current.rotation.y = angle;
    }
    if (right.current) {
      right.current.rotation.y = -angle;
    }
    const material = light.current?.material as MeshBasicMaterial | undefined;
    if (material) {
      material.opacity = 0.55 + open_ref.current * 0.35;
    }
    if (Math.abs(target - open_ref.current) > 0.002) {
      state.invalidate();
    }
  });

  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, hall.door_height / 2, -t / 2 - 0.4]} ref={light} renderOrder={1}>
        <planeGeometry args={[hall.door_width + 0.4, hall.door_height + 0.2]} />
        <meshBasicMaterial map={glow} color={next_accent} transparent opacity={0.6} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>

      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[side * (half + 0.08), hall.door_height / 2, 0]}>
          <boxGeometry args={[0.16, hall.door_height + 0.1, t + 0.06]} />
          <meshLambertMaterial color={palette.door} emissive={palette.accent} emissiveIntensity={0.1} />
        </mesh>
      ))}
      <mesh position={[0, hall.door_height + 0.05, 0]}>
        <boxGeometry args={[hall.door_width + 0.4, 0.14, t + 0.06]} />
        <meshLambertMaterial color={palette.door} emissive={palette.accent} emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0, hall.door_height + 0.13, t / 2 + 0.02]}>
        <planeGeometry args={[hall.door_width + 0.3, 0.035]} />
        <meshBasicMaterial color={palette.accent_soft} toneMapped={false} />
      </mesh>

      <group ref={left} position={[-half, 0, 0]}>
        <mesh position={[half / 2, hall.door_height / 2, 0]}>
          <boxGeometry args={[half, hall.door_height, 0.07]} />
          <meshLambertMaterial color={palette.door} />
        </mesh>
        <mesh position={[half / 2, hall.door_height / 2, 0.04]}>
          <planeGeometry args={[half * 0.7, hall.door_height * 0.82]} />
          <meshBasicMaterial color={palette.accent} transparent opacity={0.16} toneMapped={false} />
        </mesh>
        <mesh position={[half - 0.1, 1.05, 0.06]}>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshBasicMaterial color={palette.accent_soft} toneMapped={false} />
        </mesh>
      </group>
      <group ref={right} position={[half, 0, 0]}>
        <mesh position={[-half / 2, hall.door_height / 2, 0]}>
          <boxGeometry args={[half, hall.door_height, 0.07]} />
          <meshLambertMaterial color={palette.door} />
        </mesh>
        <mesh position={[-half / 2, hall.door_height / 2, 0.04]}>
          <planeGeometry args={[half * 0.7, hall.door_height * 0.82]} />
          <meshBasicMaterial color={palette.accent} transparent opacity={0.16} toneMapped={false} />
        </mesh>
        <mesh position={[-half + 0.1, 1.05, 0.06]}>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshBasicMaterial color={palette.accent_soft} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
