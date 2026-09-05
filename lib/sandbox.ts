export const SANDBOX_PRICE_SATS = 21;
export const SANDBOX_META_KIND = "sandbox-paywall";
export const SANDBOX_DEFAULT_DOCUMENT_ID = "DOC_9735_SWELL_MANIFESTO";
export const SANDBOX_CANVAS_HEIGHT = 200;
export const HEX_NOISE_CHARS = "0123456789ABCDEF!@#$%^&*<>[]{}//--==";
export const THROUGHPUT_PRESETS = [21, 64, 210] as const;

export const SANDBOX_UNLOCKED_CONTENT = `THE WAVE OWES NOTHING TO SHORELINE LAW.
LIGHTNING CHANNELS ROUTE ACROSS SUBSEA CABLING AS FREE PARTICLES.
NO BANKS. NO BOSSES. NO PERMISSION TO DROP IN.
SOVEREIGN SETTLEMENT COMPLETED VIA PREIMAGE PROOF.`;

export function hydraulicSpeed(satsPerSec: number): number {
  return 0.02 + Math.min(Math.max(0, satsPerSec) / 1000, 0.08);
}

export function hydraulicAmplitude(satsPerSec: number): number {
  return 18 + Math.min(Math.max(0, satsPerSec) * 0.8, 65);
}

export function hydraulicPressureKpa(satsPerSec: number): number {
  return Math.max(0, satsPerSec) * 1.618;
}

export function swellPeriodSec(satsPerSec: number, jitter: number): number {
  return 12 + (Math.max(0, satsPerSec) % 10) * 0.4 + jitter;
}

export function harmonicFlowKhz(satsPerSec: number): number {
  return Number((44.1 * (Math.max(0, satsPerSec) / SANDBOX_PRICE_SATS)).toFixed(1));
}

export function primaryWaveY({
  x,
  step,
  amplitude,
  height,
}: {
  x: number;
  step: number;
  amplitude: number;
  height: number;
}): number {
  return (
    height / 2 +
    Math.sin(x * 0.02 + step) * amplitude +
    Math.sin(x * 0.05 + step * 1.5) * 6
  );
}

export function secondaryWaveY({
  x,
  step,
  amplitude,
  height,
}: {
  x: number;
  step: number;
  amplitude: number;
  height: number;
}): number {
  return (
    height / 2 +
    Math.sin(x * 0.015 + step * 0.7) * (amplitude * 0.6) +
    Math.cos(x * 0.03 - step) * 10
  );
}

export function isCrestHighlight({
  y,
  height,
  amplitude,
}: {
  y: number;
  height: number;
  amplitude: number;
}): boolean {
  return y < height / 2 - amplitude * 0.7;
}

export function hexNoiseLine({
  width,
  random = Math.random,
}: {
  width: number;
  random?: () => number;
}): string {
  const count = Math.max(1, Math.floor(width));
  let out = "";
  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(random() * HEX_NOISE_CHARS.length);
    out += HEX_NOISE_CHARS[index] ?? HEX_NOISE_CHARS[0];
  }
  return out;
}

export function hexNoiseBlock({
  lines,
  width,
  random = Math.random,
}: {
  lines: number;
  width: number;
  random?: () => number;
}): string[] {
  return Array.from({ length: Math.max(0, Math.floor(lines)) }, () =>
    hexNoiseLine({ width, random }),
  );
}

export function parseSandboxDocumentId(value: unknown): string | null {
  const raw = String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 64);
  return raw || null;
}

export function paywallStorageKey(documentId: string): string {
  return `surfsats-paywall:${documentId}`;
}
