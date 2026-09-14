type LogLevel = "info" | "warn" | "error";

export function hashRef(hash?: string | null) {
  if (!hash) return null;
  return hash.slice(0, 8);
}

export function slabLog(
  level: LogLevel,
  event: string,
  extra?: Record<string, unknown>,
) {
  const payload = extra ? { event, ...extra } : { event };
  if (level === "error") {
    console.error("[slab]", payload);
    return;
  }
  if (level === "warn") {
    console.warn("[slab]", payload);
    return;
  }
  console.info("[slab]", payload);
}
