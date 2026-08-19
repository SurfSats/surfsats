import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  GRAFFITI_TTL_MS,
  isActiveMark,
  type GraffitiMark,
  type PendingGraffiti,
} from "@/lib/graffiti";

type Store = {
  pending: Record<string, PendingGraffiti>;
  paid: GraffitiMark[];
};

const emptyStore = (): Store => ({ pending: {}, paid: [] });

const memory = emptyStore();
let loaded = false;
let writeChain: Promise<void> = Promise.resolve();

function storePaths() {
  return [
    path.join(process.cwd(), "data", "graffiti.json"),
    path.join("/tmp", "surfsats-graffiti.json"),
  ];
}

async function loadStore() {
  if (loaded) return memory;
  for (const file of storePaths()) {
    try {
      const raw = await readFile(file, "utf8");
      const parsed = JSON.parse(raw) as Partial<Store>;
      if (parsed.pending && typeof parsed.pending === "object") {
        Object.assign(memory.pending, parsed.pending);
      }
      if (Array.isArray(parsed.paid)) {
        for (const mark of parsed.paid) {
          if (!mark?.id) continue;
          const exists = memory.paid.some(
            (item) =>
              item.id === mark.id ||
              (mark.paymentHash && item.paymentHash === mark.paymentHash),
          );
          if (!exists) memory.paid.push(mark);
        }
      }
    } catch {
      // missing file or unreadable path — keep going
    }
  }
  pruneExpired();
  loaded = true;
  return memory;
}

function pruneExpired(now = Date.now()) {
  memory.paid = memory.paid.filter((mark) => isActiveMark(mark, now));
  const pendingCutoff = now - GRAFFITI_TTL_MS;
  for (const [hash, pending] of Object.entries(memory.pending)) {
    if (new Date(pending.createdAt).getTime() < pendingCutoff) {
      delete memory.pending[hash];
    }
  }
}

async function persist() {
  const payload = JSON.stringify(memory, null, 2);
  for (const file of storePaths()) {
    try {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, payload, "utf8");
    } catch {
      // Vercel project dirs are read-only; /tmp usually works
    }
  }
}

function withLock<T>(fn: () => Promise<T>) {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function savePending(pending: PendingGraffiti) {
  return withLock(async () => {
    await loadStore();
    memory.pending[pending.paymentHash] = pending;
    await persist();
    return pending;
  });
}

export async function getPending(paymentHash: string) {
  await loadStore();
  return memory.pending[paymentHash] ?? null;
}

export async function savePaidMark(mark: GraffitiMark) {
  return withLock(async () => {
    await loadStore();
    pruneExpired();
    const exists = memory.paid.some(
      (item) =>
        item.id === mark.id ||
        (mark.paymentHash && item.paymentHash === mark.paymentHash),
    );
    if (!exists) memory.paid.push(mark);
    if (mark.paymentHash) delete memory.pending[mark.paymentHash];
    await persist();
    return mark;
  });
}

export async function getPaidMarks() {
  await loadStore();
  pruneExpired();
  return memory.paid.filter((mark) => isActiveMark(mark));
}

export async function findPaidByHash(paymentHash: string) {
  await loadStore();
  pruneExpired();
  return (
    memory.paid.find((mark) => mark.paymentHash === paymentHash) ?? null
  );
}
