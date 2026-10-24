"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, type Group, type Mesh } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { set_pointer } from "@/components/museum/gallery3d/exhibit_frame";
import { glow_texture, glow_text_texture, plaque_texture, wrap_text } from "@/components/museum/gallery3d/textures";
import { hall, type room_layout } from "@/lib/gallery_layout";
import type { museum, theme_config } from "@/lib/types";

export interface room_props_props {
  entry: room_layout;
  museum: museum;
  theme: theme_config;
  family: string;
  letter_open: boolean;
  on_open_letter: () => void;
}

/**
 * Wrap text into the lines a glow texture should draw.
 *
 * @param text - Text to wrap.
 * @param family - Font family.
 * @param size - Font size in pixels.
 * @param width - Width in pixels.
 * @returns The wrapped lines.
 */
function wrapped(text: string, family: string, size: number, width: number): string[] {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return [text];
  }
  ctx.font = `600 ${size}px ${family}`;
  return wrap_text(ctx, text, width).slice(0, 5);
}

/**
 * The props that belong to one kind of room: lobby lettering, the letter desk, the closing words.
 *
 * @param props - Room layout, museum, theme, and letter state.
 * @returns The props for this room type.
 */
export function RoomProps({ entry, museum, theme, family, letter_open, on_open_letter }: room_props_props) {
  if (entry.type === "lobby") {
    return <LobbyProps entry={entry} museum={museum} theme={theme} family={family} />;
  }
  if (entry.type === "letter" && entry.desk) {
    return <LetterDesk entry={entry} theme={theme} letter_open={letter_open} on_open_letter={on_open_letter} />;
  }
  if (!entry.has_door) {
    return <FinaleProps entry={entry} museum={museum} theme={theme} family={family} />;
  }
  return null;
}

function LobbyProps({ entry, museum, theme, family }: Pick<room_props_props, "entry" | "museum" | "theme" | "family">) {
  const { palette } = theme;
  const title = useMemo(
    () =>
      glow_text_texture({
        lines: [
          { text: museum.title, size: 190, weight: 700 },
          ...(museum.title.toLowerCase().includes(museum.recipient_name.toLowerCase())
            ? []
            : [{ text: `for ${museum.recipient_name}`, size: 110, weight: 500, italic: true, color: palette.accent_soft }]),
        ],
        family,
        width: 2048,
        height: 420,
        glow: palette.accent,
        color: palette.text,
      }),
    [museum.title, museum.recipient_name, family, palette],
  );
  const note = useMemo(
    () =>
      plaque_texture({
        date: null,
        title: `For ${museum.recipient_name}`,
        body: museum.dedication,
        family,
        palette,
        width: 800,
        height: 560,
      }),
    [museum.recipient_name, museum.dedication, family, palette],
  );
  useEffect(() => () => title.dispose(), [title]);
  useEffect(() => () => note.dispose(), [note]);
  const glow = glow_texture();

  return (
    <group>
      <mesh position={[0, 3.22, entry.z_far + hall.wall / 2 + 0.03]} renderOrder={4}>
        <planeGeometry args={[5.6, 5.6 * (420 / 2048)]} />
        <meshBasicMaterial map={title} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 3.2, entry.z_far + hall.wall / 2 + 0.02]} renderOrder={3}>
        <planeGeometry args={[6.4, 1.6]} />
        <meshBasicMaterial map={glow} color={palette.accent} transparent opacity={0.26} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <group position={[-hall.width / 2 + 0.03, 1.8, entry.z_near - 4.1]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0, 0.025]}>
          <boxGeometry args={[1.9, 1.4, 0.05]} />
          <meshLambertMaterial color={palette.door} />
        </mesh>
        <mesh position={[0, 0, 0.054]}>
          <planeGeometry args={[1.8, 1.8 * (560 / 800)]} />
          <meshBasicMaterial map={note} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function FinaleProps({ entry, museum, theme, family }: Pick<room_props_props, "entry" | "museum" | "theme" | "family">) {
  const { palette } = theme;
  const closing = entry.room.exhibits.find((item) => item.kind === "note")?.body ?? theme.default_copy.closing;
  const texture = useMemo(
    () =>
      glow_text_texture({
        lines: [
          { text: entry.room.name, size: 84, weight: 500, italic: true, color: palette.accent_soft },
          ...wrapped(closing, family, 124, 1700).map((text) => ({ text, size: 124, weight: 700 })),
        ],
        family,
        width: 2048,
        height: 1100,
        glow: palette.accent,
        color: palette.text,
        line_gap: 1.3,
      }),
    [entry.room.name, closing, family, palette],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  const glow = glow_texture();
  const middle = (entry.z_near + entry.z_far) / 2;
  void museum;

  return (
    <group>
      <mesh position={[0, 1.95, entry.z_far + hall.wall / 2 + 0.03]} renderOrder={4}>
        <planeGeometry args={[5.4, 5.4 * (1100 / 2048)]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.95, entry.z_far + hall.wall / 2 + 0.02]} renderOrder={3}>
        <planeGeometry args={[6.6, 3.6]} />
        <meshBasicMaterial map={glow} color={palette.accent} transparent opacity={0.22} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.24, middle + 0.5]}>
        <boxGeometry args={[1.9, 0.12, 0.55]} />
        <meshLambertMaterial color={palette.door} />
      </mesh>
      {([-0.8, 0.8] as const).map((x) => (
        <mesh key={x} position={[x, 0.11, middle + 0.5]}>
          <boxGeometry args={[0.1, 0.22, 0.45]} />
          <meshLambertMaterial color={palette.background} />
        </mesh>
      ))}
    </group>
  );
}

