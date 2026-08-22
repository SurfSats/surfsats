import Image from "next/image";

export function Watermark() {
  return (
    <div className="site-watermark" aria-hidden="true">
      {/* Exact Satoshi Smiley asset — do not replace with a redraw. */}
      <Image
        src="/satoshi-smiley-bg.png"
        alt=""
        width={1255}
        height={1216}
        className="site-watermark-mark"
        priority
        unoptimized
      />
    </div>
  );
}
