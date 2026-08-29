export type BarFace = "idle" | "squint" | "grin";

export type BarVoice = {
  skill: string;
  line: string;
};

export type BarChoice = {
  id: string;
  skill: string;
  label: string;
  next: string;
};

export type BarNode = {
  id: string;
  face: BarFace;
  him: string;
  voices: BarVoice[];
  choices: BarChoice[];
  ending?: string;
  audio?: string;
};

export type BarEnding = {
  id: string;
  title: string;
  score: number;
};

export type BarTree = {
  title: string;
  subtitle: string;
  start: string;
  endings: Record<string, BarEnding>;
  nodes: Record<string, BarNode>;
};

const FACES = new Set<BarFace>(["idle", "squint", "grin"]);

export function parseBarTree(raw: unknown): BarTree | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  const meta = asRecord(root.meta);
  const nodesRaw = asRecord(root.nodes);
  const endingsRaw = asRecord(root.endings);
  if (!meta || !nodesRaw || !endingsRaw) return null;

  const start = str(meta.start);
  const title = str(meta.title);
  const subtitle = str(meta.subtitle);
  if (!start || !title) return null;

  const endings: Record<string, BarEnding> = {};
  for (const [id, value] of Object.entries(endingsRaw)) {
    const rec = asRecord(value);
    const endingTitle = rec ? str(rec.title) : "";
    const score = rec ? num(rec.score) : null;
    if (!endingTitle || score === null) return null;
    endings[id] = { id, title: endingTitle, score };
  }
  if (Object.keys(endings).length === 0) return null;

  const nodes: Record<string, BarNode> = {};
  for (const [id, value] of Object.entries(nodesRaw)) {
    const rec = asRecord(value);
    if (!rec) return null;
    const him = str(rec.him);
    const faceRaw = str(rec.face) as BarFace;
    const face: BarFace = FACES.has(faceRaw) ? faceRaw : "idle";
    if (!him) return null;
    const voices = asArray(rec.voices).flatMap((item) => {
      const voice = asRecord(item);
      const skill = voice ? str(voice.skill) : "";
      const line = voice ? str(voice.line) : "";
      if (!skill || !line) return [];
      return [{ skill, line }];
    });
    const choices = asArray(rec.choices)
      .slice(0, 3)
      .flatMap((item) => {
        const choice = asRecord(item);
        const next = choice ? str(choice.next) : "";
        const label = choice ? str(choice.label) : "";
        const skill = choice ? str(choice.skill) : "";
        const cid = choice ? str(choice.id) : "";
        if (!next || !label) return [];
        return [{ id: cid || next, skill, label, next }];
      });
    const ending = str(rec.ending) || undefined;
    if (ending && !endings[ending]) return null;
    const audioRaw = str(rec.audio);
    const audio =
      audioRaw.startsWith("/tab/audio/") && audioRaw.endsWith(".mp3")
        ? audioRaw
        : undefined;
    nodes[id] = {
      id,
      face,
      him,
      voices,
      choices: ending ? [] : choices,
      ending,
      audio,
    };
  }

  if (!nodes[start]) return null;
  for (const node of Object.values(nodes)) {
    for (const choice of node.choices) {
      if (!nodes[choice.next]) return null;
    }
  }

  return { title, subtitle, start, endings, nodes };
}

export async function loadBarTree(): Promise<BarTree | null> {
  try {
    const response = await fetch("/tab/bar-tree.json", { cache: "no-store" });
    if (!response.ok) return null;
    return parseBarTree(await response.json());
  } catch {
    return null;
  }
}

export function nodeEnding(tree: BarTree, node: BarNode): BarEnding | null {
  if (!node.ending) return null;
  return tree.endings[node.ending] ?? null;
}

export function reachableEndings(tree: BarTree): string[] {
  const seen = new Set<string>();
  const found = new Set<string>();
  const queue = [tree.start];
  while (queue.length) {
    const id = queue.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const node = tree.nodes[id];
    if (!node) continue;
    if (node.ending) found.add(node.ending);
    for (const choice of node.choices) queue.push(choice.next);
  }
  return [...found];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
