import type { ReactNode } from "react";
import {
  Black_Ops_One,
  Creepster,
  Permanent_Marker,
  Plaster,
  Reenie_Beanie,
  Rock_Salt,
  Rubik_Spray_Paint,
  VT323,
} from "next/font/google";

const grafTag = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graf-tag",
});

const grafThrow = Rubik_Spray_Paint({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graf-throw",
});

const grafBlock = Black_Ops_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graf-block",
});

const grafStencil = Plaster({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graf-stencil",
});

const grafDrip = Creepster({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graf-drip",
});

const grafWild = Rock_Salt({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graf-wild",
});

const grafFat = Reenie_Beanie({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graf-fat",
});

const grafChrome = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-graf-chrome",
});

export default function GraffitiLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${grafTag.variable} ${grafThrow.variable} ${grafBlock.variable} ${grafStencil.variable} ${grafDrip.variable} ${grafWild.variable} ${grafFat.variable} ${grafChrome.variable}`}
    >
      {children}
    </div>
  );
}
