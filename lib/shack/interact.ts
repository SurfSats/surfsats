import {
  clamp,
  raySphere,
  screenToRay,
  vec3,
  type Mat4,
  type Vec3,
} from "./math";
import {
  ORBIT,
  ROOM_H,
  ROOM_X,
  ROOM_Z,
  type OrbitCam,
} from "./presets";

export function orbitOffset(yaw: number, pitch: number, dist: number): Vec3 {
  const cp = Math.cos(pitch);
  return vec3(
    dist * cp * Math.sin(yaw),
    dist * Math.sin(pitch),
    dist * cp * Math.cos(yaw),
  );
}

export function cameraEye(cam: OrbitCam): Vec3 {
  const o = orbitOffset(cam.yaw, cam.pitch, cam.dist);
  return vec3(cam.target.x + o.x, cam.target.y + o.y, cam.target.z + o.z);
}

/** Keep the eye inside the inner room so walls never clip to a black void. */
export function confineCam(cam: OrbitCam): void {
  cam.pitch = clamp(cam.pitch, ORBIT.pitchMin, ORBIT.pitchMax);
  cam.dist = clamp(cam.dist, ORBIT.distMin, ORBIT.distMax);

  const m = 0.42;
  const xMin = -ROOM_X + m;
  const xMax = ROOM_X - m;
  const zMin = -ROOM_Z + m;
  const zMax = ROOM_Z - m;
  const yMin = 0.28;
  const yMax = ROOM_H - m;

  cam.target.x = clamp(cam.target.x, xMin + 0.6, xMax - 0.6);
  cam.target.y = clamp(cam.target.y, 0.4, yMax - 0.4);
  cam.target.z = clamp(cam.target.z, zMin + 0.6, zMax - 0.6);

  const offset = orbitOffset(cam.yaw, cam.pitch, cam.dist);
  const scaleAxis = (
    origin: number,
    delta: number,
    min: number,
    max: number,
  ) => {
    if (delta > 1e-6) return (max - origin) / delta;
    if (delta < -1e-6) return (min - origin) / delta;
    return 1;
  };
  const s = Math.min(
    1,
    scaleAxis(cam.target.x, offset.x, xMin, xMax),
    scaleAxis(cam.target.y, offset.y, yMin, yMax),
    scaleAxis(cam.target.z, offset.z, zMin, zMax),
  );
  if (s < 1) {
    cam.dist = clamp(cam.dist * Math.max(s, 0.08), ORBIT.distMin, ORBIT.distMax);
  }
}

export type PickHit = { id: string; center: Vec3; radius: number };

export function pickSphere(
  origin: Vec3,
  dir: Vec3,
  items: PickHit[],
): string | null {
  let best = Infinity;
  let id: string | null = null;
  for (const item of items) {
    const t = raySphere(origin, dir, item.center, item.radius);
    if (t !== null && t < best) {
      best = t;
      id = item.id;
    }
  }
  return id;
}

type Pointer = { x: number; y: number };

export function attachShackControls(opts: {
  canvas: HTMLCanvasElement;
  getCam: () => OrbitCam;
  getInv: () => Mat4;
  getPickables: () => PickHit[];
  enabled: () => boolean;
  onHover: (id: string | null, ev: PointerEvent) => void;
  onPick: (id: string) => void;
  onDrag: (dragging: boolean) => void;
}): () => void {
  const { canvas } = opts;
  const pointers = new Map<number, Pointer>();
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  let pinchStart = 0;
  let pinchDist = 0;

  const setDrag = (next: boolean) => {
    if (dragging === next) return;
    dragging = next;
    opts.onDrag(next);
  };

  const pinchGap = () => {
    if (pointers.size < 2) return 0;
    const pts = [...pointers.values()];
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  const onDown = (ev: PointerEvent) => {
    if (!opts.enabled()) return;
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    canvas.setPointerCapture(ev.pointerId);
    lastX = ev.clientX;
    lastY = ev.clientY;
    moved = false;
    if (pointers.size === 2) {
      pinchStart = pinchGap();
      pinchDist = opts.getCam().dist;
      setDrag(true);
    }
  };

  const onMove = (ev: PointerEvent) => {
    if (!opts.enabled()) {
      opts.onHover(null, ev);
      return;
    }
    if (pointers.has(ev.pointerId)) {
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    }

    if (pointers.size >= 2 && pinchStart > 1) {
      const gap = pinchGap();
      const cam = opts.getCam();
      cam.dist = pinchDist * (pinchStart / Math.max(gap, 1));
      confineCam(cam);
      moved = true;
      return;
    }

    if (pointers.size === 1 && pointers.has(ev.pointerId)) {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      if (Math.hypot(dx, dy) > 2) moved = true;
      if (moved) {
        setDrag(true);
        const cam = opts.getCam();
        cam.yaw -= dx * 0.0055;
        cam.pitch += dy * 0.0042;
        confineCam(cam);
      }
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const ray = screenToRay(ev.clientX, ev.clientY, rect, opts.getInv());
    const hit = pickSphere(ray.origin, ray.dir, opts.getPickables());
    opts.onHover(hit, ev);
  };

  const onUp = (ev: PointerEvent) => {
    const was = pointers.size;
    pointers.delete(ev.pointerId);
    if (canvas.hasPointerCapture(ev.pointerId)) {
      canvas.releasePointerCapture(ev.pointerId);
    }
    if (pointers.size === 0) setDrag(false);
    if (!opts.enabled()) return;
    if (was === 1 && !moved) {
      const rect = canvas.getBoundingClientRect();
      const ray = screenToRay(ev.clientX, ev.clientY, rect, opts.getInv());
      const hit = pickSphere(ray.origin, ray.dir, opts.getPickables());
      if (hit) opts.onPick(hit);
    }
  };

  const onWheel = (ev: WheelEvent) => {
    if (!opts.enabled()) return;
    ev.preventDefault();
    const cam = opts.getCam();
    cam.dist *= Math.exp(ev.deltaY * 0.00115);
    confineCam(cam);
  };

  const onLeave = (ev: PointerEvent) => {
    if (pointers.size === 0) opts.onHover(null, ev);
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  return () => {
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    canvas.removeEventListener("pointerleave", onLeave);
    canvas.removeEventListener("wheel", onWheel);
  };
}
