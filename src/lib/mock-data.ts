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
  countries: string[];
}

const CAMPAIGN_DEFS: CampaignDef[] = [
  // North America (840=USA, 124=Canada, 484=Mexico)
  { id: 'na-sapphire-launch', name: 'NA Sapphire Reserve Launch', region: 'north-america', objective: 'awareness', status: 'live', channels: ['instagram', 'facebook', 'tiktok', 'ttd'], budgetMultiplier: 1.5, countries: ['840', '124', '484'] },
  { id: 'na-private-banking', name: 'NA Private Banking Acquisition', region: 'north-america', objective: 'performance', status: 'live', channels: ['google-search', 'facebook', 'instagram'], budgetMultiplier: 1.2, countries: ['840', '124'] },
  { id: 'na-wealth-mgmt', name: 'NA Wealth Management', region: 'north-america', objective: 'consideration', status: 'live', channels: ['instagram', 'tiktok', 'ttd', 'facebook'], budgetMultiplier: 1.0, countries: ['840'] },
  { id: 'na-commercial-retarget', name: 'NA Commercial Lending Retargeting', region: 'north-america', objective: 'performance', status: 'paused', channels: ['google-search', 'facebook', 'ttd'], budgetMultiplier: 0.7, countries: ['840', '124'] },
  { id: 'na-brand-always-on', name: 'NA Brand Always-On', region: 'north-america', objective: 'awareness', status: 'live', channels: ['instagram', 'facebook', 'tiktok', 'google-search', 'ttd'], budgetMultiplier: 0.9, countries: ['840', '124', '484'] },
  // Europe (276=Germany, 250=France, 380=Italy, 724=Spain, 528=Netherlands, 756=Switzerland, 752=Sweden, 578=Norway)
  { id: 'eu-private-heritage', name: 'EU Private Banking Heritage', region: 'europe', objective: 'awareness', status: 'live', channels: ['instagram', 'facebook', 'tiktok', 'ttd'], budgetMultiplier: 1.3, countries: ['276', '250', '380', '724', '528'] },
  { id: 'eu-asset-mgmt', name: 'EU Asset Management', region: 'europe', objective: 'performance', status: 'live', channels: ['google-search', 'facebook', 'instagram', 'ttd'], budgetMultiplier: 1.1, countries: ['276', '756', '528'] },
  { id: 'eu-wealth-exec', name: 'EU Wealth Management Executive', region: 'europe', objective: 'consideration', status: 'live', channels: ['facebook', 'google-search', 'ttd'], budgetMultiplier: 0.8, countries: ['276', '250', '380'] },
  { id: 'eu-winter-campaign', name: 'EU Year-End Planning', region: 'europe', objective: 'awareness', status: 'paused', channels: ['instagram', 'tiktok', 'facebook'], budgetMultiplier: 0.6, countries: ['752', '578', '756'] },
  // UK (826=United Kingdom, 372=Ireland)
  { id: 'uk-wealth-mgmt', name: 'UK Wealth Management', region: 'uk', objective: 'consideration', status: 'live', channels: ['instagram', 'facebook', 'google-search', 'ttd'], budgetMultiplier: 1.0, countries: ['826', '372'] },
  { id: 'uk-asset-digital', name: 'UK Asset Management Digital', region: 'uk', objective: 'performance', status: 'live', channels: ['google-search', 'facebook', 'ttd'], budgetMultiplier: 1.1, countries: ['826'] },
  { id: 'uk-private-heritage', name: 'UK Private Banking Heritage', region: 'uk', objective: 'awareness', status: 'live', channels: ['instagram', 'tiktok', 'facebook'], budgetMultiplier: 0.7, countries: ['826', '372'] },
  { id: 'uk-sapphire-launch', name: 'UK Sapphire Launch', region: 'uk', objective: 'awareness', status: 'live', channels: ['instagram', 'facebook', 'tiktok', 'google-search', 'ttd'], budgetMultiplier: 1.2, countries: ['826'] },
  // Middle East (682=Saudi Arabia, 784=UAE, 634=Qatar, 414=Kuwait, 512=Oman)
  { id: 'me-wealth-luxury', name: 'ME Wealth Management Luxury', region: 'middle-east', objective: 'awareness', status: 'live', channels: ['instagram', 'tiktok', 'ttd'], budgetMultiplier: 1.0, countries: ['784', '682', '634'] },
  { id: 'me-private-elite', name: 'ME Private Banking Elite', region: 'middle-east', objective: 'performance', status: 'live', channels: ['google-search', 'instagram', 'facebook'], budgetMultiplier: 0.9, countries: ['784', '682'] },
  { id: 'me-asset-mgmt', name: 'ME Asset Management', region: 'middle-east', objective: 'consideration', status: 'live', channels: ['tiktok', 'instagram', 'ttd'], budgetMultiplier: 0.8, countries: ['784', '414', '512'] },
  { id: 'me-commercial-vip', name: 'ME Commercial Banking VIP', region: 'middle-east', objective: 'performance', status: 'paused', channels: ['google-search', 'facebook'], budgetMultiplier: 0.5, countries: ['682', '634'] },
  // APAC (156=China, 392=Japan, 410=South Korea, 036=Australia, 702=Singapore)
  { id: 'apac-sapphire-launch', name: 'APAC Sapphire Launch', region: 'apac', objective: 'awareness', status: 'live', channels: ['instagram', 'facebook', 'tiktok', 'ttd'], budgetMultiplier: 1.3, countries: ['156', '392', '410', '036'] },
  { id: 'apac-wealth-family', name: 'APAC Wealth Management Family', region: 'apac', objective: 'consideration', status: 'live', channels: ['facebook', 'instagram', 'google-search'], budgetMultiplier: 0.9, countries: ['156', '036', '702'] },
  { id: 'apac-private-premium', name: 'APAC Private Banking Premium', region: 'apac', objective: 'performance', status: 'live', channels: ['google-search', 'instagram', 'tiktok'], budgetMultiplier: 0.8, countries: ['392', '410'] },
  { id: 'apac-brand-digital', name: 'APAC Brand Digital', region: 'apac', objective: 'awareness', status: 'live', channels: ['tiktok', 'instagram', 'ttd', 'facebook'], budgetMultiplier: 0.7, countries: ['156', '392', '036', '702', '410'] },
  // LATAM (076=Brazil, 032=Argentina, 152=Chile, 170=Colombia, 604=Peru)
  { id: 'latam-wealth-urban', name: 'LATAM Wealth Management Urban', region: 'latam', objective: 'consideration', status: 'live', channels: ['instagram', 'facebook', 'tiktok'], budgetMultiplier: 0.8, countries: ['076', '032', '170'] },
  { id: 'latam-private-legacy', name: 'LATAM Private Banking Legacy', region: 'latam', objective: 'awareness', status: 'live', channels: ['instagram', 'tiktok', 'ttd'], budgetMultiplier: 0.7, countries: ['076', '152'] },
  { id: 'latam-asset-esg', name: 'LATAM Asset Management ESG', region: 'latam', objective: 'performance', status: 'live', channels: ['google-search', 'facebook'], budgetMultiplier: 0.6, countries: ['076', '032', '604'] },
  { id: 'latam-commercial-growth', name: 'LATAM Commercial Banking Growth', region: 'latam', objective: 'awareness', status: 'paused', channels: ['instagram', 'facebook', 'tiktok', 'ttd'], budgetMultiplier: 0.5, countries: ['076', '170', '152', '032'] },
];

