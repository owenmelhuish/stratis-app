"use client";
import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Pin,
  Maximize2,
  MoreHorizontal,
} from "lucide-react";
import {
  KPI_CONFIGS,
  CHANNEL_LABELS,
  CHANNEL_COLORS,
  type KPIKey,
  type ChannelId,
  type AggregatedKPIs,
  type Campaign,
} from "@/types";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDecimal,
  formatKPIValue,
} from "@/lib/format";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BentoKPIGridProps {
  data: {
    currentKPIs: AggregatedKPIs;
    previousKPIs: AggregatedKPIs | null;
    timeSeries: Array<Record<string, number | string>>;
    channelData: Record<string, AggregatedKPIs>;
    campaignData: Array<{
      campaign: Campaign;
      kpis: AggregatedKPIs;
      previousKpis?: AggregatedKPIs;
    }>;
  };
  compareEnabled: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const METRIC_COLORS: Record<string, string> = {
  spend: "#e07060",
  impressions: "#50b89a",
  clicks: "#50b89a",
  conversions: "#50b89a",
  revenue: "#50b89a",
  roas: "#50b89a",
  reach: "#50b89a",
  cpc: "#e07060",
  cpm: "#e07060",
  cpa: "#e07060",
  frequency: "#8b7ec8",
  videoViews3s: "#50b89a",
  videoCompletionRate: "#50b89a",
  engagementRate: "#8b7ec8",
  budgetPacing: "#50b89a",
};

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(20, 24, 28, 0.95)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  fontSize: "12px",
  color: "#e0e0e0",
  padding: "10px 14px",
  backdropFilter: "blur(12px)",
};

