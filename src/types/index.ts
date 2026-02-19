// ===== Core Hierarchy =====
export type RegionId = 'north-america' | 'europe' | 'uk' | 'middle-east' | 'apac' | 'latam';

export const REGION_LABELS: Record<RegionId, string> = {
  'north-america': 'North America',
  'europe': 'Europe',
  'uk': 'United Kingdom',
  'middle-east': 'Middle East',
  'apac': 'Asia Pacific',
  'latam': 'Latin America',
};

export type ChannelId = 'instagram' | 'facebook' | 'tiktok' | 'google-search' | 'ttd';

export const CHANNEL_LABELS: Record<ChannelId, string> = {
  'instagram': 'Instagram',
  'facebook': 'Facebook',
  'tiktok': 'TikTok',
  'google-search': 'Google Search',
  'ttd': 'The Trade Desk',
};

export const CHANNEL_COLORS: Record<ChannelId, string> = {
  'instagram': '#E1306C',
  'facebook': '#1877F2',
  'tiktok': '#00F2EA',
  'google-search': '#FBBC05',
  'ttd': '#22C55E',
};

export type CampaignObjective = 'awareness' | 'consideration' | 'performance';
export type CampaignStatus = 'live' | 'paused';

export interface Campaign {
  id: string;
  name: string;
  region: RegionId;
  objective: CampaignObjective;
  status: CampaignStatus;
  channels: ChannelId[];
  countries: string[]; // ISO 3166-1 numeric codes
  startDate: string;
  plannedBudget: number;
}

// ===== KPI Data =====
export interface DailyMetrics {
  date: string; // YYYY-MM-DD
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  landingPageViews: number;
  leads: number;
  conversions: number;
  revenue: number;
  videoViews3s: number;
  videoViewsThruplay: number;
  engagements: number;
  assistedConversions: number;
}

export interface AggregatedKPIs extends DailyMetrics {
  // Derived
  frequency: number;
  ctr: number;
  cpc: number;
  cpm: number;
  lpvRate: number;
  cpl: number;
  cpa: number;
  roas: number;
  videoCompletionRate: number;
  engagementRate: number;
  brandSearchLift: number;
  shareOfVoice: number;
  // Health
  volatilityScore: number;
  anomalyCount: number;
  budgetPacing: number;
  creativeFatigueIndex: number;
}

export interface KPIDelta {
  value: number;
  previousValue: number;
  delta: number;
  deltaPercent: number;
}

export type KPIKey = keyof AggregatedKPIs;

export interface KPIConfig {
  key: KPIKey;
  label: string;
  format: 'currency' | 'number' | 'percent' | 'decimal' | 'index';
  higherIsBetter: boolean;
  category: 'spend' | 'reach' | 'engagement' | 'conversion' | 'revenue' | 'video' | 'health';
}

export const KPI_CONFIGS: KPIConfig[] = [
  { key: 'spend', label: 'Spend', format: 'currency', higherIsBetter: false, category: 'spend' },
  { key: 'impressions', label: 'Impressions', format: 'number', higherIsBetter: true, category: 'reach' },
  { key: 'reach', label: 'Reach', format: 'number', higherIsBetter: true, category: 'reach' },
  { key: 'frequency', label: 'Frequency', format: 'decimal', higherIsBetter: false, category: 'reach' },
  { key: 'clicks', label: 'Clicks', format: 'number', higherIsBetter: true, category: 'engagement' },
  { key: 'ctr', label: 'CTR', format: 'percent', higherIsBetter: true, category: 'engagement' },
  { key: 'cpc', label: 'CPC', format: 'currency', higherIsBetter: false, category: 'engagement' },
  { key: 'cpm', label: 'CPM', format: 'currency', higherIsBetter: false, category: 'reach' },
  { key: 'landingPageViews', label: 'Landing Page Views', format: 'number', higherIsBetter: true, category: 'engagement' },
  { key: 'lpvRate', label: 'LPV Rate', format: 'percent', higherIsBetter: true, category: 'engagement' },
  { key: 'leads', label: 'Leads', format: 'number', higherIsBetter: true, category: 'conversion' },
  { key: 'cpl', label: 'CPL', format: 'currency', higherIsBetter: false, category: 'conversion' },
  { key: 'conversions', label: 'Conversions', format: 'number', higherIsBetter: true, category: 'conversion' },
  { key: 'cpa', label: 'CPA', format: 'currency', higherIsBetter: false, category: 'conversion' },
  { key: 'revenue', label: 'Revenue', format: 'currency', higherIsBetter: true, category: 'revenue' },
  { key: 'roas', label: 'ROAS', format: 'decimal', higherIsBetter: true, category: 'revenue' },
  { key: 'videoViews3s', label: 'Video Views (3s)', format: 'number', higherIsBetter: true, category: 'video' },
  { key: 'videoViewsThruplay', label: 'ThruPlay Views', format: 'number', higherIsBetter: true, category: 'video' },
  { key: 'videoCompletionRate', label: 'Video Completion Rate', format: 'percent', higherIsBetter: true, category: 'video' },
  { key: 'engagements', label: 'Engagements', format: 'number', higherIsBetter: true, category: 'engagement' },
  { key: 'engagementRate', label: 'Engagement Rate', format: 'percent', higherIsBetter: true, category: 'engagement' },
  { key: 'assistedConversions', label: 'Assisted Conversions', format: 'number', higherIsBetter: true, category: 'conversion' },
  { key: 'brandSearchLift', label: 'Brand Search Lift', format: 'index', higherIsBetter: true, category: 'reach' },
  { key: 'shareOfVoice', label: 'Share of Voice', format: 'percent', higherIsBetter: true, category: 'reach' },
  { key: 'volatilityScore', label: 'Volatility', format: 'decimal', higherIsBetter: false, category: 'health' },
  { key: 'anomalyCount', label: 'Anomalies (7d)', format: 'number', higherIsBetter: false, category: 'health' },
  { key: 'budgetPacing', label: 'Budget Pacing', format: 'percent', higherIsBetter: true, category: 'health' },
  { key: 'creativeFatigueIndex', label: 'Creative Fatigue', format: 'index', higherIsBetter: false, category: 'health' },
];

