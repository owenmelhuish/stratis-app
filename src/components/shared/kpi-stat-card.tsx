"use client";
import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKPIValue, formatDeltaPercent } from '@/lib/format';
import type { KPIConfig } from '@/types';

interface KPIStatCardProps {
  config: KPIConfig;
  value: number;
  previousValue?: number;
  delta?: number;
  deltaPercent?: number;
  compareEnabled?: boolean;
  compact?: boolean;
}

export function KPIStatCard({ config, value, previousValue, delta, deltaPercent, compareEnabled = false, compact = false }: KPIStatCardProps) {
  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;
  const isGood = config.higherIsBetter ? isPositive : isNegative;
  const isBad = config.higherIsBetter ? isNegative : isPositive;

  return (
    <div className={cn(
      "rounded-xl border border-border/40 bg-card p-4 transition-colors hover:border-border/60",
      compact && "p-3"
    )}>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
        {config.label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className={cn("font-bold tracking-tight", compact ? "text-lg" : "text-xl")}>
          {formatKPIValue(value, config.format)}
        </span>
        {compareEnabled && deltaPercent !== undefined && delta !== undefined && (
          <span
            className={cn(
              "text-[11px] font-semibold",
              isGood && "text-emerald-400",
              isBad && "text-red-400",
              !isGood && !isBad && "text-muted-foreground"
            )}
          >
            {formatDeltaPercent(deltaPercent)}
          </span>
        )}
      </div>
      {compareEnabled && previousValue !== undefined && (
        <div className="text-[10px] text-muted-foreground/60 mt-1">
          vs {formatKPIValue(previousValue, config.format)} prev
        </div>
      )}
    </div>
  );
}
