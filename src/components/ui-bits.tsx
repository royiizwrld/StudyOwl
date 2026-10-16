import { cn } from "@/lib/utils";
import { PRIORITY_LABEL, type Priority } from "@/lib/types";
import type { ReactNode } from "react";

export function PriorityBadge({ p }: { p: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        p === "high" && "bg-warm/15 text-warm",
        p === "medium" && "bg-secondary text-secondary-foreground",
        p === "low" && "bg-muted text-muted-foreground",
      )}
    >
      {PRIORITY_LABEL[p]}
    </span>
  );
}

export function SubjectDot({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ backgroundColor: color }} />;
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </div>
  );
}

export function Ring({
  value,
  size = 140,
  stroke = 10,
  children,
  trackClass = "stroke-muted",
  barClass = "stroke-primary",
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  trackClass?: string;
  barClass?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClass} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className={cn(barClass, "transition-[stroke-dashoffset] duration-500")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card-surface flex flex-col items-center gap-2 p-10 text-center">
      <p className="font-display font-semibold">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
