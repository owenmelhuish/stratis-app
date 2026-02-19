"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import { cn } from "@/lib/utils";
import { REGION_CENTERS, COUNTRY_TO_REGION, REGION_PROJECTIONS, COUNTRY_NAMES, regionFillColor } from "@/lib/geo";
import { REGION_LABELS, type RegionId, type AggregatedKPIs, type ViewLevel } from "@/types";
import { formatCurrency, formatDecimal, formatNumber } from "@/lib/format";
import type { CountryDatum } from "@/hooks/use-dashboard-data";

const GEO_URL = "/geo/world-110m.json";

type ColorMetric = "spend" | "roas";

interface RegionDatum {
  region: RegionId;
  regionLabel: string;
  kpis: AggregatedKPIs;
  campaignCount: number;
}

interface WorldMapChartProps {
  regionData: RegionDatum[];
  colorMetric?: ColorMetric;
  onColorMetricChange?: (m: ColorMetric) => void;
  onRegionClick?: (regionId: RegionId) => void;
  viewLevel?: ViewLevel;
  selectedRegion?: RegionId;
  countryData?: CountryDatum[];
  highlightedCountries?: string[];
  campaignName?: string;
}

interface BrandTooltipState {
  kind: "brand";
  x: number;
  y: number;
  region: RegionDatum;
}

interface CountryTooltipState {
  kind: "country";
  x: number;
  y: number;
  countryName: string;
  spend?: number;
  campaignCount?: number;
  active?: boolean;
}

type TooltipState = BrandTooltipState | CountryTooltipState;

