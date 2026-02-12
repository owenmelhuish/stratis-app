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
    campaignData: Array<{ campaign: Campaign; kpis: AggregatedKPIs }>;
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
  cpc: "#e07060",
  cpa: "#e07060",
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
        <Bar dataKey={metricKey} fill={color} radius={[3, 3, 0, 0]} maxBarSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── C. Donut Chart ──────────────────────────────────────────────────────────

function DonutChart({
  channelData,
  metricKey,
  totalLabel,
}: {
  channelData: Record<string, AggregatedKPIs>;
  metricKey: KPIKey;
  totalLabel: string;
}) {
  const entries = CHANNEL_IDS.filter(
    (ch) => channelData[ch] && (channelData[ch][metricKey] as number) > 0
  ).map((ch) => ({
    name: CHANNEL_LABELS[ch],
    value: channelData[ch][metricKey] as number,
    color: CHANNEL_COLORS[ch],
  }));

  const total = entries.reduce((sum, e) => sum + e.value, 0);
  const config = getKPIConfig(metricKey);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={entries}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={65}
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
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-sm font-bold">
          {config ? formatKPIValue(total, config.format) : formatNumber(total)}
        </span>
        <span className="text-[10px] text-muted-foreground">{totalLabel}</span>
      </div>
    </div>
  );
}

// ─── D. Radar Chart ──────────────────────────────────────────────────────────

function RadarMiniChart({
  channelData,
  metricKey,
}: {
  channelData: Record<string, AggregatedKPIs>;
  metricKey: KPIKey;
}) {
  const radarData = CHANNEL_IDS.filter((ch) => channelData[ch]).map((ch) => ({
    channel: CHANNEL_LABELS[ch].replace("Google Search", "Google").replace("The Trade Desk", "TTD"),
    value: channelData[ch][metricKey] as number,
  }));

  const config = getKPIConfig(metricKey);

  return (
    <ResponsiveContainer width="100%" height={160}>
      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis
          dataKey="channel"
          tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }}
        />
        <Radar
          dataKey="value"
          stroke="#50b89a"
          fill="#50b89a"
          fillOpacity={0.2}
          strokeWidth={1.5}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [
            config
              ? formatKPIValue(value as number, config.format)
              : String(value),
            config?.label || metricKey,
          ]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── E. Horizontal Campaign Ranking ──────────────────────────────────────────

function CampaignRankingBars({
  campaignData,
  metricKey,
}: {
  campaignData: Array<{ campaign: Campaign; kpis: AggregatedKPIs }>;
  metricKey: KPIKey;
}) {
  const config = getKPIConfig(metricKey);
  const sorted = [...campaignData]
    .sort((a, b) => (b.kpis[metricKey] as number) - (a.kpis[metricKey] as number))
    .slice(0, 5);
  const maxVal = sorted.length > 0 ? (sorted[0].kpis[metricKey] as number) : 1;

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

// ─── F. Channel Pie ──────────────────────────────────────────────────────────

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

// ─── G. Budget Pacing Gauge ──────────────────────────────────────────────────

function BudgetGauge({ pacing }: { pacing: number }) {
  const clampedPacing = Math.min(Math.max(pacing, 0), 120);
  const filled = (clampedPacing / 120) * 100;
  const remaining = 100 - filled;

  let gaugeColor = "#50b89a"; // green
  if (pacing < 70) gaugeColor = "#e07060"; // red - underpacing
  else if (pacing < 85) gaugeColor = "#d4a55a"; // yellow

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
        {/* Impressions – area chart – 2col */}
        <BentoCard
          kpiKey="impressions"
          value={currentKPIs.impressions}
          deltaInfo={delta("impressions")}
          compareEnabled={compareEnabled}
          colSpan={2}
        >
          <AreaMiniChart data={timeSeries} metricKey="impressions" />
        </BentoCard>

        {/* CPC – line chart – 1col */}
        <BentoCard
          kpiKey="cpc"
          value={currentKPIs.cpc}
          deltaInfo={delta("cpc")}
          compareEnabled={compareEnabled}
        >
          <AreaMiniChart data={timeSeries} metricKey="cpc" />
        </BentoCard>

        {/* ROAS – campaign bars – 1col */}
        <BentoCard
          kpiKey="roas"
          value={currentKPIs.roas}
          deltaInfo={delta("roas")}
          compareEnabled={compareEnabled}
        >
          <CampaignRankingBars campaignData={campaignData} metricKey="roas" />
        </BentoCard>

        {/* ── Row 2 ─────────────────────────────────────────── */}
        {/* Spend – donut – 1col */}
        <BentoCard
          kpiKey="spend"
          value={currentKPIs.spend}
          deltaInfo={delta("spend")}
          compareEnabled={compareEnabled}
        >
          <DonutChart
            channelData={channelData}
            metricKey="spend"
            totalLabel="Total Spend"
          />
        </BentoCard>

        {/* Revenue – campaign bars – 1col */}
        <BentoCard
          kpiKey="revenue"
          value={currentKPIs.revenue}
          deltaInfo={delta("revenue")}
          compareEnabled={compareEnabled}
        >
          <CampaignRankingBars
            campaignData={campaignData}
            metricKey="revenue"
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
        {/* CPA – campaign bars – 1col */}
        <BentoCard
          kpiKey="cpa"
          value={currentKPIs.cpa}
          deltaInfo={delta("cpa")}
          compareEnabled={compareEnabled}
        >
          <CampaignRankingBars campaignData={campaignData} metricKey="cpa" />
        </BentoCard>

        {/* Conversions – area chart – 1col */}
        <BentoCard
          kpiKey="conversions"
          value={currentKPIs.conversions}
          deltaInfo={delta("conversions")}
          compareEnabled={compareEnabled}
        >
          <AreaMiniChart data={timeSeries} metricKey="conversions" />
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
    </div>
  );
}
