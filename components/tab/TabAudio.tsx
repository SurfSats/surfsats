"use client";

import { useEffect, useRef, useState } from "react";

export function TabAudio({ src, nodeId }: { src?: string; nodeId: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setFailed(false);
    setPlaying(false);
    const el = ref.current;
    if (!el || !src) return;
    el.pause();
    el.currentTime = 0;
    const run = el.play();
    if (run && typeof run.then === "function") {
      void run
        .then(() => setPlaying(true))
        .catch(() => {
          setFailed(true);
          setPlaying(false);
        });
    }
  }, [src, nodeId]);

  if (!src || failed) return null;

  return (
    <div className="tab-audio">
      <audio
        ref={ref}
        src={src}
        preload="auto"
        muted={muted}
        onError={() => {
          setFailed(true);
          setPlaying(false);
        }}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        className="tab-audio-btn"
        onClick={() => setMuted((value) => !value)}
      >
        {muted ? "UNMUTE" : "MUTE"}
      </button>
      <button
        type="button"
        className="tab-audio-btn"
        onClick={() => {
          const el = ref.current;
          if (!el) return;
          el.pause();
          setPlaying(false);
        }}
        disabled={!playing}
      >
        SKIP
      </button>
    </div>
  );
}
