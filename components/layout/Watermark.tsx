import Image from "next/image";

export function Watermark() {
  return (
    <div className="site-watermark" aria-hidden="true">
      {/* Exact Satoshi Smiley asset — do not replace with a redraw. */}
      <Image
        src="/satoshi-smiley.png"
        alt=""
        width={2000}
        height={2000}
        className="site-watermark-mark"
        priority
        unoptimized
      />
    </div>
  );
}