const CHANNEL_IDS: ChannelId[] = [
  "instagram",
  "facebook",
  "tiktok",
  "google-search",
  "ttd",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getKPIConfig(key: KPIKey) {
  return KPI_CONFIGS.find((c) => c.key === key);
}

function getDelta(
  current: number,
  previous: number | undefined
): { delta: number; percent: number } | null {
  if (previous === undefined || previous === 0) return null;
  const delta = current - previous;
  return { delta, percent: (delta / previous) * 100 };
}

function formatAbbrevDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function shortChannelName(ch: ChannelId): string {
  return CHANNEL_LABELS[ch]
    .replace("Google Search", "Google")
    .replace("The Trade Desk", "TTD");
}

// ─── Card Wrapper ────────────────────────────────────────────────────────────

function BentoCard({
  kpiKey,
  value,
  deltaInfo,
  compareEnabled,
  colSpan = 1,
  children,
  className,
}: {
  kpiKey: KPIKey;
  value: number;
  deltaInfo: { delta: number; percent: number } | null;
  compareEnabled: boolean;
  colSpan?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const config = getKPIConfig(kpiKey);
  if (!config) return null;
  const formattedValue = formatKPIValue(value, config.format);
  const isPositive = deltaInfo ? deltaInfo.delta > 0 : null;
  const isBetter = deltaInfo
    ? config.higherIsBetter
      ? deltaInfo.delta > 0
      : deltaInfo.delta < 0
    : null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/40 bg-card p-5 flex flex-col min-w-0",
        colSpan === 2 && "col-span-2",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.12em]">
            {config.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold truncate">{formattedValue}</span>
            {compareEnabled && deltaInfo && (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-xs font-medium",
                  isBetter ? "text-emerald-400" : "text-red-400"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {deltaInfo.percent > 0 ? "+" : ""}
                {deltaInfo.percent.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button className="p-1 rounded hover:bg-muted/50 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
            <Pin className="h-3 w-3" />
          </button>
          <button className="p-1 rounded hover:bg-muted/50 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
            <Maximize2 className="h-3 w-3" />
          </button>
          <button className="p-1 rounded hover:bg-muted/50 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </div>
      </div>
      {/* Visualization */}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

// ─── A. Area/Line Mini Chart ─────────────────────────────────────────────────

function AreaMiniChart({
  data,
  metricKey,
}: {
  data: Array<Record<string, number | string>>;
  metricKey: string;
}) {
  const color = METRIC_COLORS[metricKey] || "#50b89a";
  const gradientId = `bento-area-${metricKey}`;

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart
        data={data}
        margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="4 4"
          stroke="rgba(255,255,255,0.04)"
          horizontal
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
          tickFormatter={formatAbbrevDate}
          interval="preserveStartEnd"
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(v) =>
            new Date(v).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          }
          formatter={(value) => {
            const config = getKPIConfig(metricKey as KPIKey);
            return [
              config
                ? formatKPIValue(value as number, config.format)
                : String(value),
              config?.label || metricKey,
            ];
          }}
          cursor={{ stroke: "rgba(255,255,255,0.08)", strokeDasharray: "4 4" }}
        />
        <Area
          type="monotone"
          dataKey={metricKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── B. Vertical Bar Chart ───────────────────────────────────────────────────

function BarMiniChart({
  data,
  metricKey,
}: {
  data: Array<Record<string, number | string>>;
  metricKey: string;
}) {
  const color = METRIC_COLORS[metricKey] || "#50b89a";

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="4 4"
          stroke="rgba(255,255,255,0.04)"
          horizontal
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
          tickFormatter={formatAbbrevDate}
          interval="preserveStartEnd"
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
          tickFormatter={(v) => formatNumber(v)}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(v) =>
            new Date(v).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          }
          formatter={(value) => {
            const config = getKPIConfig(metricKey as KPIKey);
            return [
              config
                ? formatKPIValue(value as number, config.format)
                : String(value),
              config?.label || metricKey,
            ];
          }}
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
        />
        <Bar
          dataKey={metricKey}
          fill={color}
          radius={[3, 3, 0, 0]}
          maxBarSize={12}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── C. Donut with Side Legend (like "Viewers Age") ─────────────────────────

function DonutWithSideLegend({
  channelData,
  metricKey,
}: {
  channelData: Record<string, AggregatedKPIs>;
  metricKey: KPIKey;
}) {
  const config = getKPIConfig(metricKey);
  const entries = CHANNEL_IDS.filter(
    (ch) => channelData[ch] && (channelData[ch][metricKey] as number) > 0
  ).map((ch) => ({
    name: shortChannelName(ch),
    value: channelData[ch][metricKey] as number,
    color: CHANNEL_COLORS[ch],
  }));

  const total = entries.reduce((sum, e) => sum + e.value, 0);
  const top =
    entries.length > 0
      ? [...entries].sort((a, b) => b.value - a.value)[0]
      : null;
  const topPct =
    top && total > 0 ? ((top.value / total) * 100).toFixed(0) : "0";

  return (
    <div className="flex items-center gap-3">
      {/* Donut */}
      <div className="relative shrink-0" style={{ width: 100, height: 100 }}>
        <ResponsiveContainer width={100} height={100}>
          <PieChart>
            <Pie
              data={entries}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={44}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {entries.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-sm font-bold">{topPct}%</span>
          <span className="text-[8px] text-muted-foreground leading-tight text-center">
            {top?.name}
          </span>
        </div>
      </div>
      {/* Side legend */}
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        {entries.map((e) => {
          const pct =
            total > 0 ? ((e.value / total) * 100).toFixed(0) : "0";
          return (
            <div key={e.name} className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: e.color }}
              />
              <span className="text-[10px] text-muted-foreground truncate flex-1">
                {e.name}
              </span>
              <span className="text-[10px] font-semibold tabular-nums shrink-0">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── D. Channel Scatter Plot (like "Streaming Platform Engagement") ─────────

function ChannelScatterPlot({
  channelData,
  campaignData,
  metricKey,
}: {
  channelData: Record<string, AggregatedKPIs>;
  campaignData: Array<{ campaign: Campaign; kpis: AggregatedKPIs }>;
  metricKey: KPIKey;
}) {
  // Generate scatter dots: campaign × channel
  const dots: Array<{
    x: number;
    y: number;
    color: string;
    channel: string;
  }> = [];

  const allChannelVals = CHANNEL_IDS.filter((ch) => channelData[ch]).map(
    (ch) => channelData[ch][metricKey] as number
  );
  const globalMax = Math.max(...allChannelVals, 1);

  campaignData.forEach((cd, ci) => {
    cd.campaign.channels.forEach((ch, chIdx) => {
      const chVal = channelData[ch]
        ? (channelData[ch][metricKey] as number)
        : 0;
      // Deterministic jitter from indices
      const seed1 = ((ci * 7 + chIdx * 13 + 5) * 2654435761) >>> 0;
      const seed2 = ((ci * 11 + chIdx * 3 + 7) * 2654435761) >>> 0;
      const jx = ((seed1 % 1000) / 1000 - 0.5) * 14;
      const jy = ((seed2 % 1000) / 1000 - 0.5) * 12;

      const baseX =
        8 +
        (ci / Math.max(campaignData.length - 1, 1)) * 84;
      const baseY = globalMax > 0 ? (chVal / globalMax) * 70 + 10 : 50;

      dots.push({
        x: Math.max(4, Math.min(96, baseX + jx)),
        y: Math.max(4, Math.min(96, baseY + jy)),
        color: CHANNEL_COLORS[ch] || "#888",
        channel: shortChannelName(ch),
      });
    });
  });

  return (
    <div>
      <svg viewBox="0 0 100 100" className="w-full" style={{ height: 130 }}>
        {/* Grid lines */}
        <line
          x1="5"
          y1="15"
          x2="95"
          y2="15"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.3"
        />
        <line
          x1="5"
          y1="50"
          x2="95"
          y2="50"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.3"
        />
        <line
          x1="5"
          y1="85"
          x2="95"
          y2="85"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.3"
        />
        {/* Y labels */}
        <text
          x="2"
          y="17"
          fill="rgba(255,255,255,0.2)"
          fontSize="3"
          fontFamily="sans-serif"
        >
          100%
        </text>
        <text
          x="2"
          y="52"
          fill="rgba(255,255,255,0.2)"
          fontSize="3"
          fontFamily="sans-serif"
        >
          50%
        </text>
        <text
          x="2"
          y="87"
          fill="rgba(255,255,255,0.2)"
          fontSize="3"
          fontFamily="sans-serif"
        >
          0%
        </text>
        {/* Dots */}
        {dots.map((dot, i) => (
          <rect
            key={i}
            x={dot.x - 1.3}
            y={100 - dot.y - 1.3}
            width={2.6}
            height={2.6}
            rx={0.5}
            fill={dot.color}
            opacity={0.75}
          />
        ))}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 justify-center">
        {CHANNEL_IDS.filter((ch) => channelData[ch]).map((ch) => (
          <div key={ch} className="flex items-center gap-1">
            <span
              className="w-1.5 h-1.5 rounded-sm"
              style={{ backgroundColor: CHANNEL_COLORS[ch] }}
            />
            <span className="text-[8px] text-muted-foreground">
              {shortChannelName(ch)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── E. Campaign Delta Bars (like "Viewer Interest Per Age Group") ──────────

function CampaignDeltaBars({
  campaignData,
  metricKey,
}: {
  campaignData: Array<{
    campaign: Campaign;
    kpis: AggregatedKPIs;
    previousKpis?: AggregatedKPIs;
  }>;
  metricKey: KPIKey;
}) {
  const config = getKPIConfig(metricKey);
  const sorted = [...campaignData]
    .sort(
      (a, b) => (b.kpis[metricKey] as number) - (a.kpis[metricKey] as number)
    )
    .slice(0, 6);
  const maxVal =
    sorted.length > 0
      ? Math.max(...sorted.map((s) => s.kpis[metricKey] as number))
      : 1;

  return (
    <div className="flex items-end gap-1.5" style={{ height: 150 }}>
      {sorted.map((item, i) => {
        const val = item.kpis[metricKey] as number;
        const prevVal = item.previousKpis
          ? (item.previousKpis[metricKey] as number)
          : 0;
        const barPct = maxVal > 0 ? (val / maxVal) * 100 : 0;
        const deltaP =
          prevVal > 0 ? ((val - prevVal) / prevVal) * 100 : 0;
        const words = item.campaign.name.split(" ");
        const shortName =
          words.length > 2 ? words.slice(0, 2).join(" ") : item.campaign.name;
        const barH = Math.max(barPct * 0.9, 8);

        return (
          <div
            key={item.campaign.id}
            className="flex-1 flex flex-col items-center min-w-0"
            style={{ height: "100%" }}
          >
            {/* Delta label */}
            <span
              className={cn(
                "text-[9px] font-semibold tabular-nums mb-1 h-3",
                deltaP > 0
                  ? "text-emerald-400"
                  : deltaP < 0
                    ? "text-red-400"
                    : "text-transparent"
              )}
            >
              {deltaP > 0 ? "+" : ""}
              {deltaP !== 0 ? `${deltaP.toFixed(0)}%` : "·"}
            </span>
            {/* Bar area */}
            <div className="flex-1 w-full flex items-end justify-center">
              <div
                className="rounded-t-sm"
                style={{
                  width: "70%",
                  height: `${barH}%`,
                  backgroundColor: `rgba(80, 184, 154, ${0.7 - i * 0.07})`,
                }}
              />
            </div>
            {/* Value */}
            <span className="text-[9px] font-semibold tabular-nums mt-1">
              {config
                ? formatKPIValue(val, config.format)
                : formatNumber(val)}
            </span>
            {/* Label */}
            <span className="text-[7px] text-muted-foreground text-center leading-tight w-full truncate">
              {shortName}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── F. Channel Trending Scale (like "Stream Platform Interest") ────────────

function ChannelTrendingScale({
  channelData,
  timeSeries,
  metricKey,
}: {
  channelData: Record<string, AggregatedKPIs>;
  timeSeries: Array<Record<string, number | string>>;
  metricKey: KPIKey;
}) {
  const config = getKPIConfig(metricKey);
  const total = CHANNEL_IDS.filter((ch) => channelData[ch]).reduce(
    (sum, ch) => sum + (channelData[ch][metricKey] as number),
    0
  );

  const entries = CHANNEL_IDS.filter((ch) => channelData[ch]).map((ch) => {
    const share =
      total > 0 ? (channelData[ch][metricKey] as number) / total : 0.2;
    const values = timeSeries.map(
      (d) => (d[metricKey] as number) * share
    );
    const third = Math.max(1, Math.floor(values.length / 3));
    const early =
      values.slice(0, third).reduce((s, v) => s + v, 0) / third;
    const late =
      values.slice(-third).reduce((s, v) => s + v, 0) / third;
    const trendScore = early > 0 ? (late - early) / early : 0;

    return {
      id: ch,
      label: shortChannelName(ch),
      color: CHANNEL_COLORS[ch],
      value: channelData[ch][metricKey] as number,
      trendScore: Math.max(-1, Math.min(1, trendScore)),
      sparkline: values,
    };
  });

  return (
    <div className="space-y-3">
      {/* Fading / Trending scale */}
      <div className="relative">
        <div className="flex justify-between text-[9px] text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <span className="w-px h-2.5 bg-muted-foreground/30 inline-block" />
            fading
          </span>
          <span className="flex items-center gap-1">
            trending
            <span className="w-px h-2.5 bg-muted-foreground/30 inline-block" />
          </span>
        </div>
        <div className="h-1 bg-white/[0.04] rounded-full relative">
          {entries.map((entry) => {
            const pos = ((entry.trendScore + 1) / 2) * 100;
            return (
              <div
                key={entry.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${Math.max(4, Math.min(96, pos))}%` }}
              >
                <div
                  className="w-3 h-3 rounded-full border-2 border-background shadow-sm"
                  style={{ backgroundColor: entry.color }}
                />
              </div>
            );
          })}
        </div>
      </div>
      {/* Channel rows with sparklines */}
      <div className="space-y-1.5">
        {entries.map((entry) => {
          const vals = entry.sparkline;
          const maxV = Math.max(...vals, 1);
          const minV = Math.min(...vals, 0);
          const range = maxV - minV || 1;
          const w = 44;
          const h = 14;
          const points = vals
            .map((v, i) => {
              const x =
                vals.length > 1
                  ? (i / (vals.length - 1)) * w
                  : w / 2;
              const y = h - ((v - minV) / range) * h;
              return `${x},${y}`;
            })
            .join(" ");

          return (
            <div key={entry.id} className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[9px] font-medium w-11 truncate shrink-0">
                {entry.label}
              </span>
              <svg
                width={w}
                height={h}
                className="shrink-0 opacity-50"
              >
                <polyline
                  points={points}
                  fill="none"
                  stroke={entry.color}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[9px] font-semibold tabular-nums ml-auto shrink-0">
                {config
                  ? formatKPIValue(entry.value, config.format)
                  : String(Math.round(entry.value))}
              </span>
              <span
                className={cn(
                  "text-[8px] font-semibold shrink-0 w-8 text-right",
                  entry.trendScore > 0.02
                    ? "text-emerald-400"
                    : entry.trendScore < -0.02
                      ? "text-red-400"
                      : "text-muted-foreground"
                )}
              >
                {entry.trendScore > 0.02
                  ? `+${(entry.trendScore * 100).toFixed(0)}%`
                  : entry.trendScore < -0.02
                    ? `${(entry.trendScore * 100).toFixed(0)}%`
                    : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── G. Dual Metric Barcode Card (like "Viewers" – two big numbers) ─────────

function DualMetricBentoCard({
  metric1Key,
  metric1Value,
  metric1Label,
  metric2Key,
  metric2Value,
  metric2Label,
  timeSeries,
}: {
  metric1Key: KPIKey;
  metric1Value: number;
  metric1Label: string;
  metric2Key: KPIKey;
  metric2Value: number;
  metric2Label: string;
  timeSeries: Array<Record<string, number | string>>;
}) {
  const config1 = getKPIConfig(metric1Key);
  const config2 = getKPIConfig(metric2Key);

  const values1 = timeSeries.map((d) => d[metric1Key] as number);
  const values2 = timeSeries.map((d) => d[metric2Key] as number);
  // Normalize both to the same scale so bars are comparable
  const globalMax = Math.max(...values1, ...values2, 1);
  const barCount = timeSeries.length;

  return (
    <div className="col-span-2 rounded-xl border border-border/40 bg-card p-5 flex flex-col min-w-0">
      {/* Header with two metrics */}
      <div className="flex items-start gap-8 mb-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xl font-bold">
            {config1
              ? formatKPIValue(metric1Value, config1.format)
              : formatNumber(metric1Value)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {metric1Label}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xl font-bold text-muted-foreground">
            {config2
              ? formatKPIValue(metric2Value, config2.format)
              : formatNumber(metric2Value)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {metric2Label}
          </span>
        </div>
        <div className="flex items-center gap-1 ml-auto shrink-0">
          <button className="p-1 rounded hover:bg-muted/50 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
            <Pin className="h-3 w-3" />
          </button>
          <button className="p-1 rounded hover:bg-muted/50 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      {/* Paired vertical bars */}
      <div className="flex-1 min-h-0 flex items-end gap-px" style={{ height: 110 }}>
        {timeSeries.map((_d, i) => {
          const h1 = (values1[i] / globalMax) * 100;
          const h2 = (values2[i] / globalMax) * 100;
          return (
            <div
              key={i}
              className="flex-1 flex items-end gap-px"
              style={{ height: "100%" }}
            >
              {/* Metric 1 bar (Impressions – teal) */}
              <div
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${Math.max(h1, 2)}%`,
                  backgroundColor: "rgba(80, 184, 154, 0.7)",
                }}
              />
              {/* Metric 2 bar (Reach – white/grey) */}
              <div
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${Math.max(h2, 2)}%`,
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                }}
              />
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-5 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-[#50b89a]/70" />
          <span className="text-[10px] text-muted-foreground">
            {metric1Label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-white/[0.12]" />
          <span className="text-[10px] text-muted-foreground">
            {metric2Label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── H. Channel Horizontal Bars (like "Viewer Languages") ───────────────────

function ChannelHorizontalBars({
  channelData,
  metricKey,
}: {
  channelData: Record<string, AggregatedKPIs>;
  metricKey: KPIKey;
}) {
  const config = getKPIConfig(metricKey);
  const entries = CHANNEL_IDS.filter(
    (ch) => channelData[ch] && (channelData[ch][metricKey] as number) > 0
  ).map((ch) => ({
    id: ch,
    label: CHANNEL_LABELS[ch],
    value: channelData[ch][metricKey] as number,
    color: CHANNEL_COLORS[ch],
  }));

  const total = entries.reduce((sum, e) => sum + e.value, 0);
  const maxVal =
    entries.length > 0 ? Math.max(...entries.map((e) => e.value)) : 1;

  return (
    <div className="space-y-2.5">
      {entries.map((entry) => {
        const pct = total > 0 ? (entry.value / total) * 100 : 0;
        const barWidth = maxVal > 0 ? (entry.value / maxVal) * 100 : 0;
        return (
          <div key={entry.id} className="flex items-center gap-2.5">
            <span className="text-[10px] font-medium text-muted-foreground w-[72px] truncate shrink-0">
              {entry.label}
            </span>
            <div className="flex-1 min-w-0 h-2 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(barWidth, 4)}%`,
                  backgroundColor: entry.color,
                }}
              />
            </div>
            <span className="text-[10px] font-semibold tabular-nums w-12 text-right shrink-0">
              {config
                ? formatKPIValue(entry.value, config.format)
                : String(Math.round(entry.value))}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right shrink-0">
              {pct.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── I. Campaign Ranking Bars ───────────────────────────────────────────────

function CampaignRankingBars({
  campaignData,
  metricKey,
}: {
  campaignData: Array<{ campaign: Campaign; kpis: AggregatedKPIs }>;
  metricKey: KPIKey;
}) {
  const config = getKPIConfig(metricKey);
  const sorted = [...campaignData]
    .sort(
      (a, b) =>
        (b.kpis[metricKey] as number) - (a.kpis[metricKey] as number)
    )
    .slice(0, 5);
  const maxVal =
    sorted.length > 0 ? (sorted[0].kpis[metricKey] as number) : 1;

  return (
    <div className="space-y-2">
      {sorted.map((item, i) => {
        const val = item.kpis[metricKey] as number;
        const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
        const opacity = 1 - i * 0.15;
        return (
          <div key={item.campaign.id} className="flex items-center gap-2">
            <span className="text-[11px] font-medium w-14 text-right shrink-0">
              {config
                ? formatKPIValue(val, config.format)
                : String(Math.round(val))}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className="h-5 rounded-sm"
                  style={{
                    width: `${Math.max(pct, 4)}%`,
                    backgroundColor: `rgba(80, 184, 154, ${opacity})`,
                  }}
                />
                <span className="text-[10px] text-muted-foreground truncate">
                  {item.campaign.name}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      {sorted.length === 0 && (
        <p className="text-xs text-muted-foreground">No campaign data</p>
      )}
    </div>
  );
}

// ─── J. Channel Pie ─────────────────────────────────────────────────────────

function ChannelPie({
  channelData,
  metricKey,
}: {
  channelData: Record<string, AggregatedKPIs>;
  metricKey: KPIKey;
}) {
  const entries = CHANNEL_IDS.filter(
    (ch) => channelData[ch] && (channelData[ch][metricKey] as number) > 0
  ).map((ch) => ({
    name: CHANNEL_LABELS[ch],
    value: channelData[ch][metricKey] as number,
    color: CHANNEL_COLORS[ch],
  }));

  const config = getKPIConfig(metricKey);

  return (
    <div>
      <ResponsiveContainer width="100%" height={120}>
        <PieChart>
          <Pie
            data={entries}
            cx="50%"
            cy="50%"
            outerRadius={50}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {entries.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [
              config
                ? formatKPIValue(value as number, config.format)
                : String(value),
              config?.label || metricKey,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 justify-center">
        {entries.map((e) => (
          <div key={e.name} className="flex items-center gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: e.color }}
            />
            <span className="text-[9px] text-muted-foreground">{e.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── K. Budget Pacing Gauge ─────────────────────────────────────────────────

function BudgetGauge({ pacing }: { pacing: number }) {
  const clampedPacing = Math.min(Math.max(pacing, 0), 120);
  const filled = (clampedPacing / 120) * 100;
  const remaining = 100 - filled;

  let gaugeColor = "#50b89a";
  if (pacing < 70) gaugeColor = "#e07060";
  else if (pacing < 85) gaugeColor = "#d4a55a";

  const gaugeData = [
    { name: "filled", value: filled },
    { name: "empty", value: remaining },
  ];

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={130}>
        <PieChart>
          <Pie
            data={gaugeData}
            cx="50%"
            cy="75%"
            startAngle={180}
            endAngle={0}
            innerRadius={50}
            outerRadius={70}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={gaugeColor} />
            <Cell fill="rgba(255,255,255,0.06)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 pointer-events-none">
        <span className="text-lg font-bold">{formatPercent(pacing)}</span>
        <span className="text-[10px] text-muted-foreground">on pace</span>
      </div>
    </div>
  );
}

// ─── Persona Data ───────────────────────────────────────────────────────────

interface Persona {
  id: string;
  name: string;
  reachShare: number;   // % of total audience
  engagementIdx: number; // 0-100 engagement index
  deltaPercent: number;  // period-over-period change
  color: string;
}

const PERSONAS: Persona[] = [
  { id: "thrill-seekers",            name: "Thrill Seekers",              reachShare: 34, engagementIdx: 87, deltaPercent: 6,   color: "#50b89a" },
  { id: "big-screen-chasers",        name: "Big Screen Chasers",          reachShare: 28, engagementIdx: 82, deltaPercent: 15,  color: "#3d8c76" },
  { id: "opening-weekend-superfans", name: "Opening Weekend Superfans",   reachShare: 22, engagementIdx: 91, deltaPercent: 21,  color: "#2d6658" },
  { id: "adrenaline-athletes",       name: "Adrenaline Athletes",         reachShare: 16, engagementIdx: 68, deltaPercent: 32,  color: "#1e453b" },
];

// ─── L. Persona Donut (like "Viewers Age") ──────────────────────────────────

function PersonaDonut() {
  const top = PERSONAS[0];
  const data = PERSONAS.map((p) => ({ name: p.name, value: p.reachShare, color: p.color }));

  return (
    <div className="flex items-center gap-4">
      {/* Donut */}
      <div className="relative shrink-0" style={{ width: 110, height: 110 }}>
        <ResponsiveContainer width={110} height={110}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={34}
              outerRadius={50}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold">{top.reachShare}%</span>
          <span className="text-[8px] text-muted-foreground leading-tight text-center max-w-[60px]">
            {top.name}
          </span>
        </div>
      </div>
      {/* Side legend */}
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        {PERSONAS.map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-[11px] text-muted-foreground truncate flex-1">
              {p.name}
            </span>
            <span className="text-[11px] font-semibold tabular-nums shrink-0">
              {p.reachShare}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── M. Persona Engagement Bars (like "Viewer Interest Per Age Group") ──────

function PersonaEngagementBars() {
  const maxIdx = Math.max(...PERSONAS.map((p) => p.engagementIdx));

  return (
    <div className="flex items-end gap-2" style={{ height: 170 }}>
      {PERSONAS.map((p, i) => {
        const barPct = maxIdx > 0 ? (p.engagementIdx / maxIdx) * 100 : 0;
        const barH = Math.max(barPct * 0.85, 8);
        const words = p.name.split(" ");
        const shortName = words.length > 1 ? words[0] : p.name;

        return (
          <div
            key={p.id}
            className="flex-1 flex flex-col items-center min-w-0"
            style={{ height: "100%" }}
          >
            {/* Delta annotation */}
            <span
              className={cn(
                "text-[9px] font-semibold tabular-nums mb-1 h-3",
                p.deltaPercent > 0
                  ? "text-emerald-400"
                  : p.deltaPercent < 0
                    ? "text-red-400"
                    : "text-muted-foreground"
              )}
            >
              {p.deltaPercent > 0 ? "+" : ""}
              {p.deltaPercent}%
            </span>
            {/* Bar area */}
            <div className="flex-1 w-full flex items-end justify-center">
              <div
                className="rounded-t-sm"
                style={{
                  width: "65%",
                  height: `${barH}%`,
                  backgroundColor: p.color,
                }}
              />
            </div>
            {/* Value */}
            <span className="text-[10px] font-bold tabular-nums mt-1">
              {p.engagementIdx}%
            </span>
            {/* Label */}
            <span className="text-[8px] text-muted-foreground text-center leading-tight w-full truncate">
              {shortName}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Grid ───────────────────────────────────────────────────────────────

export function BentoKPIGrid({ data, compareEnabled }: BentoKPIGridProps) {
  const { currentKPIs, previousKPIs, timeSeries, channelData, campaignData } =
    data;

  function delta(key: KPIKey) {
    return getDelta(
      currentKPIs[key] as number,
      previousKPIs ? (previousKPIs[key] as number) : undefined
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        KPI Deep Dive
      </h2>
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(4, 1fr)",
        }}
      >
        {/* ── Row 1 ─────────────────────────────────────────── */}
        {/* Impressions + Reach – dual metric barcode – 2col */}
        <DualMetricBentoCard
          metric1Key="impressions"
          metric1Value={currentKPIs.impressions}
          metric1Label="Impressions"
          metric2Key="reach"
          metric2Value={currentKPIs.reach}
          metric2Label="Reach"
          timeSeries={timeSeries}
        />

        {/* CPM – channel horizontal bars – 1col */}
        <BentoCard
          kpiKey="cpm"
          value={currentKPIs.cpm}
          deltaInfo={delta("cpm")}
          compareEnabled={compareEnabled}
        >
          <ChannelHorizontalBars channelData={channelData} metricKey="cpm" />
        </BentoCard>

        {/* Video Completion Rate – scatter plot – 1col */}
        <BentoCard
          kpiKey="videoCompletionRate"
          value={currentKPIs.videoCompletionRate}
          deltaInfo={delta("videoCompletionRate")}
          compareEnabled={compareEnabled}
        >
          <ChannelScatterPlot
            channelData={channelData}
            campaignData={campaignData}
            metricKey="videoCompletionRate"
          />
        </BentoCard>

        {/* ── Row 2 ─────────────────────────────────────────── */}
        {/* Spend – donut with side legend – 1col */}
        <BentoCard
          kpiKey="spend"
          value={currentKPIs.spend}
          deltaInfo={delta("spend")}
          compareEnabled={compareEnabled}
        >
          <DonutWithSideLegend channelData={channelData} metricKey="spend" />
        </BentoCard>

        {/* Reach – campaign delta bars – 1col */}
        <BentoCard
          kpiKey="reach"
          value={currentKPIs.reach}
          deltaInfo={delta("reach")}
          compareEnabled={compareEnabled}
        >
          <CampaignDeltaBars
            campaignData={campaignData}
            metricKey="reach"
          />
        </BentoCard>

        {/* Clicks – bar chart – 2col */}
        <BentoCard
          kpiKey="clicks"
          value={currentKPIs.clicks}
          deltaInfo={delta("clicks")}
          compareEnabled={compareEnabled}
          colSpan={2}
        >
          <BarMiniChart data={timeSeries} metricKey="clicks" />
        </BentoCard>

        {/* ── Row 3 ─────────────────────────────────────────── */}
        {/* Frequency – trending scale – 1col */}
        <BentoCard
          kpiKey="frequency"
          value={currentKPIs.frequency}
          deltaInfo={delta("frequency")}
          compareEnabled={compareEnabled}
        >
          <ChannelTrendingScale
            channelData={channelData}
            timeSeries={timeSeries}
            metricKey="frequency"
          />
        </BentoCard>

        {/* Video Views (3s) – area chart – 1col */}
        <BentoCard
          kpiKey="videoViews3s"
          value={currentKPIs.videoViews3s}
          deltaInfo={delta("videoViews3s")}
          compareEnabled={compareEnabled}
        >
          <AreaMiniChart data={timeSeries} metricKey="videoViews3s" />
        </BentoCard>

        {/* Engagement Rate – channel pie – 1col */}
        <BentoCard
          kpiKey="engagementRate"
          value={currentKPIs.engagementRate}
          deltaInfo={delta("engagementRate")}
          compareEnabled={compareEnabled}
        >
          <ChannelPie channelData={channelData} metricKey="engagementRate" />
        </BentoCard>

        {/* Budget Pacing – gauge – 1col */}
        <BentoCard
          kpiKey="budgetPacing"
          value={currentKPIs.budgetPacing}
          deltaInfo={delta("budgetPacing")}
          compareEnabled={compareEnabled}
        >
          <BudgetGauge pacing={currentKPIs.budgetPacing} />
        </BentoCard>
      </div>

      {/* ── Audience Personas ─────────────────────────────────── */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-6">
        Audience Personas
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {/* Persona Distribution – donut with side legend */}
        <div className="rounded-xl border border-border/40 bg-card p-5 flex flex-col min-w-0">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.12em]">
              Persona Distribution
            </span>
            <button className="p-1 rounded hover:bg-muted/50 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <PersonaDonut />
          </div>
        </div>

        {/* Engagement by Persona – hatched bars with delta annotations */}
        <div className="rounded-xl border border-border/40 bg-card p-5 flex flex-col min-w-0">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.12em]">
              Engagement by Persona
            </span>
            <button className="p-1 rounded hover:bg-muted/50 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <PersonaEngagementBars />
          </div>
        </div>
      </div>
    </div>
  );
}
