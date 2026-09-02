import { hexRgb, vec3, type Vec3 } from "./math";
import { createTiledFloor } from "./models";
import {
  FIRE_POS,
  ROOM_D,
  ROOM_H,
  ROOM_W,
  ROOM_X,
  ROOM_Z,
} from "./presets";
import { addChild, createNode, type ShackNode } from "./scene";

export const PALETTE = {
  wood: hexRgb("#3d342a"),
  trim: hexRgb("#534536"),
  floorA: hexRgb("#2c241c"),
  floorB: hexRgb("#3a2e24"),
  fire: hexRgb("#d8892b"),
  glass: hexRgb("#0b1a28"),
  accent: hexRgb("#ff7a18"),
  stone: hexRgb("#4a453c"),
  stoneHot: hexRgb("#6a5340"),
  ceiling: hexRgb("#241e18"),
  night: hexRgb("#070605"),
  flame: hexRgb("#ffb347"),
  pewter: hexRgb("#8b8e92"),
  brass: hexRgb("#c4a15a"),
  fiat: hexRgb("#c8342a"),
  lantern: hexRgb("#ffd27a"),
  iron: hexRgb("#3c3e42"),
  cream: hexRgb("#e4d4b8"),
  plaqueInk: hexRgb("#2a2118"),
  cabIron: hexRgb("#2b2c2e"),
  crt: hexRgb("#7ec8e3"),
  violet: hexRgb("#5a3a6e"),
  book: hexRgb("#1c1a17"),
  cork: hexRgb("#6b5340"),
  paper: hexRgb("#e6dcc8"),
  zine: hexRgb("#f3eee6"),
  slate: hexRgb("#2a2c2e"),
  boardA: hexRgb("#c4b7a0"),
  boardB: hexRgb("#3d5c6e"),
  boardC: hexRgb("#d9b36a"),
};

export const FIRE_ID = "fire";
export const TAB_ID = "tab";
export const FIAT_ID = "fiat";
export const ABOUT_ID = "about";
export const ARCADE_ID = "arcade";
export const MUSIC_ID = "music";
export const STORY_ID = "story";
export const GRAFFITI_ID = "graffiti";
export const SIGNAL_ID = "signal";
export const ARTICLES_ID = "articles";
export const TOOLS_ID = "tools";
export const TIDECHAIN_ID = "tidechain";
export const LINEUP_ID = "lineup";

export type ShackDoorId =
  | "fire"
  | "tab"
  | "fiat"
  | "about"
  | "arcade"
  | "music"
  | "story"
  | "graffiti"
  | "signal"
  | "articles"
  | "tools"
  | "tidechain"
  | "lineup";

export type ShackDoor = {
  id: ShackDoorId;
  href: string;
  tooltip: string;
  look: Vec3;
  hoverSpeech?: string;
  hoverKey?: string;
  tapSpeech?: string;
  tapKey?: string;
};

export const SHACK_DOORS: Record<ShackDoorId, ShackDoor> = {
  fire: {
    id: "fire",
    href: "/",
    tooltip: "the lot · front door is that way",
    look: vec3(FIRE_POS.x, 0.55, FIRE_POS.z),
    tapSpeech: "you found the side door",
    tapKey: "shack.tapped",
  },
  tab: {
    id: "tab",
    href: "/tab",
    tooltip: "the tab · sit down",
    look: vec3(-7.1, 0.85, -0.6),
    hoverSpeech: "one stool. that's the bit.",
    hoverKey: "shack.hover.tab",
  },
  fiat: {
    id: "fiat",
    href: "/fiat",
    tooltip: "dirty fiat · still a joke",
    look: vec3(-8.4, 2.4, -1.6),
    hoverSpeech: "dirty fiat. still a joke.",
    hoverKey: "shack.hover.fiat",
  },
  about: {
    id: "about",
    href: "/about",
    tooltip: "about · not a pitch deck",
    look: vec3(-8.4, 1.55, 0.4),
    hoverSpeech: "sats in, sats out. no nest egg.",
    hoverKey: "shack.hover.about",
  },
  arcade: {
    id: "arcade",
    href: "/arcade",
    tooltip: "arcade · smash a cabinet",
    look: vec3(7.4, 0.9, 1.4),
    hoverSpeech: "insert stays on the glass",
    hoverKey: "shack.hover.arcade",
  },
  music: {
    id: "music",
    href: "/music",
    tooltip: "surf radio · tap to tune in",
    look: vec3(7.6, 0.7, 3.1),
    hoverSpeech: "21 sats. not a record deal.",
    hoverKey: "shack.hover.music",
  },
  story: {
    id: "story",
    href: "/story",
    tooltip: "story · write a line",
    look: vec3(5.3, 0.4, 3.4),
    hoverSpeech: "write a line or don't",
    hoverKey: "shack.hover.story",
  },
  graffiti: {
    id: "graffiti",
    href: "/graffiti",
    tooltip: "graffiti · tag the wall",
    look: vec3(-2.4, 1.8, -5.8),
    hoverSpeech: "still wet",
    hoverKey: "shack.hover.graffiti",
  },
  signal: {
    id: "signal",
    href: "/signal",
    tooltip: "signal · hand picked",
    look: vec3(4.7, 2.3, -5.8),
    hoverSpeech: "hand picked. no feed.",
    hoverKey: "shack.hover.signal",
  },
  articles: {
    id: "articles",
    href: "/articles",
    tooltip: "articles · ours, on paper",
    look: vec3(-3.6, 0.4, -5.6),
    hoverSpeech: "print for people who still touch paper",
    hoverKey: "shack.hover.articles",
  },
  tools: {
    id: "tools",
    href: "/tools",
    tooltip: "tools · no affiliates",
    look: vec3(6.2, 0.7, -3.2),
    hoverSpeech: "no affiliates",
    hoverKey: "shack.hover.tools",
  },
  tidechain: {
    id: "tidechain",
    href: "/tidechain",
    tooltip: "tidechain · tick tock next block",
    look: vec3(8.6, 3.1, -4.6),
    hoverSpeech: "the chain is the clock",
    hoverKey: "shack.hover.tidechain",
  },
  lineup: {
    id: "lineup",
    href: "/lineup",
    tooltip: "lineup · who's out",
    look: vec3(4.6, 0.9, -5.8),
    hoverSpeech: "swell doesn't care if you posted",
    hoverKey: "shack.hover.lineup",
  },
};

