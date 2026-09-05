export const TERMINAL_CARD_STATUS_CLASS = {
  idle: "bg-zinc-raw text-salt",
  active: "bg-violet text-salt",
  warning: "bg-amber text-void",
  live: "bg-terminal-green text-void animate-pulse",
} as const;

export type TerminalCardStatus = keyof typeof TERMINAL_CARD_STATUS_CLASS;

export const BRUTALIST_BUTTON_SIZE_CLASS = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3 text-base tracking-wider",
} as const;

export type BrutalistButtonSize = keyof typeof BRUTALIST_BUTTON_SIZE_CLASS;

export const BRUTALIST_BUTTON_VARIANT_CLASS = {
  primary:
    "bg-violet text-salt border-violet hover:bg-void hover:text-violet active:bg-violet active:text-salt",
  secondary:
    "bg-void text-salt border-zinc-raw hover:border-salt hover:bg-zinc-raw/20",
  amber:
    "bg-amber text-void border-amber hover:bg-void hover:text-amber active:bg-amber active:text-void",
  ghost:
    "bg-transparent text-salt border-transparent hover:border-zinc-raw hover:bg-void",
  danger:
    "bg-void text-red-500 border-red-500 hover:bg-red-500 hover:text-salt",
} as const;

export type BrutalistButtonVariant = keyof typeof BRUTALIST_BUTTON_VARIANT_CLASS;

export const HEX_STREAM_DEFAULT_TAG = "HEX_FLOW // 44.1KHZ";

export function randomHexSnippet(random: () => number = Math.random): string {
  const hex = Array.from({ length: 8 }, () =>
    Math.floor(random() * 16).toString(16).toUpperCase(),
  ).join("");
  return `0x${hex}`;
}
