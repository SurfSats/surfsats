// THE WELL — next-block template at the center.
// Histogram bands spawn a handful of particles (not unique txs).
// Outer rings are upcoming projected mempool-blocks.

struct Params {
  time: f32,
  pulse: f32,
  fill: f32,
  _pad: f32,
  pointer: vec2f,
  res: vec2f,
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

fn fee_color(rate: f32) -> vec3f {
  let t = saturate(rate / 80.0);
  let cool = mix(ASH, TEAL, saturate(rate / 12.0));
  return mix(cool, ORANGE, smoothstep(0.12, 0.85, t));
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let aspect = params.res.x / max(params.res.y, 1.0);
  var p = vec2f((uv.x - 0.5) * aspect, 0.5 - uv.y);
  let pointer = vec2f((params.pointer.x - 0.5) * aspect, 0.5 - params.pointer.y);
  p -= pointer * 0.045;

  let t = params.time;
  let pulse = saturate(params.pulse);
  let fill = saturate(params.fill);
  let r = length(p);
  let ang = atan2(p.y, p.x);

  var col = INK;
  col += vec3f(0.012, 0.016, 0.018) * (1.0 - smoothstep(0.0, 1.15, r));

  // Outer projected-block rings (upcoming mempool-blocks).
  for (var k = 0; k < 4; k++) {
    let ring = ring_at(k);
    if (ring.x <= 0.001) { continue; }
    let rr = ring.x;
    let d = abs(r - rr);
    let fee_t = saturate(ring.z / 70.0);
    let glow = exp(-d * 92.0) * (0.12 + ring.y * 0.55);
    let tick = exp(-abs(fract(ang * (6.0 + f32(k) * 2.0) / 6.28318) - 0.5) * 28.0) * 0.18;
    col += fee_color(ring.z) * (glow + tick * glow) * mix(0.55, 1.0, fee_t);
  }

  // Particles from histogram bands. Speed scales with sat/vB.
  for (var i = 0; i < 64; i++) {
    let b = band_at(i % 8);
    if (b.y < 0.004) { continue; }
    let id = f32(i) + 1.7;
    let h = hash21(id);
    let fee = max(b.z, 0.4);
    let speed = mix(0.055, 0.58, saturate(fee / 90.0));
    let life = fract(h.x + t * speed + pulse * 0.42);
    let sucked = saturate(life + pulse * 0.55);
    let spawn_r = mix(0.82, 0.36, saturate(fee / 140.0));
    let pr = mix(spawn_r, 0.075, pow(sucked, mix(0.65, 1.35, speed)));
    let spin = t * mix(0.018, 0.11, speed);
    let a = h.y * 6.2831853 + spin;
    var pos = vec2f(cos(a), sin(a)) * pr;
    pos += pointer * 0.05 * (1.0 - sucked);
    let d = length(p - pos);
    let sharp = mix(110.0, 58.0, saturate(fee / 80.0));
    let glow = exp(-d * sharp) * mix(0.22, 1.05, saturate(b.y * 3.4));
    let streak = exp(-abs(dot(normalize(p + 1e-4), normalize(pos + 1e-4)) - 1.0) * 18.0) * 0.15 * (1.0 - sucked);
    col += fee_color(fee) * (glow + streak * glow);
  }

  // Center well = next block template. Fill/brightness from vsize vs 1.5 vMB.
  let well_r = 0.105 + fill * 0.055 - pulse * 0.02;
  let hole = smoothstep(well_r + 0.018, well_r - 0.01, r);
  let rim = exp(-abs(r - well_r) * 70.0);
  let corona = exp(-max(r - well_r, 0.0) * 14.0) * (0.18 + fill * 0.55);
  let core = mix(vec3f(0.04, 0.035, 0.03), ORANGE * (0.35 + fill * 0.9), hole);
  let pulse_flash = pulse * exp(-r * 6.0) * ORANGE;
  let idle = 0.85 + 0.15 * sin(t * 1.4 + ang * 3.0);
  col = mix(col, core, hole * 0.92);
  col += ORANGE * rim * (0.55 + fill * 0.9) * idle;
  col += ORANGE * corona * idle;
  col += pulse_flash * 0.85;

  // Soft grain so a still mempool still reads as live.
  let grain = (hash11(uv.x * 917.0 + uv.y * 433.0 + floor(t * 24.0)) - 0.5) * 0.03;
  col += grain;
  col = max(col, vec3f(0.0));
  return vec4f(col, 1.0);
}