export function isShackDoor(id: string | null | undefined): id is ShackDoorId {
  return !!id && id in SHACK_DOORS;
}

const WALL_T = 0.16;

export function addBox(
  parent: ShackNode,
  id: string,
  pos: Vec3,
  size: Vec3,
  color: Vec3,
  opts?: {
    emissive?: Vec3;
    rot?: Vec3;
    group?: string;
    href?: string;
  },
): ShackNode {
  const n = createNode(id);
  n.local.pos = pos;
  n.local.scale = size;
  if (opts?.rot) n.local.rot = opts.rot;
  n.mesh = {
    kind: "box",
    color,
    emissive: opts?.emissive ?? vec3(),
  };
  if (opts?.group) n.group = opts.group;
  if (opts?.href) n.href = opts.href;
  addChild(parent, n);
  return n;
}

export function addPanel(
  parent: ShackNode,
  id: string,
  pos: Vec3,
  size: Vec3,
  color: Vec3,
  opts?: { emissive?: Vec3; rot?: Vec3; group?: string },
): ShackNode {
  const n = createNode(id);
  n.local.pos = pos;
  n.local.scale = size;
  if (opts?.rot) n.local.rot = opts.rot;
  n.mesh = {
    kind: "panel",
    color,
    emissive: opts?.emissive ?? vec3(),
  };
  if (opts?.group) n.group = opts.group;
  addChild(parent, n);
  return n;
}

type Glyph = readonly [string, string, string, string, string];

const GLYPH: Record<string, Glyph> = {
  a: [" # ", "# #", "###", "# #", "# #"],
  b: ["## ", "# #", "## ", "# #", "## "],
  c: [" ##", "#  ", "#  ", "#  ", " ##"],
  d: ["## ", "# #", "# #", "# #", "## "],
  e: ["###", "#  ", "## ", "#  ", "###"],
  f: ["###", "#  ", "## ", "#  ", "#  "],
  g: [" ##", "#  ", "# #", "# #", " ##"],
  h: ["# #", "# #", "###", "# #", "# #"],
  i: ["###", " # ", " # ", " # ", "###"],
  l: ["#  ", "#  ", "#  ", "#  ", "###"],
  m: ["# #", "###", "# #", "# #", "# #"],
  n: ["# #", "## ", "# #", "# #", "# #"],
  o: [" # ", "# #", "# #", "# #", " # "],
  r: ["## ", "# #", "## ", "# #", "# #"],
  s: [" ##", "#  ", " # ", "  #", "## "],
  t: ["###", " # ", " # ", " # ", " # "],
  u: ["# #", "# #", "# #", "# #", "###"],
  v: ["# #", "# #", "# #", "# #", " # "],
  y: ["# #", "# #", " # ", " # ", " # "],
  "·": ["   ", "   ", " # ", "   ", "   "],
  " ": ["   ", "   ", "   ", "   ", "   "],
};

/** Block letters on the −X wall: readable left→right as viewed from the room (toward −Z). */
function addText(
  parent: ShackNode,
  id: string,
  text: string,
  origin: Vec3,
  pixel: number,
  color: Vec3,
  group: string,
): void {
  const label = createNode(id);
  label.group = group;
  addChild(parent, label);
  let z = origin.z;
  let n = 0;
  const gap = pixel * 0.85;
  for (const ch of text.toLowerCase()) {
    const g = GLYPH[ch] ?? GLYPH[" "];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (g[row][col] !== "#") continue;
        addBox(
          label,
          `${id}-${n++}`,
          vec3(
            origin.x,
            origin.y - row * pixel,
            z - col * pixel,
          ),
          vec3(pixel * 0.45, pixel * 0.88, pixel * 0.88),
          color,
          { group },
        );
      }
    }
    z -= 3 * pixel + gap;
  }
}

