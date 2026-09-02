import { vec3, type Vec3 } from "./math";

export type Geometry = {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
};

function pack(
  positions: number[],
  normals: number[],
  colors: number[],
  uvs: number[],
  indices: number[],
): Geometry {
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}

/** Unit cube, origin at center, extent −0.5…0.5. Per-face normals. */
export function createBox(): Geometry {
  const faces: Array<{ n: Vec3; q: Vec3[] }> = [
    {
      n: vec3(0, 0, 1),
      q: [
        vec3(-0.5, -0.5, 0.5),
        vec3(0.5, -0.5, 0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(-0.5, 0.5, 0.5),
      ],
    },
    {
      n: vec3(0, 0, -1),
      q: [
        vec3(0.5, -0.5, -0.5),
        vec3(-0.5, -0.5, -0.5),
        vec3(-0.5, 0.5, -0.5),
        vec3(0.5, 0.5, -0.5),
      ],
    },
    {
      n: vec3(1, 0, 0),
      q: [
        vec3(0.5, -0.5, 0.5),
        vec3(0.5, -0.5, -0.5),
        vec3(0.5, 0.5, -0.5),
        vec3(0.5, 0.5, 0.5),
      ],
    },
    {
      n: vec3(-1, 0, 0),
      q: [
        vec3(-0.5, -0.5, -0.5),
        vec3(-0.5, -0.5, 0.5),
        vec3(-0.5, 0.5, 0.5),
        vec3(-0.5, 0.5, -0.5),
      ],
    },
    {
      n: vec3(0, 1, 0),
      q: [
        vec3(-0.5, 0.5, 0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(0.5, 0.5, -0.5),
        vec3(-0.5, 0.5, -0.5),
      ],
    },
    {
      n: vec3(0, -1, 0),
      q: [
        vec3(-0.5, -0.5, -0.5),
        vec3(0.5, -0.5, -0.5),
        vec3(0.5, -0.5, 0.5),
        vec3(-0.5, -0.5, 0.5),
      ],
    },
  ];

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const faceUv: Array<[number, number]> = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  for (const face of faces) {
    const base = positions.length / 3;
    face.q.forEach((p, i) => {
      positions.push(p.x, p.y, p.z);
      normals.push(face.n.x, face.n.y, face.n.z);
      colors.push(1, 1, 1);
      uvs.push(faceUv[i][0], faceUv[i][1]);
    });
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  return pack(positions, normals, colors, uvs, indices);
}

/** Unit XZ panel, origin at center, +Y normal. */
export function createPanel(): Geometry {
  const positions = [
    -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, -0.5,
  ];
  const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
  const colors = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  const uvs = [0, 0, 1, 0, 1, 1, 0, 1];
  const indices = [0, 1, 2, 0, 2, 3];
  return pack(positions, normals, colors, uvs, indices);
}

/** Checker floor in meters, centered on origin, y = 0, +Y. */
export function createTiledFloor(
  width: number,
  depth: number,
  tile: number,
  colorA: Vec3,
  colorB: Vec3,
): Geometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const nx = Math.max(1, Math.round(width / tile));
  const nz = Math.max(1, Math.round(depth / tile));
  const dx = width / nx;
  const dz = depth / nz;
  const x0 = -width / 2;
  const z0 = -depth / 2;

  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const x1 = x0 + ix * dx;
      const x2 = x1 + dx;
      const z1 = z0 + iz * dz;
      const z2 = z1 + dz;
      const c = (ix + iz) % 2 === 0 ? colorA : colorB;
      const base = positions.length / 3;
      positions.push(x1, 0, z2, x2, 0, z2, x2, 0, z1, x1, 0, z1);
      uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
      for (let i = 0; i < 4; i++) {
        normals.push(0, 1, 0);
        colors.push(c.x, c.y, c.z);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  return pack(positions, normals, colors, uvs, indices);
}
