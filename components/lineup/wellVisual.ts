import {
  BLOCK_CAPACITY_VSIZE,
  FEE_BANDS,
  bandMidRate,
  type LineupSnapshot,
} from "@/lib/lineup";

export const WELL_PARTICLE_MAX = 192;

export type WellBandVisual = {
  start: number;
  end: number;
  fee: number;
  radius: number;
  weight: number;
  count: number;
  vsize: number;
};

export type WellRingVisual = {
  radius: number;
  thickness: number;
  fee: number;
};

export type WellVisual = {
  fill: number;
  fastest: number;
  vmb: number;
  txCount: number;
  height: number | null;
  particleCount: number;
  bands: WellBandVisual[];
  rings: WellRingVisual[];
};

export function wellVisualFromSnapshot(snapshot: LineupSnapshot): WellVisual {
  const cap = snapshot.capacityVsize || BLOCK_CAPACITY_VSIZE;
  const fill = clamp((snapshot.nextBlockVsize ?? 0) / cap, 0, 1);
  const totalV = snapshot.bands.reduce((sum, band) => sum + band.vsize, 0);
  const totalC = snapshot.bands.reduce((sum, band) => sum + band.count, 0);
  const denom = totalV > 0 ? totalV : 1;

  let cursor = 0;
  const bands = FEE_BANDS.map((_, index) => {
    const band = snapshot.bands[index];
    const vsize = band?.vsize ?? 0;
    const count = band?.count ?? 0;
    const fee = band ? bandMidRate(band) : 0;
    const weight = vsize / denom;
    const start = cursor;
    cursor = Math.min(1, cursor + weight);
    return {
      start,
      end: cursor,
      fee,
      radius: spawnRadius(fee),
      weight,
      count,
      vsize,
    };
  });
  if (bands.length > 0 && totalV > 0) {
    bands[bands.length - 1].end = 1;
  }

  const upcoming = snapshot.projected.slice(1, 5);
  const rings = upcoming.map((block, index) => ({
    radius: 0.28 + index * 0.1,
    thickness: 0.005 + 0.03 * clamp(block.blockVSize / cap, 0, 1),
    fee: block.medianFee,
  }));

  const txCount = snapshot.mempoolCount ?? totalC;
  const particleCount =
    totalV <= 0
      ? 0
      : Math.min(
          WELL_PARTICLE_MAX,
          Math.max(48, Math.round(40 + Math.sqrt(Math.max(txCount, 1)) * 0.48)),
        );

  return {
    fill,
    fastest: snapshot.fastestFee ?? 1,
    vmb: (snapshot.mempoolVsize ?? totalV) / 1_000_000,
    txCount,
    height: snapshot.blockHeight,
    particleCount,
    bands,
    rings,
  };
}

export function pickBand(visual: WellVisual, u: number): WellBandVisual | null {
  const live = visual.bands.filter((band) => band.weight > 0.0005);
  if (live.length === 0) return null;
  const t = clamp(u, 0, 0.9999);
  return live.find((band) => t >= band.start && t < band.end) ?? live[live.length - 1];
}

export function feeRgb(rate: number, fastest: number): [number, number, number] {
  const orangeStart = Math.max(fastest * 2, 12);
  const t = clamp((rate - orangeStart) / 40, 0, 1);
  const ash: [number, number, number] = [0.22, 0.23, 0.25];
  const teal: [number, number, number] = [0.22, 0.42, 0.44];
  const orange: [number, number, number] = [0.969, 0.576, 0.102];
  const cool = mix3(ash, teal, clamp(rate / 8, 0, 1));
  return mix3(cool, orange, t);
}

export function particlePose(
  index: number,
  band: WellBandVisual,
  time: number,
  pulse: number,
) {
  const h = hash21(index + 1.7);
  const speed = lerp(0.045, 0.62, clamp(band.fee / 90, 0, 1));
  const life = fract(h[0] + time * speed + pulse * 0.42);
  const sucked = clamp(life + pulse * 0.55, 0, 1);
  const pr = lerp(band.radius, 0.075, Math.pow(sucked, lerp(0.65, 1.35, speed)));
  const spin = time * lerp(0.016, 0.11, speed);
  const a = h[1] * Math.PI * 2 + spin;
  return {
    x: Math.cos(a) * pr,
    y: Math.sin(a) * pr,
    sucked,
    speed,
  };
}

function spawnRadius(fee: number) {
  return lerp(0.86, 0.34, clamp(fee / 80, 0, 1));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mix3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function fract(value: number) {
  return value - Math.floor(value);
}

function hash21(n: number): [number, number] {
  return [
    fract(Math.sin(n * 127.1) * 43758.5453),
    fract(Math.sin((n + 19.19) * 269.5) * 22578.1459),
  ];
}

export function wellUniforms(
  visual: WellVisual,
  time: number,
  pulse: number,
  pointer: { x: number; y: number },
  res: readonly [number, number],
) {
  const zeros = [0, 0, 0, 0] as const;
  const bands = Array.from({ length: 8 }, (_, i) => {
    const band = visual.bands[i];
    if (!band) return [...zeros];
    return [band.start, band.end, band.fee, band.radius];
  });
  const rings = Array.from({ length: 4 }, (_, i) => {
    const ring = visual.rings[i];
    if (!ring) return [...zeros];
    return [ring.radius, ring.thickness, ring.fee, 0];
  });

  return {
    time,
    pulse,
    fill: visual.fill,
    particle_n: visual.particleCount,
    fastest: visual.fastest,
    vmb: visual.vmb,
    pointer: [pointer.x, pointer.y],
    res: [res[0], res[1], 0, 0],
    band0: bands[0],
    band1: bands[1],
    band2: bands[2],
    band3: bands[3],
    band4: bands[4],
    band5: bands[5],
    band6: bands[6],
    band7: bands[7],
    ring0: rings[0],
    ring1: rings[1],
    ring2: rings[2],
    ring3: rings[3],
  };
}
