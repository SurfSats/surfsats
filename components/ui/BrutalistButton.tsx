import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import {
  BRUTALIST_BUTTON_SIZE_CLASS,
  BRUTALIST_BUTTON_VARIANT_CLASS,
  type BrutalistButtonSize,
  type BrutalistButtonVariant,
} from "@/lib/brutalist-ui";

type BrutalistButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BrutalistButtonVariant;
  size?: BrutalistButtonSize;
};

export function BrutalistButton({
  variant = "primary",
  size = "md",
  children,
  className,
  disabled,
  type = "button",
  ...props
}: BrutalistButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center border font-mono font-bold tracking-telemetry uppercase transition-all duration-75 active:translate-x-px active:translate-y-px disabled:pointer-events-none disabled:opacity-30",
        BRUTALIST_BUTTON_SIZE_CLASS[size],
        BRUTALIST_BUTTON_VARIANT_CLASS[variant],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
