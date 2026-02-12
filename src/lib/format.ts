import type { DateRange } from '@/types';

export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  if (Math.abs(value) >= 100) {
    return `$${Math.round(value).toLocaleString()}`;
  }
  return `$${value.toFixed(2)}`;
}

export function formatNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return Math.round(value).toLocaleString();
}

export function formatPercent(value: number): string {
  if (Math.abs(value) < 0.01) return '0%';
  if (Math.abs(value) < 1) return `${value.toFixed(2)}%`;
  return `${value.toFixed(1)}%`;
}

export function formatDecimal(value: number): string {
  return `${value.toFixed(2)}x`;
}

export function formatIndex(value: number): string {
  return `${Math.round(value)}/100`;
}

export function formatKPIValue(value: number, format: 'currency' | 'number' | 'percent' | 'decimal' | 'index'): string {
  switch (format) {
    case 'currency': return formatCurrency(value);
    case 'number': return formatNumber(value);
    case 'percent': return formatPercent(value);
    case 'decimal': return formatDecimal(value);
    case 'index': return formatIndex(value);
  }
}

export function formatDelta(delta: number, format: 'currency' | 'number' | 'percent' | 'decimal' | 'index'): string {
  const prefix = delta > 0 ? '+' : '';
  return `${prefix}${formatKPIValue(delta, format)}`;
}

export function formatDeltaPercent(deltaPercent: number): string {
  const prefix = deltaPercent > 0 ? '+' : '';
  return `${prefix}${deltaPercent.toFixed(1)}%`;
}

export function getDateRangeLabel(range: DateRange): string {
  switch (range.preset) {
    case '7d': return 'Last 7 Days';
    case '14d': return 'Last 14 Days';
    case '30d': return 'Last 30 Days';
    case '90d': return 'Last 90 Days';
    case 'ytd': return 'Year to Date';
    case 'custom': {
      const s = new Date(range.start);
      const e = new Date(range.end);
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${fmt(s)} – ${fmt(e)}, ${e.getFullYear()}`;
    }
  }
}
