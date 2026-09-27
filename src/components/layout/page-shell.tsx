import React from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  primaryAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageShell({
  title,
  subtitle,
  primaryAction,
  children,
  className,
}: PageShellProps) {
  return (
    <div className={cn("container mx-auto px-4 py-6 max-w-5xl space-y-6", className)}>
      {(title || primaryAction) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            {title && <h1 className="text-2xl font-semibold text-foreground tracking-tight">{title}</h1>}
            {subtitle && <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>}
          </div>
          {primaryAction && <div className="shrink-0">{primaryAction}</div>}
        </div>
      )}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}
