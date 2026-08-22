type LogLevel = "info" | "warn" | "error";

export function hashRef(hash?: string | null) {
  if (!hash) return null;
  return hash.slice(0, 8);
}

export function storyLog(
  level: LogLevel,
  event: string,
  extra?: Record<string, unknown>,
) {
  const payload = extra ? { event, ...extra } : { event };
  if (level === "error") {
    console.error("[story]", payload);
    return;
  }
  if (level === "warn") {
    console.warn("[story]", payload);
    return;
  }
  console.info("[story]", payload);
}