function buildTab(root: ShackNode): void {
  const tab = createNode(TAB_ID);
  tab.local.pos = vec3(-7.1, 0, -0.6);
  tab.pick = { radius: 1.4 };
  tab.group = TAB_ID;
  tab.href = "/tab";
  addChild(root, tab);

  addBox(tab, "tab-carcass", vec3(0, 0.525, 0), vec3(0.9, 1.05, 3.6), PALETTE.wood, {
    group: TAB_ID,
  });
  addBox(tab, "tab-top", vec3(0.04, 1.07, 0), vec3(1.02, 0.06, 3.72), PALETTE.trim, {
    group: TAB_ID,
  });
  addBox(tab, "tab-rail", vec3(0.5, 0.16, 0), vec3(0.05, 0.04, 3.35), PALETTE.iron, {
    group: TAB_ID,
  });

  const stool = createNode("tab-stool");
  stool.local.pos = vec3(1.08, 0, 0.06);
  stool.group = TAB_ID;
  addChild(tab, stool);
  addBox(stool, "tab-seat", vec3(0, 0.48, 0), vec3(0.34, 0.05, 0.34), PALETTE.trim, {
    group: TAB_ID,
  });
  addBox(stool, "tab-post", vec3(0, 0.24, 0), vec3(0.055, 0.44, 0.055), PALETTE.wood, {
    group: TAB_ID,
  });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    addBox(
      stool,
      `tab-foot-${i}`,
      vec3(Math.cos(a) * 0.13, 0.025, Math.sin(a) * 0.13),
      vec3(0.22, 0.04, 0.05),
      PALETTE.iron,
      { rot: vec3(0, a, 0), group: TAB_ID },
    );
  }

  addBox(tab, "tab-mug", vec3(0.12, 1.16, -0.18), vec3(0.07, 0.1, 0.07), PALETTE.pewter, {
    group: TAB_ID,
  });
  addBox(tab, "tab-mug-handle", vec3(0.17, 1.16, -0.18), vec3(0.03, 0.055, 0.02), PALETTE.pewter, {
    group: TAB_ID,
  });

  const lantern = createNode("tab-lantern");
  lantern.local.pos = vec3(0.06, 1.18, 0.58);
  lantern.group = TAB_ID;
  addChild(tab, lantern);
  addBox(lantern, "tab-lantern-core", vec3(0, 0, 0), vec3(0.07, 0.08, 0.07), PALETTE.lantern, {
    emissive: vec3(1.15, 0.88, 0.38),
    group: TAB_ID,
  });
  addBox(lantern, "tab-lantern-top", vec3(0, 0.055, 0), vec3(0.1, 0.016, 0.1), PALETTE.brass, {
    group: TAB_ID,
  });
  addBox(lantern, "tab-lantern-bot", vec3(0, -0.055, 0), vec3(0.1, 0.016, 0.1), PALETTE.brass, {
    group: TAB_ID,
  });
  const post = 0.045;
  for (let i = 0; i < 4; i++) {
    const sx = i % 2 === 0 ? -post : post;
    const sz = i < 2 ? -post : post;
    addBox(
      lantern,
      `tab-lantern-post-${i}`,
      vec3(sx, 0, sz),
      vec3(0.016, 0.11, 0.016),
      PALETTE.brass,
      { group: TAB_ID },
    );
  }
  addBox(lantern, "tab-lantern-rod", vec3(0, 0.22, 0), vec3(0.014, 0.32, 0.014), PALETTE.brass, {
    group: TAB_ID,
  });
}

function buildFiat(root: ShackNode): void {
  const fiat = createNode(FIAT_ID);
  fiat.local.pos = vec3(-9.7, 2.55, -1.6);
  fiat.pick = { radius: 0.7 };
  fiat.group = FIAT_ID;
  fiat.href = "/fiat";
  addChild(root, fiat);

  addBox(fiat, "fiat-sheet", vec3(0, 0, 0), vec3(0.03, 1.25, 0.95), PALETTE.fiat, {
    group: FIAT_ID,
  });
  addBox(
    fiat,
    "fiat-peel-0",
    vec3(0.03, 0.58, 0.44),
    vec3(0.02, 0.09, 0.11),
    hexRgb("#a42b24"),
    { rot: vec3(0.18, 0.35, 0.12), group: FIAT_ID },
  );
  addBox(
    fiat,
    "fiat-peel-1",
    vec3(0.03, -0.58, -0.44),
    vec3(0.02, 0.1, 0.12),
    hexRgb("#d44a3c"),
    { rot: vec3(-0.22, -0.4, 0.08), group: FIAT_ID },
  );
  addText(fiat, "fiat-dirty", "dirty", vec3(0.03, 0.38, 0.34), 0.038, PALETTE.cream, FIAT_ID);
  addText(fiat, "fiat-fiat", "fiat", vec3(0.03, 0.02, 0.26), 0.048, PALETTE.cream, FIAT_ID);
}

function buildAbout(root: ShackNode): void {
  const about = createNode(ABOUT_ID);
  about.local.pos = vec3(-9.7, 1.55, 0.4);
  about.pick = { radius: 0.35 };
  about.group = ABOUT_ID;
  about.href = "/about";
  addChild(root, about);

  addBox(about, "about-mount", vec3(-0.02, 0, 0), vec3(0.02, 0.38, 0.62), PALETTE.wood, {
    group: ABOUT_ID,
  });
  addBox(about, "about-plate", vec3(0.012, 0, 0), vec3(0.03, 0.32, 0.55), PALETTE.brass, {
    group: ABOUT_ID,
  });
  const screws: Array<[number, number]> = [
    [0.13, 0.24],
    [0.13, -0.24],
    [-0.13, 0.24],
    [-0.13, -0.24],
  ];
  screws.forEach(([y, z], i) => {
    addBox(about, `about-screw-${i}`, vec3(0.03, y, z), vec3(0.02, 0.025, 0.025), PALETTE.iron, {
      group: ABOUT_ID,
    });
  });
  addText(
    about,
    "about-line-0",
    "five machines",
    vec3(0.03, 0.08, 0.25),
    0.01,
    PALETTE.plaqueInk,
    ABOUT_ID,
  );
  addText(
    about,
    "about-line-1",
    "sats in · sats out · no nest egg",
    vec3(0.03, -0.02, 0.26),
    0.0043,
    PALETTE.plaqueInk,
    ABOUT_ID,
  );
}

