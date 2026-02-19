"use client";
import React, { useState } from 'react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useAppStore } from '@/lib/store';
import { HeroKPICard } from '@/components/shared/hero-kpi-card';
import { TrendChart } from '@/components/shared/trend-chart';
import { ChannelMixChart } from '@/components/shared/channel-mix-chart';
import { CampaignOverviewChart } from '@/components/shared/campaign-overview-chart';
import { WorldMapChart } from '@/components/shared/world-map-chart';
import { BentoKPIGrid } from '@/components/shared/bento-kpi-grid';
import { DataTableWrapper, type Column } from '@/components/shared/data-table-wrapper';
import { ComparisonDelta } from '@/components/shared/comparison-delta';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Settings2, TrendingUp, TrendingDown, AlertTriangle, ArrowRight, PieChart as PieChartIcon, Table2, Zap, Target, DollarSign, BarChart3, Activity, Eye } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { KPI_CONFIGS, REGION_LABELS, CHANNEL_LABELS, type KPIKey, type ChannelId, type RegionId, type AggregatedKPIs } from '@/types';
import { formatCurrency, formatKPIValue, formatPercent } from '@/lib/format';
import Link from 'next/link';

const HERO_KPIS: KPIKey[] = ['spend', 'conversions', 'roas'];
const HERO_COLORS: Record<string, string> = { spend: '#e07060', conversions: '#50b89a', roas: '#50b89a' };

interface RegionRow {
  region: RegionId; label: string; kpis: AggregatedKPIs; previousKpis?: AggregatedKPIs; campaignCount: number;
}

const REGION_COLORS = [
  '#e07060', '#50b89a', '#6b8aad', '#8b7ec8', '#f0a050',
  '#c76be0', '#5ab8d0', '#d06090', '#70c070', '#b8a060',
];

