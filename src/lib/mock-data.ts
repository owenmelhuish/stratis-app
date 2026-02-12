import { subDays, format, differenceInDays } from 'date-fns';
import type {
  RegionId, ChannelId, Campaign, CampaignObjective, CampaignStatus,
  DailyMetrics, AggregatedKPIs, KPIDelta, KPIKey,
  NewsItem, NewsTag, NewsUrgency,
  Insight, InsightCategory, InsightScope, InsightStatus, InsightActionStep,
  Anomaly,
} from '@/types';
import { REGION_LABELS, CHANNEL_LABELS } from '@/types';

// ===== Seedable PRNG (Mulberry32) =====
function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);

function randBetween(min: number, max: number): number {
  return min + rng() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(randBetween(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

function gaussian(): number {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ===== Constants =====
const END_DATE = new Date('2026-02-11');
const DATA_DAYS = 180;
const START_DATE = subDays(END_DATE, DATA_DAYS - 1);
const ALL_REGIONS: RegionId[] = ['north-america', 'europe', 'uk', 'middle-east', 'apac', 'latam'];
const ALL_CHANNELS: ChannelId[] = ['instagram', 'facebook', 'tiktok', 'google-search', 'ttd'];

// ===== Channel Profiles =====
interface ChannelProfile {
  baseSpend: number;
  cpmRange: [number, number];
  ctrRange: [number, number];
  cvrRange: [number, number];
  cpcRange: [number, number];
  videoViewRate: number;
  videoCompletionRate: number;
  engagementMultiplier: number;
  volatility: number;
}

const CHANNEL_PROFILES: Record<ChannelId, ChannelProfile> = {
  'google-search': { baseSpend: 1200, cpmRange: [15, 30], ctrRange: [4, 8], cvrRange: [6, 10], cpcRange: [2, 5], videoViewRate: 0, videoCompletionRate: 0, engagementMultiplier: 0.5, volatility: 0.15 },
  'facebook': { baseSpend: 1000, cpmRange: [8, 18], ctrRange: [1.2, 2.5], cvrRange: [2.5, 5], cpcRange: [0.8, 2.5], videoViewRate: 0.3, videoCompletionRate: 0.25, engagementMultiplier: 1.2, volatility: 0.12 },
  'instagram': { baseSpend: 900, cpmRange: [8, 20], ctrRange: [1, 2.2], cvrRange: [2.5, 4.5], cpcRange: [1, 3], videoViewRate: 0.4, videoCompletionRate: 0.3, engagementMultiplier: 1.5, volatility: 0.1 },
  'tiktok': { baseSpend: 700, cpmRange: [5, 15], ctrRange: [0.8, 2], cvrRange: [1.5, 3.5], cpcRange: [0.5, 2], videoViewRate: 0.8, videoCompletionRate: 0.15, engagementMultiplier: 2.0, volatility: 0.25 },
  'ttd': { baseSpend: 1500, cpmRange: [5, 15], ctrRange: [0.3, 1], cvrRange: [1, 2.5], cpcRange: [1, 4], videoViewRate: 0.2, videoCompletionRate: 0.2, engagementMultiplier: 0.3, volatility: 0.08 },
};

// ===== Region multipliers =====
const REGION_MULTIPLIERS: Record<RegionId, number> = {
  'north-america': 1.4,
  'europe': 1.2,
  'uk': 0.8,
  'middle-east': 0.6,
  'apac': 1.0,
  'latam': 0.5,
};

// ===== Campaign definitions =====
interface CampaignDef {
  id: string; name: string; region: RegionId; objective: CampaignObjective;
  status: CampaignStatus; channels: ChannelId[]; budgetMultiplier: number;
}

const CAMPAIGN_DEFS: CampaignDef[] = [
  // North America
  { id: 'na-taycan-launch', name: 'NA Taycan Launch', region: 'north-america', objective: 'awareness', status: 'live', channels: ['instagram', 'facebook', 'tiktok', 'ttd'], budgetMultiplier: 1.5 },
  { id: 'na-911-performance', name: 'NA 911 Performance', region: 'north-america', objective: 'performance', status: 'live', channels: ['google-search', 'facebook', 'instagram'], budgetMultiplier: 1.2 },
  { id: 'na-cayenne-summer', name: 'NA Cayenne Summer', region: 'north-america', objective: 'consideration', status: 'live', channels: ['instagram', 'tiktok', 'ttd', 'facebook'], budgetMultiplier: 1.0 },
  { id: 'na-macan-retarget', name: 'NA Macan Retargeting', region: 'north-america', objective: 'performance', status: 'paused', channels: ['google-search', 'facebook', 'ttd'], budgetMultiplier: 0.7 },
  { id: 'na-brand-always-on', name: 'NA Brand Always-On', region: 'north-america', objective: 'awareness', status: 'live', channels: ['instagram', 'facebook', 'tiktok', 'google-search', 'ttd'], budgetMultiplier: 0.9 },
  // Europe
  { id: 'eu-911-heritage', name: 'EU 911 Heritage', region: 'europe', objective: 'awareness', status: 'live', channels: ['instagram', 'facebook', 'tiktok', 'ttd'], budgetMultiplier: 1.3 },
  { id: 'eu-taycan-turbo', name: 'EU Taycan Turbo', region: 'europe', objective: 'performance', status: 'live', channels: ['google-search', 'facebook', 'instagram', 'ttd'], budgetMultiplier: 1.1 },
  { id: 'eu-panamera-exec', name: 'EU Panamera Executive', region: 'europe', objective: 'consideration', status: 'live', channels: ['facebook', 'google-search', 'ttd'], budgetMultiplier: 0.8 },
  { id: 'eu-winter-driving', name: 'EU Winter Driving', region: 'europe', objective: 'awareness', status: 'paused', channels: ['instagram', 'tiktok', 'facebook'], budgetMultiplier: 0.6 },
  // UK
  { id: 'uk-cayenne-summer', name: 'UK Cayenne Summer', region: 'uk', objective: 'consideration', status: 'live', channels: ['instagram', 'facebook', 'google-search', 'ttd'], budgetMultiplier: 1.0 },
  { id: 'uk-taycan-electric', name: 'UK Taycan Electric', region: 'uk', objective: 'performance', status: 'live', channels: ['google-search', 'facebook', 'ttd'], budgetMultiplier: 1.1 },
  { id: 'uk-911-heritage', name: 'UK 911 Heritage', region: 'uk', objective: 'awareness', status: 'live', channels: ['instagram', 'tiktok', 'facebook'], budgetMultiplier: 0.7 },
  { id: 'uk-macan-launch', name: 'UK Macan Launch', region: 'uk', objective: 'awareness', status: 'live', channels: ['instagram', 'facebook', 'tiktok', 'google-search', 'ttd'], budgetMultiplier: 1.2 },
  // Middle East
  { id: 'me-cayenne-luxury', name: 'ME Cayenne Luxury', region: 'middle-east', objective: 'awareness', status: 'live', channels: ['instagram', 'tiktok', 'ttd'], budgetMultiplier: 1.0 },
  { id: 'me-911-gt', name: 'ME 911 GT Collection', region: 'middle-east', objective: 'performance', status: 'live', channels: ['google-search', 'instagram', 'facebook'], budgetMultiplier: 0.9 },
  { id: 'me-taycan-desert', name: 'ME Taycan Desert', region: 'middle-east', objective: 'consideration', status: 'live', channels: ['tiktok', 'instagram', 'ttd'], budgetMultiplier: 0.8 },
  { id: 'me-panamera-vip', name: 'ME Panamera VIP', region: 'middle-east', objective: 'performance', status: 'paused', channels: ['google-search', 'facebook'], budgetMultiplier: 0.5 },
  // APAC
  { id: 'apac-taycan-launch', name: 'APAC Taycan Launch', region: 'apac', objective: 'awareness', status: 'live', channels: ['instagram', 'facebook', 'tiktok', 'ttd'], budgetMultiplier: 1.3 },
  { id: 'apac-cayenne-family', name: 'APAC Cayenne Family', region: 'apac', objective: 'consideration', status: 'live', channels: ['facebook', 'instagram', 'google-search'], budgetMultiplier: 0.9 },
  { id: 'apac-911-track', name: 'APAC 911 Track Day', region: 'apac', objective: 'performance', status: 'live', channels: ['google-search', 'instagram', 'tiktok'], budgetMultiplier: 0.8 },
  { id: 'apac-brand-digital', name: 'APAC Brand Digital', region: 'apac', objective: 'awareness', status: 'live', channels: ['tiktok', 'instagram', 'ttd', 'facebook'], budgetMultiplier: 0.7 },
  // LATAM
  { id: 'latam-cayenne-urban', name: 'LATAM Cayenne Urban', region: 'latam', objective: 'consideration', status: 'live', channels: ['instagram', 'facebook', 'tiktok'], budgetMultiplier: 0.8 },
  { id: 'latam-911-legend', name: 'LATAM 911 Legend', region: 'latam', objective: 'awareness', status: 'live', channels: ['instagram', 'tiktok', 'ttd'], budgetMultiplier: 0.7 },
  { id: 'latam-taycan-green', name: 'LATAM Taycan Green', region: 'latam', objective: 'performance', status: 'live', channels: ['google-search', 'facebook'], budgetMultiplier: 0.6 },
  { id: 'latam-macan-adventure', name: 'LATAM Macan Adventure', region: 'latam', objective: 'awareness', status: 'paused', channels: ['instagram', 'facebook', 'tiktok', 'ttd'], budgetMultiplier: 0.5 },
];

// ===== Events (anomaly generators) =====
interface DataEvent {
  name: string; dayOffset: number; duration: number;
  regions: RegionId[]; spendMult: number; cvrMult: number; engageMult: number;
}

const DATA_EVENTS: DataEvent[] = [
  { name: 'Taycan Product Launch', dayOffset: 45, duration: 7, regions: ['north-america', 'europe', 'uk'], spendMult: 1.8, cvrMult: 1.3, engageMult: 2.0 },
  { name: 'Competitive Surge BMW', dayOffset: 90, duration: 10, regions: ['europe'], spendMult: 1.0, cvrMult: 0.8, engageMult: 0.7 },
  { name: 'APAC Economic Softness', dayOffset: 120, duration: 14, regions: ['apac'], spendMult: 0.9, cvrMult: 0.65, engageMult: 0.85 },
  { name: 'Holiday Shopping Surge', dayOffset: 70, duration: 14, regions: ALL_REGIONS, spendMult: 1.3, cvrMult: 1.15, engageMult: 1.4 },
  { name: 'TikTok Algorithm Shift', dayOffset: 100, duration: 5, regions: ALL_REGIONS, spendMult: 1.0, cvrMult: 0.75, engageMult: 1.6 },
  { name: 'Q4 Budget Push', dayOffset: 150, duration: 10, regions: ['north-america', 'europe'], spendMult: 1.5, cvrMult: 1.1, engageMult: 1.1 },
];

// ===== Data Generation =====
function generateDailyData(): Record<string, Record<string, DailyMetrics[]>> {
  const data: Record<string, Record<string, DailyMetrics[]>> = {};

  for (const campaign of CAMPAIGN_DEFS) {
    data[campaign.id] = {};
    const regionMult = REGION_MULTIPLIERS[campaign.region];

    for (const channel of campaign.channels) {
      const profile = CHANNEL_PROFILES[channel];
      const days: DailyMetrics[] = [];

      for (let d = 0; d < DATA_DAYS; d++) {
        const date = format(subDays(END_DATE, DATA_DAYS - 1 - d), 'yyyy-MM-dd');
        const dayOfWeek = new Date(date).getDay();
        const weekendMult = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.75 : 1.0;
        const seasonality = 1 + 0.1 * Math.sin((d / DATA_DAYS) * Math.PI * 2);

        // Check events
        let eventSpendMult = 1, eventCvrMult = 1, eventEngageMult = 1;
        for (const evt of DATA_EVENTS) {
          if (d >= evt.dayOffset && d < evt.dayOffset + evt.duration && evt.regions.includes(campaign.region)) {
            eventSpendMult *= evt.spendMult;
            eventCvrMult *= evt.cvrMult;
            eventEngageMult *= evt.engageMult;
          }
        }

        const noise = 1 + gaussian() * profile.volatility;
        const spendBase = profile.baseSpend * campaign.budgetMultiplier * regionMult * weekendMult * seasonality * eventSpendMult * Math.max(0.3, noise);
        const spend = Math.max(10, spendBase);

        const cpm = randBetween(profile.cpmRange[0], profile.cpmRange[1]) * (1 + gaussian() * 0.1);
        const impressions = Math.round((spend / cpm) * 1000);
        const reach = Math.round(impressions * randBetween(0.6, 0.85));

        const ctr = randBetween(profile.ctrRange[0], profile.ctrRange[1]) * Math.max(0.5, 1 + gaussian() * 0.15) / 100;
        const clicks = Math.round(impressions * ctr);

        const lpvRate = randBetween(0.5, 0.8);
        const landingPageViews = Math.round(clicks * lpvRate);

        const cvr = randBetween(profile.cvrRange[0], profile.cvrRange[1]) * eventCvrMult * Math.max(0.3, 1 + gaussian() * 0.15) / 100;
        const conversions = Math.max(0, Math.round(clicks * cvr));
        const leads = Math.round(conversions * randBetween(1.5, 3));

        const avgOrderValue = randBetween(190, 440);
        const revenue = conversions * avgOrderValue * randBetween(0.8, 1.2);

        const videoViews3s = Math.round(impressions * profile.videoViewRate * randBetween(0.8, 1.2));
        const videoViewsThruplay = Math.round(videoViews3s * profile.videoCompletionRate * randBetween(0.7, 1.3));

        const engagements = Math.round(impressions * profile.engagementMultiplier * eventEngageMult * randBetween(0.01, 0.04));
        const assistedConversions = Math.round(conversions * randBetween(0.2, 0.5));

        days.push({
          date, spend, impressions, reach, clicks, landingPageViews,
          leads, conversions, revenue, videoViews3s, videoViewsThruplay,
          engagements, assistedConversions,
        });
      }
      data[campaign.id][channel] = days;
    }
  }
  return data;
}

// ===== Aggregation =====
export function aggregateMetrics(dailyData: DailyMetrics[]): AggregatedKPIs {
  if (dailyData.length === 0) {
    return {
      date: '', spend: 0, impressions: 0, reach: 0, clicks: 0, landingPageViews: 0,
      leads: 0, conversions: 0, revenue: 0, videoViews3s: 0, videoViewsThruplay: 0,
      engagements: 0, assistedConversions: 0,
      frequency: 0, ctr: 0, cpc: 0, cpm: 0, lpvRate: 0, cpl: 0, cpa: 0, roas: 0,
      videoCompletionRate: 0, engagementRate: 0, brandSearchLift: 0, shareOfVoice: 0,
      volatilityScore: 0, anomalyCount: 0, budgetPacing: 0, creativeFatigueIndex: 0,
    };
  }

  const sum = (key: keyof DailyMetrics) => dailyData.reduce((s, d) => s + (d[key] as number), 0);

  const spend = sum('spend');
  const impressions = sum('impressions');
  const reach = sum('reach');
  const clicks = sum('clicks');
  const landingPageViews = sum('landingPageViews');
  const leads = sum('leads');
  const conversions = sum('conversions');
  const revenue = sum('revenue');
  const videoViews3s = sum('videoViews3s');
  const videoViewsThruplay = sum('videoViewsThruplay');
  const engagements = sum('engagements');
  const assistedConversions = sum('assistedConversions');

  const frequency = reach > 0 ? impressions / reach : 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const lpvRate = clicks > 0 ? (landingPageViews / clicks) * 100 : 0;
  const cpl = leads > 0 ? spend / leads : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  const roas = spend > 0 ? revenue / spend : 0;
  const videoCompletionRate = videoViews3s > 0 ? (videoViewsThruplay / videoViews3s) * 100 : 0;
  const engagementRate = impressions > 0 ? (engagements / impressions) * 100 : 0;

  // Mock health indicators
  const spendValues = dailyData.map(d => d.spend);
  const mean = spendValues.reduce((a, b) => a + b, 0) / spendValues.length;
  const stdDev = Math.sqrt(spendValues.reduce((s, v) => s + (v - mean) ** 2, 0) / spendValues.length);
  const volatilityScore = mean > 0 ? (stdDev / mean) * 100 : 0;

  // Count anomalies in last 7 days
  const last7 = dailyData.slice(-7);
  let anomalyCount = 0;
  for (const day of last7) {
    const zScore = mean > 0 ? Math.abs(day.spend - mean) / (stdDev || 1) : 0;
    if (zScore > 2) anomalyCount++;
  }

  const brandSearchLift = 50 + rng() * 50;
  const shareOfVoice = 10 + rng() * 30;
  const budgetPacing = 85 + rng() * 30;
  const creativeFatigueIndex = 20 + rng() * 60;

  return {
    date: dailyData[dailyData.length - 1]?.date ?? '',
    spend, impressions, reach, clicks, landingPageViews, leads, conversions, revenue,
    videoViews3s, videoViewsThruplay, engagements, assistedConversions,
    frequency, ctr, cpc, cpm, lpvRate, cpl, cpa, roas,
    videoCompletionRate, engagementRate, brandSearchLift, shareOfVoice,
    volatilityScore, anomalyCount, budgetPacing, creativeFatigueIndex,
  };
}

export function computeDeltas(current: AggregatedKPIs, previous: AggregatedKPIs): Record<KPIKey, KPIDelta> {
  const result: Record<string, KPIDelta> = {};
  const keys: KPIKey[] = [
    'spend', 'impressions', 'reach', 'clicks', 'landingPageViews', 'leads', 'conversions', 'revenue',
    'videoViews3s', 'videoViewsThruplay', 'engagements', 'assistedConversions',
    'frequency', 'ctr', 'cpc', 'cpm', 'lpvRate', 'cpl', 'cpa', 'roas',
    'videoCompletionRate', 'engagementRate', 'brandSearchLift', 'shareOfVoice',
    'volatilityScore', 'anomalyCount', 'budgetPacing', 'creativeFatigueIndex',
  ];
  for (const key of keys) {
    const v = current[key] as number;
    const pv = previous[key] as number;
    result[key] = {
      value: v, previousValue: pv,
      delta: v - pv,
      deltaPercent: pv !== 0 ? ((v - pv) / pv) * 100 : 0,
    };
  }
  return result as Record<KPIKey, KPIDelta>;
}

// ===== Anomaly Detection =====
function detectAnomalies(dailyData: Record<string, Record<string, DailyMetrics[]>>): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const metricsToCheck: (keyof DailyMetrics)[] = ['spend', 'clicks', 'conversions', 'revenue'];

  for (const campaignDef of CAMPAIGN_DEFS) {
    for (const channel of campaignDef.channels) {
      const series = dailyData[campaignDef.id]?.[channel];
      if (!series || series.length < 30) continue;

      for (const metric of metricsToCheck) {
        const values = series.map(d => d[metric] as number);
        const rollingWindow = 30;

        for (let i = rollingWindow; i < values.length; i++) {
          const window = values.slice(i - rollingWindow, i);
          const windowMean = window.reduce((a, b) => a + b, 0) / window.length;
          const windowStd = Math.sqrt(window.reduce((s, v) => s + (v - windowMean) ** 2, 0) / window.length);

          if (windowStd === 0) continue;
          const zScore = Math.abs(values[i] - windowMean) / windowStd;

          if (zScore > 2.5) {
            const severity = zScore > 3.5 ? 'high' : zScore > 3 ? 'medium' : 'low';
            anomalies.push({
              id: `anom-${campaignDef.id}-${channel}-${metric}-${i}`,
              date: series[i].date,
              region: campaignDef.region,
              campaign: campaignDef.id,
              channel: channel,
              metric: metric as KPIKey,
              severity,
              zScore: Math.round(zScore * 100) / 100,
              description: `${metric} ${values[i] > windowMean ? 'spike' : 'drop'} in ${campaignDef.name} (${CHANNEL_LABELS[channel]}): z-score ${zScore.toFixed(1)}`,
            });
          }
        }
      }
    }
  }

  // Limit and sort by date desc
  return anomalies.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 200);
}

// ===== News Generation =====
const NEWS_SOURCES = ['Automotive News', 'Reuters', 'AdAge', 'TechCrunch', 'Bloomberg', 'Campaign', 'The Drum'];
const COMPETITORS = ['BMW', 'Mercedes-Benz', 'Audi', 'Tesla', 'Lexus'];

function generateNews(): NewsItem[] {
  const items: NewsItem[] = [];
  const templates: Array<{
    titleTemplate: (c?: string) => string; tags: NewsTag[]; urgency: NewsUrgency;
    summary: string; whyItMatters: string; competitor?: boolean;
  }> = [
    { titleTemplate: (c) => `${c} Announces Major EV Investment in ${pick(['North America', 'Europe', 'Asia'])}`, tags: ['competitor'], urgency: 'high', summary: `${pick(COMPETITORS)} is scaling up electric vehicle production with a multi-billion dollar factory expansion.`, whyItMatters: 'Direct competitive pressure on Taycan positioning and market share.', competitor: true },
    { titleTemplate: () => 'TikTok Updates Creator Fund Algorithm for Auto Content', tags: ['platform'], urgency: 'medium', summary: 'TikTok is adjusting algorithm weights for automotive content creators, potentially affecting organic reach for brand accounts.', whyItMatters: 'May impact TikTok campaign performance metrics and organic discovery.' },
    { titleTemplate: () => 'Global Luxury Car Sales Rise 8% YoY in Latest Quarter', tags: ['category'], urgency: 'low', summary: 'Industry-wide luxury car sales show continued growth driven by strong demand in North America and Middle East markets.', whyItMatters: 'Positive macro trend supports increased investment in performance campaigns.' },
    { titleTemplate: (c) => `${c} Launches Aggressive Digital Campaign Targeting Porsche Owners`, tags: ['competitor'], urgency: 'high', summary: `Competitive intelligence indicates ${pick(COMPETITORS)} is running conquest campaigns specifically targeting Porsche intenders.`, whyItMatters: 'Defensive strategy needed in affected regions to protect market share.', competitor: true },
    { titleTemplate: () => 'Meta Introduces New Advantage+ Creative Optimization', tags: ['platform'], urgency: 'medium', summary: 'Meta rolls out enhanced AI-driven creative optimization tools that could improve Facebook and Instagram campaign performance.', whyItMatters: 'New creative optimization features could reduce CPA across Meta channels.' },
    { titleTemplate: () => 'Google Search Adds AI-Powered Shopping Experience', tags: ['platform'], urgency: 'high', summary: 'Google is expanding AI-generated shopping results that could change how automotive search ads appear in results.', whyItMatters: 'Search campaign strategy may need adjustment for new SERP layouts.' },
    { titleTemplate: () => 'EU Proposes Stricter Digital Advertising Regulations', tags: ['macro'], urgency: 'medium', summary: 'European Parliament proposes new regulations on targeted digital advertising that could affect personalization capabilities.', whyItMatters: 'May require campaign targeting adjustments in European markets.' },
    { titleTemplate: () => 'Middle East Luxury Goods Market Forecast Upgraded', tags: ['macro', 'category'], urgency: 'low', summary: 'Analysts upgrade Middle East luxury market forecast citing strong oil revenues and tourism growth.', whyItMatters: 'Opportunity to increase investment in Middle East performance campaigns.' },
    { titleTemplate: () => 'APAC Currency Volatility Increases Marketing Costs', tags: ['macro'], urgency: 'high', summary: 'Currency fluctuations in APAC region are increasing effective CPMs and overall marketing costs.', whyItMatters: 'Budget pacing in APAC may need adjustment to maintain efficiency targets.' },
    { titleTemplate: (c) => `${c} Reports Record Q4 Digital Ad Spend`, tags: ['competitor'], urgency: 'medium', summary: `${pick(COMPETITORS)} significantly increased digital advertising investment, signaling heightened competitive intensity.`, whyItMatters: 'Share of voice may decline without proportional spend increases.', competitor: true },
    { titleTemplate: () => 'The Trade Desk Launches New CTV Targeting Features', tags: ['platform'], urgency: 'medium', summary: 'TTD introduces enhanced connected TV targeting capabilities with first-party data integration.', whyItMatters: 'New upper-funnel targeting options could improve awareness campaign efficiency.' },
    { titleTemplate: () => 'Global EV Adoption Accelerates Beyond Forecasts', tags: ['category'], urgency: 'low', summary: 'Electric vehicle adoption rates exceed analyst expectations across all major markets.', whyItMatters: 'Supports increased investment in Taycan-focused campaigns across regions.' },
    { titleTemplate: () => 'Instagram Reels Engagement Surpasses TikTok in Key Demographics', tags: ['platform'], urgency: 'medium', summary: 'New data shows Instagram Reels outperforming TikTok for engagement among luxury auto intenders aged 35-54.', whyItMatters: 'Consider shifting video content budget allocation between platforms.' },
    { titleTemplate: () => 'UK Auto Market Shows Signs of Recovery', tags: ['macro', 'category'], urgency: 'low', summary: 'UK automotive registrations up 12% following post-Brexit trade stabilization.', whyItMatters: 'Favorable conditions for scaling UK campaign budgets.' },
    { titleTemplate: () => 'LATAM Digital Ad Market Grows 25% YoY', tags: ['macro'], urgency: 'medium', summary: 'Latin American digital advertising market experiences rapid growth driven by increasing internet penetration.', whyItMatters: 'Growing addressable audience supports LATAM campaign expansion.' },
    { titleTemplate: (c) => `${c} Shifts 40% of Budget to Performance Max`, tags: ['competitor'], urgency: 'medium', summary: `${pick(COMPETITORS)} reportedly moving significant budget to Google Performance Max campaigns.`, whyItMatters: 'Competitor adoption may increase auction pressure on Performance Max.', competitor: true },
    { titleTemplate: () => 'New Privacy Regulations Impact Cross-Border Targeting', tags: ['macro', 'platform'], urgency: 'high', summary: 'New data privacy frameworks across multiple regions are limiting cross-border audience targeting capabilities.', whyItMatters: 'Regional targeting strategies need review for compliance and effectiveness.' },
    { titleTemplate: () => 'Connected Car Data Opens New Marketing Channels', tags: ['category', 'platform'], urgency: 'low', summary: 'Automotive OEMs explore first-party connected car data for targeted marketing and customer retention.', whyItMatters: 'Potential new channel for existing owner engagement and upsell campaigns.' },
  ];

  for (let i = 0; i < 80; i++) {
    const template = templates[i % templates.length];
    const daysAgo = randInt(0, 89);
    const date = format(subDays(END_DATE, daysAgo), 'yyyy-MM-dd');
    const competitor = template.competitor ? pick(COMPETITORS) : undefined;
    const regions = pickN(ALL_REGIONS, randInt(1, 3));

    items.push({
      id: `news-${i}`,
      title: template.titleTemplate(competitor),
      source: pick(NEWS_SOURCES),
      date,
      tags: template.tags,
      regions: regions,
      urgency: template.urgency,
      summary: template.summary,
      whyItMatters: template.whyItMatters,
      competitor,
    });
  }

  return items.sort((a, b) => b.date.localeCompare(a.date));
}

// ===== Action Step Templates =====
const ACTION_STEP_TEMPLATES: Record<InsightCategory, Array<{ title: string; subtitle: string; type: InsightActionStep['type'] }>> = {
  performance: [
    { title: 'Optimize Budget Allocation', subtitle: 'REDISTRIBUTE SPEND ACROSS TOP AD SETS', type: 'budget' },
    { title: 'Adjust Channel Bids', subtitle: 'INCREASE BIDS ON HIGH-ROAS CHANNELS', type: 'bidding' },
    { title: 'Refine Audience Targeting', subtitle: 'NARROW TO HIGH-INTENT SEGMENTS', type: 'targeting' },
  ],
  creative: [
    { title: 'Refresh Creative Assets', subtitle: 'REPLACE FATIGUED AD UNITS WITH NEW VARIANTS', type: 'creative' },
    { title: 'A/B Test New Variants', subtitle: 'LAUNCH 3 NEW CREATIVE CONCEPTS', type: 'creative' },
    { title: 'Adjust Ad Scheduling', subtitle: 'SHIFT DELIVERY TO PEAK HOURS', type: 'scheduling' },
  ],
  competitive: [
    { title: 'Launch Conquest Campaign', subtitle: 'TARGET COMPETITOR AUDIENCES', type: 'targeting' },
    { title: 'Increase Brand Spend', subtitle: 'BOOST AWARENESS BUDGET BY 15%', type: 'budget' },
    { title: 'Adjust Bidding Strategy', subtitle: 'INCREASE BIDS ON CONTESTED TERMS', type: 'bidding' },
  ],
  platform: [
    { title: 'Update Bidding Strategy', subtitle: 'ALIGN WITH NEW ALGORITHM PREFERENCES', type: 'bidding' },
    { title: 'Adjust Ad Formats', subtitle: 'ADOPT PLATFORM-RECOMMENDED FORMATS', type: 'creative' },
    { title: 'Revise Targeting Parameters', subtitle: 'UPDATE AUDIENCE DEFINITIONS', type: 'targeting' },
  ],
  macro: [
    { title: 'Reallocate Regional Budget', subtitle: 'SHIFT SPEND TO FAVORABLE MARKETS', type: 'budget' },
    { title: 'Adjust Messaging', subtitle: 'UPDATE COPY FOR MARKET CONDITIONS', type: 'creative' },
    { title: 'Modify Flight Schedule', subtitle: 'RESCHEDULE CAMPAIGNS FOR OPTIMAL TIMING', type: 'scheduling' },
  ],
};

function generateActionSteps(category: InsightCategory, insightIndex: number): InsightActionStep[] {
  const templates = ACTION_STEP_TEMPLATES[category];
  const count = 1 + (insightIndex % 3); // 1-3 steps
  const steps: InsightActionStep[] = [];
  for (let i = 0; i < count; i++) {
    const t = templates[i % templates.length];
    steps.push({
      id: `step-${insightIndex}-${i}`,
      title: t.title,
      subtitle: t.subtitle,
      type: t.type,
      completed: false,
    });
  }
  return steps;
}

// ===== Curated Insight Generation =====
function generateInsights(_anomalies: Anomaly[]): Insight[] {
  const today = format(END_DATE, 'yyyy-MM-dd');
  const yesterday = format(subDays(END_DATE, 1), 'yyyy-MM-dd');
  const twoDaysAgo = format(subDays(END_DATE, 2), 'yyyy-MM-dd');

  const curated: Insight[] = [
    // ── CAMPAIGN group (scope=campaign, category≠creative) ──
    {
      id: 'insight-pacing-1',
      createdAt: today,
      scope: 'campaign',
      category: 'performance',
      region: 'north-america',
      campaign: 'na-taycan-launch',
      channels: ['instagram', 'facebook', 'tiktok'],
      title: 'Pacing to Underspend',
      recommendedAction: 'Adjust pacing to reach the end date',
      summary: 'Current daily spend rate projects a $3,750 underspend by flight end. Increasing daily budget or expanding targeting will close the gap.',
      evidence: ['Projected spend: $46,250 of $50,000 budget', 'Daily run rate $325 below target', '18 days remaining in flight'],
      impactEstimate: '+$3.8K utilization',
      confidence: 88,
      status: 'new',
      actionSteps: generateActionSteps('performance', 0),
    },
    {
      id: 'insight-cvr-decline',
      createdAt: yesterday,
      scope: 'campaign',
      category: 'performance',
      region: 'europe',
      campaign: 'eu-taycan-turbo',
      channels: ['google-search', 'facebook'],
      title: 'Conversion Rate Declining',
      recommendedAction: 'Review landing page and audience targeting',
      summary: 'Campaign conversion rate has dropped 22% over the last 14 days while traffic volume remains steady, suggesting landing page or audience quality issues.',
      evidence: ['CVR dropped from 3.2% to 2.5% over 14 days', 'Click volume stable at ~1,200/day', 'Bounce rate increased 15% on landing page'],
      impactEstimate: '-$12K rev risk',
      confidence: 82,
      status: 'new',
      actionSteps: generateActionSteps('performance', 1),
    },
    {
      id: 'insight-cpa-above',
      createdAt: twoDaysAgo,
      scope: 'campaign',
      category: 'performance',
      region: 'north-america',
      campaign: 'na-911-performance',
      channels: ['google-search', 'facebook', 'instagram'],
      title: 'CPA Trending Above Target',
      recommendedAction: 'Tighten targeting or reduce bid caps on low-ROAS segments',
      summary: 'Cost per acquisition has risen 18% above the $45 target over the past week. Bidding inefficiency on broad audiences is the primary driver.',
      evidence: ['Current CPA $53 vs $45 target', 'Broad audience CPA is 2.1x retargeting CPA', 'Bid cap exceeded on 3 ad sets'],
      impactEstimate: '-$8K efficiency',
      confidence: 79,
      status: 'new',
      actionSteps: generateActionSteps('performance', 2),
    },

    // ── CROSS CHANNEL group (scope=brand|region, category≠creative) ──
    {
      id: 'insight-channel-mix',
      createdAt: today,
      scope: 'brand',
      category: 'performance',
      channels: ['instagram', 'google-search', 'facebook'],
      title: 'Channel Mix Imbalance',
      recommendedAction: 'Shift budget from saturated to high-ROAS channels',
      summary: 'Instagram is receiving 40% of total budget but generating only 18% of conversions. Google Search shows 3.2x higher ROAS with room to scale.',
      evidence: ['Instagram ROAS: 1.2x vs Google Search ROAS: 3.8x', '40% budget → 18% conversions on Instagram', 'Google Search impression share only 62%'],
      impactEstimate: '+$28K rev potential',
      confidence: 91,
      status: 'new',
      actionSteps: generateActionSteps('performance', 3),
    },
    {
      id: 'insight-meta-diminishing',
      createdAt: yesterday,
      scope: 'region',
      category: 'platform',
      region: 'europe',
      channels: ['facebook', 'google-search'],
      title: 'Diminishing Returns on Meta',
      recommendedAction: 'Reallocate excess Facebook spend to Google Search',
      summary: 'Incremental CPA on Facebook has risen 35% as audience overlap between ad sets reaches 45%. Moving $5K weekly to Search would improve blended efficiency.',
      evidence: ['Facebook incremental CPA up 35% MoM', 'Audience overlap at 45% across 4 ad sets', 'Google Search has 38% headroom on impression share'],
      impactEstimate: '-$4.2K CPA savings',
      confidence: 85,
      status: 'new',
      actionSteps: generateActionSteps('platform', 4),
    },
    {
      id: 'insight-freq-cap',
      createdAt: twoDaysAgo,
      scope: 'brand',
      category: 'performance',
      channels: ['instagram', 'facebook', 'tiktok', 'ttd'],
      title: 'Cross-Channel Frequency Cap',
      recommendedAction: 'Cap combined exposure to reduce wasted impressions',
      summary: 'Users are seeing an average of 12.4 impressions per week across channels, well above the 8x optimal threshold. Excess frequency is driving CPM inflation without conversion lift.',
      evidence: ['Average weekly frequency: 12.4x (target: 8x)', 'CTR drops 40% after 9th impression', 'Estimated waste: $6K/week in excess impressions'],
      impactEstimate: '-$6K waste/wk',
      confidence: 87,
      status: 'new',
      actionSteps: generateActionSteps('performance', 5),
    },

    // ── AD group (category=creative) ──
    {
      id: 'insight-fatigue-1',
      createdAt: today,
      scope: 'campaign',
      category: 'creative',
      region: 'north-america',
      campaign: 'na-taycan-launch',
      channels: ['instagram', 'facebook'],
      title: 'Possible Creative Fatigue',
      recommendedAction: 'Pause spend on underperforming ad',
      summary: 'Primary hero creative has been running for 21 days with CTR declining steadily. Frequency has reached 6.8x in core audience, indicating ad fatigue.',
      evidence: ['CTR declined 28% over 14 days', 'Frequency reached 6.8x in primary audience', 'Creative fatigue index: 72/100'],
      impactEstimate: '+18% CTR recovery',
      confidence: 84,
      status: 'new',
      actionSteps: generateActionSteps('creative', 6),
    },
    {
      id: 'insight-fatigue-2',
      createdAt: yesterday,
      scope: 'campaign',
      category: 'creative',
      region: 'europe',
      campaign: 'eu-911-heritage',
      channels: ['instagram', 'tiktok'],
      title: 'Possible Creative Fatigue',
      recommendedAction: 'Pause spend on underperforming ad',
      summary: 'Video ad variant B has reached saturation with completion rates dropping below 15%. Audience has been heavily exposed over the past 3 weeks.',
      evidence: ['Video completion rate dropped from 28% to 14%', 'Frequency: 5.4x in lookalike audience', 'CPA increased 32% for this creative'],
      impactEstimate: '+22% VCR recovery',
      confidence: 78,
      status: 'new',
      actionSteps: generateActionSteps('creative', 7),
    },
    {
      id: 'insight-fatigue-3',
      createdAt: twoDaysAgo,
      scope: 'campaign',
      category: 'creative',
      region: 'uk',
      campaign: 'uk-cayenne-summer',
      channels: ['instagram', 'facebook'],
      title: 'Possible Creative Fatigue',
      recommendedAction: 'Pause spend on underperforming ad',
      summary: 'Carousel ad in UK Cayenne campaign shows declining engagement. Swipe rate has halved while CPC has doubled, suggesting creative exhaustion.',
      evidence: ['Swipe rate dropped 52% in 10 days', 'CPC increased from $1.20 to $2.45', 'Engagement rate: 1.1% (was 2.8%)'],
      impactEstimate: '+$2.1K efficiency',
      confidence: 81,
      status: 'new',
      actionSteps: generateActionSteps('creative', 8),
    },
    {
      id: 'insight-scale-top',
      createdAt: today,
      scope: 'campaign',
      category: 'creative',
      region: 'north-america',
      campaign: 'na-taycan-launch',
      channels: ['tiktok', 'instagram'],
      title: 'Top Performer Ready to Scale',
      recommendedAction: 'Increase budget allocation to top creative',
      summary: 'New UGC-style Taycan video is outperforming all other creatives by 2.4x on ROAS. Currently capped at 15% of ad set budget — scaling to 35% is projected to improve overall campaign ROAS.',
      evidence: ['Creative ROAS: 4.8x vs campaign avg 2.0x', 'Only receiving 15% of ad set budget', 'No fatigue signals after 12 days'],
      impactEstimate: '+$18K rev potential',
      confidence: 92,
      status: 'new',
      actionSteps: generateActionSteps('creative', 9),
    },
    {
      id: 'insight-low-engage',
      createdAt: yesterday,
      scope: 'campaign',
      category: 'creative',
      region: 'apac',
      campaign: 'apac-taycan-launch',
      channels: ['facebook', 'instagram'],
      title: 'Low Engagement Variant',
      recommendedAction: 'Replace or refresh underperforming creative',
      summary: 'Static image variant C has the lowest engagement rate across all active creatives at 0.8%. Budget is being wasted on an asset that fails to capture attention.',
      evidence: ['Engagement rate: 0.8% (campaign avg: 2.3%)', 'CTR: 0.4% vs 1.2% campaign average', 'Zero conversions attributed in last 7 days'],
      impactEstimate: '+$3.5K reallocation',
      confidence: 90,
      status: 'new',
      actionSteps: generateActionSteps('creative', 10),
    },
  ];

  return curated;
}

// ===== Main Data Store =====
export interface MockDataStore {
  campaigns: Campaign[];
  dailyData: Record<string, Record<string, DailyMetrics[]>>;
  newsItems: NewsItem[];
  insights: Insight[];
  anomalies: Anomaly[];
}

let cachedStore: MockDataStore | null = null;

export function generateAllData(): MockDataStore {
  if (cachedStore) return cachedStore;

  const campaigns: Campaign[] = CAMPAIGN_DEFS.map(def => ({
    id: def.id,
    name: def.name,
    region: def.region,
    objective: def.objective,
    status: def.status,
    channels: def.channels,
    startDate: format(START_DATE, 'yyyy-MM-dd'),
    plannedBudget: Math.round(def.budgetMultiplier * REGION_MULTIPLIERS[def.region] * 150000),
  }));

  const dailyData = generateDailyData();
  const anomalies = detectAnomalies(dailyData);
  const newsItems = generateNews();
  const insights = generateInsights(anomalies);

  cachedStore = { campaigns, dailyData, newsItems, insights, anomalies };
  return cachedStore;
}
