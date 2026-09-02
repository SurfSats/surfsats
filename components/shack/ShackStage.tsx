"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  attachShackControls,
  cameraEye,
  confineCam,
} from "@/lib/shack/interact";
import { mat4 } from "@/lib/shack/math";
import {
  applyCam,
  CAM_PRESET_IDS,
  CAM_PRESETS,
  cloneCam,
  parseCam,
  focusPreset,
  parseFocus,
  parseFocusDoor,
  type CamPresetId,
  type OrbitCam,
} from "@/lib/shack/presets";
import { createRenderer, makeProj, makeView } from "@/lib/shack/renderer";
import {
  SHACK_DOORS,
  buildShack,
  isShackDoor,
  type ShackDoorId,
} from "@/lib/shack/room";
import {
  collectPickables,
  findNode,
  setGroupHighlight,
  startCamTween,
  tickCamTween,
  tickPulses,
  updateWorld,
  type CamTween,
} from "@/lib/shack/scene";

const HINT = "drag to orbit · scroll to zoom · tap a thing to go there";

function readFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Runtime = {
  cam: OrbitCam;
  exiting: boolean;
  applyPreset: (id: CamPresetId) => void;
};

export function ShackStage({
  cam: camParam,
  focus: focusParam,
  debug = false,
}: {
  cam?: string;
  focus?: string;
  debug?: boolean;
}) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);

  const focusDoor = parseFocusDoor(focusParam);
  const focus = parseFocus(focusParam);
  const initialPreset: CamPresetId = focusDoor
    ? focusPreset(focusDoor)
    : parseCam(camParam);

  const [preset, setPreset] = useState<CamPresetId>(initialPreset);
  const [glOk, setGlOk] = useState<boolean | null>(null);
  const [aa, setAa] = useState(false);
  const [hint, setHint] = useState(true);
  const [speech, setSpeech] = useState<string | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const root = buildShack();
    const floor = findNode(root, "floor");
    const floorGeom = floor?.mesh?.geometry;
    if (!floorGeom) {
      setGlOk(false);
      return;
    }

    const renderer = createRenderer(canvas, floorGeom);
    if (!renderer) {
      setGlOk(false);
      return;
    }
    setGlOk(true);
    setAa(renderer.aa);

    const cam = cloneCam(CAM_PRESETS[initialPreset]);
    confineCam(cam);
    const view = mat4();
    const proj = mat4();
    let tween: CamTween | null = null;
    let raf = 0;
    let last = performance.now();
    let hoverId: string | null = null;
    let speechTimer = 0;
    const focusPulseUntil = focusDoor ? last + 1200 : 0;
    let focusPulseDone = !focusDoor;

    const say = (text: string, holdMs: number) => {
      setSpeech(text);
      window.clearTimeout(speechTimer);
      speechTimer = window.setTimeout(() => setSpeech(null), holdMs);
    };

    const paint = () => {
      tickPulses(root, last / 1000);
      if (!focusPulseDone) {
        if (last < focusPulseUntil && focusDoor) {
          const on = Math.sin((focusPulseUntil - last) * 0.016) > 0;
          setGroupHighlight(root, on ? focusDoor : null);
        } else {
          focusPulseDone = true;
          setGroupHighlight(root, hoverId);
        }
      }
      updateWorld(root, null);
      const eye = cameraEye(cam);
      const aspect =
        canvas.clientWidth / Math.max(canvas.clientHeight, 1) || 1;
      makeProj(aspect, proj);
      makeView(eye, cam.target, view);
      renderer.draw(root, view, proj, eye);
    };

    const runtime: Runtime = {
      cam,
      exiting: false,
      applyPreset: (id) => {
        if (runtime.exiting) return;
        tween = null;
        applyCam(cam, CAM_PRESETS[id]);
        confineCam(cam);
      },
    };
    runtimeRef.current = runtime;

    const goTo = (id: ShackDoorId) => {
      if (runtime.exiting) return;
      const door = SHACK_DOORS[id];
      runtime.exiting = true;
      focusPulseDone = true;
      setGroupHighlight(root, id);
      const leave = () => routerRef.current.push(door.href);
      if (reducedMotion()) {
        leave();
        return;
      }
      tween = startCamTween(
        cam,
        {
          yaw: cam.yaw,
          pitch: 0.2,
          dist: 3.35,
          target: {
            x: door.look.x,
            y: door.look.y,
            z: door.look.z,
          },
        },
        0.45,
        leave,
      );
    };

    const resize = () => {
      renderer.resize();
      paint();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const stop = attachShackControls({
      canvas,
      getCam: () => cam,
      getInv: () => renderer.viewProjInv(),
      getPickables: () => collectPickables(root),
      enabled: () => !runtime.exiting,
      onDrag: (next) => {
        setDragging(next);
        if (next) setHint(false);
      },
      onHover: (id, ev) => {
        if (id !== hoverId) {
          hoverId = id;
          if (focusPulseDone) setGroupHighlight(root, id);
          setHovering(isShackDoor(id));
          if (isShackDoor(id)) {
            const door = SHACK_DOORS[id];
            if (
              door.hoverSpeech &&
              door.hoverKey &&
              !readFlag(door.hoverKey)
            ) {
              writeFlag(door.hoverKey);
              say(door.hoverSpeech, 2800);
            }
          }
        }
        const box = stageRef.current?.getBoundingClientRect();
        if (isShackDoor(id) && box) {
          setTip({
            x: ev.clientX - box.left,
            y: ev.clientY - box.top,
            text: SHACK_DOORS[id].tooltip,
          });
        } else {
          setTip(null);
        }
      },
      onPick: (id) => {
        if (!isShackDoor(id)) return;
        const door = SHACK_DOORS[id];
        if (door.tapSpeech && door.tapKey && !readFlag(door.tapKey)) {
          writeFlag(door.tapKey);
          say(door.tapSpeech, 450);
        }
        goTo(id);
      },
    });

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (tween && !tween.done) {
        tickCamTween(tween, dt, cam);
        confineCam(cam);
      }
      paint();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(speechTimer);
      stop();
      ro.disconnect();
      renderer.dispose();
      runtimeRef.current = null;
    };
    // Boot once; cam query is read into initialPreset on this mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPreset(id: CamPresetId) {
    setPreset(id);
    runtimeRef.current?.applyPreset(id);
  }

  return (
    <div
      ref={stageRef}
      className="shack-stage"
      data-focus={focus ?? undefined}
    >
      <canvas
        ref={canvasRef}
        className={
          dragging ? "is-drag" : hovering ? "is-hot" : undefined
        }
        aria-label="The Shack. Drag to look around. Tap the fire, bar, poster, or plaque."
      />

      <div className="shack-hud">
        <div className="shack-hud-top">
          <div className="shack-brand">
            <h1 className="shack-title">
              The Shack{" "}
              <span>/ side door · not the front door</span>
            </h1>
          </div>
          <div className="shack-pills" role="group" aria-label="Camera">
            {CAM_PRESET_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={preset === id ? "is-on" : undefined}
                aria-pressed={preset === id}
                onClick={() => onPreset(id)}
              >
                {id}
              </button>
            ))}
          </div>
        </div>

        {hint ? <p className="shack-hint">{HINT}</p> : null}

        {speech ? <p className="shack-speech">{speech}</p> : null}

        {tip ? (
          <p
            className="shack-tip"
            style={{ left: tip.x, top: tip.y }}
          >
            {tip.text}
          </p>
        ) : null}

        {debug ? (
          <p className="shack-debug">
            WEBGL2
            {glOk === false ? " · fail" : aa ? " · AA" : " · ok"}
          </p>
        ) : null}

        {glOk === false ? (
          <p className="shack-fallback">this shack wants webgl2</p>
        ) : null}
      </div>
    </div>
  );
}