function buildArcade(root: ShackNode): void {
  const arcade = createNode(ARCADE_ID);
  arcade.local.pos = vec3(7.4, 0, 1.4);
  arcade.pick = { radius: 1.1, offset: vec3(0, 0.75, 0) };
  arcade.group = ARCADE_ID;
  arcade.href = "/arcade";
  addChild(root, arcade);

  addBox(
    arcade,
    "arcade-body",
    vec3(0, 0.86, 0),
    vec3(0.72, 1.72, 0.78),
    PALETTE.cabIron,
    { group: ARCADE_ID },
  );
  addBox(
    arcade,
    "arcade-bezel",
    vec3(-0.355, 1.18, 0),
    vec3(0.04, 0.56, 0.6),
    PALETTE.iron,
    { group: ARCADE_ID },
  );
  addBox(
    arcade,
    "arcade-screen",
    vec3(-0.38, 1.18, 0),
    vec3(0.02, 0.46, 0.5),
    PALETTE.crt,
    { emissive: vec3(0.22, 0.48, 0.58), group: ARCADE_ID },
  );
  addBox(
    arcade,
    "arcade-marquee",
    vec3(-0.06, 1.7, 0),
    vec3(0.58, 0.12, 0.82),
    PALETTE.accent,
    { emissive: vec3(0.42, 0.16, 0.03), group: ARCADE_ID },
  );
  addBox(
    arcade,
    "arcade-shelf",
    vec3(-0.42, 0.82, 0),
    vec3(0.22, 0.05, 0.72),
    PALETTE.cabIron,
    { group: ARCADE_ID },
  );
  addBox(
    arcade,
    "arcade-stick",
    vec3(-0.48, 0.94, -0.14),
    vec3(0.03, 0.18, 0.03),
    PALETTE.iron,
    { group: ARCADE_ID },
  );
  addBox(
    arcade,
    "arcade-ball",
    vec3(-0.48, 1.05, -0.14),
    vec3(0.055, 0.055, 0.055),
    PALETTE.accent,
    { group: ARCADE_ID },
  );
  addBox(
    arcade,
    "arcade-btn-0",
    vec3(-0.46, 0.86, 0.08),
    vec3(0.045, 0.022, 0.045),
    PALETTE.fiat,
    { group: ARCADE_ID },
  );
  addBox(
    arcade,
    "arcade-btn-1",
    vec3(-0.46, 0.86, 0.16),
    vec3(0.045, 0.022, 0.045),
    PALETTE.crt,
    { group: ARCADE_ID },
  );
  addBox(
    arcade,
    "arcade-coin",
    vec3(-0.37, 0.36, 0),
    vec3(0.02, 0.12, 0.16),
    PALETTE.pewter,
    { emissive: vec3(0.08, 0.08, 0.07), group: ARCADE_ID },
  );
}

function buildMusic(root: ShackNode): void {
  const music = createNode(MUSIC_ID);
  music.local.pos = vec3(7.6, 0, 3.1);
  music.pick = { radius: 0.9, offset: vec3(0, 0.55, 0) };
  music.group = MUSIC_ID;
  music.href = "/music";
  addChild(root, music);

  addBox(
    music,
    "music-body",
    vec3(0, 0.5, 0),
    vec3(0.55, 1.0, 0.7),
    PALETTE.violet,
    { group: MUSIC_ID },
  );
  addBox(
    music,
    "music-arch",
    vec3(0, 1.08, 0),
    vec3(0.55, 0.16, 0.52),
    PALETTE.violet,
    { group: MUSIC_ID },
  );
  addBox(
    music,
    "music-crown",
    vec3(0, 1.18, 0),
    vec3(0.48, 0.1, 0.32),
    PALETTE.violet,
    { group: MUSIC_ID },
  );
  for (let i = 0; i < 6; i++) {
    addBox(
      music,
      `music-grille-${i}`,
      vec3(-0.285, 0.28 + i * 0.075, 0),
      vec3(0.02, 0.028, 0.5),
      PALETTE.brass,
      { emissive: vec3(0.28, 0.16, 0.06), group: MUSIC_ID },
    );
  }
  for (let i = 0; i < 3; i++) {
    addBox(
      music,
      `music-btn-${i}`,
      vec3(-0.29, 0.86, -0.14 + i * 0.14),
      vec3(0.03, 0.03, 0.03),
      i === 1 ? PALETTE.accent : PALETTE.cream,
      { group: MUSIC_ID },
    );
  }
}

function buildStory(root: ShackNode): void {
  const story = createNode(STORY_ID);
  story.local.pos = vec3(5.3, 0, 3.4);
  story.pick = { radius: 0.7 };
  story.group = STORY_ID;
  story.href = "/story";
  addChild(root, story);

  addBox(
    story,
    "story-crate",
    vec3(0, 0.19, 0),
    vec3(0.7, 0.38, 0.55),
    PALETTE.wood,
    { group: STORY_ID },
  );
  addBox(
    story,
    "story-strap-0",
    vec3(0, 0.19, 0.22),
    vec3(0.72, 0.05, 0.04),
    PALETTE.cabIron,
    { group: STORY_ID },
  );
  addBox(
    story,
    "story-strap-1",
    vec3(0, 0.19, -0.22),
    vec3(0.72, 0.05, 0.04),
    PALETTE.cabIron,
    { group: STORY_ID },
  );
  addBox(
    story,
    "story-strap-2",
    vec3(0, 0.36, 0),
    vec3(0.08, 0.03, 0.56),
    PALETTE.cabIron,
    { group: STORY_ID },
  );
  addBox(
    story,
    "story-book",
    vec3(0.04, 0.42, 0.02),
    vec3(0.42, 0.07, 0.3),
    PALETTE.book,
    { group: STORY_ID },
  );
  addBox(
    story,
    "story-pencil",
    vec3(0.02, 0.47, 0.04),
    vec3(0.28, 0.018, 0.018),
    hexRgb("#d2b06a"),
    { rot: vec3(0, 0.4, 0.08), group: STORY_ID },
  );
  addBox(
    story,
    "story-ferrule",
    vec3(0.14, 0.475, 0.09),
    vec3(0.035, 0.02, 0.02),
    PALETTE.brass,
    { rot: vec3(0, 0.4, 0.08), group: STORY_ID },
  );
}

