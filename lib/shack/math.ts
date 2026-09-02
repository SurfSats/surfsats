export type Vec3 = { x: number; y: number; z: number };

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

export function vcopy(v: Vec3): Vec3 {
  return { x: v.x, y: v.y, z: v.z };
}

export function vadd(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vsub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vscale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function vdot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function vcross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function vlen(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z);
}

export function vnorm(a: Vec3): Vec3 {
  const l = vlen(a);
  return l > 1e-8 ? vscale(a, 1 / l) : vec3(0, 1, 0);
}

export function vlerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeInCubic(t: number): number {
  return t * t * t;
}

export function hexRgb(hex: string): Vec3 {
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  const n = parseInt(h, 16);
  return vec3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export type Mat4 = Float32Array;

export function mat4(): Mat4 {
  const m = new Float32Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
}

export function mat4Ident(out: Mat4): Mat4 {
  out.fill(0);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}

export function mat4Copy(src: Mat4, out: Mat4 = new Float32Array(16)): Mat4 {
  out.set(src);
  return out;
}

/** Column-major `out = a * b`. `out` may not alias `a` or `b`. */
export function mat4Mul(a: Mat4, b: Mat4, out: Mat4): Mat4 {
  const a00 = a[0],
    a01 = a[1],
    a02 = a[2],
    a03 = a[3];
  const a10 = a[4],
    a11 = a[5],
    a12 = a[6],
    a13 = a[7];
  const a20 = a[8],
    a21 = a[9],
    a22 = a[10],
    a23 = a[11];
  const a30 = a[12],
    a31 = a[13],
    a32 = a[14],
    a33 = a[15];

  let b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3];
  out[0] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
  out[1] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
  out[2] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
  out[3] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;

  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
  out[5] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
  out[6] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
  out[7] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;

  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
  out[9] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
  out[10] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
  out[11] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;

  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3;
  out[13] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3;
  out[14] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3;
  out[15] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3;
  return out;
}

/**
 * TRS: T * Ry(yaw) * Rx(pitch) * Rz(roll) * S.
 * `rot` is radians, Y-up, YXZ order.
 */
export function mat4FromTrs(pos: Vec3, rot: Vec3, scale: Vec3, out: Mat4): Mat4 {
  const cy = Math.cos(rot.y);
  const sy = Math.sin(rot.y);
  const cx = Math.cos(rot.x);
  const sx = Math.sin(rot.x);
  const cz = Math.cos(rot.z);
  const sz = Math.sin(rot.z);

  const r00 = cy * cz + sy * sx * sz;
  const r01 = cz * sy * sx - cy * sz;
  const r02 = cx * sy;
  const r10 = cx * sz;
  const r11 = cx * cz;
  const r12 = -sx;
  const r20 = cy * sx * sz - cz * sy;
  const r21 = cy * cz * sx + sy * sz;
  const r22 = cx * cy;

  out[0] = r00 * scale.x;
  out[1] = r10 * scale.x;
  out[2] = r20 * scale.x;
  out[3] = 0;
  out[4] = r01 * scale.y;
  out[5] = r11 * scale.y;
  out[6] = r21 * scale.y;
  out[7] = 0;
  out[8] = r02 * scale.z;
  out[9] = r12 * scale.z;
  out[10] = r22 * scale.z;
  out[11] = 0;
  out[12] = pos.x;
  out[13] = pos.y;
  out[14] = pos.z;
  out[15] = 1;
  return out;
}

export function mat4LookAt(eye: Vec3, target: Vec3, up: Vec3, out: Mat4): Mat4 {
  const z = vnorm(vsub(eye, target));
  let x = vcross(up, z);
  if (vlen(x) < 1e-6) x = vcross(vec3(0, 0, 1), z);
  x = vnorm(x);
  const y = vcross(z, x);
  out[0] = x.x;
  out[1] = y.x;
  out[2] = z.x;
  out[3] = 0;
  out[4] = x.y;
  out[5] = y.y;
  out[6] = z.y;
  out[7] = 0;
  out[8] = x.z;
  out[9] = y.z;
  out[10] = z.z;
  out[11] = 0;
  out[12] = -vdot(x, eye);
  out[13] = -vdot(y, eye);
  out[14] = -vdot(z, eye);
  out[15] = 1;
  return out;
}

