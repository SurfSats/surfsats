import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SLAB_CELL_PX,
  SLAB_COATS,
  SLAB_COPY,
  SLAB_HEIGHT,
  SLAB_MAX_PIXELS,
  SLAB_MORTAR_PX,
  SLAB_REEF_BLOCKS,
  SLAB_REEF_SATS,
  SLAB_STAIN_OPACITY,
  SLAB_SWELL_BLOCKS,
  SLAB_SWELL_SATS,
  SLAB_WIDTH,
  applyStroke,
  bezelCounts,
  blocksRemaining,
  cellKey,
  coatBlocks,
  coatPrice,
  expireBoard,
  invoiceSats,
  isLiveCell,
  isSlabCoat,
  isSlabColor,
  parseSlabPixels,
  pendingSlabFromBody,
  slabPalette,
  slabTapeText,
  stripStroke,
} from "./slab.ts";

const HEIGHT = 910_000;

function cell(input: {
  x: number;
  y: number;
  color?: "blood" | "hope" | "banana" | "ice" | "cyan";
  coat?: "swell" | "reef";
  callsign?: string;
  paintedHeight?: number;
  expiresHeight?: number;
}) {
  const coat = input.coat ?? "swell";
  const paintedHeight = input.paintedHeight ?? HEIGHT;
  return {
    x: input.x,
    y: input.y,
    color: input.color ?? "blood",
    coat,
    callsign: input.callsign ?? "HOPE",
    paintedHeight,
    expiresHeight: input.expiresHeight ?? paintedHeight + coatBlocks(coat),
    paymentHash: "hash",
  };
}

test("the slab is 84 by 42 voxels at 14px with a 1px mortar and a 21-block stroke cap", () => {
  assert.equal(SLAB_WIDTH, 84);
  assert.equal(SLAB_HEIGHT, 42);
  assert.equal(SLAB_CELL_PX, 14);
  assert.equal(SLAB_MORTAR_PX, 1);
  assert.equal(SLAB_MAX_PIXELS, 21);
  assert.equal(slabPalette.length, 16);
  const ids = slabPalette.map((item) => item.id);
  assert.deepEqual(ids, [
    "void",
    "bone",
    "chrome",
    "banana",
    "blood",
    "ice",
    "rust",
    "pink",
    "night",
    "moss",
    "foam",
    "tar",
    "sats",
    "cyan",
    "magenta",
    "hope",
  ]);
  assert.equal(isSlabColor("hope"), true);
  assert.equal(isSlabColor("gold"), false);
  assert.equal(SLAB_STAIN_OPACITY, 0.15);
});

test("three swell pixels invoice 63 sats and expire at paintedHeight+2016", () => {
  assert.equal(SLAB_SWELL_SATS, 21);
  assert.equal(SLAB_SWELL_BLOCKS, 2016);
  assert.equal(SLAB_COATS.swell.priceSats, 21);
  assert.equal(SLAB_COATS.swell.blocks, 2016);
  assert.equal(invoiceSats("swell", 3), 63);
  assert.equal(coatPrice("swell"), 21);
  assert.equal(coatBlocks("swell"), 2016);

  const painted = applyStroke({
    live: [],
    stains: [],
    pixels: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ],
    coat: "swell",
    color: "blood",
    callsign: "HOPE",
    paintedHeight: HEIGHT,
    paymentHash: "swell-3",
  });
  assert.equal(painted.painted.length, 3);
  assert.equal(painted.live.length, 3);
  for (const next of painted.painted) {
    assert.equal(next.expiresHeight, HEIGHT + 2016);
    assert.equal(next.coat, "swell");
    assert.equal(isLiveCell(next, HEIGHT), true);
    assert.equal(isLiveCell(next, HEIGHT + 2015), true);
    assert.equal(isLiveCell(next, HEIGHT + 2016), false);
  }
});