function buildGraffiti(root: ShackNode): void {
  const graffiti = createNode(GRAFFITI_ID);
  graffiti.local.pos = vec3(-2.4, 1.8, -6.85);
  graffiti.pick = { radius: 1.6 };
  graffiti.group = GRAFFITI_ID;
  graffiti.href = "/graffiti";
  addChild(root, graffiti);

  const wet = vec3(0.55, 0.28, 0.04);
  const stains: Array<{
    id: string;
    pos: Vec3;
    size: Vec3;
    rot?: Vec3;
    em?: Vec3;
  }> = [
    { id: "g-splat-0", pos: vec3(-1.35, 0.15, 0), size: vec3(1.55, 1.15, 0.03), rot: vec3(0, 0, 0.1), em: wet },
    { id: "g-splat-1", pos: vec3(0.55, -0.35, 0.01), size: vec3(1.25, 0.95, 0.025), rot: vec3(0, 0, -0.14), em: wet },
    { id: "g-splat-2", pos: vec3(-0.15, 0.75, 0.012), size: vec3(0.95, 0.72, 0.022), rot: vec3(0, 0, 0.22) },
    { id: "g-splat-3", pos: vec3(1.35, 0.05, 0.008), size: vec3(0.72, 1.35, 0.022), rot: vec3(0, 0, -0.06), em: wet },
    { id: "g-splat-4", pos: vec3(-1.55, -0.55, 0.01), size: vec3(0.85, 0.48, 0.02), rot: vec3(0, 0, 0.28) },
    { id: "g-drip-0", pos: vec3(-0.7, -0.7, 0.01), size: vec3(0.08, 0.55, 0.018) },
    { id: "g-drip-1", pos: vec3(0.9, -0.85, 0.01), size: vec3(0.06, 0.42, 0.016) },
    { id: "g-chev-0", pos: vec3(0.05, 0.2, 0.02), size: vec3(1.35, 0.16, 0.024), rot: vec3(0, 0, 0.52), em: wet },
    { id: "g-chev-1", pos: vec3(0.05, 0.2, 0.02), size: vec3(1.35, 0.16, 0.024), rot: vec3(0, 0, -0.52), em: wet },
  ];
  for (const s of stains) {
    addBox(graffiti, s.id, s.pos, s.size, PALETTE.fire, {
      rot: s.rot,
      emissive: s.em ?? vec3(0.28, 0.12, 0.02),
      group: GRAFFITI_ID,
    });
  }

  addBox(
    graffiti,
    "g-sill",
    vec3(0.8, -0.52, 0.3),
    vec3(1.2, 0.08, 0.2),
    PALETTE.trim,
    { group: GRAFFITI_ID },
  );
  addBox(
    graffiti,
    "g-can-body",
    vec3(0.92, -0.38, 0.28),
    vec3(0.055, 0.14, 0.055),
    PALETTE.pewter,
    { group: GRAFFITI_ID },
  );
  addBox(
    graffiti,
    "g-can-shoulder",
    vec3(0.92, -0.29, 0.28),
    vec3(0.04, 0.03, 0.04),
    PALETTE.iron,
    { group: GRAFFITI_ID },
  );
  addBox(
    graffiti,
    "g-can-cap",
    vec3(0.92, -0.25, 0.28),
    vec3(0.048, 0.04, 0.048),
    PALETTE.fire,
    { group: GRAFFITI_ID },
  );
}

function buildSignal(root: ShackNode): void {
  // Right of the night window (glass x=0.6–3.8). Spec 1.6 would sit on the glass.
  const signal = createNode(SIGNAL_ID);
  signal.local.pos = vec3(4.7, 2.3, -6.85);
  signal.pick = { radius: 0.9 };
  signal.group = SIGNAL_ID;
  signal.href = "/signal";
  addChild(root, signal);

  addBox(
    signal,
    "signal-frame",
    vec3(0, 0, 0),
    vec3(1.15, 0.9, 0.05),
    PALETTE.wood,
    { group: SIGNAL_ID },
  );
  addBox(
    signal,
    "signal-cork",
    vec3(0, 0, 0.018),
    vec3(1.05, 0.8, 0.02),
    PALETTE.cork,
    { group: SIGNAL_ID },
  );

  for (let i = 0; i < 8; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = -0.34 + col * 0.34 + ((i % 2) * 0.05 - 0.02);
    const y = 0.24 - row * 0.26 + ((i * 3) % 5 - 2) * 0.018;
    const yaw = ((i * 17) % 7 - 3) * 0.07;
    addBox(
      signal,
      `signal-slip-${i}`,
      vec3(x, y, 0.04),
      vec3(0.16, 0.12, 0.012),
      PALETTE.paper,
      { rot: vec3(0, yaw, ((i * 11) % 5 - 2) * 0.04), group: SIGNAL_ID },
    );
    addBox(
      signal,
      `signal-pin-${i}`,
      vec3(x, y + 0.05, 0.05),
      vec3(0.02, 0.02, 0.02),
      PALETTE.iron,
      { group: SIGNAL_ID },
    );
  }
}

