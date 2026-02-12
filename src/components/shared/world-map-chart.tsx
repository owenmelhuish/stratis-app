"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import { cn } from "@/lib/utils";
import { REGION_CENTERS, COUNTRY_TO_REGION, regionFillColor } from "@/lib/geo";
import { REGION_LABELS, type RegionId, type AggregatedKPIs } from "@/types";
import { formatCurrency, formatDecimal, formatNumber } from "@/lib/format";

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
  colorMetric: ColorMetric;
  onColorMetricChange: (m: ColorMetric) => void;
  onRegionClick: (regionId: RegionId) => void;
}

interface TooltipState {
  x: number;
  y: number;
  region: RegionDatum;
}

export function WorldMapChart({
  regionData,
  colorMetric,
  onColorMetricChange,
  onRegionClick,
}: WorldMapChartProps) {
  const [hoveredRegion, setHoveredRegion] = useState<RegionId | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Build intensity map: regionId → 0..1 normalized by chosen metric
  const intensityMap = useMemo(() => {
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
  }, [regionData, colorMetric]);

  // Lookup helpers
  const regionByIdMap = useMemo(() => {
    const m: Record<string, RegionDatum> = {};
    for (const r of regionData) m[r.region] = r;
    return m;
  }, [regionData]);

  const handleGeoMouseEnter = useCallback(
    (regionId: RegionId, event: React.MouseEvent) => {
      setHoveredRegion(regionId);
      const datum = regionByIdMap[regionId];
      if (datum) {
        setTooltip({ x: event.clientX, y: event.clientY, region: datum });
      }
    },
    [regionByIdMap]
  );

  const handleGeoMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (tooltip) {
        setTooltip((prev) =>
          prev ? { ...prev, x: event.clientX, y: event.clientY } : null
        );
      }
    },
    [tooltip]
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
        setTooltip({ x: event.clientX, y: event.clientY, region: datum });
      }
    },
    [regionByIdMap]
  );

  return (
    <div className="rounded-xl border border-border/40 bg-card p-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold tracking-wide">
          Global Market Overview
        </h3>
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
      </div>

      {/* Map */}
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 130, center: [10, 30] }}
        width={800}
        height={400}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const countryId: string = geo.id;
              const regionId = COUNTRY_TO_REGION[countryId] as
                | RegionId
                | undefined;
              const intensity = regionId ? intensityMap[regionId] ?? 0 : 0;
              const isHovered = regionId !== undefined && regionId === hoveredRegion;
              const fill = regionId
                ? regionFillColor(isHovered ? Math.min(intensity + 0.25, 1) : intensity)
                : "rgba(255,255,255,0.03)";

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", cursor: regionId ? "pointer" : "default" },
                    pressed: { outline: "none" },
                  }}
                  onMouseEnter={(e) => {
                    if (regionId) handleGeoMouseEnter(regionId, e);
                  }}
                  onMouseMove={handleGeoMouseMove}
                  onMouseLeave={handleGeoMouseLeave}
                  onClick={() => {
                    if (regionId) onRegionClick(regionId);
                  }}
                />
              );
            })
          }
        </Geographies>

        {/* Glowing dot markers at region centers */}
        {regionData.map((r) => {
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
              onClick={() => onRegionClick(r.region)}
              style={{ cursor: "pointer" }}
            >
              {/* Outer pulse ring */}
              <circle
                r={10}
                fill="rgba(80,184,154,0.15)"
                className="animate-pulse"
              />
              {/* Mid ring */}
              <circle
                r={6}
                fill={isHovered ? "rgba(80,184,154,0.45)" : "rgba(80,184,154,0.25)"}
              />
              {/* Inner solid dot */}
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
            <div className="font-semibold text-foreground mb-2">
              {tooltip.region.regionLabel}
            </div>
            <div className="space-y-1">
              <Row label="Spend" value={formatCurrency(tooltip.region.kpis.spend)} />
              <Row label="ROAS" value={formatDecimal(tooltip.region.kpis.roas)} />
              <Row label="Conversions" value={formatNumber(tooltip.region.kpis.conversions)} />
              <Row label="Anomalies" value={String(tooltip.region.kpis.anomalyCount)} highlight={tooltip.region.kpis.anomalyCount > 3} />
            </div>
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
