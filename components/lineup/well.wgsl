// THE WELL — live mempool. Histogram weights spawn the halo/particles.
// Center well fill = next-block template fullness. Outer rings = upcoming blocks.

struct Params {
  time: f32,
  pulse: f32,
  fill: f32,
  particle_n: f32,
  fastest: f32,
  vmb: f32,
  pointer: vec2f,
  res: vec4f,
  band0: vec4f,
  band1: vec4f,
  band2: vec4f,
  band3: vec4f,
  band4: vec4f,
  band5: vec4f,
  band6: vec4f,
  band7: vec4f,
  ring0: vec4f,
  ring1: vec4f,
  ring2: vec4f,
  ring3: vec4f,
}

@group(0) @binding(0) var<uniform> params: Params;

const ORANGE = vec3f(0.969, 0.576, 0.102);
const TEAL = vec3f(0.22, 0.42, 0.44);
const ASH = vec3f(0.22, 0.23, 0.25);
const INK = vec3f(0.020, 0.022, 0.028);

fn hash11(n: f32) -> f32 {
  return fract(sin(n * 127.1) * 43758.5453123);
}

fn hash21(n: f32) -> vec2f {
  return fract(sin(vec2f(n, n + 19.19)) * vec2f(43758.5453, 22578.1459));
}

fn band_at(i: i32) -> vec4f {
  switch i {
    case 0: { return params.band0; }
    case 1: { return params.band1; }
    case 2: { return params.band2; }
    case 3: { return params.band3; }
    case 4: { return params.band4; }
    case 5: { return params.band5; }
    case 6: { return params.band6; }
    default: { return params.band7; }
  }
}

fn ring_at(i: i32) -> vec4f {
  switch i {
    case 0: { return params.ring0; }
    case 1: { return params.ring1; }
    case 2: { return params.ring2; }
    default: { return params.ring3; }
  }
}

fn band_for(u: f32) -> vec4f {
  for (var i = 0; i < 8; i++) {
    let b = band_at(i);
    if (b.y - b.x > 0.0005 && u >= b.x && u < b.y) {
      return b;
    }
  }
  return band_at(0);
}

fn fee_color(rate: f32) -> vec3f {
  let orange_start = max(params.fastest * 2.0, 12.0);
  let t = saturate((rate - orange_start) / 40.0);
  let cool = mix(ASH, TEAL, saturate(rate / 8.0));
  return mix(cool, ORANGE, t);
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let aspect = params.res.x / max(params.res.y, 1.0);
  var p = vec2f((uv.x - 0.5) * aspect, 0.5 - uv.y);
  let pointer = vec2f((params.pointer.x - 0.5) * aspect, 0.5 - params.pointer.y);
  p -= pointer * 0.04;

  let t = params.time;
  let pulse = saturate(params.pulse);
  let fill = saturate(params.fill);
  let pool = saturate(params.vmb / 50.0);
  let r = length(p);
  let ang = atan2(p.y, p.x);

  var col = INK;
  col += vec3f(0.01, 0.012, 0.014) * (1.0 - smoothstep(0.0, 1.2, r));

  // Histogram mass as radial halo. A 0–5 sat/vB-heavy pool reads as a thick cold shell.
  for (var i = 0; i < 8; i++) {
    let b = band_at(i);
    let w = max(0.0, b.y - b.x);
    if (w < 0.0008) { continue; }
    let width = mix(0.14, 0.028, saturate(b.z / 40.0));
    let d = abs(r - b.w);
    let halo = exp(-pow(d / max(width, 0.01), 2.0)) * pow(w, 0.45) * mix(0.35, 1.15, pool);
    col += fee_color(b.z) * halo;
  }

  // Upcoming projected blocks — thickness from that block's vsize.
  for (var k = 0; k < 4; k++) {
    let ring = ring_at(k);
    if (ring.x <= 0.001 || ring.y <= 0.0001) { continue; }
    let d = abs(r - ring.x);
    let glow = exp(-d / max(ring.y, 0.003)) * (0.16 + ring.y * 8.0);
    col += fee_color(ring.z) * glow * 0.55;
  }

  // Particles allocated by histogram weight (not 8-per-band).
  let n = params.particle_n;
  for (var i = 0; i < 192; i++) {
    if (f32(i) >= n) { continue; }
    let u = (f32(i) + 0.5) / max(n, 1.0);
    let b = band_for(u);
    let id = f32(i) + 1.7;
    let h = hash21(id);
    let fee = max(b.z, 0.4);
    let speed = mix(0.045, 0.62, saturate(fee / 90.0));
    let life = fract(h.x + t * speed + pulse * 0.42);
    let sucked = saturate(life + pulse * 0.55);
    let pr = mix(b.w, 0.075, pow(sucked, mix(0.65, 1.35, speed)));
    let a = h.y * 6.2831853 + t * mix(0.016, 0.11, speed);
    var pos = vec2f(cos(a), sin(a)) * pr;
    pos += pointer * 0.045 * (1.0 - sucked);
    let d = length(p - pos);
    let sharp = mix(95.0, 52.0, saturate(fee / 80.0));
    let glow = exp(-d * sharp);
    col += fee_color(fee) * glow * mix(0.45, 1.1, pool);
  }

  // Inner well: empty = thin ring, full = bright disk.
  let well_r = 0.11;
  let rim = exp(-abs(r - well_r) * mix(120.0, 68.0, fill)) * mix(1.15, 0.4, fill);
  let disk = smoothstep(well_r + 0.004, well_r - 0.024, r) * pow(fill, 0.8);
  col += ORANGE * rim;
  col += mix(ORANGE * 0.12, ORANGE * 1.2, fill) * disk;
  col += pulse * ORANGE * exp(-r * 5.2) * 0.9;

  let grain = (hash11(uv.x * 917.0 + uv.y * 433.0 + floor(t * 24.0)) - 0.5) * 0.025;
  col += grain;
  col = max(col, vec3f(0.0));
  return vec4f(col, 1.0);
}
