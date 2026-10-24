"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  InstancedMesh,
  Object3D,
  PlaneGeometry,
  type Points,
} from "three";
import type { gallery_tier } from "@/components/museum/gallery3d/quality";
import { glow_texture, particle_texture } from "@/components/museum/gallery3d/textures";
import { hall, type gallery_layout, type room_layout } from "@/lib/gallery_layout";
import type { motif, theme_config } from "@/lib/types";

type particle_mode = "flutter" | "glow";

interface particle_style {
  mode: particle_mode;
  count_high: number;
  count_low: number;
  size: number;
  fall: number;
  drift: number;
  colors: (theme: theme_config) => string[];
}

const styles: Record<motif, particle_style> = {
  petals: { mode: "flutter", count_high: 90, count_low: 36, size: 0.13, fall: 0.22, drift: 0.35, colors: (t) => [t.palette.accent, t.palette.accent_soft, "#ffffff"] },
  leaves: { mode: "flutter", count_high: 80, count_low: 32, size: 0.15, fall: 0.3, drift: 0.45, colors: () => ["#e0a050", "#c97a3a", "#9cb05a", "#d9c070"] },
  paper: { mode: "flutter", count_high: 70, count_low: 28, size: 0.16, fall: 0.18, drift: 0.3, colors: (t) => [t.palette.surface, t.palette.frame, t.palette.accent_soft] },
  confetti: { mode: "flutter", count_high: 120, count_low: 44, size: 0.1, fall: 0.35, drift: 0.4, colors: (t) => [t.palette.accent, "#ffd166", "#4cc9f0", "#f72585", "#a3e635"] },
  stars: { mode: "glow", count_high: 80, count_low: 30, size: 0.06, fall: -0.04, drift: 0.12, colors: (t) => [t.palette.accent_soft, "#ffffff"] },
  rings: { mode: "glow", count_high: 60, count_low: 24, size: 0.09, fall: -0.05, drift: 0.1, colors: (t) => [t.palette.accent_soft, "#ffe9a8"] },
  windows: { mode: "glow", count_high: 70, count_low: 28, size: 0.07, fall: -0.03, drift: 0.14, colors: () => ["#fff1cf", "#ffffff"] },
  hearth: { mode: "glow", count_high: 70, count_low: 28, size: 0.07, fall: -0.32, drift: 0.2, colors: () => ["#ffb05a", "#ff7a3a", "#ffd9a0"] },
};

export interface atmosphere_props {
  theme: theme_config;
  tier: gallery_tier;
  reduce_motion: boolean;
  layout: gallery_layout;
}

const span_ahead = 11;
const span_behind = 5;

/**
 * Drifting particles that follow the camera. The shape comes from the theme motif.
 *
 * @param props - Theme, tier, and motion preference.
 * @returns The particle layer, or nothing when motion is reduced.
 */
export function Atmosphere({ theme, tier, reduce_motion, layout }: atmosphere_props) {
  if (reduce_motion) {
    return null;
  }
  const style = styles[theme.background.motif];
  const count = tier === "high" ? style.count_high : style.count_low;
  return style.mode === "flutter" ? (
    <FlutterLayer theme={theme} style={style} count={count} layout={layout} />
  ) : (
    <GlowLayer theme={theme} style={style} count={count} layout={layout} />
  );
}