function buildArticles(root: ShackNode): void {
  const articles = createNode(ARTICLES_ID);
  articles.local.pos = vec3(-3.6, 0, -5.6);
  articles.pick = { radius: 0.7 };
  articles.group = ARTICLES_ID;
  articles.href = "/articles";
  addChild(root, articles);

  addBox(
    articles,
    "articles-crate",
    vec3(0, 0.19, 0),
    vec3(0.7, 0.38, 0.55),
    PALETTE.wood,
    { group: ARTICLES_ID },
  );
  addBox(
    articles,
    "articles-strap-0",
    vec3(0, 0.19, 0.22),
    vec3(0.72, 0.05, 0.04),
    PALETTE.cabIron,
    { group: ARTICLES_ID },
  );
  addBox(
    articles,
    "articles-strap-1",
    vec3(0, 0.19, -0.22),
    vec3(0.72, 0.05, 0.04),
    PALETTE.cabIron,
    { group: ARTICLES_ID },
  );
  addBox(
    articles,
    "articles-strap-2",
    vec3(0.22, 0.19, 0),
    vec3(0.04, 0.05, 0.56),
    PALETTE.cabIron,
    { group: ARTICLES_ID },
  );

  for (let i = 0; i < 5; i++) {
    const top = i === 4;
    addBox(
      articles,
      `articles-zine-${i}`,
      vec3((i % 2) * 0.03 - 0.01, 0.4 + i * 0.042, (i % 3) * 0.015 - 0.01),
      vec3(0.28, 0.04, 0.36),
      top ? PALETTE.zine : PALETTE.paper,
      { rot: vec3(0, (i - 2) * 0.04, 0), group: ARTICLES_ID },
    );
  }
  addBox(
    articles,
    "articles-band",
    vec3(0.02, 0.59, 0.02),
    vec3(0.29, 0.012, 0.08),
    PALETTE.fire,
    { rot: vec3(0, 0.08, 0), group: ARTICLES_ID },
  );
}

function buildTools(root: ShackNode): void {
  const tools = createNode(TOOLS_ID);
  tools.local.pos = vec3(6.2, 0, -3.2);
  tools.pick = { radius: 1.0, offset: vec3(0, 0.45, 0) };
  tools.group = TOOLS_ID;
  tools.href = "/tools";
  addChild(root, tools);

  addBox(
    tools,
    "tools-bench",
    vec3(0, 0.425, 0),
    vec3(0.7, 0.85, 1.8),
    PALETTE.wood,
    { group: TOOLS_ID },
  );
  addBox(
    tools,
    "tools-top",
    vec3(0.02, 0.86, 0),
    vec3(0.76, 0.05, 1.86),
    PALETTE.trim,
    { group: TOOLS_ID },
  );
  addBox(
    tools,
    "tools-vise-base",
    vec3(-0.12, 0.93, 0.62),
    vec3(0.28, 0.08, 0.22),
    PALETTE.cabIron,
    { group: TOOLS_ID },
  );
  addBox(
    tools,
    "tools-vise-jaw",
    vec3(-0.22, 1.02, 0.62),
    vec3(0.08, 0.12, 0.2),
    PALETTE.iron,
    { group: TOOLS_ID },
  );
  addBox(
    tools,
    "tools-vise-screw",
    vec3(-0.02, 1.0, 0.62),
    vec3(0.22, 0.035, 0.035),
    PALETTE.pewter,
    { group: TOOLS_ID },
  );

  addBox(
    tools,
    "tools-box",
    vec3(0.05, 0.97, -0.55),
    vec3(0.32, 0.16, 0.55),
    PALETTE.cabIron,
    { group: TOOLS_ID },
  );
  const lidAngle = (70 * Math.PI) / 180;
  addBox(
    tools,
    "tools-lid",
    vec3(0.05 - Math.sin(lidAngle) * 0.12, 1.05 + Math.cos(lidAngle) * 0.12, -0.55),
    vec3(0.32, 0.025, 0.55),
    PALETTE.iron,
    { rot: vec3(0, 0, -lidAngle), group: TOOLS_ID },
  );
  for (let i = 0; i < 4; i++) {
    addBox(
      tools,
      `tools-bar-${i}`,
      vec3(-0.04 + i * 0.04, 0.98, -0.42 - (i % 2) * 0.08),
      vec3(0.02, 0.02, 0.22 + i * 0.04),
      PALETTE.iron,
      { group: TOOLS_ID },
    );
  }
}

function buildTidechain(root: ShackNode): void {
  const clock = createNode(TIDECHAIN_ID);
  clock.local.pos = vec3(9.82, 3.1, -4.6);
  clock.pick = { radius: 0.4 };
  clock.group = TIDECHAIN_ID;
  clock.href = "/tidechain";
  addChild(root, clock);

  const ringR = 0.22;
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    addBox(
      clock,
      `tide-seg-${i}`,
      vec3(0, Math.sin(a) * ringR, Math.cos(a) * ringR),
      vec3(0.05, 0.07, 0.07),
      PALETTE.brass,
      { rot: vec3(a, 0, 0), group: TIDECHAIN_ID },
    );
  }
  addBox(
    clock,
    "tide-hub",
    vec3(0, 0, 0),
    vec3(0.06, 0.08, 0.08),
    PALETTE.cabIron,
    { group: TIDECHAIN_ID },
  );
  addBox(
    clock,
    "tide-hand",
    vec3(0, 0.07, 0.04),
    vec3(0.03, 0.16, 0.03),
    PALETTE.iron,
    { rot: vec3(0.45, 0, 0), group: TIDECHAIN_ID },
  );
  addBox(
    clock,
    "tide-bead",
    vec3(0, ringR, 0),
    vec3(0.045, 0.045, 0.045),
    PALETTE.accent,
    { emissive: vec3(0.4, 0.15, 0.02), group: TIDECHAIN_ID },
  );
}

