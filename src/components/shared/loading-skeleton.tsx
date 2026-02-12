import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function KPIGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-card p-4">
          <Skeleton className="h-2.5 w-16 mb-3" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

export function HeroKPISkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-card p-6 pb-0">
          <Skeleton className="h-2.5 w-20 mb-2" />
          <Skeleton className="h-8 w-28 mb-4" />
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 320 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-6">
      <div className="flex items-center justify-between mb-5">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-1"><Skeleton className="h-6 w-14" /><Skeleton className="h-6 w-14" /><Skeleton className="h-6 w-14" /></div>
      </div>
      <Skeleton className="w-full" style={{ height }} />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 8 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-6">
      <Skeleton className="h-4 w-48 mb-4" />
      <div className="space-y-2">
        <div className="flex gap-4">{Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-3 flex-1" />)}</div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">{Array.from({ length: cols }).map((_, j) => <Skeleton key={j} className="h-6 flex-1" />)}</div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <HeroKPISkeleton />
      <KPIGridSkeleton count={12} />
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3"><ChartSkeleton /></div>
        <div className="xl:col-span-2"><ChartSkeleton height={400} /></div>
      </div>
      <TableSkeleton />
    </div>
  );
}
