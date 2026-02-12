"use client";
import React from 'react';
import { KPIStatCard } from './kpi-stat-card';
import { KPI_CONFIGS, type KPIKey, type AggregatedKPIs } from '@/types';
import { useAppStore } from '@/lib/store';

interface KPIGridProps {
  kpis: KPIKey[];
  current: AggregatedKPIs;
  previous?: AggregatedKPIs;
  compact?: boolean;
}

export function KPIGrid({ kpis, current, previous, compact = false }: KPIGridProps) {
  const compareEnabled = useAppStore(s => s.compareEnabled);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {kpis.map((key) => {
        const config = KPI_CONFIGS.find(c => c.key === key);
        if (!config) return null;
        const value = current[key] as number;
        const prev = previous ? previous[key] as number : undefined;
        const delta = prev !== undefined ? value - prev : undefined;
        const deltaPercent = prev !== undefined && prev !== 0 ? ((value - prev) / prev) * 100 : undefined;

        return (
          <KPIStatCard
            key={key}
            config={config}
            value={value}
            previousValue={prev}
            delta={delta}
            deltaPercent={deltaPercent}
            compareEnabled={compareEnabled}
            compact={compact}
          />
        );
      })}
    </div>
  );
}
