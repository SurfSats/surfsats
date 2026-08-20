import { hashRef } from "@/lib/graffiti-log";

type LogLevel = "info" | "warn" | "error";

export { hashRef };

export function arcadeLog(
  level: LogLevel,
  event: string,
  extra?: Record<string, unknown>,
) {
  const payload = extra ? { event, ...extra } : { event };
  if (level === "error") {
    console.error("[arcade]", payload);
    return;
  }
  if (level === "warn") {
    console.warn("[arcade]", payload);
    return;
  }
  console.info("[arcade]", payload);
}