test("one reef pixel invoices 441 sats and expires at paintedHeight+210000", () => {
  assert.equal(SLAB_REEF_SATS, 441);
  assert.equal(SLAB_REEF_BLOCKS, 210_000);
  assert.equal(invoiceSats("reef", 1), 441);
  assert.equal(coatPrice("reef") * 1, 21 * 21);

  const painted = applyStroke({
    live: [],
    stains: [],
    pixels: [{ x: 10, y: 10 }],
    coat: "reef",
    color: "hope",
    callsign: "HOPE",
    paintedHeight: HEIGHT,
    paymentHash: "reef-1",
  });
  assert.equal(painted.painted.length, 1);
  assert.equal(painted.painted[0].expiresHeight, HEIGHT + 210_000);
  assert.equal(isLiveCell(painted.painted[0], HEIGHT + 209_999), true);
  assert.equal(isLiveCell(painted.painted[0], HEIGHT + 210_000), false);
});

test("swell cannot overwrite a live reef pixel and those cells are stripped", () => {
  const reef = cell({ x: 4, y: 4, coat: "reef", color: "hope" });
  const swell = cell({ x: 5, y: 4, coat: "swell", color: "banana" });
  const stroke = stripStroke({
    pixels: [
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
    ],
    live: [reef, swell],
    coat: "swell",
    currentHeight: HEIGHT,
  });
  assert.deepEqual(stroke, [
    { x: 5, y: 4 },
    { x: 6, y: 4 },
  ]);

  const applied = applyStroke({
    live: [reef, swell],
    stains: [],
    pixels: [
      { x: 4, y: 4 },
      { x: 5, y: 4 },
    ],
    coat: "swell",
    color: "blood",
    callsign: "ZOE",
    paintedHeight: HEIGHT,
    paymentHash: "swell-over",
  });
  const reefCell = applied.live.find((item) => cellKey(item.x, item.y) === "4,4");
  const swellCell = applied.live.find((item) => cellKey(item.x, item.y) === "5,4");
  assert.equal(reefCell?.coat, "reef");
  assert.equal(reefCell?.callsign, "HOPE");
  assert.equal(swellCell?.coat, "swell");
  assert.equal(swellCell?.color, "blood");
  assert.equal(swellCell?.callsign, "ZOE");
});

test("reef may overwrite swell or reef", () => {
  const live = [
    cell({ x: 1, y: 1, coat: "swell" }),
    cell({ x: 2, y: 1, coat: "reef", color: "ice" }),
  ];
  const applied = applyStroke({
    live,
    stains: [],
    pixels: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    coat: "reef",
    color: "moss",
    callsign: "ZOE",
    paintedHeight: HEIGHT,
    paymentHash: "reef-over",
  });
  assert.equal(applied.live.length, 2);
  assert.ok(applied.live.every((item) => item.coat === "reef"));
  assert.ok(applied.live.every((item) => item.color === "moss"));
  assert.ok(applied.live.every((item) => item.callsign === "ZOE"));
});

test("expired swell and reef cells remain as stains instead of snapping to void", () => {
  const swell = cell({
    x: 8,
    y: 8,
    coat: "swell",
    color: "banana",
    paintedHeight: HEIGHT,
  });
  const reef = cell({
    x: 9,
    y: 8,
    coat: "reef",
    color: "cyan",
    paintedHeight: HEIGHT,
  });
  const expired = expireBoard({
    live: [swell, reef],
    stains: [],
    currentHeight: HEIGHT + 2016,
  });
  assert.equal(expired.live.length, 1);
  assert.equal(expired.live[0].coat, "reef");
  assert.equal(expired.stains.length, 1);
  assert.deepEqual(expired.stains[0], { x: 8, y: 8, color: "banana" });
  assert.equal("callsign" in expired.stains[0], false);

  const both = expireBoard({
    live: expired.live,
    stains: expired.stains,
    currentHeight: HEIGHT + 210_000,
  });
  assert.equal(both.live.length, 0);
  assert.equal(both.stains.length, 2);
  const reefStain = both.stains.find((item) => item.x === 9 && item.y === 8);
  assert.equal(reefStain?.color, "cyan");
});

