"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { memo, useEffect, useRef, useState, type MutableRefObject } from "react";
import { CameraRig, type camera_rig_props, type pointer_state } from "@/components/museum/gallery3d/camera_rig";
import { GalleryScene, type gallery_scene_props } from "@/components/museum/gallery3d/gallery_scene";
import { PointerBridge } from "@/components/museum/gallery3d/pointer_bridge";
import type { gallery_tier } from "@/components/museum/gallery3d/quality";
import { gallery_pixel_ratio } from "@/lib/gallery_tour";

export interface gallery_canvas_props {
  scene: gallery_scene_props;
  rig: Omit<camera_rig_props, "pointer">;
  pointer: MutableRefObject<pointer_state>;
  tier: gallery_tier;
  explore: boolean;
  /** Called with the average frames per second for each measured window. */
  on_fps: (fps: number) => void;
  measure_fps: boolean;
  on_canvas: (canvas: HTMLCanvasElement | null) => void;
}

/**
 * The single WebGL canvas for the museum.
 * It renders every frame while there is anything moving, and on demand when motion is reduced.
 *
 * @param props - Scene, camera, input, and quality settings.
 * @returns The R3F canvas.
 */
function GalleryCanvasBase({ scene, rig, pointer, tier, explore, on_fps, measure_fps, on_canvas }: gallery_canvas_props) {
  const [dpr, set_dpr] = useState(1);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    set_dpr(gallery_pixel_ratio(window.devicePixelRatio || 1, fine, tier === "low"));
  }, [tier]);

  return (
    <Canvas
      className="gallery3d_canvas"
      flat
      frameloop={scene.reduce_motion ? "demand" : "always"}
      dpr={dpr}
      gl={{ antialias: tier === "high", alpha: false, powerPreference: "high-performance" }}
      camera={{ position: [0, 1.55, 0], fov: rig.portrait ? 72 : 62, near: 0.08, far: 60 }}
      onCreated={({ gl }) => on_canvas(gl.domElement)}
    >
      <GalleryScene {...scene} />
      <CameraRig {...rig} pointer={pointer} />
      <PointerBridge pointer={pointer} enabled={explore} />
      <FpsWatch active={measure_fps} on_fps={on_fps} />
    </Canvas>
  );
}

/**
 * Measure frame rate in 3 second windows after a short settling time.
 *
 * @param props - Whether to measure, and where to report.
 * @returns null.
 */
function FpsWatch({ active, on_fps }: { active: boolean; on_fps: (fps: number) => void }) {
  const clock = useRef({ started: 0, frames: 0, grace_until: 0 });

  useFrame((frame) => {
    const state = clock.current;
    const now = frame.clock.elapsedTime;
    if (!active) {
      state.started = 0;
      state.grace_until = 0;
      return;
    }
    if (state.grace_until === 0) {
      state.grace_until = now + 1.6;
      return;
    }
    if (now < state.grace_until) {
      return;
    }
    if (state.started === 0) {
      state.started = now;
      state.frames = 0;
    }
    state.frames += 1;
    if (now - state.started >= 3) {
      on_fps(state.frames / (now - state.started));
      state.started = 0;
      state.grace_until = now;
    }
  });

  return null;
}

export const GalleryCanvas = memo(GalleryCanvasBase);
