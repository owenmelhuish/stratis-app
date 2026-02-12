"use client";
import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { BrandView } from '@/components/dashboard/brand-view';
import { RegionView } from '@/components/dashboard/region-view';
import { CampaignView } from '@/components/dashboard/campaign-view';
import { DashboardSkeleton } from '@/components/shared/loading-skeleton';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const selectedRegion = useAppStore(s => s.selectedRegion);
  const selectedCampaign = useAppStore(s => s.selectedCampaign);
  const actionLog = useAppStore(s => s.actionLog);
  const viewLevel = selectedCampaign ? 'campaign' : selectedRegion ? 'region' : 'brand';
  const approvedCount = actionLog.filter(a => a.action === 'approved').length;

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [viewLevel, selectedRegion, selectedCampaign]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">
          {viewLevel === 'brand' && 'Global Performance'}
          {viewLevel === 'region' && 'Regional Performance'}
          {viewLevel === 'campaign' && 'Campaign Performance'}
        </h1>
        <span className="text-[11px] text-muted-foreground/70">
          {viewLevel === 'brand' && 'All regions & channels'}
          {viewLevel === 'region' && 'All campaigns in this region'}
          {viewLevel === 'campaign' && "Bird's eye view across channels"}
        </span>
        {approvedCount > 0 && (
          <Badge className="bg-teal/15 text-teal text-[10px] ml-auto border-0">
            Plan updated ({approvedCount} approved)
          </Badge>
        )}
      </div>
      {viewLevel === 'brand' && <BrandView />}
      {viewLevel === 'region' && <RegionView />}
      {viewLevel === 'campaign' && <CampaignView />}
    </div>
  );
}