function buildLineup(root: ShackNode): void {
  const lineup = createNode(LINEUP_ID);
  lineup.local.pos = vec3(4.6, 0, -5.8);
  lineup.pick = { radius: 1.3, offset: vec3(0, 0.5, -0.35) };
  lineup.group = LINEUP_ID;
  lineup.href = "/lineup";
  addChild(root, lineup);

  addBox(
    lineup,
    "lineup-slate",
    vec3(0, 1.12, -1.05),
    vec3(1.1, 0.7, 0.04),
    PALETTE.slate,
    { group: LINEUP_ID },
  );
  addBox(
    lineup,
    "lineup-tray",
    vec3(0, 0.74, -0.95),
    vec3(1.14, 0.06, 0.16),
    PALETTE.wood,
    { group: LINEUP_ID },
  );
  addBox(
    lineup,
    "lineup-chev-0",
    vec3(0.02, 1.18, -1.02),
    vec3(0.28, 0.05, 0.02),
    PALETTE.fire,
    { rot: vec3(0, 0, 0.55), group: LINEUP_ID },
  );
  addBox(
    lineup,
    "lineup-chev-1",
    vec3(0.02, 1.18, -1.02),
    vec3(0.28, 0.05, 0.02),
    PALETTE.fire,
    { rot: vec3(0, 0, -0.55), group: LINEUP_ID },
  );

  addBox(
    lineup,
    "lineup-post-0",
    vec3(-0.55, 0.55, 0.15),
    vec3(0.06, 1.1, 0.06),
    PALETTE.wood,
    { group: LINEUP_ID },
  );
  addBox(
    lineup,
    "lineup-post-1",
    vec3(0.55, 0.55, 0.15),
    vec3(0.06, 1.1, 0.06),
    PALETTE.wood,
    { group: LINEUP_ID },
  );
  for (let i = 0; i < 3; i++) {
    addBox(
      lineup,
      `lineup-cradle-${i}`,
      vec3(0, 0.28 + i * 0.28, 0.18),
      vec3(1.12, 0.04, 0.12),
      PALETTE.trim,
      { group: LINEUP_ID },
    );
  }

  const boards: Array<{ id: string; x: number; yaw: number; color: Vec3 }> = [
    { id: "lineup-board-0", x: -0.28, yaw: -0.12, color: PALETTE.boardA },
    { id: "lineup-board-1", x: 0.02, yaw: 0.08, color: PALETTE.boardB },
    { id: "lineup-board-2", x: 0.32, yaw: -0.05, color: PALETTE.boardC },
  ];
  for (const b of boards) {
    addBox(
      lineup,
      b.id,
      vec3(b.x, 0.925, 0.42),
      vec3(0.18, 1.85, 0.06),
      b.color,
      { rot: vec3(0.05, b.yaw, 0.04), group: LINEUP_ID },
    );
  }
}

function buildMuteBoards(root: ShackNode): void {
  addBox(root, "scenery-board-0", vec3(9.82, 1.55, -1.15), vec3(0.05, 1.6, 0.22), PALETTE.boardA, {
    rot: vec3(0, 0, 0.08),
  });
  addBox(root, "scenery-board-1", vec3(9.82, 1.4, -1.55), vec3(0.05, 1.45, 0.2), PALETTE.boardC, {
    rot: vec3(0, 0, -0.05),
  });
  addBox(root, "scenery-board-2", vec3(9.82, 1.5, -5.35), vec3(0.05, 1.55, 0.2), PALETTE.boardB, {
    rot: vec3(0, 0, 0.04),
  });
}

function slab(
  parent: ShackNode,
  id: string,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z: number,
  color: Vec3,
): ShackNode {
  return addBox(
    parent,
    id,
    vec3((x0 + x1) / 2, (y0 + y1) / 2, z),
    vec3(Math.max(x1 - x0, 0.02), Math.max(y1 - y0, 0.02), WALL_T),
    color,
  );
}

function buildFire(root: ShackNode): ShackNode {
  const fire = createNode(FIRE_ID);
  fire.local.pos = vec3(FIRE_POS.x, 0.35, FIRE_POS.z);
  fire.pick = { radius: 1.15, offset: vec3(0, 0.1, 0) };
  fire.group = FIRE_ID;
  fire.href = "/";
  addChild(root, fire);

  const ring = 0.85;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.18;
    const w = 0.28 + (i % 3) * 0.04;
    const h = 0.2 + (i % 2) * 0.07;
    const d = 0.24 + ((i + 1) % 3) * 0.03;
    addBox(
      fire,
      `fire-stone-${i}`,
      vec3(Math.cos(a) * ring, h / 2 - 0.35, Math.sin(a) * ring),
      vec3(w, h, d),
      i % 2 === 0 ? PALETTE.stone : PALETTE.stoneHot,
      { group: FIRE_ID },
    );
  }

  const flames = [
    { id: "fire-flame-0", pos: vec3(0.04, 0.28, 0.02), size: vec3(0.14, 0.72, 0.12), phase: 0.2, amp: 0.22, speed: 5.4 },
    { id: "fire-flame-1", pos: vec3(-0.07, 0.38, -0.04), size: vec3(0.1, 0.96, 0.1), phase: 1.7, amp: 0.28, speed: 6.1 },
    { id: "fire-flame-2", pos: vec3(0.02, 0.18, 0.08), size: vec3(0.09, 0.5, 0.09), phase: 3.4, amp: 0.18, speed: 7.2 },
  ];

  for (const f of flames) {
    const node = addBox(fire, f.id, f.pos, f.size, PALETTE.fire, {
      emissive: PALETTE.flame,
      group: FIRE_ID,
    });
    node.pulse = {
      amp: f.amp,
      speed: f.speed,
      phase: f.phase,
      emissiveAmp: 0.85,
      baseScale: vec3(f.size.x, f.size.y, f.size.z),
      baseEmissive: vec3(1.35, 0.62, 0.12),
    };
  }

  return fire;
}