function LetterDesk({
  entry,
  theme,
  letter_open,
  on_open_letter,
}: {
  entry: room_layout;
  theme: theme_config;
  letter_open: boolean;
  on_open_letter: () => void;
}) {
  const { palette } = theme;
  const desk = entry.desk;
  const flap = useRef<Group>(null);
  const paper = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  const open_ref = useRef(0);
  const glow = glow_texture();

  useFrame((state, delta) => {
    const target = letter_open ? 1 : 0;
    open_ref.current += (target - open_ref.current) * Math.min(1, delta * 4);
    if (flap.current) {
      flap.current.rotation.x = -open_ref.current * Math.PI * 0.94;
    }
    if (paper.current) {
      paper.current.position.y = 0.012 + open_ref.current * 0.1;
    }
    if (halo.current) {
      const pulse = 0.85 + Math.sin(state.clock.elapsedTime * 2.4) * 0.15;
      halo.current.scale.setScalar(pulse * (1 - open_ref.current * 0.6));
    }
    if (Math.abs(target - open_ref.current) > 0.003) {
      state.invalidate();
    }
  });

  if (!desk) {
    return null;
  }

  const click = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 8) {
      return;
    }
    event.stopPropagation();
    on_open_letter();
  };

  return (
    <group position={[desk.x, 0, desk.z]}>
      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[1.7, 0.07, 0.9]} />
        <meshStandardMaterial color={palette.door} roughness={0.55} metalness={0.1} />
      </mesh>
      {([-0.76, 0.76] as const).flatMap((x) =>
        ([-0.38, 0.38] as const).map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.39, z]}>
            <boxGeometry args={[0.07, 0.78, 0.07]} />
            <meshStandardMaterial color={palette.door} roughness={0.6} />
          </mesh>
        )),
      )}

      <mesh position={[0.62, 0.84, -0.1]}>
        <cylinderGeometry args={[0.1, 0.12, 0.05, 20]} />
        <meshStandardMaterial color="#2b2320" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.62, 1.1, -0.1]}>
        <cylinderGeometry args={[0.012, 0.012, 0.5, 8]} />
        <meshStandardMaterial color="#2b2320" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.62, 1.4, -0.1]}>
        <coneGeometry args={[0.2, 0.2, 24, 1, true]} />
        <meshBasicMaterial color="#ffcf8f" side={2} toneMapped={false} />
      </mesh>
      <mesh position={[0.62, 1.22, -0.1]} renderOrder={3}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial map={glow} color="#ffb870" transparent opacity={0.4} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight position={[0.62, 1.3, 0]} color="#ffc78a" intensity={7} distance={5} decay={2} />

      <group position={[-0.15, 0.815, 0.05]} rotation={[0, 0.12, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 0.014, 0.34]} />
          <meshLambertMaterial color="#f4ead9" />
        </mesh>
        <mesh ref={paper} position={[0, 0.012, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.44, 0.28]} />
          <meshBasicMaterial color="#fffaf0" side={2} />
        </mesh>
        <group ref={flap} position={[0, 0.009, -0.17]}>
          <mesh position={[0, 0, 0.085]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.5, 0.17]} />
            <meshLambertMaterial color="#ead9bf" side={2} />
          </mesh>
        </group>
        <mesh position={[0, 0.02, 0.02]}>
          <circleGeometry args={[0.028, 16]} />
          <meshBasicMaterial color={palette.accent} toneMapped={false} />
        </mesh>
        <mesh ref={halo} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <planeGeometry args={[1.0, 1.0]} />
          <meshBasicMaterial map={glow} color={palette.accent_soft} transparent opacity={0.65} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.1, 0]} onClick={click} onPointerOver={set_pointer("pointer")} onPointerOut={set_pointer("")}>
          <boxGeometry args={[0.9, 0.3, 0.7]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
