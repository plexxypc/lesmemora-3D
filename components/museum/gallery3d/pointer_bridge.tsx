"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, type MutableRefObject } from "react";
import type { pointer_state } from "@/components/museum/gallery3d/camera_rig";

export interface pointer_bridge_props {
  pointer: MutableRefObject<pointer_state>;
  enabled: boolean;
}

/**
 * Map pointer and keyboard input onto the explore camera.
 * Dragging looks around. Arrow keys, W/S, and the mouse wheel walk.
 *
 * @param props - Shared input ref and whether explore input is active.
 * @returns null.
 */
export function PointerBridge({ pointer, enabled }: pointer_bridge_props) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const input = pointer.current;
    if (!enabled) {
      input.dragging = false;
      input.key_forward = 0;
      return;
    }

    const element = gl.domElement;
    let last_x = 0;
    let last_y = 0;
    let active = false;

    function on_down(event: PointerEvent) {
      active = true;
      input.dragging = true;
      last_x = event.clientX;
      last_y = event.clientY;
      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        // Capture can fail for synthetic events.
      }
      invalidate();
    }

    function on_move(event: PointerEvent) {
      if (!active) {
        return;
      }
      input.yaw += (event.clientX - last_x) * 0.0048;
      input.pitch = Math.max(-0.45, Math.min(0.45, input.pitch - (event.clientY - last_y) * 0.0032));
      last_x = event.clientX;
      last_y = event.clientY;
      invalidate();
    }

    function on_up(event: PointerEvent) {
      active = false;
      input.dragging = false;
      try {
        element.releasePointerCapture(event.pointerId);
      } catch {
        // Capture may already be released.
      }
      invalidate();
    }

    function on_wheel(event: WheelEvent) {
      event.preventDefault();
      input.key_forward = Math.max(-1, Math.min(1, -event.deltaY * 0.02));
      invalidate();
      window.setTimeout(() => {
        input.key_forward = 0;
      }, 120);
    }

    function on_key_down(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (key === "arrowup" || key === "w") {
        input.key_forward = 1;
      } else if (key === "arrowdown" || key === "s") {
        input.key_forward = -1;
      } else if (key === "arrowleft" || key === "a") {
        input.yaw -= 0.09;
      } else if (key === "arrowright" || key === "d") {
        input.yaw += 0.09;
      } else {
        return;
      }
      invalidate();
    }

    function on_key_up(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (key === "arrowup" || key === "arrowdown" || key === "w" || key === "s") {
        input.key_forward = 0;
        invalidate();
      }
    }

    element.addEventListener("pointerdown", on_down);
    element.addEventListener("pointermove", on_move);
    element.addEventListener("pointerup", on_up);
    element.addEventListener("pointercancel", on_up);
    element.addEventListener("wheel", on_wheel, { passive: false });
    window.addEventListener("keydown", on_key_down);
    window.addEventListener("keyup", on_key_up);
    return () => {
      element.removeEventListener("pointerdown", on_down);
      element.removeEventListener("pointermove", on_move);
      element.removeEventListener("pointerup", on_up);
      element.removeEventListener("pointercancel", on_up);
      element.removeEventListener("wheel", on_wheel);
      window.removeEventListener("keydown", on_key_down);
      window.removeEventListener("keyup", on_key_up);
    };
  }, [enabled, gl, invalidate, pointer]);

  return null;
}
