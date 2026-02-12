"use client";
import React from 'react';
import { useAppStore } from '@/lib/store';
import { REGION_LABELS, CHANNEL_LABELS, type RegionId, type ChannelId, type DateRangePreset } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, SlidersHorizontal, GitCompareArrows, User, MapPin, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

const DATE_PILLS: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '14d', label: '14D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'ytd', label: 'YTD' },
];

function MultiSelectFilter({
  label, icon: Icon, allItems, selectedItems, onToggle, onClear,
}: {
  label: string; icon: React.ElementType;
  allItems: Record<string, string>; selectedItems: string[];
  onToggle: (id: string) => void; onClear: () => void;
}) {
  const count = selectedItems.length;
  const allKeys = Object.keys(allItems);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 border-border bg-transparent text-muted-foreground hover:text-foreground gap-1.5 text-xs">
          <Icon className="h-3 w-3" />
          {label}
          {count > 0 && count < allKeys.length && (
            <Badge variant="secondary" className="ml-1 h-4 min-w-[16px] px-1 text-[10px] bg-orange/15 text-orange border-0">{count}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3" align="start">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium">{label}</p>
          {count > 0 && <button onClick={onClear} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>}
        </div>
        <Separator className="mb-2" />
        <div className="space-y-1.5 max-h-48 overflow-auto">
          {allKeys.map((key) => (
            <label key={key} className="flex items-center gap-2.5 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer">
              <Checkbox checked={selectedItems.includes(key)} onCheckedChange={() => onToggle(key)} className="h-3.5 w-3.5" />
              <span className="text-xs">{allItems[key]}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function HeaderBar() {
  const {
    role, setRole, dateRange, setDatePreset, compareEnabled, toggleCompare,
    selectedRegions, setSelectedRegions, selectedChannels, setSelectedChannels,
    attributionModel, setAttributionModel,
    selectedRegion, selectedCampaign, setSelectedRegion, setSelectedCampaign,
  } = useAppStore();

  const viewLevel = selectedCampaign ? 'campaign' : selectedRegion ? 'region' : 'brand';
  const viewLabel = viewLevel === 'campaign' ? 'Campaign View' : viewLevel === 'region' ? 'Region View' : 'Brand View';

  const toggleRegion = (id: string) => {
    const r = id as RegionId;
    setSelectedRegions(selectedRegions.includes(r) ? selectedRegions.filter(x => x !== r) : [...selectedRegions, r]);
  };

  const toggleChannel = (id: string) => {
    const c = id as ChannelId;
    setSelectedChannels(selectedChannels.includes(c) ? selectedChannels.filter(x => x !== c) : [...selectedChannels, c]);
  };

  return (
    <header className="shrink-0 border-b border-border/30 bg-background/60 backdrop-blur-md">
      <div className="flex items-center justify-between px-8 h-12">
        <div className="flex items-center gap-1.5 min-w-0">
          <button onClick={() => { setSelectedRegion(null); setSelectedCampaign(null); }} className="text-sm font-semibold text-foreground hover:text-teal transition-colors">
            Porsche
          </button>
          {selectedRegion && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <button onClick={() => setSelectedCampaign(null)} className="text-sm font-medium text-foreground hover:text-teal transition-colors truncate">
                {REGION_LABELS[selectedRegion]}
              </button>
            </>
          )}
          {selectedCampaign && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">{selectedCampaign}</span>
            </>
          )}
          <Badge variant="outline" className="ml-2 text-[10px] font-medium border-border text-muted-foreground shrink-0">{viewLabel}</Badge>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-[11px] text-muted-foreground whitespace-nowrap">
              {role === 'agency' ? 'Agency Operator' : 'Brand Exec'}
            </Label>
            <Switch checked={role === 'exec'} onCheckedChange={(c) => setRole(c ? 'exec' : 'agency')} className="data-[state=checked]:bg-teal" />
          </div>

          <Separator orientation="vertical" className="h-5" />

          {/* Pill date selector */}
          <div className="flex items-center gap-0.5 rounded-lg bg-muted/30 p-0.5">
            {DATE_PILLS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDatePreset(p.value)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                  dateRange.preset === p.value
                    ? "bg-card-elevated text-teal"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Separator orientation="vertical" className="h-5" />

          <div className="flex items-center gap-2">
            <GitCompareArrows className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-[11px] text-muted-foreground">Compare</Label>
            <Switch checked={compareEnabled} onCheckedChange={toggleCompare} className="data-[state=checked]:bg-teal" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-8 h-9 border-t border-border/20">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground mr-1" />
        <MultiSelectFilter label="Region" icon={MapPin} allItems={REGION_LABELS as unknown as Record<string, string>} selectedItems={selectedRegions} onToggle={toggleRegion} onClear={() => setSelectedRegions([])} />
        <MultiSelectFilter label="Channel" icon={Radio} allItems={CHANNEL_LABELS as unknown as Record<string, string>} selectedItems={selectedChannels} onToggle={toggleChannel} onClear={() => setSelectedChannels([])} />

        <Select value={attributionModel} onValueChange={(v) => setAttributionModel(v as typeof attributionModel)}>
          <SelectTrigger className="h-7 w-[140px] text-xs border-border bg-transparent text-muted-foreground ml-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last-click" className="text-xs">Last Click</SelectItem>
            <SelectItem value="first-click" className="text-xs">First Click</SelectItem>
            <SelectItem value="linear" className="text-xs">Linear</SelectItem>
            <SelectItem value="data-driven" className="text-xs">Data-Driven</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </header>
  );
}
