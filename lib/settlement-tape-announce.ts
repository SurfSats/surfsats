import { ARCADE_PRICE_SATS } from "@/lib/arcade";
import { BOTTLE_PRICE_SATS, type BottlePull } from "@/lib/bottle";
import type { GraffitiMark } from "@/lib/graffiti";
import {
  publishTape,
  tapeFromArcade,
  tapeFromGraffiti,
  tapeFromRadio,
  tapeFromStory,
  tapeFromTab,
} from "@/lib/settlement-tape";
import type { StoryLine } from "@/lib/story";
import { getStoryLines } from "@/lib/story-store";
import { TAB_PRICE_SATS } from "@/lib/tab";

export function announceGraffitiTape(mark: GraffitiMark) {
  publishTape(tapeFromGraffiti(mark));
}

export function announceArcadeTape(grant: {
  paymentHash: string;
  alias: string;
  createdAt?: string;
}) {
  publishTape(
    tapeFromArcade({
      paymentHash: grant.paymentHash,
      alias: grant.alias,
      createdAt: grant.createdAt ?? new Date().toISOString(),
      sats: ARCADE_PRICE_SATS,
    }),
  );
}

export function announceTabTape(grant: {
  paymentHash: string;
  alias: string;
  createdAt?: string;
}) {
  publishTape(
    tapeFromTab({
      paymentHash: grant.paymentHash,
      alias: grant.alias,
      createdAt: grant.createdAt ?? new Date().toISOString(),
      sats: TAB_PRICE_SATS,
    }),
  );
}

export async function announceStoryTape(line: StoryLine) {
  let lineNo = 1;
  try {
    const lines = await getStoryLines();
    const index = lines.findIndex((item) => item.id === line.id);
    lineNo = index >= 0 ? index + 1 : Math.max(1, lines.length);
  } catch (error) {
    console.error("[tape] story line index failed", error);
  }
  publishTape(tapeFromStory(line, lineNo));
}

export function announceRadioTape(pull: BottlePull) {
  publishTape(
    tapeFromRadio({
      ...pull,
      sats: BOTTLE_PRICE_SATS,
    }),
  );
}
