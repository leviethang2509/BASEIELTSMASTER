import { BookOpenCheck } from "lucide-react";

import { cn } from "@/lib/utils";

interface BrandMarkProps {
  compact?: boolean;
  className?: string;
}

export function BrandMark({ compact = false, className }: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <BookOpenCheck className="size-5" />
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold tracking-wide">
            IELTS MASTER
          </p>
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Training Ops
          </p>
        </div>
      )}
    </div>
  );
}
