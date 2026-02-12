"use client";
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { formatKPIValue, formatDeltaPercent } from '@/lib/format';
import type { KPIConfig } from '@/types';

interface HeroKPICardProps {
  config: KPIConfig;
  value: number;
  delta?: number;
  deltaPercent?: number;
  sparklineData: Array<{ value: number }>;
  accentColor: string;
}

export function HeroKPICard({ config, value, delta, deltaPercent, sparklineData, accentColor }: HeroKPICardProps) {
  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;
  const isGood = config.higherIsBetter ? isPositive : isNegative;
  const isBad = config.higherIsBetter ? isNegative : isPositive;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 pb-0">
      {/* Header row */}
      <div className="flex items-start justify-between mb-1">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
          {config.label}
        </span>
      </div>

      {/* Value row */}
      <div className="flex items-baseline gap-2.5">
        <span className="text-[32px] font-bold tracking-tight leading-none">
          {formatKPIValue(value, config.format)}
        </span>
        {deltaPercent !== undefined && delta !== undefined && (
          <span
            className={cn(
              "text-xs font-semibold",
              isGood && "text-emerald-400",
              isBad && "text-red-400",
              !isGood && !isBad && "text-muted-foreground"
            )}
          >
            {formatDeltaPercent(deltaPercent)}
          </span>
        )}
      </div>

      {/* Area chart sparkline */}
      {sparklineData.length > 0 && (
        <div className="mt-4 -mx-6 -mb-[1px]">
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={sparklineData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`hero-fill-${config.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
              <XAxis dataKey="value" hide />
              <Area
                type="monotone"
                dataKey="value"
                stroke={accentColor}
                strokeWidth={1.5}
                fill={`url(#hero-fill-${config.key})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
