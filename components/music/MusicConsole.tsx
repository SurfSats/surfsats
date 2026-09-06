"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LiveStream } from "@/components/jukebox/LiveStream";
import { WavlakeV4VStrip } from "@/components/radio/WavlakeV4VStrip";
import { ConsoleShell } from "@/components/layout/ConsoleShell";
import { RadioDeck } from "@/components/music/RadioDeck";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { JUKEBOX_LIVE_URL, JUKEBOX_PRICE_SATS } from "@/lib/jukebox";
import {
  RADIO_NAV,
  RADIO_TAB_CHROME,
  isRadioTab,
  type RadioTabId,
} from "@/lib/music";

const DEFAULT_TAB: RadioTabId = "jukebox";

function resolveTab(raw: string | null | undefined): RadioTabId {
  if (raw && isRadioTab(raw)) return raw;
  return DEFAULT_TAB;
}

export function MusicConsole() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<RadioTabId>(() =>
    resolveTab(searchParams.get("tab")),
  );

  useEffect(() => {
    const fromQuery = searchParams.get("tab");
    if (fromQuery && isRadioTab(fromQuery)) {
      setTab(fromQuery);
      return;
    }
    const hash = window.location.hash.replace(/^#/, "");
    if (isRadioTab(hash)) {
      setTab(hash);
      router.replace(`${pathname}?tab=${hash}`, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  function onTab(id: string) {
    if (!isRadioTab(id)) return;
    setTab(id);
    router.replace(`${pathname}?tab=${id}`, { scroll: false });
  }

  return (
    <ConsoleShell
      name="music"
      className="music-page"
      deckLabel="Dial"
      strip={
        <p>
          surf radio · {JUKEBOX_PRICE_SATS} sats · pirate ship · international
          waters
        </p>
      }
      stage={
        <>
          <div className="music-stage-art" aria-hidden="true">
            <Image
              src="/jukebox-ship.png"
              alt=""
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 65vw"
              className="object-cover object-[center_38%]"
            />
            <div className="music-stage-veil" />
          </div>
          <div className="music-stage-fore">
            <p className="music-stage-kicker">
              located on a pirate ship sailing in international waters
            </p>
            <LiveStream />
            <div className="mt-4">
              <WavlakeV4VStrip />
            </div>
          </div>
        </>
      }
      tabs={RADIO_NAV.map((item) => ({
        id: item.id,
        label: RADIO_TAB_CHROME[item.id].label,
        ariaLabel: RADIO_TAB_CHROME[item.id].ariaLabel,
      }))}
      tab={tab}
      onTab={onTab}
      footer={
        tab === "jukebox" ? (
          <ButtonLink
            href={JUKEBOX_LIVE_URL}
            external
            className="btn-pulse w-full px-5 py-3 text-sm"
          >
            REQUEST ON THE SHIP
          </ButtonLink>
        ) : null
      }
    >
      <RadioDeck tab={tab} />
    </ConsoleShell>
  );
}