// ===== Events (anomaly generators) =====
interface DataEvent {
  name: string; dayOffset: number; duration: number;
  regions: RegionId[]; spendMult: number; cvrMult: number; engageMult: number;
}

const DATA_EVENTS: DataEvent[] = [
  { name: 'Sapphire Reserve Launch', dayOffset: 45, duration: 7, regions: ['north-america', 'europe', 'uk'], spendMult: 1.8, cvrMult: 1.3, engageMult: 2.0 },
  { name: 'Competitive Surge Goldman Sachs', dayOffset: 90, duration: 10, regions: ['europe'], spendMult: 1.0, cvrMult: 0.8, engageMult: 0.7 },
  { name: 'APAC Economic Softness', dayOffset: 120, duration: 14, regions: ['apac'], spendMult: 0.9, cvrMult: 0.65, engageMult: 0.85 },
  { name: 'Year-End Financial Planning Surge', dayOffset: 70, duration: 14, regions: ALL_REGIONS, spendMult: 1.3, cvrMult: 1.15, engageMult: 1.4 },
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
const NEWS_SOURCES = ['Financial Times', 'Reuters', 'AdAge', 'Bloomberg', 'Wall Street Journal', 'Campaign', 'The Drum'];
const COMPETITORS = ['Goldman Sachs', 'Morgan Stanley', 'Bank of America', 'Citigroup', 'Wells Fargo'];

function generateNews(): NewsItem[] {
  const items: NewsItem[] = [];
  const templates: Array<{
    titleTemplate: (c?: string) => string; tags: NewsTag[]; urgency: NewsUrgency;
    summary: string; whyItMatters: string; competitor?: boolean;
  }> = [
    // ── Brand News (JP Morgan mentions) ──
    { titleTemplate: () => 'JP Morgan Chase Reports Record Q1 Revenue of $42.4B Driven by Consumer Banking Growth', tags: ['brand'], urgency: 'high', summary: 'JP Morgan Chase reported record first-quarter revenue, surpassing analyst expectations by 8%, driven by strong consumer banking and net interest income.', whyItMatters: 'Strong earnings provide ammunition for brand trust messaging and market leadership positioning in campaigns.' },
    { titleTemplate: () => 'JP Morgan Launches Next-Gen Sapphire Reserve Card With Enhanced Travel Benefits', tags: ['brand'], urgency: 'high', summary: 'JP Morgan has unveiled an upgraded Sapphire Reserve card featuring new travel perks, dining rewards, and a redesigned metal card to compete with Amex Platinum.', whyItMatters: 'Major product launch — all Sapphire campaigns should align messaging with new benefits and creative assets.' },
    { titleTemplate: () => 'JP Morgan Wealth Management Surpasses $4 Trillion in Client Assets', tags: ['brand'], urgency: 'medium', summary: 'JP Morgan\'s wealth management division has crossed the $4 trillion AUM milestone, cementing its position as the largest US wealth manager.', whyItMatters: 'AUM milestone supports credibility messaging — feature in Private Banking and Wealth Management campaigns.' },
    { titleTemplate: () => 'JP Morgan Named "World\'s Best Digital Bank" by Global Finance Magazine', tags: ['brand'], urgency: 'medium', summary: 'Global Finance Magazine has awarded JP Morgan Chase its top honor for digital banking innovation, citing the Chase mobile app and digital onboarding experience.', whyItMatters: 'Award recognition should be leveraged in digital-first campaign creative and landing pages.' },
    { titleTemplate: () => 'JP Morgan CEO Jamie Dimon Highlights AI Investment in Annual Shareholder Letter', tags: ['brand'], urgency: 'medium', summary: 'In his annual letter, Jamie Dimon outlined JP Morgan\'s $2B AI investment strategy, positioning the firm as a leader in financial technology innovation.', whyItMatters: 'CEO thought leadership creates PR momentum — amplify via thought leadership and brand awareness campaigns.' },
    { titleTemplate: () => 'JP Morgan Expands Private Banking Operations Across Southeast Asia', tags: ['brand'], urgency: 'high', summary: 'JP Morgan is opening new private banking offices in Singapore, Bangkok, and Jakarta as part of a major APAC wealth management expansion.', whyItMatters: 'APAC expansion supports scaling Private Banking campaigns in the region with local market credibility.' },
    { titleTemplate: () => 'JP Morgan Reports 23% YoY Increase in Mobile Banking Active Users', tags: ['brand'], urgency: 'low', summary: 'Chase mobile app active users have grown to 67 million, with transaction volumes up 31% year-over-year across all consumer banking products.', whyItMatters: 'Growing digital engagement validates mobile-first campaign strategies and app-download CTAs.' },
    { titleTemplate: () => 'JP Morgan Chase Foundation Commits $500M to Affordable Housing Initiative', tags: ['brand'], urgency: 'low', summary: 'The JP Morgan Chase Foundation has announced a $500 million commitment to affordable housing and community development across underserved US markets.', whyItMatters: 'CSR initiatives enhance brand perception — consider integrating into purpose-driven brand awareness campaigns.' },
    { titleTemplate: () => 'JP Morgan Commercial Banking Opens New Innovation Hub in Dallas', tags: ['brand'], urgency: 'low', summary: 'JP Morgan\'s commercial banking division has opened a new innovation and technology hub in Dallas, creating 2,000 jobs and expanding regional capabilities.', whyItMatters: 'Regional expansion news supports geo-targeted commercial banking campaigns in the South Central US market.' },
    { titleTemplate: () => 'JP Morgan Partners With Formula E as Official Banking Partner', tags: ['brand'], urgency: 'medium', summary: 'JP Morgan has signed a multi-year sponsorship deal with Formula E, aligning the brand with sustainability and premium sports marketing.', whyItMatters: 'Sponsorship deal creates new content opportunities — integrate Formula E assets into awareness and lifestyle campaigns.' },

    { titleTemplate: (c) => `${c} Announces Major Wealth Management Expansion in ${pick(['North America', 'Europe', 'Asia'])}`, tags: ['competitor'], urgency: 'high', summary: `${pick(COMPETITORS)} is scaling up wealth management operations with a multi-billion dollar investment in new advisory centers.`, whyItMatters: 'Direct competitive pressure on JP Morgan Private Banking positioning and market share.', competitor: true },
    { titleTemplate: () => 'TikTok Updates Creator Fund Algorithm for Finance Content', tags: ['platform'], urgency: 'medium', summary: 'TikTok is adjusting algorithm weights for financial content creators, potentially affecting organic reach for brand accounts.', whyItMatters: 'May impact TikTok campaign performance metrics and organic discovery.' },
    { titleTemplate: () => 'Global Wealth Management AUM Rises 8% YoY in Latest Quarter', tags: ['category'], urgency: 'low', summary: 'Industry-wide assets under management show continued growth driven by strong demand in North America and Middle East markets.', whyItMatters: 'Positive macro trend supports increased investment in performance campaigns.' },
    { titleTemplate: (c) => `${c} Launches Aggressive Digital Campaign Targeting JP Morgan Clients`, tags: ['competitor'], urgency: 'high', summary: `Competitive intelligence indicates ${pick(COMPETITORS)} is running conquest campaigns specifically targeting JP Morgan HNW prospects.`, whyItMatters: 'Defensive strategy needed in affected regions to protect market share.', competitor: true },
    { titleTemplate: () => 'Meta Introduces New Advantage+ Creative Optimization', tags: ['platform'], urgency: 'medium', summary: 'Meta rolls out enhanced AI-driven creative optimization tools that could improve Facebook and Instagram campaign performance.', whyItMatters: 'New creative optimization features could reduce CPA across Meta channels.' },
    { titleTemplate: () => 'Google Search Adds AI-Powered Financial Services Experience', tags: ['platform'], urgency: 'high', summary: 'Google is expanding AI-generated financial comparison results that could change how banking search ads appear in results.', whyItMatters: 'Search campaign strategy may need adjustment for new SERP layouts.' },
    { titleTemplate: () => 'EU Proposes Stricter Digital Advertising Regulations', tags: ['macro'], urgency: 'medium', summary: 'European Parliament proposes new regulations on targeted digital advertising that could affect personalization capabilities.', whyItMatters: 'May require campaign targeting adjustments in European markets.' },
    { titleTemplate: () => 'Middle East Private Banking Market Forecast Upgraded', tags: ['macro', 'category'], urgency: 'low', summary: 'Analysts upgrade Middle East wealth management forecast citing strong oil revenues and sovereign wealth fund growth.', whyItMatters: 'Opportunity to increase investment in Middle East performance campaigns.' },
    { titleTemplate: () => 'APAC Currency Volatility Increases Marketing Costs', tags: ['macro'], urgency: 'high', summary: 'Currency fluctuations in APAC region are increasing effective CPMs and overall marketing costs.', whyItMatters: 'Budget pacing in APAC may need adjustment to maintain efficiency targets.' },
    { titleTemplate: (c) => `${c} Reports Record Q4 Digital Ad Spend`, tags: ['competitor'], urgency: 'medium', summary: `${pick(COMPETITORS)} significantly increased digital advertising investment, signaling heightened competitive intensity.`, whyItMatters: 'Share of voice may decline without proportional spend increases.', competitor: true },
    { titleTemplate: () => 'The Trade Desk Launches New CTV Targeting Features', tags: ['platform'], urgency: 'medium', summary: 'TTD introduces enhanced connected TV targeting capabilities with first-party data integration.', whyItMatters: 'New upper-funnel targeting options could improve awareness campaign efficiency.' },
    { titleTemplate: () => 'Digital Banking Adoption Accelerates Beyond Forecasts', tags: ['category'], urgency: 'low', summary: 'Digital banking adoption rates exceed analyst expectations across all major markets.', whyItMatters: 'Supports increased investment in Sapphire-focused campaigns across regions.' },
    { titleTemplate: () => 'Instagram Reels Engagement Surpasses TikTok in Key Demographics', tags: ['platform'], urgency: 'medium', summary: 'New data shows Instagram Reels outperforming TikTok for engagement among affluent financial decision-makers aged 35-54.', whyItMatters: 'Consider shifting video content budget allocation between platforms.' },
    { titleTemplate: () => 'UK Financial Services Market Shows Signs of Recovery', tags: ['macro', 'category'], urgency: 'low', summary: 'UK financial services sector up 12% following post-Brexit regulatory stabilization.', whyItMatters: 'Favorable conditions for scaling UK campaign budgets.' },
    { titleTemplate: () => 'LATAM Digital Ad Market Grows 25% YoY', tags: ['macro'], urgency: 'medium', summary: 'Latin American digital advertising market experiences rapid growth driven by increasing internet penetration.', whyItMatters: 'Growing addressable audience supports LATAM campaign expansion.' },
    { titleTemplate: (c) => `${c} Shifts 40% of Budget to Performance Max`, tags: ['competitor'], urgency: 'medium', summary: `${pick(COMPETITORS)} reportedly moving significant budget to Google Performance Max campaigns.`, whyItMatters: 'Competitor adoption may increase auction pressure on Performance Max.', competitor: true },
    { titleTemplate: () => 'New Privacy Regulations Impact Cross-Border Targeting', tags: ['macro', 'platform'], urgency: 'high', summary: 'New data privacy frameworks across multiple regions are limiting cross-border audience targeting capabilities.', whyItMatters: 'Regional targeting strategies need review for compliance and effectiveness.' },
    { titleTemplate: () => 'Open Banking Data Opens New Marketing Channels', tags: ['category', 'platform'], urgency: 'low', summary: 'Financial institutions explore first-party open banking data for targeted marketing and customer retention.', whyItMatters: 'Potential new channel for existing client engagement and cross-sell campaigns.' },

    // ── Audience Behaviour ──
    { titleTemplate: () => 'Gen Z Opens 40% More Brokerage Accounts Than Millennials Did at Same Age', tags: ['audience'], urgency: 'high', summary: 'New data from Deloitte shows Gen Z investors are opening brokerage accounts at record rates, driven by fintech apps and social media financial education.', whyItMatters: 'Opportunity to capture next-gen HNW clients early with targeted Sapphire and investing campaigns on TikTok and Instagram.' },
    { titleTemplate: () => 'HNW Investors Shift to Mobile-First Financial Management', tags: ['audience'], urgency: 'medium', summary: 'A McKinsey study reveals 68% of high-net-worth individuals now prefer mobile apps over in-branch visits for routine portfolio management and transactions.', whyItMatters: 'Digital-first campaigns and app-focused CTAs may outperform traditional lead generation funnels.' },
    { titleTemplate: () => 'Affluent Consumer Trust in Traditional Banks Rebounds to Pre-2020 Levels', tags: ['audience'], urgency: 'low', summary: 'Consumer confidence surveys show affluent individuals are returning trust to established financial institutions over fintech-only providers.', whyItMatters: 'Heritage and trust messaging will resonate more strongly — lean into JP Morgan\'s 200+ year legacy in creative.' },
    { titleTemplate: () => 'Cross-Border Wealth Transfers Surge Among Millennial Inheritors', tags: ['audience'], urgency: 'medium', summary: 'The great wealth transfer is accelerating as millennial and Gen X heirs manage cross-border inheritance, creating demand for global advisory services.', whyItMatters: 'Target inheritor segments in APAC and Middle East with Private Banking consideration campaigns.' },

    // ── Regulation & Policy ──
    { titleTemplate: () => 'SEC Finalizes New Digital Advertising Disclosure Rules for Financial Services', tags: ['regulation'], urgency: 'high', summary: 'The SEC has published final rules requiring enhanced disclosures in digital financial product advertisements, including social media and programmatic ads.', whyItMatters: 'All US-facing ad creatives must be audited for compliance by Q3 — budget for legal review and creative refresh.' },
    { titleTemplate: () => 'EU MiCA Regulation Creates New Crypto Marketing Restrictions', tags: ['regulation'], urgency: 'medium', summary: 'The Markets in Crypto-Assets regulation imposes strict marketing guidelines for crypto and digital asset products across EU member states.', whyItMatters: 'European digital asset campaigns need messaging overhaul to comply with new disclosure requirements.' },
    { titleTemplate: () => 'FCA Tightens Social Media Financial Promotion Rules in the UK', tags: ['regulation'], urgency: 'high', summary: 'The UK Financial Conduct Authority has expanded its financial promotion rules to cover influencer partnerships and paid social media content.', whyItMatters: 'UK influencer and social campaigns require compliance review — may impact TikTok and Instagram strategies.' },
    { titleTemplate: () => 'APAC Regulators Harmonize Cross-Border Data Sharing Framework', tags: ['regulation'], urgency: 'medium', summary: 'A new APAC regulatory framework allows easier cross-border data sharing for financial institutions, potentially enabling unified regional targeting.', whyItMatters: 'Unlocks new targeting capabilities for APAC campaigns — consolidate regional audience pools.' },

    // ── Technological Disruption ──
    { titleTemplate: () => 'AI-Powered Robo-Advisors Capture 12% of New Wealth Management Accounts', tags: ['tech-disruption'], urgency: 'high', summary: 'Automated advisory platforms are winning an increasing share of new wealth management accounts, particularly among younger affluent clients.', whyItMatters: 'Position JP Morgan\'s hybrid human+AI advisory model as differentiation in performance campaigns.' },
    { titleTemplate: () => 'Blockchain-Based Identity Verification Reduces Onboarding Friction by 60%', tags: ['tech-disruption'], urgency: 'medium', summary: 'Major banks piloting blockchain KYC solutions report dramatically faster client onboarding, improving conversion from marketing to account opening.', whyItMatters: 'Faster onboarding means higher conversion rates — update attribution models to capture the improved funnel.' },
    { titleTemplate: () => 'Voice Banking Adoption Doubles as Smart Speaker Penetration Grows', tags: ['tech-disruption'], urgency: 'low', summary: 'Consumer adoption of voice-activated banking through Alexa, Google Home, and Siri has doubled year-over-year across major markets.', whyItMatters: 'Emerging channel opportunity for brand awareness — consider voice-optimized search and audio ad formats.' },
    { titleTemplate: () => 'Real-Time Payment Networks Reshape Consumer Expectations for Banking Speed', tags: ['tech-disruption'], urgency: 'medium', summary: 'The rapid adoption of instant payment networks (FedNow, PIX, UPI) is raising consumer expectations for banking speed across all services.', whyItMatters: 'Speed and innovation messaging should feature more prominently in product campaigns.' },

    // ── Macroeconomic Signals ──
    { titleTemplate: () => 'Fed Signals Rate Hold Through Q3, Extending Favorable Wealth Management Conditions', tags: ['macroeconomic'], urgency: 'high', summary: 'Federal Reserve guidance indicates interest rates will remain stable through Q3 2026, supporting sustained wealth management and lending demand.', whyItMatters: 'Stable rate environment supports scaling Private Banking and Wealth Management campaigns in North America.' },
    { titleTemplate: () => 'Global M&A Activity Surges 35% as Corporate Confidence Returns', tags: ['macroeconomic'], urgency: 'medium', summary: 'Mergers and acquisitions activity has rebounded sharply, with deal volumes up 35% year-over-year driven by technology and financial sectors.', whyItMatters: 'Increase Commercial Banking and advisory campaign budgets to capture deal-driven demand.' },
    { titleTemplate: () => 'Emerging Market GDP Growth Outpaces Developed Economies by 2.1x', tags: ['macroeconomic'], urgency: 'medium', summary: 'IMF data shows emerging markets growing at 5.8% vs. 2.7% for developed economies, shifting wealth creation patterns eastward.', whyItMatters: 'Reallocate budget toward APAC and LATAM markets where wealth creation is accelerating fastest.' },
    { titleTemplate: () => 'Dollar Strength Creates Headwinds for International Client Acquisition', tags: ['macroeconomic'], urgency: 'high', summary: 'The strong US dollar is increasing effective costs for international prospect targeting and reducing purchasing power parity in non-USD markets.', whyItMatters: 'Adjust APAC, LATAM, and Europe campaign budgets and CPM forecasts to account for currency impact.' },
  ];

  for (let i = 0; i < 120; i++) {
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
      campaign: 'na-sapphire-launch',
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
      campaign: 'eu-asset-mgmt',
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
      campaign: 'na-private-banking',
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
      campaign: 'na-sapphire-launch',
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
      campaign: 'eu-private-heritage',
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
      campaign: 'uk-wealth-mgmt',
      channels: ['instagram', 'facebook'],
      title: 'Possible Creative Fatigue',
      recommendedAction: 'Pause spend on underperforming ad',
      summary: 'Carousel ad in UK Wealth Management campaign shows declining engagement. Swipe rate has halved while CPC has doubled, suggesting creative exhaustion.',
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
      campaign: 'na-sapphire-launch',
      channels: ['tiktok', 'instagram'],
      title: 'Top Performer Ready to Scale',
      recommendedAction: 'Increase budget allocation to top creative',
      summary: 'New UGC-style Sapphire Reserve video is outperforming all other creatives by 2.4x on ROAS. Currently capped at 15% of ad set budget — scaling to 35% is projected to improve overall campaign ROAS.',
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
      campaign: 'apac-sapphire-launch',
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
    countries: def.countries,
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
