import { vec3, type Vec3 } from "./math";

export const ROOM_W = 20;
export const ROOM_D = 14;
export const ROOM_H = 4.6;
export const ROOM_X = ROOM_W / 2;
export const ROOM_Z = ROOM_D / 2;

export const FIRE_POS = vec3(0, 0, 0.8);
export const DEFAULT_TARGET = vec3(0, 1.05, 0.2);

export const ORBIT = {
  distMin: 3.2,
  distMax: 6.8,
  pitchMin: 0.08,
  pitchMax: 0.7,
} as const;

export const CAM_PRESET_IDS = ["floor", "wall", "bar", "pit", "bench"] as const;
export type CamPresetId = (typeof CAM_PRESET_IDS)[number];

export type OrbitCam = {
  yaw: number;
  pitch: number;
  dist: number;
  target: Vec3;
};

export const CAM_PRESETS: Record<CamPresetId, OrbitCam> = {
  floor: {
    yaw: -0.42,
    pitch: 0.32,
    dist: 5.8,
    target: vec3(0, 1.05, 0.2),
  },
  wall: {
    yaw: 0.08,
    pitch: 0.24,
    dist: 6.0,
    target: vec3(-1.2, 1.8, -4.4),
  },
  bar: {
    yaw: 1.45,
    pitch: 0.28,
    dist: 5.4,
    target: vec3(-5.4, 1.1, -0.2),
  },
  pit: {
    yaw: -1.35,
    pitch: 0.28,
    dist: 5.4,
    target: vec3(5.2, 1.2, 0.6),
  },
  bench: {
    yaw: -0.85,
    pitch: 0.38,
    dist: 5.2,
    target: vec3(4.6, 1.0, -3.2),
  },
};

export function isCamPresetId(value: string | undefined): value is CamPresetId {
  return !!value && (CAM_PRESET_IDS as readonly string[]).includes(value);
}

export function parseCam(raw: string | undefined): CamPresetId {
  return isCamPresetId(raw) ? raw : "floor";
}

export const FOCUS_DOORS = [
  "tab",
  "fiat",
  "about",
  "arcade",
  "music",
  "story",
  "graffiti",
  "signal",
  "articles",
  "tools",
  "tidechain",
  "lineup",
] as const;
export type FocusDoor = (typeof FOCUS_DOORS)[number];

export function parseFocus(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().slice(0, 80);
  return trimmed.length ? trimmed : null;
}

export function parseFocusDoor(raw: string | undefined): FocusDoor | null {
  const v = parseFocus(raw);
  return v && (FOCUS_DOORS as readonly string[]).includes(v)
    ? (v as FocusDoor)
    : null;
}

export function focusPreset(id: FocusDoor): CamPresetId {
  if (id === "arcade" || id === "music" || id === "story") return "pit";
  if (id === "graffiti" || id === "signal" || id === "articles") return "wall";
  if (id === "tools" || id === "tidechain" || id === "lineup") return "bench";
  return "bar";
}

export function cloneCam(cam: OrbitCam): OrbitCam {
  return {
    yaw: cam.yaw,
    pitch: cam.pitch,
    dist: cam.dist,
    target: vec3(cam.target.x, cam.target.y, cam.target.z),
  };
}

export function applyCam(cam: OrbitCam, src: OrbitCam): void {
  cam.yaw = src.yaw;
  cam.pitch = src.pitch;
  cam.dist = src.dist;
  cam.target.x = src.target.x;
  cam.target.y = src.target.y;
  cam.target.z = src.target.z;
}
