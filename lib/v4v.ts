export const V4V_PRESETS = [21, 100, 210] as const;
export type V4vPreset = (typeof V4V_PRESETS)[number];

export const V4V_LN_ADDRESS = "noderunnersradio@getalby.com";
export const V4V_COMMENT = "SurfSats V4V boost";

export function isV4vPreset(value: number): value is V4vPreset {
  return (V4V_PRESETS as readonly number[]).includes(value);
}

export function v4vRecipient(lud16?: string | null) {
  const trimmed = lud16?.trim() ?? "";
  return trimmed.includes("@") ? trimmed : V4V_LN_ADDRESS;
}
