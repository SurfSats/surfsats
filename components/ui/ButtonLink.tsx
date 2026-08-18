import Link from "next/link";
import { cn } from "@/lib/cn";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "ghost";
  className?: string;
};

export function ButtonLink({
  href,
  children,
  variant = "solid",
  className,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn("btn", variant === "ghost" && "btn-ghost", className)}
    >
      {children}
    </Link>
  );
}