test("fresh paint covers stains", () => {
  const applied = applyStroke({
    live: [],
    stains: [{ x: 3, y: 3, color: "blood" }],
    pixels: [{ x: 3, y: 3 }],
    coat: "swell",
    color: "hope",
    callsign: "HOPE",
    paintedHeight: HEIGHT,
    paymentHash: "cover",
  });
  assert.equal(applied.stains.length, 0);
  assert.equal(applied.live[0].color, "hope");
  assert.equal(applied.live[0].callsign, "HOPE");
});

test("parseSlabPixels drops duplicates, out of bounds, and caps at 21", () => {
  assert.equal(parseSlabPixels(null), null);
  const parsed = parseSlabPixels([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 83, y: 41 },
    { x: 84, y: 0 },
    { x: 0, y: 42 },
    { x: 1.5, y: 1 },
  ]);
  assert.deepEqual(parsed, [
    { x: 0, y: 0 },
    { x: 83, y: 41 },
  ]);

  const tooMany = Array.from({ length: 22 }, (_, i) => ({ x: i, y: 0 }));
  assert.equal(parseSlabPixels(tooMany), null);
  assert.equal(parseSlabPixels([]), null);
});

test("pendingSlabFromBody requires callsign, coat, color, and pixels", () => {
  const ok = pendingSlabFromBody({
    coat: "swell",
    color: "hope",
    callsign: "hope",
    pixels: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ],
  });
  assert.equal("error" in ok, false);
  if ("error" in ok) return;
  assert.equal(ok.callsign, "HOPE");
  assert.equal(ok.coat, "swell");
  assert.equal(ok.color, "hope");
  assert.equal(ok.pixels.length, 3);
  assert.equal(invoiceSats(ok.coat, ok.pixels.length), 63);

  const missing = pendingSlabFromBody({
    coat: "swell",
    color: "hope",
    pixels: [{ x: 1, y: 1 }],
  });
  assert.equal("error" in missing, true);
  if ("error" in missing) {
    assert.equal(missing.error, "SET CALLSIGN FIRST · 2–16 CHARS");
  }
  assert.equal(isSlabCoat("swell"), true);
  assert.equal(isSlabCoat("gloss"), false);
});

test("tape line is HOPE laid 12 swell px on The Slab", () => {
  assert.equal(
    slabTapeText("HOPE", 12, "swell"),
    "HOPE laid 12 swell px on The Slab",
  );
  assert.equal(
    slabTapeText("ZOE", 1, "reef"),
    "ZOE laid 1 reef px on The Slab",
  );
});

test("bezel counts painted swell reef stain and next expiry in blocks", () => {
  const swell = cell({ x: 0, y: 0, coat: "swell" });
  const reef = cell({
    x: 1,
    y: 0,
    coat: "reef",
    paintedHeight: HEIGHT,
    expiresHeight: HEIGHT + 210_000,
  });
  const counts = bezelCounts({
    live: [swell, reef],
    stains: [{ x: 2, y: 0, color: "tar" }],
    currentHeight: HEIGHT,
  });
  assert.equal(counts.painted, 2);
  assert.equal(counts.swell, 1);
  assert.equal(counts.reef, 1);
  assert.equal(counts.stain, 1);
  assert.equal(counts.nextExpiry, 2016);
  assert.equal(blocksRemaining(swell, HEIGHT), 2016);
});

test("slab copy stays concrete and never says NFT mint own username account", () => {
  const blob = Object.values(SLAB_COPY).join(" ").toLowerCase();
  for (const word of ["nft", "mint", "own", "username", "account"]) {
    assert.equal(blob.includes(word), false, word);
  }
  assert.ok(SLAB_COPY.title.includes("THE SLAB"));
  assert.ok(SLAB_COPY.clock.includes("the chain is the clock"));
});
