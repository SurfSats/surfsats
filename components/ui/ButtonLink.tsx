import Link from "next/link";
import { cn } from "@/lib/cn";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "ghost";
  className?: string;
  external?: boolean;
};

export function ButtonLink({
  href,
  children,
  variant = "solid",
  className,
  external = false,
}: ButtonLinkProps) {
  const classes = cn("btn", variant === "ghost" && "btn-ghost", className);

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
