import { hashRef } from "@/lib/graffiti-log";

type LogLevel = "info" | "warn" | "error";

export { hashRef };

export function tabLog(
  level: LogLevel,
  event: string,
  extra?: Record<string, unknown>,
) {
  const payload = extra ? { event, ...extra } : { event };
  if (level === "error") {
    console.error("[tab]", payload);
    return;
  }
  if (level === "warn") {
    console.warn("[tab]", payload);
    return;
  }
  console.info("[tab]", payload);
}
