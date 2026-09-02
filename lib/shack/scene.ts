import {
  easeInCubic,
  lerp,
  mat4,
  mat4FromTrs,
  mat4Mul,
  vec3,
  vlerp,
  worldTranslation,
  type Mat4,
  type Vec3,
} from "./math";
import type { Geometry } from "./models";
import {
  applyCam,
  cloneCam,
  type OrbitCam,
} from "./presets";

export type MeshKind = "box" | "panel" | "floor";

export type MeshStyle = {
  kind: MeshKind;
  color: Vec3;
  emissive: Vec3;
  geometry?: Geometry;
};

export type Pulse = {
  amp: number;
  speed: number;
  phase: number;
  emissiveAmp: number;
  baseScale: Vec3;
  baseEmissive: Vec3;
};

export type PickSphere = {
  radius: number;
  offset?: Vec3;
};

export type ShackNode = {
  id: string;
  local: { pos: Vec3; rot: Vec3; scale: Vec3 };
  world: Mat4;
  children: ShackNode[];
  mesh?: MeshStyle;
  pick?: PickSphere;
  group?: string;
  highlight: boolean;
  pulse?: Pulse;
  /** Future furniture: route after camera ease. */
  href?: string;
};

const LOCAL = mat4();

export function createNode(id: string): ShackNode {
  return {
    id,
    local: { pos: vec3(), rot: vec3(), scale: vec3(1, 1, 1) },
    world: mat4(),
    children: [],
    highlight: false,
  };
}

export function addChild(parent: ShackNode, child: ShackNode): ShackNode {
  parent.children.push(child);
  return child;
}

export function updateWorld(node: ShackNode, parentWorld: Mat4 | null): void {
  mat4FromTrs(node.local.pos, node.local.rot, node.local.scale, LOCAL);
  if (parentWorld) mat4Mul(parentWorld, LOCAL, node.world);
  else node.world.set(LOCAL);
  for (const child of node.children) updateWorld(child, node.world);
}

export function walk(node: ShackNode, fn: (n: ShackNode) => void): void {
  fn(node);
  for (const child of node.children) walk(child, fn);
}

export function findNode(root: ShackNode, id: string): ShackNode | null {
  let hit: ShackNode | null = null;
  walk(root, (n) => {
    if (n.id === id) hit = n;
  });
  return hit;
}

export function nodeWorldPos(node: ShackNode): Vec3 {
  return worldTranslation(node.world);
}

export function tickPulses(root: ShackNode, time: number): void {
  walk(root, (n) => {
    const p = n.pulse;
    if (!p) return;
    const wave = 0.5 + 0.5 * Math.sin(time * p.speed + p.phase);
    n.local.scale.y = p.baseScale.y * (1 + p.amp * wave);
    if (n.mesh) {
      const em = 0.5 + p.emissiveAmp * wave;
      n.mesh.emissive = {
        x: p.baseEmissive.x * em,
        y: p.baseEmissive.y * em,
        z: p.baseEmissive.z * (0.45 + 0.7 * wave),
      };
    }
  });
}

export function setGroupHighlight(
  root: ShackNode,
  group: string | null,
): void {
  walk(root, (n) => {
    n.highlight = !!group && n.group === group;
  });
}

export type CamTween = {
  from: OrbitCam;
  to: OrbitCam;
  duration: number;
  elapsed: number;
  ease: (t: number) => number;
  done: boolean;
  onDone?: () => void;
};

export function startCamTween(
  from: OrbitCam,
  to: OrbitCam,
  duration: number,
  onDone?: () => void,
): CamTween {
  return {
    from: cloneCam(from),
    to: cloneCam(to),
    duration,
    elapsed: 0,
    ease: easeInCubic,
    done: false,
    onDone,
  };
}

export function tickCamTween(
  tw: CamTween,
  dt: number,
  cam: OrbitCam,
): void {
  if (tw.done) return;
  tw.elapsed += dt;
  const t = Math.min(1, tw.elapsed / Math.max(tw.duration, 1e-4));
  const u = tw.ease(t);
  cam.yaw = lerp(tw.from.yaw, tw.to.yaw, u);
  cam.pitch = lerp(tw.from.pitch, tw.to.pitch, u);
  cam.dist = lerp(tw.from.dist, tw.to.dist, u);
  const target = vlerp(tw.from.target, tw.to.target, u);
  cam.target.x = target.x;
  cam.target.y = target.y;
  cam.target.z = target.z;
  if (t >= 1) {
    tw.done = true;
    applyCam(cam, tw.to);
    tw.onDone?.();
  }
}

export function pickCenterWorld(node: ShackNode): Vec3 {
  const base = nodeWorldPos(node);
  const off = node.pick?.offset;
  if (!off) return base;
  return {
    x: base.x + off.x,
    y: base.y + off.y,
    z: base.z + off.z,
  };
}

export function collectPickables(
  root: ShackNode,
): Array<{ id: string; center: Vec3; radius: number }> {
  const list: Array<{ id: string; center: Vec3; radius: number }> = [];
  walk(root, (n) => {
    if (!n.pick) return;
    list.push({
      id: n.id,
      center: pickCenterWorld(n),
      radius: n.pick.radius,
    });
  });
  return list;
}