export const DEFAULT_BRAND_KPIS: KPIKey[] = [
  'spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpc', 'cpm',
  'conversions', 'cpa', 'revenue', 'roas', 'engagementRate', 'videoCompletionRate', 'budgetPacing'
];

export const DEFAULT_EXEC_KPIS: KPIKey[] = [
  'spend', 'reach', 'conversions', 'revenue', 'roas', 'cpa',
  'brandSearchLift', 'shareOfVoice', 'budgetPacing', 'anomalyCount'
];

// ===== Date Range =====
export type DateRangePreset = '7d' | '14d' | '30d' | '90d' | 'ytd' | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  start: string;
  end: string;
}

// ===== Attribution =====
export type AttributionModel = 'last-click' | 'first-click' | 'linear' | 'data-driven';

// ===== Role =====
export type UserRole = 'agency' | 'exec';

// ===== View Level =====
export type ViewLevel = 'brand' | 'region' | 'campaign';

// ===== News =====
export type NewsTag = 'competitor' | 'category' | 'platform' | 'macro';
export type NewsUrgency = 'low' | 'medium' | 'high';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  date: string;
  tags: NewsTag[];
  regions: RegionId[];
  urgency: NewsUrgency;
  summary: string;
  whyItMatters: string;
  competitor?: string;
}

// ===== Insights =====
export type InsightCategory = 'performance' | 'creative' | 'competitive' | 'platform' | 'macro';
export type InsightStatus = 'new' | 'reviewed' | 'approved' | 'dismissed' | 'snoozed';
export type InsightScope = 'brand' | 'region' | 'campaign';

export type DismissReason = 'not-relevant' | 'insufficient-confidence' | 'brand-constraint' | 'other';

export interface InsightActionStep {
  id: string;
  title: string;
  subtitle: string;
  type: 'budget' | 'creative' | 'targeting' | 'bidding' | 'scheduling';
  completed: boolean;
}

export interface Insight {
  id: string;
  createdAt: string;
  scope: InsightScope;
  region?: RegionId;
  campaign?: string;
  channels: ChannelId[];
  category: InsightCategory;
  title: string;
  summary: string;
  evidence: string[];
  confidence: number;
  impactEstimate: string;
  recommendedAction: string;
  status: InsightStatus;
  linkedNewsId?: string;
  linkedAnomalyId?: string;
  actionSteps: InsightActionStep[];
  // Workflow
  approvalRationale?: string;
  dismissReason?: DismissReason;
  snoozeUntil?: string;
  actionedAt?: string;
  actionedBy?: string;
}

export interface ActionLogEntry {
  id: string;
  insightId: string;
  action: 'approved' | 'dismissed' | 'snoozed' | 'reviewed';
  timestamp: string;
  rationale?: string;
  dismissReason?: DismissReason;
  snoozeUntil?: string;
}

// ===== Anomaly =====
export interface Anomaly {
  id: string;
  date: string;
  region: RegionId;
  campaign?: string;
  channel?: ChannelId;
  metric: KPIKey;
  severity: 'low' | 'medium' | 'high';
  zScore: number;
  description: string;
}

// ===== Filters =====
export interface DashboardFilters {
  dateRange: DateRange;
  compareEnabled: boolean;
  regions: RegionId[];
  channels: ChannelId[];
  objectives: CampaignObjective[];
  campaignStatus: CampaignStatus[];
  attributionModel: AttributionModel;
  role: UserRole;
  selectedRegion?: RegionId;
  selectedCampaign?: string;
  customKpis?: KPIKey[];
}
