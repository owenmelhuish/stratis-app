"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Circle,
  MoreHorizontal,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  BarChart,
  Bar,
} from 'recharts';
import type { Insight, InsightActionStep } from '@/types';
import { cn } from '@/lib/utils';
import {
  generateInsightChartData,
  interpolateImproved,
  interpolateAdSets,
  type MetricsHint,
} from '@/lib/insight-chart-data';
import type { InsightChartData } from '@/lib/insight-chart-data';

// --- Step-type configuration ---
const STEP_TYPE_CONFIG: Record<
  InsightActionStep['type'],
  { unit: string; label: string; min: number; max: number; defaultVal: number }
> = {
  budget: { unit: '%', label: 'Budget reallocation', min: 0, max: 100, defaultVal: 50 },
  creative: { unit: '%', label: 'Creative refresh', min: 0, max: 100, defaultVal: 50 },
  targeting: { unit: '%', label: 'Targeting adjustment', min: 0, max: 100, defaultVal: 50 },
  bidding: { unit: '%', label: 'Bid adjustment', min: 0, max: 100, defaultVal: 50 },
  scheduling: { unit: '%', label: 'Schedule shift', min: 0, max: 100, defaultVal: 50 },
};

interface InsightDetailModalProps {
  insight: Insight | null;
  open: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDiscard: (id: string) => void;
  onComplete: (id: string) => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function InsightDetailModal({
  insight,
  open,
  onClose,
  onPrev,
  onNext,
  onDiscard,
  onComplete,
  hasPrev,
  hasNext,
}: InsightDetailModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  // Slider values keyed by step id, 0-100
  const [stepValues, setStepValues] = useState<Record<string, number>>({});

  // Derive metrics hint from title
  const metricsHint: MetricsHint = insight?.title.includes('Pacing') || insight?.title.includes('Budget')
    ? 'budget-spend'
    : 'roas-frequency';

  // Base chart data (static per insight)
  const chartData = useMemo<InsightChartData | null>(
    () => (insight ? generateInsightChartData(insight.id, metricsHint) : null),
    [insight, metricsHint]
  );

  // Reset sliders when insight changes
  useEffect(() => {
    if (!insight) return;
    const defaults: Record<string, number> = {};
    for (const step of insight.actionSteps) {
      defaults[step.id] = STEP_TYPE_CONFIG[step.type].defaultVal;
    }
    setStepValues(defaults);
    setActiveTab(0);
  }, [insight]);

  const setStepValue = useCallback((stepId: string, value: number) => {
    setStepValues((prev) => ({ ...prev, [stepId]: value }));
  }, []);

  // Aggregate intensity = average of all step sliders (0-1)
  const aggregateIntensity = useMemo(() => {
    if (!insight || insight.actionSteps.length === 0) return 0;
    const vals = insight.actionSteps.map((s) => (stepValues[s.id] ?? 50) / 100);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [insight, stepValues]);

  // Adjusted improved line and ad sets based on aggregate intensity
  const adjustedImproved = useMemo(() => {
    if (!chartData) return [];
    return interpolateImproved(chartData.predicted, chartData.improved, aggregateIntensity);
  }, [chartData, aggregateIntensity]);

  const adjustedAdSets = useMemo(() => {
    if (!chartData) return [];
    // For budget steps, use the budget step's own slider value
    const budgetStep = insight?.actionSteps.find((s) => s.type === 'budget');
    const budgetIntensity = budgetStep ? (stepValues[budgetStep.id] ?? 50) / 100 : aggregateIntensity;
    return interpolateAdSets(chartData.adSets, budgetIntensity);
  }, [chartData, insight, stepValues, aggregateIntensity]);

  // Build the combined chart data array
  const combinedForChart = useMemo(() => {
    if (!chartData) return [];

    const map = new Map<number, Record<string, number | string | undefined>>();

    for (const p of chartData.historical) {
      map.set(p.day, {
        day: p.day,
        label: p.label,
        primary: p.primary,
        secondary: p.secondary,
      });
    }

    // Bridge from last historical into predicted
    const lastHist = chartData.historical[chartData.historical.length - 1];
    const predictedWithBridge = [lastHist, ...chartData.predicted];
    for (const p of predictedWithBridge) {
      const existing = map.get(p.day) || { day: p.day, label: p.label };
      map.set(p.day, { ...existing, predicted: p.primary, predSecondary: p.secondary });
    }

    // Bridge from last historical into adjusted improved
    const improvedWithBridge = [
      { ...lastHist, improved: lastHist.primary },
      ...adjustedImproved,
    ];
    for (const p of improvedWithBridge) {
      const existing = map.get(p.day) || { day: p.day, label: p.label };
      map.set(p.day, { ...existing, improved: p.improved });
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([, v]) => v);
  }, [chartData, adjustedImproved]);

  if (!insight || !chartData) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed top-[50%] left-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border/40 bg-card shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DialogTitle className="sr-only">{insight.title}</DialogTitle>

          {/* Nav arrows */}
          {hasPrev && (
            <button
              onClick={onPrev}
              className="absolute -left-12 top-1/2 -translate-y-1/2 rounded-full bg-card/80 border border-border/40 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={onNext}
              className="absolute -right-12 top-1/2 -translate-y-1/2 rounded-full bg-card/80 border border-border/40 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          <ScrollArea className="max-h-[80vh]">
            <div className="p-5 space-y-4">
              {/* Metric Tabs */}
              <div className="flex items-center gap-1 border-b border-border/30 pb-2">
                {chartData.metricTabs.map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(i)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                      activeTab === i
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tab}
                  </button>
                ))}
                <button className="ml-auto p-1 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              {/* Main Chart — reactive to slider intensity */}
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={combinedForChart}
                    margin={{ top: 5, right: 5, bottom: 0, left: 5 }}
                  >
                    <defs>
                      <linearGradient id="improvedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: '#666' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(20,24,28,0.95)',
                        border: 'none',
                        borderRadius: 8,
                        backdropFilter: 'blur(12px)',
                        fontSize: 11,
                      }}
                      itemStyle={{ color: '#ccc' }}
                      labelStyle={{ color: '#fff', fontWeight: 600 }}
                    />
                    <ReferenceLine
                      x={chartData.todayIndex}
                      stroke="#555"
                      strokeDasharray="3 3"
                      label={{ value: 'TODAY', position: 'top', fontSize: 9, fill: '#888' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="primary"
                      stroke="#e5e5e5"
                      strokeWidth={2}
                      fill="none"
                      dot={false}
                      name={chartData.primaryLabel}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="secondary"
                      stroke="#888"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      fill="none"
                      dot={false}
                      name={chartData.secondaryLabel}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="predicted"
                      stroke="#888"
                      strokeWidth={1.5}
                      strokeDasharray="6 3"
                      fill="none"
                      dot={false}
                      name="Predicted"
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="improved"
                      stroke="#2dd4bf"
                      strokeWidth={1.5}
                      fill="url(#improvedGrad)"
                      dot={false}
                      name="With optimization"
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Chart legend + intensity readout */}
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-white/80 rounded" />
                  {chartData.primaryLabel}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-muted-foreground/50 rounded" />
                  {chartData.secondaryLabel}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-teal-400 rounded" />
                  With optimization
                </span>
                <span className="ml-auto font-medium text-teal-400">
                  {Math.round(aggregateIntensity * 100)}% applied
                </span>
              </div>

              {/* Title & Summary */}
              <div>
                <h2 className="text-lg font-bold">{insight.title}</h2>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5 line-clamp-2">
                  {insight.recommendedAction}
                </p>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {insight.summary}
              </p>

              {/* Action Steps with Sliders */}
              {insight.actionSteps.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Action Steps
                  </p>
                  {insight.actionSteps.map((step) => {
                    const config = STEP_TYPE_CONFIG[step.type];
                    const val = stepValues[step.id] ?? config.defaultVal;
                    return (
                      <div
                        key={step.id}
                        className="rounded-lg border border-border/30 bg-muted/20 p-3 space-y-3"
                      >
                        {/* Step header */}
                        <div className="flex items-start gap-2">
                          <Circle className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{step.title}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              {step.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Slider */}
                        <div className="space-y-1.5 px-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">{config.label}</span>
                            <span className="font-semibold text-teal-400 tabular-nums">
                              {val}{config.unit}
                            </span>
                          </div>
                          <Slider
                            value={[val]}
                            min={config.min}
                            max={config.max}
                            step={1}
                            onValueChange={([v]) => setStepValue(step.id, v)}
                          />
                          <div className="flex justify-between text-[9px] text-muted-foreground/60">
                            <span>No change</span>
                            <span>Full recommendation</span>
                          </div>
                        </div>

                        {/* Step-specific visualization driven by slider */}
                        {step.type === 'budget' && (
                          <ActionStepBudgetChart adSets={adjustedAdSets} />
                        )}
                        {step.type === 'creative' && (
                          <ActionStepCreativeChart insightId={insight.id} intensity={val / 100} />
                        )}
                        {(step.type === 'bidding' ||
                          step.type === 'targeting' ||
                          step.type === 'scheduling') && (
                          <ActionStepMetricBar
                            type={step.type}
                            insightId={insight.id}
                            intensity={val / 100}
                          />
                        )}

                        {/* Summary + actions */}
                        <div className="flex items-center justify-between pt-1">
                          <p className="text-[11px] text-muted-foreground">
                            {step.type === 'budget'
                              ? 'Redistribute spend across top-performing ad sets'
                              : step.type === 'creative'
                                ? 'Replace underperforming assets with new variants'
                                : 'Apply recommended adjustments'}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-2 text-muted-foreground"
                              onClick={() => setStepValue(step.id, 0)}
                            >
                              Skip
                            </Button>
                            <Button
                              size="sm"
                              className="h-6 text-[10px] px-2 bg-teal-600 hover:bg-teal-700 text-white"
                              onClick={() => setStepValue(step.id, 100)}
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom action bar */}
              <div className="flex items-center gap-3 pt-2 border-t border-border/30">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 text-xs gap-1.5 border-border/50 text-muted-foreground hover:text-red-400 hover:border-red-500/30"
                  onClick={() => onDiscard(insight.id)}
                >
                  <X className="h-3.5 w-3.5" />
                  Discard Insight
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onComplete(insight.id)}
                >
                  <Check className="h-3.5 w-3.5" />
                  Mark as Complete
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

// --- Mini visualizations for action steps ---

function ActionStepBudgetChart({
  adSets,
}: {
  adSets: { name: string; current: number; recommended: number }[];
}) {
  const data = adSets.map((a) => ({
    name: a.name.length > 20 ? a.name.slice(0, 18) + '...' : a.name,
    current: Math.round(a.current),
    recommended: Math.round(a.recommended),
  }));

  return (
    <div className="h-[90px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 5, bottom: 0, left: 5 }}
        >
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 9, fill: '#888' }}
            width={110}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(20,24,28,0.95)',
              border: 'none',
              borderRadius: 8,
              fontSize: 10,
            }}
          />
          <Bar
            dataKey="current"
            fill="#555"
            radius={[0, 2, 2, 0]}
            barSize={6}
            name="Current"
            isAnimationActive={false}
          />
          <Bar
            dataKey="recommended"
            fill="#2dd4bf"
            radius={[0, 2, 2, 0]}
            barSize={6}
            name="Adjusted"
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ActionStepCreativeChart({
  insightId,
  intensity,
}: {
  insightId: string;
  intensity: number;
}) {
  const seed = insightId.length * 7;
  const before = 25 + (seed % 30);
  const maxAfter = before + 10 + (seed % 20);
  // Interpolate based on slider
  const after = before + (maxAfter - before) * intensity;

  return (
    <div className="flex items-center gap-4 py-2 px-1">
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Current CTR</span>
          <span className="font-medium">{(before / 10).toFixed(1)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-muted-foreground/50"
            style={{ width: `${before}%` }}
          />
        </div>
      </div>
      <TrendingUp className="h-3.5 w-3.5 text-teal-400 shrink-0" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Projected CTR</span>
          <span className="font-medium text-teal-400">
            {(after / 10).toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-teal-400 transition-all duration-150"
            style={{ width: `${after}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ActionStepMetricBar({
  type,
  insightId,
  intensity,
}: {
  type: string;
  insightId: string;
  intensity: number;
}) {
  const seed = insightId.length * 13 + type.length;
  const currentVal = 30 + (seed % 40);
  const maxTarget = Math.min(95, currentVal + 10 + (seed % 20));
  // Interpolate based on slider
  const targetVal = currentVal + (maxTarget - currentVal) * intensity;
  const label =
    type === 'bidding'
      ? 'Win Rate'
      : type === 'targeting'
        ? 'Audience Match'
        : 'Delivery Score';

  return (
    <div className="py-2 px-1 space-y-1.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{currentVal}%</span> →{' '}
          <span className="text-teal-400 font-medium">{Math.round(targetVal)}%</span>
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute h-full rounded-full bg-muted-foreground/40"
          style={{ width: `${currentVal}%` }}
        />
        <div
          className="absolute h-full rounded-full bg-teal-400/50 transition-all duration-150"
          style={{ width: `${targetVal}%` }}
        />
      </div>
    </div>
  );
}
