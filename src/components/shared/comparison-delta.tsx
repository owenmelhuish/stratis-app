import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDeltaPercent } from '@/lib/format';

interface ComparisonDeltaProps {
  deltaPercent: number;
  higherIsBetter: boolean;
  className?: string;
}

export function ComparisonDelta({ deltaPercent, higherIsBetter, className }: ComparisonDeltaProps) {
  const isPositive = deltaPercent > 0;
  const isNegative = deltaPercent < 0;
  const isGood = higherIsBetter ? isPositive : isNegative;
  const isBad = higherIsBetter ? isNegative : isPositive;

  if (Math.abs(deltaPercent) < 0.1) {
    return <span className={cn("inline-flex items-center gap-0.5 text-xs text-muted-foreground", className)}><Minus className="h-3 w-3" /> 0%</span>;
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-medium",
      isGood && "text-emerald-400", isBad && "text-red-400",
      !isGood && !isBad && "text-muted-foreground", className
    )}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {formatDeltaPercent(deltaPercent)}
    </span>
  );
}