function seeded(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

interface particle_state {
  x: number[];
  y: number[];
  z: number[];
  phase: number[];
  spin: number[];
  placed: boolean;
}

/**
 * Keep a particle in a window around the camera. Particles live in the hall,
 * so they drift past as the camera walks, and wrap when they fall out of the window.
 *
 * @param state - Particle arrays.
 * @param index - Particle to place.
 * @param camera_z - Camera Z this frame.
 * @returns The particle's world Z.
 */
function window_z(state: particle_state, index: number, camera_z: number): number {
  const span = span_ahead + span_behind;
  let z = state.z[index] ?? 0;
  if (!state.placed) {
    z = camera_z + span_behind - (z / span) * span;
  }
  while (z > camera_z + span_behind) {
    z -= span;
  }
  while (z < camera_z - span_ahead) {
    z += span;
  }
  state.z[index] = z;
  return z;
}

function make_state(count: number, seed: number): particle_state {
  const random = seeded(seed);
  const state: particle_state = { x: [], y: [], z: [], phase: [], spin: [], placed: false };
  for (let index = 0; index < count; index += 1) {
    state.x.push((random() - 0.5) * (hall.width - 0.8));
    state.y.push(random() * hall.height);
    state.z.push(random() * (span_ahead + span_behind));
    state.phase.push(random() * Math.PI * 2);
    state.spin.push(0.4 + random() * 1.4);
  }
  return state;
}

function FlutterLayer({ theme, style, count, layout }: { theme: theme_config; style: particle_style; count: number; layout: gallery_layout }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const state = useMemo(() => make_state(count, 7), [count]);
  const geometry = useMemo(() => new PlaneGeometry(style.size, style.size * 1.15), [style.size]);
  const texture = particle_texture(theme.background.motif);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) {
      return;
    }
    const palette = style.colors(theme).map((value) => new Color(value));
    for (let index = 0; index < count; index += 1) {
      instanced.setColorAt(index, palette[index % palette.length] ?? new Color("#ffffff"));
    }
    if (instanced.instanceColor) {
      instanced.instanceColor.needsUpdate = true;
    }
  }, [count, style, theme]);

  useFrame((frame, delta) => {
    const instanced = mesh.current;
    if (!instanced) {
      return;
    }
    const camera_z = frame.camera.position.z;
    const t = frame.clock.elapsedTime;
    for (let index = 0; index < count; index += 1) {
      state.y[index] = (state.y[index] ?? 0) - style.fall * delta;
      if ((state.y[index] ?? 0) < 0.05) {
        state.y[index] = hall.height - 0.1;
      }
      const wrapped_z = Math.max(layout.z_end + 0.3, window_z(state, index, camera_z));
      const phase = state.phase[index] ?? 0;
      dummy.position.set(
        (state.x[index] ?? 0) + Math.sin(t * 0.6 + phase) * style.drift,
        state.y[index] ?? 1,
        wrapped_z,
      );
      const spin = state.spin[index] ?? 1;
      dummy.rotation.set(t * spin + phase, t * spin * 0.7, t * spin * 0.5);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
    }
    state.placed = true;
    instanced.instanceMatrix.needsUpdate = true;
    frame.invalidate();
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false} renderOrder={5}>
      <meshBasicMaterial map={texture} transparent alphaTest={0.05} side={DoubleSide} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

function GlowLayer({ theme, style, count, layout }: { theme: theme_config; style: particle_style; count: number; layout: gallery_layout }) {
  const points = useRef<Points>(null);
  const state = useMemo(() => make_state(count, 11), [count]);
  const texture = particle_texture(theme.background.motif);
  const geometry = useMemo(() => {
    const created = new BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = style.colors(theme).map((value) => new Color(value));
    for (let index = 0; index < count; index += 1) {
      const color = palette[index % palette.length] ?? new Color("#ffffff");
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
    created.setAttribute("position", new BufferAttribute(positions, 3));
    created.setAttribute("color", new BufferAttribute(colors, 3));
    return created;
  }, [count, style, theme]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((frame, delta) => {
    const camera_z = frame.camera.position.z;
    const t = frame.clock.elapsedTime;
    const attribute = geometry.getAttribute("position") as BufferAttribute;
    for (let index = 0; index < count; index += 1) {
      state.y[index] = (state.y[index] ?? 0) - style.fall * delta;
      if ((state.y[index] ?? 0) > hall.height - 0.1) {
        state.y[index] = 0.1;
      } else if ((state.y[index] ?? 0) < 0.05) {
        state.y[index] = hall.height - 0.2;
      }
      const wrapped_z = Math.max(layout.z_end + 0.3, window_z(state, index, camera_z));
      const phase = state.phase[index] ?? 0;
      attribute.setXYZ(
        index,
        (state.x[index] ?? 0) + Math.sin(t * 0.5 + phase) * style.drift,
        state.y[index] ?? 1,
        wrapped_z,
      );
    }
    state.placed = true;
    attribute.needsUpdate = true;
    const material = points.current?.material as { opacity: number } | undefined;
    if (material) {
      material.opacity = 0.8 + Math.sin(t * 2.2) * 0.12;
    }
    frame.invalidate();
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false} renderOrder={5}>
      <pointsMaterial
        map={texture}
        size={style.size * 3.2}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.85}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

export interface signature_props {
  entry: room_layout;
  theme: theme_config;
  tier: gallery_tier;
  reduce_motion: boolean;
}

/**
 * The one touch that makes each theme's rooms its own: a star ceiling, bunting,
 * window light, floating rings, or petals on the floor.
 *
 * @param props - Room, theme, tier, and motion preference.
 * @returns The signature props, or nothing.
 */
export function Signature({ entry, theme, tier, reduce_motion }: signature_props) {
  const kind = theme.background.motif;
  if (kind === "stars") {
    return <StarCeiling entry={entry} theme={theme} tier={tier} reduce_motion={reduce_motion} />;
  }
  if (kind === "confetti") {
    return <Bunting entry={entry} theme={theme} />;
  }
  if (kind === "windows") {
    return <LightShafts entry={entry} theme={theme} />;
  }
  if (kind === "rings") {
    return <FloatingRings entry={entry} theme={theme} reduce_motion={reduce_motion} />;
  }
  if (kind === "petals" || kind === "leaves" || kind === "paper") {
    return <FloorScatter entry={entry} theme={theme} tier={tier} />;
  }
  return <HearthGlow entry={entry} theme={theme} reduce_motion={reduce_motion} />;
}

function StarCeiling({ entry, theme, tier, reduce_motion }: signature_props) {
  const points = useRef<Points>(null);
  const texture = particle_texture("stars");
  const count = tier === "high" ? 160 : 70;
  const geometry = useMemo(() => {
    const random = seeded(entry.index * 31 + 5);
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (random() - 0.5) * (hall.width - 0.6);
      positions[index * 3 + 1] = hall.height - 0.04;
      positions[index * 3 + 2] = entry.z_near - random() * entry.depth;
    }
    const created = new BufferGeometry();
    created.setAttribute("position", new BufferAttribute(positions, 3));
    return created;
  }, [count, entry.depth, entry.index, entry.z_near]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((frame) => {
    const material = points.current?.material as { opacity: number } | undefined;
    if (material && !reduce_motion) {
      material.opacity = 0.7 + Math.sin(frame.clock.elapsedTime * 1.7 + entry.index) * 0.25;
    }
  });
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial map={texture} size={0.2} color={theme.palette.accent_soft} transparent opacity={0.8} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  );
}

function Bunting({ entry, theme }: { entry: room_layout; theme: theme_config }) {
  const mesh = useRef<InstancedMesh>(null);
  const strands = [0.3, 0.7];
  const flags = 11;
  const colors = useMemo(() => [theme.palette.accent, "#ffd166", "#4cc9f0", "#f72585", "#a3e635"].map((value) => new Color(value)), [theme]);
  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) {
      return;
    }
    const dummy = new Object3D();
    let index = 0;
    for (const fraction of strands) {
      const z = entry.z_near - entry.depth * fraction;
      for (let flag = 0; flag < flags; flag += 1) {
        const u = (flag + 0.5) / flags;
        const x = (u - 0.5) * (hall.width - 0.6);
        const sag = Math.sin(u * Math.PI) * 0.34;
        dummy.position.set(x, hall.height - 0.2 - sag, z);
        dummy.rotation.set(0, 0, Math.PI);
        dummy.updateMatrix();
        instanced.setMatrixAt(index, dummy.matrix);
        instanced.setColorAt(index, colors[index % colors.length] ?? new Color("#ffffff"));
        index += 1;
      }
    }
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) {
      instanced.instanceColor.needsUpdate = true;
    }
    // strands is a constant list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.depth, entry.z_near, colors]);
  return (
    <>
      <instancedMesh ref={mesh} args={[undefined, undefined, strands.length * flags]} frustumCulled={false}>
        <coneGeometry args={[0.13, 0.28, 3]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {strands.map((fraction) => (
        <mesh key={fraction} position={[0, hall.height - 0.16, entry.z_near - entry.depth * fraction]}>
          <boxGeometry args={[hall.width - 0.5, 0.012, 0.012]} />
          <meshBasicMaterial color={theme.palette.accent_soft} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function LightShafts({ entry, theme }: { entry: room_layout; theme: theme_config }) {
  const glow = glow_texture();
  const shafts = [0.22, 0.5, 0.78];
  return (
    <>
      {shafts.map((fraction) => (
        <mesh
          key={fraction}
          position={[1.1, hall.height / 2, entry.z_near - entry.depth * fraction]}
          rotation={[0, 0, 0.5]}
          renderOrder={2}
        >
          <planeGeometry args={[0.9, hall.height * 1.5]} />
          <meshBasicMaterial map={glow} color="#fff1cf" transparent opacity={0.1} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
        </mesh>
      ))}
      {shafts.map((fraction) => (
        <mesh key={`w${fraction}`} position={[hall.width / 2 - 0.02, 2.3, entry.z_near - entry.depth * fraction]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[1.0, 1.7]} />
          <meshBasicMaterial color={theme.palette.accent_soft} transparent opacity={0.34} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function FloatingRings({ entry, theme, reduce_motion }: { entry: room_layout; theme: theme_config; reduce_motion: boolean }) {
  const group = useRef<Object3D>(null);
  useFrame((frame) => {
    if (group.current && !reduce_motion) {
      group.current.rotation.y = frame.clock.elapsedTime * 0.25;
    }
  });
  const spots = [0.25, 0.5, 0.75];
  return (
    <>
      {spots.map((fraction, index) => (
        <group key={fraction} position={[index % 2 === 0 ? -1.4 : 1.4, hall.height - 0.9, entry.z_near - entry.depth * fraction]}>
          <group ref={index === 0 ? group : undefined}>
            <mesh rotation={[Math.PI / 2.6, 0, 0]}>
              <torusGeometry args={[0.2, 0.012, 8, 40]} />
              <meshBasicMaterial color={theme.palette.accent_soft} toneMapped={false} />
            </mesh>
            <mesh position={[0.17, 0, 0]} rotation={[0, Math.PI / 2.4, 0]}>
              <torusGeometry args={[0.2, 0.012, 8, 40]} />
              <meshBasicMaterial color="#ffe9a8" toneMapped={false} />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
}

function FloorScatter({ entry, theme, tier }: { entry: room_layout; theme: theme_config; tier: gallery_tier }) {
  const mesh = useRef<InstancedMesh>(null);
  const count = tier === "high" ? 44 : 18;
  const texture = particle_texture(theme.background.motif);
  const style = styles[theme.background.motif];
  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) {
      return;
    }
    const random = seeded(entry.index * 17 + 3);
    const dummy = new Object3D();
    const palette = style.colors(theme).map((value) => new Color(value));
    for (let index = 0; index < count; index += 1) {
      dummy.position.set((random() - 0.5) * 2.4, 0.02 + random() * 0.004, entry.z_near - random() * entry.depth);
      dummy.rotation.set(-Math.PI / 2, 0, random() * Math.PI * 2);
      dummy.scale.setScalar(0.9 + random() * 0.9);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
      instanced.setColorAt(index, palette[index % palette.length] ?? new Color("#ffffff"));
    }
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) {
      instanced.instanceColor.needsUpdate = true;
    }
  }, [count, entry.depth, entry.index, entry.z_near, style, theme]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false} renderOrder={2}>
      <planeGeometry args={[style.size * 1.5, style.size * 1.7]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.05} side={DoubleSide} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

function HearthGlow({ entry, theme, reduce_motion }: { entry: room_layout; theme: theme_config; reduce_motion: boolean }) {
  const light = useRef<{ intensity: number } | null>(null);
  const glow = glow_texture();
  useFrame((frame) => {
    if (light.current && !reduce_motion) {
      const t = frame.clock.elapsedTime;
      light.current.intensity = 5 + Math.sin(t * 7.1) * 0.9 + Math.sin(t * 13.3 + entry.index) * 0.6;
    }
  });
  return (
    <>
      <mesh position={[0, 0.9, entry.z_far + 0.3]} renderOrder={2}>
        <planeGeometry args={[3.4, 2.2]} />
        <meshBasicMaterial map={glow} color="#ff9a4a" transparent opacity={0.22} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 1.1, entry.z_far + 0.8]} color={theme.palette.accent} intensity={5} distance={8} decay={2} />
    </>
  );
}