export function mat4Perspective(
  fovy: number,
  aspect: number,
  near: number,
  far: number,
  out: Mat4,
): Mat4 {
  const f = 1 / Math.tan(fovy / 2);
  out.fill(0);
  out[0] = f / Math.max(aspect, 1e-6);
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

export function mat4Invert(m: Mat4, out: Mat4): boolean {
  const a00 = m[0],
    a01 = m[1],
    a02 = m[2],
    a03 = m[3];
  const a10 = m[4],
    a11 = m[5],
    a12 = m[6],
    a13 = m[7];
  const a20 = m[8],
    a21 = m[9],
    a22 = m[10],
    a23 = m[11];
  const a30 = m[12],
    a31 = m[13],
    a32 = m[14],
    a33 = m[15];

  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  let det =
    b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (Math.abs(det) < 1e-8) return false;
  det = 1 / det;

  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return true;
}

export function mat4MulVec3(m: Mat4, v: Vec3, w = 1): Vec3 {
  const x = m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12] * w;
  const y = m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13] * w;
  const z = m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14] * w;
  const ww = m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15] * w;
  if (Math.abs(ww) > 1e-8 && w === 1) return vec3(x / ww, y / ww, z / ww);
  return vec3(x, y, z);
}

/** Inverse-transpose of the upper 3×3, column-major 3 floats × 3. */
export function mat3NormalFromMat4(m: Mat4, out: Float32Array): Float32Array {
  const a00 = m[0],
    a01 = m[4],
    a02 = m[8];
  const a10 = m[1],
    a11 = m[5],
    a12 = m[9];
  const a20 = m[2],
    a21 = m[6],
    a22 = m[10];
  const b01 = a22 * a11 - a12 * a21;
  const b11 = -a22 * a10 + a12 * a20;
  const b21 = a21 * a10 - a11 * a20;
  let det = a00 * b01 + a01 * b11 + a02 * b21;
  if (Math.abs(det) < 1e-8) {
    out[0] = a00;
    out[1] = a10;
    out[2] = a20;
    out[3] = a01;
    out[4] = a11;
    out[5] = a21;
    out[6] = a02;
    out[7] = a12;
    out[8] = a22;
    return out;
  }
  det = 1 / det;
  out[0] = b01 * det;
  out[1] = (-a22 * a01 + a02 * a21) * det;
  out[2] = (a12 * a01 - a02 * a11) * det;
  out[3] = b11 * det;
  out[4] = (a22 * a00 - a02 * a20) * det;
  out[5] = (-a12 * a00 + a02 * a10) * det;
  out[6] = b21 * det;
  out[7] = (-a21 * a00 + a01 * a20) * det;
  out[8] = (a11 * a00 - a01 * a10) * det;
  return out;
}

export function worldTranslation(m: Mat4): Vec3 {
  return vec3(m[12], m[13], m[14]);
}

export function screenToRay(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  invViewProj: Mat4,
): { origin: Vec3; dir: Vec3 } {
  const x = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
  const y = -(((clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
  const near = mat4MulVec3(invViewProj, vec3(x, y, -1), 1);
  const far = mat4MulVec3(invViewProj, vec3(x, y, 1), 1);
  return { origin: near, dir: vnorm(vsub(far, near)) };
}

export function raySphere(
  origin: Vec3,
  dir: Vec3,
  center: Vec3,
  radius: number,
): number | null {
  const oc = vsub(origin, center);
  const b = vdot(oc, dir);
  const c = vdot(oc, oc) - radius * radius;
  const disc = b * b - c;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  const t0 = -b - s;
  if (t0 > 1e-4) return t0;
  const t1 = -b + s;
  return t1 > 1e-4 ? t1 : null;
}
