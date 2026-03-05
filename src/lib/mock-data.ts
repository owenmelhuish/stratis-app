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
const ALL_REGIONS: RegionId[] = ['north-america'];
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
  'google-search': { baseSpend: 2085, cpmRange: [15, 30], ctrRange: [4, 8], cvrRange: [6, 10], cpcRange: [2, 5], videoViewRate: 0, videoCompletionRate: 0, engagementMultiplier: 0.5, volatility: 0.15 },
  'facebook': { baseSpend: 1730, cpmRange: [8, 18], ctrRange: [1.2, 2.5], cvrRange: [2.5, 5], cpcRange: [0.8, 2.5], videoViewRate: 0.3, videoCompletionRate: 0.25, engagementMultiplier: 1.2, volatility: 0.12 },
  'instagram': { baseSpend: 1535, cpmRange: [8, 20], ctrRange: [1, 2.2], cvrRange: [2.5, 4.5], cpcRange: [1, 3], videoViewRate: 0.4, videoCompletionRate: 0.3, engagementMultiplier: 1.5, volatility: 0.1 },
  'tiktok': { baseSpend: 1185, cpmRange: [5, 15], ctrRange: [0.8, 2], cvrRange: [1.5, 3.5], cpcRange: [0.5, 2], videoViewRate: 0.8, videoCompletionRate: 0.15, engagementMultiplier: 2.0, volatility: 0.25 },
  'ttd': { baseSpend: 2570, cpmRange: [5, 15], ctrRange: [0.3, 1], cvrRange: [1, 2.5], cpcRange: [1, 4], videoViewRate: 0.2, videoCompletionRate: 0.2, engagementMultiplier: 0.3, volatility: 0.08 },
};

// ===== Region multipliers =====
const REGION_MULTIPLIERS: Record<RegionId, number> = {
  'north-america': 1.4,
};

// ===== Campaign definitions =====
interface CampaignDef {
  id: string; name: string; region: RegionId; objective: CampaignObjective;
  status: CampaignStatus; channels: ChannelId[]; budgetMultiplier: number;
  countries: string[]; plannedBudget: number;
}

const CAMPAIGN_DEFS: CampaignDef[] = [
  // Deep Water movie launch — 40% Seed Superfans, 10% each for the other 6
  // Cast a Wide Net (10%) — broad national awareness
  { id: 'dw-cast-wide-net', name: 'Cast a Wide Net', region: 'north-america', objective: 'awareness', status: 'live',
    channels: ['instagram', 'facebook', 'ttd'], budgetMultiplier: 0.6286, plannedBudget: 930000,
    countries: ['36', '06', '48', '12', '17', '39', '42', '34', '13', '25', '51', '53', '08', '04', '37', '26', '27', '24', '47', '55'] },
  // Amplify Fear (10%) — horror/thriller social push
  { id: 'dw-amplify-fear', name: 'Amplify Fear', region: 'north-america', objective: 'awareness', status: 'live',
    channels: ['instagram', 'facebook', 'tiktok', 'ttd'], budgetMultiplier: 0.5231, plannedBudget: 930000,
    countries: ['36', '06', '48', '12', '17', '39', '42', '34', '13', '25', '51', '53', '08', '04', '37'] },
  // Seed Superfans (40%) — largest campaign, full-funnel national
  { id: 'dw-seed-superfans', name: 'Seed Superfans', region: 'north-america', objective: 'performance', status: 'live',
    channels: ['instagram', 'facebook', 'tiktok', 'google-search', 'ttd'], budgetMultiplier: 1.6116, plannedBudget: 3720000,
    countries: ['36', '06', '12', '42', '34', '25', '48', '17', '39', '13', '37', '51', '53', '08', '04', '24', '27', '41', '47', '26', '29', '55', '45', '18', '21', '22', '32', '49', '40', '01'] },
  // Thrill Seekers (10%) — niche horror/action audience
  { id: 'dw-thrill-seekers', name: 'Thrill Seekers', region: 'north-america', objective: 'consideration', status: 'live',
    channels: ['instagram', 'tiktok'], budgetMultiplier: 1.349, plannedBudget: 930000,
    countries: ['36', '06', '48', '12', '17', '13', '39', '42', '37', '51'] },
  // Big Screen Chasers (10%) — theatrical moviegoers
  { id: 'dw-big-screen-chasers', name: 'Big Screen Chasers', region: 'north-america', objective: 'consideration', status: 'live',
    channels: ['facebook', 'google-search'], budgetMultiplier: 0.9619, plannedBudget: 930000,
    countries: ['36', '06', '48', '12', '17', '42', '25', '13', '34', '39', '51', '53'] },
  // Adrenaline Athletes (10%) — action/sports audience crossover
  { id: 'dw-adrenaline-athletes', name: 'Adrenaline Athletes', region: 'north-america', objective: 'consideration', status: 'live',
    channels: ['instagram', 'tiktok'], budgetMultiplier: 1.349, plannedBudget: 930000,
    countries: ['36', '06', '08', '53', '04', '32', '12', '48', '41', '37'] },
  // Opening Weekend Superfans (10%) — intent-driven conversion
  { id: 'dw-opening-weekend', name: 'Opening Weekend Superfans', region: 'north-america', objective: 'performance', status: 'live',
    channels: ['google-search', 'instagram'], budgetMultiplier: 1.0136, plannedBudget: 930000,
    countries: ['36', '06', '48', '12', '17', '42', '25', '34'] },
];

