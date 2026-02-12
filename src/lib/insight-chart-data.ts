// Deterministic chart data generator seeded by insight ID

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ChartPoint {
  day: number;
  label: string;
  primary: number;
  secondary: number;
  improved?: number;
}

export interface AdSetData {
  name: string;
  current: number;
  recommended: number;
}

export type MetricsHint = 'roas-frequency' | 'budget-spend';

export interface InsightChartData {
  historical: ChartPoint[];
  predicted: ChartPoint[];
  improved: ChartPoint[];
  todayIndex: number;
  adSets: AdSetData[];
  primaryLabel: string;
  secondaryLabel: string;
  metricTabs: string[];
}

export function generateInsightChartData(
  insightId: string,
  metricsHint: MetricsHint = 'roas-frequency',
): InsightChartData {
  const seed = hashString(insightId);
  const rng = mulberry32(seed);

  const totalDays = 42;
  const todayIndex = 28;

  // Metric labels based on hint
  const isBudget = metricsHint === 'budget-spend';
  const primaryLabel = isBudget ? 'BUDGET TARGET' : 'ROAS';
  const secondaryLabel = isBudget ? 'ACTUAL SPEND' : 'FREQUENCY';
  const metricTabs = isBudget
    ? ['Spend Pacing', 'Budget', 'Forecast']
    : ['Comparison', 'ROAS', 'Frequency'];

  // Value ranges based on hint
  const baseP = isBudget ? 400 + rng() * 600 : 1.5 + rng() * 1.2;
  const baseS = isBudget ? baseP * (0.7 + rng() * 0.15) : 1.0 + rng() * 1.5;
  const noiseP = isBudget ? 30 : 0.12;
  const noiseS = isBudget ? 50 : 0.1;
  const trend = isBudget ? 8 + rng() * 15 : (rng() - 0.35) * 0.06;
  const improveDelta = isBudget ? 80 + rng() * 200 : 0.3 + rng() * 0.6;

  const historical: ChartPoint[] = [];
  const predicted: ChartPoint[] = [];
  const improved: ChartPoint[] = [];

  let pVal = baseP;
  let sVal = baseS;

  for (let d = 0; d < totalDays; d++) {
    const noise1 = (rng() - 0.5) * noiseP * 2;
    const noise2 = (rng() - 0.5) * noiseS * 2;
    pVal = Math.max(isBudget ? 50 : 0.2, pVal + trend + noise1);
    sVal = Math.max(isBudget ? 30 : 0.2, sVal + trend * 0.6 + noise2);

    const dayLabel =
      d === 0
        ? 'APR 6'
        : d === todayIndex
          ? 'TODAY'
          : d === totalDays - 1
            ? 'MAY 9'
            : '';

    const point: ChartPoint = isBudget
      ? { day: d, label: dayLabel, primary: Math.round(pVal), secondary: Math.round(sVal) }
      : { day: d, label: dayLabel, primary: Math.round(pVal * 10) / 10, secondary: Math.round(sVal * 10) / 10 };

    if (d <= todayIndex) {
      historical.push(point);
    } else {
      predicted.push(point);
      const impVal = isBudget
        ? Math.round(pVal + improveDelta * (0.8 + rng() * 0.4))
        : Math.round((pVal + improveDelta * (0.5 + rng() * 0.5)) * 10) / 10;
      improved.push({ ...point, improved: impVal });
    }
  }

  // Generate ad set data for budget action steps
  const adSetNames = ['Lookalike – US', 'Interest – Auto Intenders', 'Retarget – Site Visitors', 'Broad – 25-54', 'Custom – CRM Match'];
  const numSets = 3 + (seed % 3);
  const adSets: AdSetData[] = [];
  for (let i = 0; i < numSets; i++) {
    const current = Math.round((1000 + rng() * 4000) * 100) / 100;
    const shift = (rng() - 0.3) * 0.4;
    adSets.push({
      name: adSetNames[i % adSetNames.length],
      current,
      recommended: Math.round(current * (1 + shift) * 100) / 100,
    });
  }

  return {
    historical,
    predicted,
    improved,
    todayIndex,
    adSets,
    primaryLabel,
    secondaryLabel,
    metricTabs,
  };
}

/**
 * Interpolate the "improved" line based on a 0-1 intensity factor.
 * At intensity=0 the improved line equals the predicted line (no action).
 * At intensity=1 the improved line is the full optimistic projection.
 */
export function interpolateImproved(
  predicted: ChartPoint[],
  improved: ChartPoint[],
  intensity: number,
): ChartPoint[] {
  const t = Math.max(0, Math.min(1, intensity));
  return improved.map((imp, i) => {
    const pred = predicted[i];
    if (!pred || imp.improved == null) return imp;
    const base = pred.primary;
    const target = imp.improved;
    return {
      ...imp,
      improved: Math.round((base + (target - base) * t) * 10) / 10,
    };
  });
}

/**
 * Interpolate ad-set budget allocations by intensity.
 * At 0 = current allocation, at 1 = full recommended.
 */
export function interpolateAdSets(
  adSets: AdSetData[],
  intensity: number,
): AdSetData[] {
  const t = Math.max(0, Math.min(1, intensity));
  return adSets.map((a) => ({
    ...a,
    recommended: Math.round((a.current + (a.recommended - a.current) * t) * 100) / 100,
  }));
}