export function buildShack(): ShackNode {
  const root = createNode("shack");

  const floor = createNode("floor");
  floor.mesh = {
    kind: "floor",
    color: vec3(1, 1, 1),
    emissive: vec3(),
    geometry: createTiledFloor(ROOM_W, ROOM_D, 1, PALETTE.floorA, PALETTE.floorB),
  };
  addChild(root, floor);

  addBox(
    root,
    "floor-slab",
    vec3(0, -0.06, 0),
    vec3(ROOM_W + WALL_T * 2, 0.12, ROOM_D + WALL_T * 2),
    PALETTE.floorA,
  );

  addBox(
    root,
    "ceiling",
    vec3(0, ROOM_H + WALL_T / 2, 0),
    vec3(ROOM_W + WALL_T * 2, WALL_T, ROOM_D + WALL_T * 2),
    PALETTE.ceiling,
  );

  // −X bar wall, +X pit wall — solid, inner face on the room bound.
  addBox(
    root,
    "wall-bar",
    vec3(-ROOM_X - WALL_T / 2, ROOM_H / 2, 0),
    vec3(WALL_T, ROOM_H, ROOM_D),
    PALETTE.wood,
  );
  addBox(
    root,
    "wall-pit",
    vec3(ROOM_X + WALL_T / 2, ROOM_H / 2, 0),
    vec3(WALL_T, ROOM_H, ROOM_D),
    PALETTE.wood,
  );

  // −Z back wall, window 3.2 × 2.4, sill y=1.4, center x=2.2
  const winW = 3.2;
  const winH = 2.4;
  const winSill = 1.4;
  const winCx = 2.2;
  const winX0 = winCx - winW / 2;
  const winX1 = winCx + winW / 2;
  const winY1 = winSill + winH;
  const zBack = -ROOM_Z - WALL_T / 2;

  slab(root, "wall-back-west", -ROOM_X, winX0, 0, ROOM_H, zBack, PALETTE.wood);
  slab(root, "wall-back-east", winX1, ROOM_X, 0, ROOM_H, zBack, PALETTE.wood);
  slab(root, "wall-back-sill", winX0, winX1, 0, winSill, zBack, PALETTE.wood);
  slab(root, "wall-back-head", winX0, winX1, winY1, ROOM_H, zBack, PALETTE.wood);

  addBox(
    root,
    "window-glass",
    vec3(winCx, winSill + winH / 2, -ROOM_Z - 0.02),
    vec3(winW, winH, 0.04),
    PALETTE.glass,
    { emissive: vec3(0.04, 0.09, 0.14) },
  );
  addBox(
    root,
    "window-sill",
    vec3(winCx, winSill + 0.04, -ROOM_Z + 0.12),
    vec3(winW + 0.16, 0.08, 0.28),
    PALETTE.trim,
  );
  addBox(
    root,
    "window-trim-l",
    vec3(winX0 - 0.05, winSill + winH / 2, -ROOM_Z + 0.02),
    vec3(0.1, winH + 0.16, 0.08),
    PALETTE.trim,
  );
  addBox(
    root,
    "window-trim-r",
    vec3(winX1 + 0.05, winSill + winH / 2, -ROOM_Z + 0.02),
    vec3(0.1, winH + 0.16, 0.08),
    PALETTE.trim,
  );

  // +Z hatch wall — door 1.4 × 2.55 at x=0, filled with planks.
  const doorW = 1.4;
  const doorH = 2.55;
  const doorX0 = -doorW / 2;
  const doorX1 = doorW / 2;
  const zHatch = ROOM_Z + WALL_T / 2;

  slab(root, "wall-hatch-west", -ROOM_X, doorX0, 0, ROOM_H, zHatch, PALETTE.wood);
  slab(root, "wall-hatch-east", doorX1, ROOM_X, 0, ROOM_H, zHatch, PALETTE.wood);
  slab(root, "wall-hatch-head", doorX0, doorX1, doorH, ROOM_H, zHatch, PALETTE.wood);

  const plankN = 5;
  const plankW = doorW / plankN;
  for (let i = 0; i < plankN; i++) {
    const x = doorX0 + plankW * (i + 0.5);
    addBox(
      root,
      `hatch-plank-${i}`,
      vec3(x, doorH / 2, ROOM_Z + 0.02),
      vec3(plankW - 0.03, doorH, 0.08),
      i % 2 === 0 ? PALETTE.wood : PALETTE.trim,
    );
  }
  addBox(
    root,
    "hatch-bar",
    vec3(0, 1.15, ROOM_Z + 0.06),
    vec3(doorW - 0.08, 0.1, 0.06),
    PALETTE.trim,
  );
  addBox(
    root,
    "hatch-mark",
    vec3(0, doorH + 0.16, ROOM_Z + 0.04),
    vec3(0.22, 0.12, 0.06),
    PALETTE.accent,
    { emissive: vec3(0.35, 0.14, 0.02) },
  );

  buildFire(root);
  buildTab(root);
  buildFiat(root);
  buildAbout(root);
  buildArcade(root);
  buildMusic(root);
  buildStory(root);
  buildGraffiti(root);
  buildSignal(root);
  buildArticles(root);
  buildTools(root);
  buildTidechain(root);
  buildLineup(root);
  buildMuteBoards(root);
  return root;
}

export { ROOM_D, ROOM_H, ROOM_W, ROOM_X, ROOM_Z, FIRE_POS };