// ===== Events (anomaly generators) =====
interface DataEvent {
  name: string; dayOffset: number; duration: number;
  regions: RegionId[]; spendMult: number; cvrMult: number; engageMult: number;
}

const DATA_EVENTS: DataEvent[] = [
  { name: 'Trailer #2 Drop', dayOffset: 45, duration: 7, regions: ['north-america'], spendMult: 1.8, cvrMult: 1.3, engageMult: 2.0 },
  { name: 'Competing Film Release', dayOffset: 90, duration: 10, regions: ['north-america'], spendMult: 1.0, cvrMult: 0.8, engageMult: 0.7 },
  { name: 'Awards Season Buzz', dayOffset: 70, duration: 14, regions: ALL_REGIONS, spendMult: 1.3, cvrMult: 1.15, engageMult: 1.4 },
  { name: 'TikTok Algorithm Shift', dayOffset: 100, duration: 5, regions: ALL_REGIONS, spendMult: 1.0, cvrMult: 0.75, engageMult: 1.6 },
  { name: 'Opening Weekend Push', dayOffset: 150, duration: 10, regions: ['north-america'], spendMult: 1.5, cvrMult: 1.1, engageMult: 1.1 },
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
  const budgetPacing = 82 + rng() * 13;
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
const NEWS_SOURCES = ['Variety', 'Deadline', 'The Hollywood Reporter', 'Entertainment Weekly', 'IndieWire', 'Screen Rant', 'Collider'];
const COMPETITORS = ['Devil Wears Prada 2', 'Mission Impossible 8', 'Thunderbolts*', 'The Beast (Netflix)', 'A Quiet Place: Day One'];

function generateNews(): NewsItem[] {
  const items: NewsItem[] = [];
  const templates: Array<{
    titleTemplate: (c?: string) => string; tags: NewsTag[]; urgency: NewsUrgency;
    summary: string; whyItMatters: string; competitor?: string;
  }> = [
    // ── 1. Emerging Conversation (exactly 3 — Reddit/social mentions of "Deep Water") ──
    { titleTemplate: () => 'r/movies: "Deep Water looks insane — the practical underwater stunts are giving Jaws vibes"', tags: ['brand'], urgency: 'high', summary: 'A Reddit post on r/movies comparing Deep Water\'s practical effects to Jaws has reached 14.2K upvotes and 1,800+ comments, with users debating whether it could revive the ocean thriller genre.', whyItMatters: 'Organic Reddit hype signals core audience excitement — amplify with paid social targeting r/movies and film enthusiast lookalikes.' },
    { titleTemplate: () => 'Deep Water Subway Takeover in NYC and LA Drives 12M Impressions in 48 Hours', tags: ['brand'], urgency: 'high', summary: 'A full subway station takeover in Times Square and Hollywood/Highland featuring immersive Deep Water ocean-themed wraps has generated 12M OOH impressions and gone viral on social media, with commuters sharing photos across Instagram and TikTok.', whyItMatters: 'OOH activations are driving outsized social amplification — experiential placements are earning 3-5x their paid value in organic reach.' },
    { titleTemplate: () => 'r/boxoffice tracks Deep Water pre-sale mentions surging 280% week-over-week', tags: ['brand'], urgency: 'medium', summary: 'The r/boxoffice community is tracking a 280% week-over-week increase in Deep Water mentions, with multiple threads predicting a $35M+ opening weekend based on social momentum.', whyItMatters: 'Box office prediction communities influence wider media coverage — monitor sentiment and seed positive data points for earned media pickup.' },

    // ── 2. Cast & Talent Signals (exactly 3 — one per talent, order: Eckhart → Gale → Kingsley) ──
    { titleTemplate: () => 'Aaron Eckhart Talks Deep Water Role on The Tonight Show, Clip Goes Viral', tags: ['cast'], urgency: 'high', summary: 'Aaron Eckhart appeared on The Tonight Show discussing his preparation for Deep Water, including learning to hold his breath for 4 minutes. The segment has been viewed 6M+ times.', whyItMatters: 'Talk show virality creates earned media spike — amplify with paid video ads featuring Aaron Eckhart clips and quotes.' },
    { titleTemplate: () => 'Kelly Gale Deep Water Interview Drives 800K Instagram Impressions', tags: ['cast'], urgency: 'high', summary: 'Kelly Gale\'s Instagram interview about her Deep Water role generated 800K impressions and 45K engagements, with strong response from 18-34 female audiences.', whyItMatters: 'Kelly Gale content resonates with younger demographics — feature in Seed Superfans and social-first creative.' },
    { titleTemplate: () => 'Ben Kingsley Praised for Deep Water Performance in Early Press Reactions', tags: ['cast'], urgency: 'medium', summary: 'Early press screenings are singling out Ben Kingsley\'s performance as a standout, with critics calling it "his best work in a decade."', whyItMatters: 'Critical praise for cast strengthens credibility messaging — incorporate review quotes into Amplify Fear creative.' },

    // ── 3. Competitive Movie Releases (exactly 3 — all Devil Wears Prada 2) ──
    { titleTemplate: () => 'Devil Wears Prada 2 Trailer Drops to 32M Views — Meryl Streep Return Breaks Social Media', tags: ['competitor'], urgency: 'high', summary: 'The first trailer for Devil Wears Prada 2 has amassed 32M views in 72 hours, making it the most-watched comedy sequel trailer of the year. Meryl Streep and Anne Hathaway\'s return is dominating social conversation across all platforms.', whyItMatters: 'DWP2 is absorbing massive share of voice in the theatrical marketing space — Deep Water needs to surge social spend to maintain visibility during this attention spike.', competitor: 'Devil Wears Prada 2' },
    { titleTemplate: () => 'r/movies megathread: "Devil Wears Prada 2 looks incredible — opening weekend is going to be huge"', tags: ['competitor'], urgency: 'high', summary: 'A Reddit megathread on r/movies discussing the DWP2 trailer has reached 22K upvotes with 4,100+ comments. Community sentiment is overwhelmingly positive, with users predicting a $60M+ opening weekend.', whyItMatters: 'Reddit hype for DWP2 is pulling attention from other releases — consider targeted Reddit ads positioning Deep Water as the alternative for audiences seeking intensity over comedy.', competitor: 'Devil Wears Prada 2' },
    { titleTemplate: () => 'Devil Wears Prada 2 Fandango Pre-Sales Track for $58M Opening Weekend', tags: ['competitor'], urgency: 'high', summary: 'Fandango reports Devil Wears Prada 2 advance ticket sales are pacing toward a $58M domestic opening weekend, driven by 25-44 women who made up 72% of first-day pre-sale buyers across New York, Los Angeles, and Chicago.', whyItMatters: 'DWP2 is commanding massive pre-sale volume in top DMAs — increased theatrical competition will raise CPMs and fragment audience attention across all concurrent releases.', competitor: 'Devil Wears Prada 2' },

    // ── 4. Genre & Theme Signals (exactly 3 pinned) ──
    { titleTemplate: () => '#SharkTok Surges 340% on TikTok — Ocean Content Hits All-Time High', tags: ['genre'], urgency: 'high', summary: 'Ocean and shark-themed content is experiencing a massive surge on TikTok, with #SharkTok and related hashtags generating 340% more views than the monthly average. Creators are posting shark encounter stories, deep-sea footage, and ocean survival challenges.', whyItMatters: 'Trending genre interest creates organic tailwind — create shark/ocean themed Deep Water ads for TikTok to ride the wave.' },
    { titleTemplate: () => 'Underwater Thriller Genre Sees 28% Box Office Growth Year-Over-Year', tags: ['genre'], urgency: 'medium', summary: 'Box office data shows underwater and ocean thriller films have outperformed the broader thriller category by 28% this year, with audiences showing strong appetite for high-tension maritime narratives.', whyItMatters: 'Genre tailwind supports bullish box office projections — lean into the underwater thriller positioning in all creative.' },
    { titleTemplate: () => 'Ocean Survival Podcasts Climb Charts as Maritime Peril Trend Accelerates', tags: ['genre'], urgency: 'medium', summary: 'Multiple ocean survival and "lost at sea" podcasts have climbed the Apple and Spotify charts, indicating elevated public interest in maritime survival narratives ahead of summer movie season.', whyItMatters: 'Genre conversation is primed for Deep Water — sponsor relevant podcasts and test audio ad placements to capture high-intent listeners.' },

    // ── 5. Review & Sentiment Signals ──
    { titleTemplate: () => 'Deep Water Early Reviews: 82% Fresh on Rotten Tomatoes', tags: ['sentiment'], urgency: 'high', summary: 'Early critic reviews have pushed Deep Water to an 82% Fresh rating on Rotten Tomatoes, with praise for practical effects and lead performances.', whyItMatters: 'Strong RT score is a powerful trust signal — feature the rating prominently in all ad creative and landing pages.' },
    { titleTemplate: () => 'Deep Water IMDb Rating Holds Steady at 7.4 After Early Screenings', tags: ['sentiment'], urgency: 'medium', summary: 'The IMDb audience rating for Deep Water is holding at 7.4 based on early screening attendees, indicating strong audience satisfaction.', whyItMatters: 'Audience score validates word-of-mouth potential — lean into "audiences love it" messaging in week 2 campaigns.' },
    { titleTemplate: () => 'Social Sentiment for Deep Water Running 78% Positive Across Platforms', tags: ['sentiment'], urgency: 'medium', summary: 'Social listening tools show Deep Water sentiment is 78% positive, 15% neutral, and only 7% negative — well above thriller genre averages.', whyItMatters: 'Positive sentiment supports scaling spend — increase budget confidence and extend campaign flights if trends hold.' },
    { titleTemplate: () => 'Deep Water Letterboxd Score Surpasses Genre Average by 0.8 Points', tags: ['sentiment'], urgency: 'low', summary: 'Film enthusiasts on Letterboxd are rating Deep Water 3.9/5, significantly above the thriller genre average of 3.1, with praise for cinematography.', whyItMatters: 'Letterboxd audience skews cinephile — use as proof point for Big Screen Chasers campaign targeting film enthusiasts.' },
    { titleTemplate: () => '"Is Deep Water Worth Watching?" Search Volume Spikes 420%', tags: ['sentiment'], urgency: 'high', summary: 'Google search volume for "Deep Water worth watching" and "Deep Water good or bad" has surged 420%, indicating audiences are in the consideration phase.', whyItMatters: 'High-intent search signals demand — ensure branded search campaigns capture consideration-phase queries with review-led creative.' },
    { titleTemplate: () => 'Deep Water Audience Exit Polls Show 91% Would Recommend to Friends', tags: ['sentiment'], urgency: 'medium', summary: 'Post-screening exit polls show 91% of audiences would recommend Deep Water, with "edge-of-your-seat tension" cited most frequently.', whyItMatters: 'Word-of-mouth metric is exceptional — shift post-opening budget toward social proof and testimonial-style creative.' },

    // ── 6. Platform & Ad Tech ──
    { titleTemplate: () => 'TikTok Launches Movie Ticket Integration for In-App Purchases', tags: ['platform'], urgency: 'high', summary: 'TikTok has rolled out native ticket purchasing for movie content, allowing users to buy tickets directly from video ads without leaving the app.', whyItMatters: 'Native ticketing removes friction from the conversion funnel — test in-app ticket purchase CTAs across all TikTok campaigns.' },
    { titleTemplate: () => 'Meta Introduces New Advantage+ for Entertainment Vertical', tags: ['platform'], urgency: 'medium', summary: 'Meta has launched an entertainment-specific Advantage+ campaign type optimized for movie awareness and ticket conversions.', whyItMatters: 'Entertainment-specific optimization could improve efficiency — test against current campaign structures on Facebook and Instagram.' },
    { titleTemplate: () => 'Google Search Adds Movie Showtime Cards to AI Overview Results', tags: ['platform'], urgency: 'high', summary: 'Google is now displaying interactive showtime cards within AI-generated search results for movie queries, changing how users discover films.', whyItMatters: 'New SERP format changes search behavior — ensure Deep Water structured data is optimized for showtime card eligibility.' },
    { titleTemplate: () => 'The Trade Desk Launches CTV Movie Trailer Ad Format', tags: ['platform'], urgency: 'medium', summary: 'TTD has introduced a new pre-roll format specifically designed for movie trailers on connected TV, with enhanced engagement tracking.', whyItMatters: 'CTV trailer format is ideal for Deep Water — test across Thrill Seekers and Cast a Wide Net campaigns for upper-funnel reach.' },
    { titleTemplate: () => 'Instagram Reels Tests "Swipe to Buy Tickets" Feature for Movies', tags: ['platform'], urgency: 'medium', summary: 'Instagram is testing a swipe-to-purchase feature for movie tickets in Reels, enabling seamless conversion from trailer content to ticket sale.', whyItMatters: 'Reduces conversion friction on Instagram — prioritize Reels creative in Seed Superfans and Opening Weekend campaigns.' },

    // ── 7. Audience Behaviour ──
    { titleTemplate: () => 'Gen Z Moviegoers Spend 3.2x More on Opening Weekends Than Millennials', tags: ['audience'], urgency: 'high', summary: 'New research shows Gen Z audiences are 3.2x more likely to attend opening weekend screenings, driven by FOMO and social media conversation.', whyItMatters: 'Opening Weekend Superfans campaign should over-index on Gen Z targeting — increase TikTok and Instagram allocation.' },
    { titleTemplate: () => 'Thriller Audiences Show 45% Higher Engagement With Behind-the-Scenes Content', tags: ['audience'], urgency: 'medium', summary: 'A study of thriller movie marketing shows BTS content drives 45% higher engagement than standard trailer ads among core thriller audiences.', whyItMatters: 'Shift creative mix toward BTS content for Thrill Seekers and Adrenaline Athletes — test against standard trailer cuts.' },
    { titleTemplate: () => 'Social Media Drives 62% of Movie Discovery for 18-34 Audiences', tags: ['audience'], urgency: 'medium', summary: 'New data confirms social media has overtaken traditional trailers as the primary movie discovery channel for 18-34 year olds.', whyItMatters: 'Social-first strategy is validated — ensure majority of Cast a Wide Net budget flows through social platforms.' },
    { titleTemplate: () => 'Group Ticket Purchases Up 28% as Moviegoing Becomes Social Event Again', tags: ['audience'], urgency: 'low', summary: 'Theaters report a 28% increase in group ticket purchases, with friend groups and couples driving the return to theatrical experiences.', whyItMatters: 'Social moviegoing trend supports group-targeted messaging — test "bring your friends" CTAs in Adrenaline Athletes creative.' },

    // ── 8. Box Office & Industry Macro ──
    { titleTemplate: () => 'Domestic Box Office Tracking 22% Above 2025 Pace Through Q1', tags: ['macro'], urgency: 'medium', summary: 'The domestic box office is on a strong recovery trajectory, with Q1 2026 revenues tracking 22% above the same period in 2025.', whyItMatters: 'Rising box office tide lifts all boats — macro conditions favor aggressive spend for Deep Water opening weekend.' },
    { titleTemplate: () => 'IMAX and Premium Format Screens Show Record Demand for Thrillers', tags: ['macro'], urgency: 'high', summary: 'IMAX and Dolby Cinema screenings of thriller films are seeing record attendance, with premium formats commanding 40% higher ticket prices.', whyItMatters: 'Premium format demand aligns with Deep Water\'s visual spectacle — emphasize IMAX experience in Big Screen Chasers creative.' },
    { titleTemplate: () => 'Theatrical Window Shortening Pressures Opening Weekend Performance', tags: ['macro'], urgency: 'high', summary: 'Studios are shortening theatrical windows to 45 days, making opening weekend box office performance more critical than ever for total revenue.', whyItMatters: 'Compressed windows mean opening weekend is make-or-break — front-load maximum budget into the first 5 days.' },
    { titleTemplate: () => 'Summer Movie Season Ad Costs Expected to Rise 18% Year-Over-Year', tags: ['macro'], urgency: 'medium', summary: 'Media buyers forecast an 18% increase in entertainment advertising costs as studios compete for attention heading into summer blockbuster season.', whyItMatters: 'Rising costs mean earlier is better — lock in media buys now before CPMs spike in late March.' },
  ];

  // Pinned tags: brand, cast, competitor, genre get fixed articles with pinned dates
  const pinnedTags = new Set(['brand', 'cast', 'competitor', 'genre']);
  const pinnedTemplates = templates.filter(t => pinnedTags.has(t.tags[0]));
  const loopTemplates = templates.filter(t => !pinnedTags.has(t.tags[0]));

  // Brand (emerging conversation) — 3 articles with pinned recent dates
  const brandTemplates = pinnedTemplates.filter(t => t.tags.includes('brand'));
  brandTemplates.forEach((bt, idx) => {
    items.push({
      id: `news-brand-${idx}`,
      title: bt.titleTemplate(),
      source: ['Reddit — r/movies', 'Variety', 'Reddit — r/boxoffice'][idx],
      date: format(subDays(END_DATE, idx), 'yyyy-MM-dd'),
      tags: bt.tags,
      regions: ['north-america'] as RegionId[],
      urgency: bt.urgency,
      summary: bt.summary,
      whyItMatters: bt.whyItMatters,
    });
  });

  // Cast — 3 articles with pinned recent dates
  const castTemplates = pinnedTemplates.filter(t => t.tags.includes('cast'));
  castTemplates.forEach((ct, idx) => {
    items.push({
      id: `news-cast-${idx}`,
      title: ct.titleTemplate(),
      source: ['Variety', 'Entertainment Weekly', 'Collider'][idx],
      date: format(subDays(END_DATE, idx + 3), 'yyyy-MM-dd'),
      tags: ct.tags,
      regions: ['north-america'] as RegionId[],
      urgency: ct.urgency,
      summary: ct.summary,
      whyItMatters: ct.whyItMatters,
    });
  });

  // Competitor (Devil Wears Prada 2) — 3 articles with pinned recent dates
  const competitorTemplates = pinnedTemplates.filter(t => t.tags.includes('competitor'));
  competitorTemplates.forEach((ct, idx) => {
    items.push({
      id: `news-competitor-${idx}`,
      title: ct.titleTemplate(),
      source: ['Deadline', 'Reddit — r/movies', 'Variety'][idx],
      date: format(subDays(END_DATE, idx + 1), 'yyyy-MM-dd'),
      tags: ct.tags,
      regions: ['north-america'] as RegionId[],
      urgency: ct.urgency,
      summary: ct.summary,
      whyItMatters: ct.whyItMatters,
      competitor: ct.competitor,
    });
  });

  // Genre & Theme — 3 articles with pinned recent dates
  const genreTemplates = pinnedTemplates.filter(t => t.tags.includes('genre'));
  genreTemplates.forEach((gt, idx) => {
    items.push({
      id: `news-genre-${idx}`,
      title: gt.titleTemplate(),
      source: ['TikTok Trending', 'Box Office Mojo', 'Apple Podcasts'][idx],
      date: format(subDays(END_DATE, idx + 2), 'yyyy-MM-dd'),
      tags: gt.tags,
      regions: ['north-america'] as RegionId[],
      urgency: gt.urgency,
      summary: gt.summary,
      whyItMatters: gt.whyItMatters,
    });
  });

  for (let i = 0; i < 120; i++) {
    const template = loopTemplates[i % loopTemplates.length];
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
      campaign: 'dw-seed-superfans',
      channels: ['instagram', 'facebook', 'tiktok'],
      title: 'Pacing to Underspend',
      recommendedAction: 'Increase daily budget or expand targeting to hit flight budget',
      summary: 'Seed Superfans daily spend rate projects a $38K underspend by flight end. Expanding lookalike audiences or increasing bid caps will close the gap before opening weekend.',
      evidence: ['Projected spend: $6.38M of $6.42M budget', 'Daily run rate $2.1K below target', '18 days remaining in flight'],
      impactEstimate: '+$38K utilization',
      confidence: 88,
      status: 'new',
      actionSteps: generateActionSteps('performance', 0),
    },
    {
      id: 'insight-cvr-decline',
      createdAt: yesterday,
      scope: 'campaign',
      category: 'performance',
      region: 'north-america',
      campaign: 'dw-amplify-fear',
      channels: ['instagram', 'tiktok'],
      title: 'Ticket Intent Declining',
      recommendedAction: 'Refresh horror teasers and test new audience segments',
      summary: 'Amplify Fear click-to-ticket-site rate has dropped 22% over 14 days while impressions remain steady, suggesting creative wear-out on horror audiences.',
      evidence: ['CVR dropped from 3.2% to 2.5% over 14 days', 'Impression volume stable at ~180K/day', 'Bounce rate increased 15% on Fandango landing page'],
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
      campaign: 'dw-opening-weekend',
      channels: ['google-search', 'instagram'],
      title: 'CPA Trending Above Target',
      recommendedAction: 'Tighten targeting or reduce bid caps on broad search terms',
      summary: 'Opening Weekend Superfans cost per ticket conversion has risen 18% above target. Generic movie search terms are driving inefficiency.',
      evidence: ['Current CPA $53 vs $45 target', 'Generic terms CPA is 2.1x branded CPA', 'Bid cap exceeded on 3 ad groups'],
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
      recommendedAction: 'Shift budget from saturated social to high-intent search',
      summary: 'Instagram is receiving 40% of total budget but generating only 18% of ticket conversions. Google Search shows 3.2x higher ROAS with room to scale pre-release.',
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
      region: 'north-america',
      channels: ['facebook', 'google-search'],
      title: 'Diminishing Returns on Meta',
      recommendedAction: 'Reallocate excess Facebook spend to Google Search',
      summary: 'Incremental CPA on Facebook has risen 35% as audience overlap between ad sets reaches 45%. Moving $5K weekly to Search would improve blended efficiency heading into opening weekend.',
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
      recommendedAction: 'Cap combined exposure to reduce trailer fatigue',
      summary: 'Users are seeing Deep Water ads an average of 12.4 times per week across channels, well above the 8x optimal threshold. Excess frequency is driving CPM inflation without ticket conversion lift.',
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
      campaign: 'dw-amplify-fear',
      channels: ['instagram', 'facebook'],
      title: 'Possible Creative Fatigue',
      recommendedAction: 'Pause spend on underperforming ad',
      summary: 'Primary horror teaser creative has been running for 21 days with CTR declining steadily. Frequency has reached 6.8x in core horror audience, indicating ad fatigue.',
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
      region: 'north-america',
      campaign: 'dw-seed-superfans',
      channels: ['instagram', 'tiktok'],
      title: 'Possible Creative Fatigue',
      recommendedAction: 'Pause spend on underperforming ad',
      summary: 'Trailer clip variant B has reached saturation with completion rates dropping below 15%. Superfan audience has been heavily exposed over the past 3 weeks.',
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
      region: 'north-america',
      campaign: 'dw-thrill-seekers',
      channels: ['instagram', 'tiktok'],
      title: 'Possible Creative Fatigue',
      recommendedAction: 'Pause spend on underperforming ad',
      summary: 'Action-focused carousel in Thrill Seekers campaign shows declining engagement. Swipe rate has halved while CPC has doubled, suggesting creative exhaustion.',
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
      campaign: 'dw-seed-superfans',
      channels: ['tiktok', 'instagram'],
      title: 'Top Performer Ready to Scale',
      recommendedAction: 'Increase budget allocation to top creative',
      summary: 'New UGC-style Deep Water reaction video is outperforming all other creatives by 2.4x on ROAS. Currently capped at 15% of ad set budget — scaling to 35% is projected to improve overall campaign ROAS.',
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
      region: 'north-america',
      campaign: 'dw-cast-wide-net',
      channels: ['facebook', 'instagram'],
      title: 'Low Engagement Variant',
      recommendedAction: 'Replace or refresh underperforming creative',
      summary: 'Static poster image variant C has the lowest engagement rate across all active creatives at 0.8%. Budget is being wasted on an asset that fails to capture attention.',
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
    plannedBudget: def.plannedBudget,
  }));

  const dailyData = generateDailyData();
  const anomalies = detectAnomalies(dailyData);
  const newsItems = generateNews();
  const insights = generateInsights(anomalies);

  cachedStore = { campaigns, dailyData, newsItems, insights, anomalies };
  return cachedStore;
}