export function WorldMapChart({
  regionData,
  colorMetric = "spend",
  onColorMetricChange,
  onRegionClick,
  viewLevel = "brand",
  selectedRegion,
  countryData,
  highlightedCountries,
  campaignName,
}: WorldMapChartProps) {
  const [hoveredRegion, setHoveredRegion] = useState<RegionId | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const isBrandView = viewLevel === "brand";
  const isRegionView = viewLevel === "region";
  const isCampaignView = viewLevel === "campaign";

  // Projection config based on zoom level
  const projectionConfig = useMemo(() => {
    if ((isRegionView || isCampaignView) && selectedRegion) {
      return REGION_PROJECTIONS[selectedRegion];
    }
    return REGION_PROJECTIONS["global"];
  }, [isRegionView, isCampaignView, selectedRegion]);

  // Build intensity map for brand view: regionId → 0..1
  const regionIntensityMap = useMemo(() => {
    if (!isBrandView) return {};
    const map: Record<string, number> = {};
    const values = regionData.map((r) =>
      colorMetric === "spend" ? r.kpis.spend : r.kpis.roas
    );
    const max = Math.max(...values, 1);
    for (const r of regionData) {
      const val = colorMetric === "spend" ? r.kpis.spend : r.kpis.roas;
      map[r.region] = val / max;
    }
    return map;
  }, [regionData, colorMetric, isBrandView]);

  // Build country intensity map for region/campaign views
  const countryIntensityMap = useMemo(() => {
    if (isBrandView || !countryData) return {};
    const map: Record<string, number> = {};
    const maxSpend = Math.max(...countryData.map((c) => c.spend), 1);
    for (const c of countryData) {
      map[c.countryCode] = c.spend / maxSpend;
    }
    return map;
  }, [countryData, isBrandView]);

  // Country data lookup for tooltips
  const countryDataMap = useMemo(() => {
    if (!countryData) return {};
    const map: Record<string, CountryDatum> = {};
    for (const c of countryData) map[c.countryCode] = c;
    return map;
  }, [countryData]);

  // Highlighted countries set
  const highlightedSet = useMemo(
    () => new Set(highlightedCountries || []),
    [highlightedCountries]
  );

  // Region lookup
  const regionByIdMap = useMemo(() => {
    const m: Record<string, RegionDatum> = {};
    for (const r of regionData) m[r.region] = r;
    return m;
  }, [regionData]);

  // Header text
  const headerText = useMemo(() => {
    if (isRegionView && selectedRegion) {
      return `${REGION_LABELS[selectedRegion]} — Market Presence`;
    }
    if (isCampaignView && campaignName) {
      return `${campaignName} — Geographic Footprint`;
    }
    return "Global Market Overview";
  }, [isRegionView, isCampaignView, selectedRegion, campaignName]);

  // Mouse handlers for brand view (region-level)
  const handleGeoMouseEnterBrand = useCallback(
    (regionId: RegionId, event: React.MouseEvent) => {
      setHoveredRegion(regionId);
      const datum = regionByIdMap[regionId];
      if (datum) {
        setTooltip({ kind: "brand", x: event.clientX, y: event.clientY, region: datum });
      }
    },
    [regionByIdMap]
  );

  // Mouse handlers for region/campaign view (country-level)
  const handleGeoMouseEnterCountry = useCallback(
    (countryId: string, event: React.MouseEvent) => {
      const name = COUNTRY_NAMES[countryId] || countryId;
      if (isCampaignView) {
        setTooltip({
          kind: "country",
          x: event.clientX,
          y: event.clientY,
          countryName: name,
          active: highlightedSet.has(countryId),
        });
      } else {
        const cd = countryDataMap[countryId];
        setTooltip({
          kind: "country",
          x: event.clientX,
          y: event.clientY,
          countryName: name,
          spend: cd?.spend,
          campaignCount: cd?.campaignCount,
        });
      }
    },
    [countryDataMap, highlightedSet, isCampaignView]
  );

  const handleGeoMouseMove = useCallback(
    (event: React.MouseEvent) => {
      setTooltip((prev) =>
        prev ? { ...prev, x: event.clientX, y: event.clientY } : null
      );
    },
    []
  );

  const handleGeoMouseLeave = useCallback(() => {
    setHoveredRegion(null);
    setTooltip(null);
  }, []);

  const handleMarkerEnter = useCallback(
    (regionId: RegionId, event: React.MouseEvent) => {
      setHoveredRegion(regionId);
      const datum = regionByIdMap[regionId];
      if (datum) {
        setTooltip({ kind: "brand", x: event.clientX, y: event.clientY, region: datum });
      }
    },
    [regionByIdMap]
  );

  // Fill logic per view level
  const getGeoFill = useCallback(
    (countryId: string) => {
      const regionId = COUNTRY_TO_REGION[countryId] as RegionId | undefined;

      if (isBrandView) {
        if (!regionId) return "rgba(255,255,255,0.03)";
        const intensity = regionIntensityMap[regionId] ?? 0;
        const isHovered = regionId === hoveredRegion;
        return regionFillColor(isHovered ? Math.min(intensity + 0.25, 1) : intensity);
      }

      if (isRegionView) {
        if (!regionId) return "rgba(255,255,255,0.02)";
        if (regionId !== selectedRegion) return "rgba(255,255,255,0.02)";
        // When highlighted countries are provided, only those get bright fill
        if (highlightedSet.size > 0) {
          if (highlightedSet.has(countryId)) {
            const intensity = countryIntensityMap[countryId];
            return regionFillColor(intensity !== undefined ? 0.2 + intensity * 0.6 : 0.5);
          }
          return "rgba(80,184,154,0.06)";
        }
        const intensity = countryIntensityMap[countryId];
        if (intensity !== undefined) {
          return regionFillColor(0.2 + intensity * 0.6);
        }
        return "rgba(80,184,154,0.06)";
      }

      if (isCampaignView) {
        if (!regionId) return "rgba(255,255,255,0.02)";
        if (regionId !== selectedRegion) return "rgba(255,255,255,0.02)";
        if (highlightedSet.has(countryId)) {
          return "rgba(80,184,154,0.7)";
        }
        return "rgba(80,184,154,0.06)";
      }

      return "rgba(255,255,255,0.03)";
    },
    [isBrandView, isRegionView, isCampaignView, selectedRegion, regionIntensityMap, countryIntensityMap, highlightedSet, hoveredRegion]
  );

  return (
    <div className="rounded-xl border border-border/40 bg-card p-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold tracking-wide">
          {headerText}
        </h3>
        {isBrandView && onColorMetricChange && (
          <div className="flex gap-1">
            {(["spend", "roas"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onColorMetricChange(m)}
                className={cn(
                  "h-6 text-[10px] px-2.5 rounded-md font-medium transition-all inline-flex items-center gap-1.5",
                  colorMetric === m
                    ? "bg-card-elevated text-foreground"
                    : "text-muted-foreground/60 hover:text-muted-foreground"
                )}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      colorMetric === m ? "#50b89a" : "transparent",
                    border: "1.5px solid #50b89a",
                  }}
                />
                {m === "spend" ? "Spend" : "ROAS"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: projectionConfig.scale, center: projectionConfig.center }}
        width={800}
        height={400}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const countryId: string = geo.id;
              const regionId = COUNTRY_TO_REGION[countryId] as RegionId | undefined;
              const fill = getGeoFill(countryId);

              // Determine if this geo is interactive
              const isInteractive = isBrandView
                ? !!regionId
                : (regionId === selectedRegion);

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", cursor: isInteractive ? "pointer" : "default" },
                    pressed: { outline: "none" },
                  }}
                  onMouseEnter={(e) => {
                    if (isBrandView && regionId) {
                      handleGeoMouseEnterBrand(regionId, e);
                    } else if (!isBrandView && regionId === selectedRegion) {
                      handleGeoMouseEnterCountry(countryId, e);
                    }
                  }}
                  onMouseMove={handleGeoMouseMove}
                  onMouseLeave={handleGeoMouseLeave}
                  onClick={() => {
                    if (isBrandView && regionId && onRegionClick) {
                      onRegionClick(regionId);
                    }
                  }}
                />
              );
            })
          }
        </Geographies>

        {/* Glowing dot markers at region centers — brand view only */}
        {isBrandView &&
          regionData.map((r) => {
            const center = REGION_CENTERS[r.region];
            if (!center) return null;
            const isHovered = r.region === hoveredRegion;
            return (
              <Marker
                key={r.region}
                coordinates={center}
                onMouseEnter={(e) => handleMarkerEnter(r.region, e)}
                onMouseMove={handleGeoMouseMove}
                onMouseLeave={handleGeoMouseLeave}
                onClick={() => onRegionClick?.(r.region)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  r={10}
                  fill="rgba(80,184,154,0.15)"
                  className="animate-pulse"
                />
                <circle
                  r={6}
                  fill={isHovered ? "rgba(80,184,154,0.45)" : "rgba(80,184,154,0.25)"}
                />
                <circle
                  r={3.5}
                  fill={isHovered ? "rgba(80,184,154,1)" : "rgba(80,184,154,0.8)"}
                />
              </Marker>
            );
          })}
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <div
            className="rounded-[10px] border border-white/[0.08] px-4 py-3 text-xs text-[#e0e0e0] min-w-[180px]"
            style={{
              backgroundColor: "rgba(20,24,28,0.95)",
              backdropFilter: "blur(12px)",
            }}
          >
            {tooltip.kind === "brand" && (
              <>
                <div className="font-semibold text-foreground mb-2">
                  {tooltip.region.regionLabel}
                </div>
                <div className="space-y-1">
                  <Row label="Spend" value={formatCurrency(tooltip.region.kpis.spend)} />
                  <Row label="ROAS" value={formatDecimal(tooltip.region.kpis.roas)} />
                  <Row label="Conversions" value={formatNumber(tooltip.region.kpis.conversions)} />
                  <Row label="Anomalies" value={String(tooltip.region.kpis.anomalyCount)} highlight={tooltip.region.kpis.anomalyCount > 3} />
                </div>
              </>
            )}
            {tooltip.kind === "country" && (
              <>
                <div className="font-semibold text-foreground mb-2">
                  {tooltip.countryName}
                </div>
                <div className="space-y-1">
                  {tooltip.spend !== undefined && (
                    <Row label="Spend" value={formatCurrency(tooltip.spend)} />
                  )}
                  {tooltip.campaignCount !== undefined && (
                    <Row label="Campaigns" value={String(tooltip.campaignCount)} />
                  )}
                  {tooltip.active !== undefined && (
                    <Row label="Status" value={tooltip.active ? "Active" : "Inactive"} />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", highlight && "text-red-400")}>{value}</span>
    </div>
  );
}
