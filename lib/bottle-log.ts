import { hashRef } from "@/lib/graffiti-log";

type LogLevel = "info" | "warn" | "error";

export { hashRef };

export function bottleLog(
  level: LogLevel,
  event: string,
  extra?: Record<string, unknown>,
) {
  const payload = extra ? { event, ...extra } : { event };
  if (level === "error") {
    console.error("[bottle]", payload);
    return;
  }
  if (level === "warn") {
    console.warn("[bottle]", payload);
    return;
  }
  console.info("[bottle]", payload);
}