function RegionPieView({ regionData, onRegionClick }: {
  regionData: Array<{ region: RegionId; label: string; kpis: AggregatedKPIs; campaignCount: number }>;
  onRegionClick: (region: RegionId) => void;
}) {
  const sorted = [...regionData].sort((a, b) => b.kpis.spend - a.kpis.spend);
  const totalSpend = sorted.reduce((s, r) => s + r.kpis.spend, 0);

  const pieData = sorted.map((r, i) => ({
    name: r.label,
    value: r.kpis.spend,
    color: REGION_COLORS[i % REGION_COLORS.length],
    region: r.region,
  }));

  return (
    <div className="grid grid-cols-[200px_1fr] gap-6">
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              dataKey="value"
              paddingAngle={2}
              strokeWidth={0}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} className="cursor-pointer" onClick={() => onRegionClick(entry.region)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(20, 24, 28, 0.95)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#e0e0e0',
                padding: '10px 14px',
              }}
              formatter={(value) => [formatCurrency(value as number), 'Spend']}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold">{formatCurrency(totalSpend)}</span>
          <span className="text-[10px] text-muted-foreground">Total Spend</span>
        </div>
      </div>

      <div className="overflow-auto max-h-[280px]">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground text-[10px] uppercase tracking-wider border-b border-border/30">
              <th className="text-left pb-2 font-medium">Region</th>
              <th className="text-right pb-2 font-medium">Spend</th>
              <th className="text-right pb-2 font-medium">% of Total</th>
              <th className="text-right pb-2 font-medium">ROAS</th>
              <th className="text-right pb-2 font-medium">CPA</th>
              <th className="text-right pb-2 font-medium">Conv.</th>
              <th className="text-right pb-2 font-medium">Campaigns</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr
                key={r.region}
                className="border-b border-border/20 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onRegionClick(r.region)}
              >
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: REGION_COLORS[i % REGION_COLORS.length] }} />
                    <span className="font-medium">{r.label}</span>
                  </div>
                </td>
                <td className="text-right py-2 tabular-nums">{formatCurrency(r.kpis.spend)}</td>
                <td className="text-right py-2 tabular-nums text-muted-foreground">
                  {totalSpend > 0 ? ((r.kpis.spend / totalSpend) * 100).toFixed(1) : '0.0'}%
                </td>
                <td className="text-right py-2 tabular-nums">{formatKPIValue(r.kpis.roas, 'decimal')}</td>
                <td className="text-right py-2 tabular-nums">{formatCurrency(r.kpis.cpa)}</td>
                <td className="text-right py-2 tabular-nums">{formatKPIValue(r.kpis.conversions, 'number')}</td>
                <td className="text-right py-2 tabular-nums">{r.campaignCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BrandView() {
  const data = useDashboardData();
  const { customKpis, setCustomKpis, compareEnabled } = useAppStore();
  const drillToRegion = useAppStore(s => s.drillToRegion);
  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);
  const [mapColorMetric, setMapColorMetric] = useState<'spend' | 'roas'>('spend');
  const [regionViewMode, setRegionViewMode] = useState<'table' | 'chart'>('table');

  const toggleKpi = (key: KPIKey) => {
    const next = customKpis.includes(key) ? customKpis.filter(k => k !== key) : [...customKpis, key];
    setCustomKpis(next);
  };

  const regionColumns: Column<RegionRow>[] = [
    { key: 'region', label: 'Region', sortable: true, getValue: (r) => r.label,
      render: (r) => (<div className="flex items-center gap-2"><span className="font-medium">{r.label}</span><Badge variant="outline" className="text-[10px]">{r.campaignCount} campaigns</Badge></div>),
    },
    { key: 'spend', label: 'Spend', sortable: true, align: 'right', getValue: (r) => r.kpis.spend,
      render: (r) => (<div>{formatCurrency(r.kpis.spend)}{compareEnabled && r.previousKpis && r.previousKpis.spend > 0 && <ComparisonDelta deltaPercent={((r.kpis.spend - r.previousKpis.spend) / r.previousKpis.spend) * 100} higherIsBetter={false} className="ml-2" />}</div>),
    },
    { key: 'roas', label: 'ROAS', sortable: true, align: 'right', getValue: (r) => r.kpis.roas,
      render: (r) => (<div>{formatKPIValue(r.kpis.roas, 'decimal')}{compareEnabled && r.previousKpis && r.previousKpis.roas > 0 && <ComparisonDelta deltaPercent={((r.kpis.roas - r.previousKpis.roas) / r.previousKpis.roas) * 100} higherIsBetter={true} className="ml-2" />}</div>),
    },
    { key: 'cpa', label: 'CPA', sortable: true, align: 'right', getValue: (r) => r.kpis.cpa, render: (r) => formatCurrency(r.kpis.cpa) },
    { key: 'conversions', label: 'Conv.', sortable: true, align: 'right', getValue: (r) => r.kpis.conversions, render: (r) => formatKPIValue(r.kpis.conversions, 'number') },
    { key: 'sov', label: 'Share of Voice', sortable: true, align: 'right', getValue: (r) => r.kpis.shareOfVoice,
      render: (r) => (<div className="flex items-center justify-end gap-2"><div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-orange rounded-full" style={{ width: `${Math.min(r.kpis.shareOfVoice, 100)}%` }} /></div><span className="text-xs">{formatPercent(r.kpis.shareOfVoice)}</span></div>),
    },
    { key: 'anomalies', label: 'Anomalies', sortable: true, align: 'center', getValue: (r) => r.kpis.anomalyCount,
      render: (r) => (<Badge variant={r.kpis.anomalyCount > 3 ? "destructive" : "secondary"} className="text-xs">{r.kpis.anomalyCount}</Badge>),
    },
    { key: 'action', label: '', render: () => <ArrowRight className="h-4 w-4 text-muted-foreground" /> },
  ];

  return (
    <div className="space-y-8">
      {/* Hero KPI Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Key Metrics</h2>
          <Dialog open={kpiDialogOpen} onOpenChange={setKpiDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs"><Settings2 className="h-3 w-3 mr-1" /> Customize KPIs</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Customize Dashboard KPIs</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-2 mt-4 max-h-80 overflow-auto">
                {KPI_CONFIGS.map(config => (
                  <div key={config.key} className="flex items-center gap-2 p-2 rounded hover:bg-muted">
                    <Checkbox id={config.key} checked={customKpis.includes(config.key)} onCheckedChange={() => toggleKpi(config.key)} />
                    <Label htmlFor={config.key} className="text-sm cursor-pointer">{config.label}</Label>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {HERO_KPIS.map((key) => {
            const config = KPI_CONFIGS.find(c => c.key === key);
            if (!config) return null;
            const value = data.currentKPIs[key] as number;
            const prev = data.previousKPIs ? data.previousKPIs[key] as number : undefined;
            const delta = prev !== undefined ? value - prev : undefined;
            const deltaPercent = prev !== undefined && prev !== 0 ? ((value - prev) / prev) * 100 : undefined;
            const sparklineData = data.timeSeries.slice(-14).map(d => ({ value: d[key] as number }));

            return (
              <HeroKPICard
                key={key}
                config={config}
                value={value}
                delta={compareEnabled ? delta : undefined}
                deltaPercent={compareEnabled ? deltaPercent : undefined}
                sparklineData={sparklineData}
                accentColor={HERO_COLORS[key] || '#f97316'}
              />
            );
          })}
        </div>

      </div>

      <WorldMapChart
        regionData={data.regionData}
        colorMetric={mapColorMetric}
        onColorMetricChange={setMapColorMetric}
        onRegionClick={drillToRegion}
        viewLevel={data.filteredRegions.length === 1 ? 'region' : 'brand'}
        selectedRegion={data.filteredRegions.length === 1 ? data.filteredRegions[0] : undefined}
        countryData={data.filteredRegions.length === 1
          ? data.countryData.filter(c => c.regionId === data.filteredRegions[0])
          : undefined}
      />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <TrendChart data={data.timeSeries} title="Global Performance Trend" defaultMetrics={['spend', 'conversions', 'roas']} />
        </div>
        <div className="xl:col-span-2">
          <ChannelMixChart data={data.channelData} title="Channel Mix" />
        </div>
      </div>

      <Card className="p-6 bg-card border-border/40">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Regional Performance</h3>
          <div className="flex items-center rounded-md border border-border/40 p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 ${regionViewMode === 'chart' ? 'bg-muted' : ''}`}
              onClick={() => setRegionViewMode('chart')}
            >
              <PieChartIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 ${regionViewMode === 'table' ? 'bg-muted' : ''}`}
              onClick={() => setRegionViewMode('table')}
            >
              <Table2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {regionViewMode === 'table' ? (
          <DataTableWrapper<RegionRow>
            data={data.regionData.map(r => ({ region: r.region, label: r.regionLabel, kpis: r.kpis, previousKpis: r.previousKpis, campaignCount: r.campaignCount }))}
            columns={regionColumns}
            onRowClick={(row) => drillToRegion(row.region)}
            searchable searchPlaceholder="Search regions..." searchKey={(row) => row.label}
          />
        ) : (
          <RegionPieView
            regionData={data.regionData.map(r => ({ region: r.region, label: r.regionLabel, kpis: r.kpis, campaignCount: r.campaignCount }))}
            onRegionClick={drillToRegion}
          />
        )}
      </Card>

      <CampaignOverviewChart campaignData={data.campaignData} />

      <BentoKPIGrid data={data} compareEnabled={compareEnabled} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Highlights */}
        <Card className="p-6 bg-card border-border/40">
          <div className="flex items-center gap-2 mb-5">
            <Zap className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold">Performance Highlights</h3>
          </div>
          <div className="space-y-3">
            {(() => {
              const topCampaign = [...data.campaignData]
                .filter(c => c.campaign.status === 'live' && c.kpis.spend > 0)
                .sort((a, b) => b.kpis.roas - a.kpis.roas)[0];
              const topRegion = [...data.regionData]
                .filter(r => r.kpis.spend > 0)
                .sort((a, b) => b.kpis.roas - a.kpis.roas)[0];
              const channelEntries = Object.entries(data.channelData)
                .filter(([, kpis]) => kpis.spend > 0)
                .sort(([, a], [, b]) => b.roas - a.roas);
              const topChannel = channelEntries[0];
              const liveCampaigns = data.campaignData.filter(c => c.campaign.status === 'live');
              const onPaceCount = liveCampaigns.filter(c => c.kpis.budgetPacing >= 85 && c.kpis.budgetPacing <= 115).length;

              return (
                <>
                  {topCampaign && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 shrink-0">
                        <Target className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Top Campaign by ROAS</p>
                        <p className="text-sm font-medium truncate">{topCampaign.campaign.name}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-400 tabular-nums shrink-0">{formatKPIValue(topCampaign.kpis.roas, 'decimal')}</span>
                    </div>
                  )}
                  {topChannel && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 shrink-0">
                        <BarChart3 className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Top Channel by ROAS</p>
                        <p className="text-sm font-medium">{CHANNEL_LABELS[topChannel[0] as ChannelId]}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-400 tabular-nums shrink-0">{formatKPIValue(topChannel[1].roas, 'decimal')}</span>
                    </div>
                  )}
                  {topRegion && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 shrink-0">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Strongest Region</p>
                        <p className="text-sm font-medium">{topRegion.regionLabel}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-emerald-400 tabular-nums">{formatKPIValue(topRegion.kpis.roas, 'decimal')}</span>
                        <p className="text-[10px] text-muted-foreground">{formatCurrency(topRegion.kpis.spend)} spend</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 shrink-0">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget Pacing</p>
                      <p className="text-sm font-medium">{onPaceCount} of {liveCampaigns.length} campaigns on pace</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-400 tabular-nums shrink-0">{liveCampaigns.length > 0 ? Math.round((onPaceCount / liveCampaigns.length) * 100) : 0}%</span>
                  </div>
                </>
              );
            })()}
          </div>
        </Card>

        {/* Watch List */}
        <Card className="p-6 bg-card border-border/40">
          <div className="flex items-center gap-2 mb-5">
            <Eye className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold">Watch List</h3>
            {data.anomalies.length > 0 && (
              <Badge className="bg-red-500/15 text-red-400 text-xs border-0">{data.anomalies.length} anomalies</Badge>
            )}
          </div>
          <div className="space-y-3">
            {(() => {
              const worstCampaign = [...data.campaignData]
                .filter(c => c.campaign.status === 'live' && c.kpis.spend > 0)
                .sort((a, b) => a.kpis.roas - b.kpis.roas)[0];
              const highestCPA = [...data.campaignData]
                .filter(c => c.campaign.status === 'live' && c.kpis.conversions > 0)
                .sort((a, b) => b.kpis.cpa - a.kpis.cpa)[0];
              const liveCampaigns = data.campaignData.filter(c => c.campaign.status === 'live');
              const offPace = liveCampaigns.filter(c => c.kpis.budgetPacing < 85 || c.kpis.budgetPacing > 115);
              const weakestRegion = [...data.regionData]
                .filter(r => r.kpis.spend > 0)
                .sort((a, b) => a.kpis.roas - b.kpis.roas)[0];

              return (
                <>
                  {worstCampaign && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 shrink-0">
                        <TrendingDown className="h-4 w-4 text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lowest ROAS Campaign</p>
                        <p className="text-sm font-medium truncate">{worstCampaign.campaign.name}</p>
                      </div>
                      <span className="text-sm font-bold text-amber-400 tabular-nums shrink-0">{formatKPIValue(worstCampaign.kpis.roas, 'decimal')}</span>
                    </div>
                  )}
                  {highestCPA && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 shrink-0">
                        <DollarSign className="h-4 w-4 text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Highest CPA Campaign</p>
                        <p className="text-sm font-medium truncate">{highestCPA.campaign.name}</p>
                      </div>
                      <span className="text-sm font-bold text-amber-400 tabular-nums shrink-0">{formatCurrency(highestCPA.kpis.cpa)}</span>
                    </div>
                  )}
                  {weakestRegion && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 shrink-0">
                        <Activity className="h-4 w-4 text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Weakest Region</p>
                        <p className="text-sm font-medium">{weakestRegion.regionLabel}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-amber-400 tabular-nums">{formatKPIValue(weakestRegion.kpis.roas, 'decimal')}</span>
                        <p className="text-[10px] text-muted-foreground">{formatCurrency(weakestRegion.kpis.cpa)} CPA</p>
                      </div>
                    </div>
                  )}
                  {offPace.length > 0 ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 shrink-0">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Off-Pace Campaigns</p>
                        <p className="text-sm font-medium">{offPace.length} campaigns over/under pacing</p>
                      </div>
                      <Link href="/insights" className="text-xs text-red-400 hover:underline shrink-0">View &rarr;</Link>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 shrink-0">
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget Pacing</p>
                        <p className="text-sm font-medium text-emerald-400">All campaigns on pace</p>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </Card>
      </div>
    </div>
  );
}
