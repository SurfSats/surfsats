import { COPY } from "@/lib/copy";
import { cn } from "@/lib/cn";

export function InvoiceHint({ className }: { className?: string }) {
  return (
    <p className={cn("invoice-hint", className)}>{COPY.invoiceHint}</p>
  );
}
