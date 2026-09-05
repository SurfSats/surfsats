import { ARCADE_PRICE_SATS } from "@/lib/arcade";
import { getArcadeRecentGrants } from "@/lib/arcade-store";
import { BOTTLE_PRICE_SATS } from "@/lib/bottle";
import { getRecentBottlePulls } from "@/lib/bottle-store";
import { getPaidMarks } from "@/lib/graffiti-store";
import {
  bufferedTape,
  mergeTapeEvents,
  mergeTapeWithFallback,
  tapeFromArcade,
  tapeFromGraffiti,
  tapeFromRadio,
  tapeFromStory,
  tapeFromTab,
  type TapeEvent,
} from "@/lib/settlement-tape";
import { getStoryLines } from "@/lib/story-store";
import { TAB_PRICE_SATS } from "@/lib/tab";
import { getTabRecentGrants } from "@/lib/tab-store";

async function safeList<T>(load: () => Promise<T[]>, label: string) {
  try {
    return await load();
  } catch (error) {
    console.error(`[tape] ${label} history failed`, error);
    return [];
  }
}

export async function collectRecentTape(): Promise<TapeEvent[]> {
  const [marks, arcadeGrants, tabGrants, storyLines, pulls] = await Promise.all([
    safeList(() => getPaidMarks(), "graffiti"),
    safeList(() => getArcadeRecentGrants(12), "arcade"),
    safeList(() => getTabRecentGrants(12), "tab"),
    safeList(() => getStoryLines(), "story"),
    safeList(() => getRecentBottlePulls(12), "radio"),
  ]);

  const graffiti = marks.map(tapeFromGraffiti);
  const arcade = arcadeGrants.map((grant) =>
    tapeFromArcade({ ...grant, sats: ARCADE_PRICE_SATS }),
  );
  const tab = tabGrants.map((grant) =>
    tapeFromTab({ ...grant, sats: TAB_PRICE_SATS }),
  );
  const story = storyLines
    .map((line, index) =>
      line.paymentHash ? tapeFromStory(line, index + 1) : null,
    )
    .filter((event): event is TapeEvent => Boolean(event));
  const radio = pulls.map((pull) =>
    tapeFromRadio({ ...pull, sats: BOTTLE_PRICE_SATS }),
  );

  return mergeTapeEvents([], [
    ...graffiti,
    ...arcade,
    ...tab,
    ...story,
    ...radio,
  ]);
}

export async function tapeHistory(): Promise<TapeEvent[]> {
  return mergeTapeWithFallback(bufferedTape(), await collectRecentTape());
}
